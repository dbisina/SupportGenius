import { Router } from 'express';
import { logger } from '../utils/logger';
import { elasticsearchClient, INDEXES } from '../config/elasticsearch';

const router = Router();

/**
 * GET /api/incidents/detect
 * Detect anomalous patterns in support tickets using ES aggregations:
 *   - Ticket surge by category (last 2 hours)
 *   - Quality degradation (24h confidence drop vs 7-day baseline)
 *   - Category health indicators (24h)
 */
router.get('/detect', async (_req, res) => {
  try {
    const [surgeResult, qualityResult, categoryHealthResult] = await Promise.all([
      // Ticket surge: categories with high volume in last 2 hours
      elasticsearchClient.search({
        index: INDEXES.SUPPORT_TICKETS,
        body: {
          size: 0,
          query: { range: { created_at: { gte: 'now-2h' } } },
          aggs: {
            by_category: {
              terms: { field: 'category', size: 10 },
            },
          },
        },
      }).catch(() => ({ aggregations: { by_category: { buckets: [] } } })),

      // Quality degradation: compare 24h confidence to 7-day baseline
      elasticsearchClient.search({
        index: INDEXES.SUPPORT_TICKETS,
        body: {
          size: 0,
          query: {
            bool: {
              must: [
                { range: { created_at: { gte: 'now-7d' } } },
                { term: { status: 'resolved' } },
              ],
            },
          },
          aggs: {
            by_category: {
              terms: { field: 'category', size: 10 },
              aggs: {
                avg_confidence: { avg: { field: 'agent_confidence' } },
                total: { value_count: { field: 'ticket_id' } },
                recent: {
                  filter: { range: { created_at: { gte: 'now-24h' } } },
                  aggs: {
                    avg_confidence: { avg: { field: 'agent_confidence' } },
                  },
                },
              },
            },
          },
        },
      }).catch(() => ({ aggregations: { by_category: { buckets: [] } } })),

      // Category health: 24h metrics per category
      elasticsearchClient.search({
        index: INDEXES.SUPPORT_TICKETS,
        body: {
          size: 0,
          query: { range: { created_at: { gte: 'now-24h' } } },
          aggs: {
            by_category: {
              terms: { field: 'category', size: 10 },
              aggs: {
                avg_confidence: { avg: { field: 'agent_confidence' } },
                automated: { filter: { term: { automated: true } } },
                escalated: { filter: { term: { status: 'escalated' } } },
              },
            },
          },
        },
      }).catch(() => ({ aggregations: { by_category: { buckets: [] } } })),
    ]);

    // Process surge detection
    const surges = ((surgeResult.aggregations as any)?.by_category?.buckets || [])
      .filter((b: any) => b.doc_count >= 3)
      .map((b: any) => ({
        category: b.key,
        count: b.doc_count,
        severity: b.doc_count >= 10 ? 'critical' : b.doc_count >= 5 ? 'warning' : 'info',
        message: `${b.doc_count} ${b.key} tickets in the last 2 hours`,
      }));

    // Process quality degradation
    const qualityIssues = ((qualityResult.aggregations as any)?.by_category?.buckets || [])
      .filter((b: any) => {
        const overallAvg = b.avg_confidence?.value || 0;
        const recentAvg = b.recent?.avg_confidence?.value || 0;
        return overallAvg > 0 && recentAvg > 0 && recentAvg < overallAvg * 0.85;
      })
      .map((b: any) => ({
        category: b.key,
        overall_confidence: b.avg_confidence?.value || 0,
        recent_confidence: b.recent?.avg_confidence?.value || 0,
        severity: 'warning' as const,
        message: `${b.key} confidence dropped from ${((b.avg_confidence?.value || 0) * 100).toFixed(0)}% to ${((b.recent?.avg_confidence?.value || 0) * 100).toFixed(0)}% in last 24h`,
      }));

    // Process category health
    const categoryHealth = ((categoryHealthResult.aggregations as any)?.by_category?.buckets || [])
      .map((b: any) => {
        const total = b.doc_count;
        const automated = b.automated?.doc_count || 0;
        const escalated = b.escalated?.doc_count || 0;
        const avgConfidence = b.avg_confidence?.value || 0;

        let health: 'green' | 'yellow' | 'red' = 'green';
        if (avgConfidence < 0.7 || (escalated / Math.max(total, 1)) > 0.3) health = 'red';
        else if (avgConfidence < 0.85 || (escalated / Math.max(total, 1)) > 0.15) health = 'yellow';

        return {
          category: b.key,
          total,
          automated,
          escalated,
          avg_confidence: avgConfidence,
          automation_rate: total > 0 ? automated / total : 0,
          health,
        };
      });

    // Keyword clustering via significant_terms on descriptions (last 6 hours)
    let keywordClusters: any[] = [];
    try {
      const keywordResult = await elasticsearchClient.search({
        index: INDEXES.SUPPORT_TICKETS,
        body: {
          size: 0,
          query: { range: { created_at: { gte: 'now-6h' } } },
          aggs: {
            keywords: {
              significant_terms: {
                field: 'description',
                size: 10,
                min_doc_count: 2,
              },
            },
          },
        },
      });
      const keywordBuckets = (keywordResult.aggregations as any)?.keywords?.buckets || [];
      keywordClusters = keywordBuckets.map((b: any) => ({
        term: b.key,
        doc_count: b.doc_count,
        score: b.score,
        severity: b.doc_count >= 5 ? 'critical' : b.doc_count >= 3 ? 'warning' : 'info',
      }));
    } catch (kwErr) {
      logger.warn('Keyword clustering failed (non-fatal)', { error: kwErr });
    }

    res.json({
      timestamp: new Date().toISOString(),
      surges,
      quality_issues: qualityIssues,
      category_health: categoryHealth,
      keyword_clusters: keywordClusters,
      incidents_count: surges.length + qualityIssues.length,
    });
  } catch (error) {
    logger.error('Error detecting incidents', error);
    res.status(500).json({ error: 'Failed to detect incidents' });
  }
});

/**
 * POST /api/incidents/create
 * Create a major incident ticket linking sub-tickets
 */
router.post('/create', async (req, res) => {
  try {
    const { keyword_cluster, affected_tickets = [], severity = 'warning' } = req.body;
    const incidentId = `INC-${Date.now().toString(36).toUpperCase()}`;

    await elasticsearchClient.index({
      index: INDEXES.SUPPORT_TICKETS,
      id: incidentId,
      body: {
        ticket_id: incidentId,
        customer_id: 'SYSTEM',
        subject: `Major Incident: ${keyword_cluster}`,
        description: `Auto-generated incident for keyword cluster "${keyword_cluster}". Affected tickets: ${affected_tickets.join(', ') || 'none identified'}`,
        category: 'other',
        priority: severity === 'critical' ? 'urgent' : 'high',
        status: 'new',
        automated: false,
        agent_confidence: 0,
        created_at: new Date().toISOString(),
      },
      refresh: 'wait_for',
    });

    logger.info('Created major incident', { incidentId, keyword_cluster, severity });

    res.json({
      incident_id: incidentId,
      keyword_cluster,
      severity,
      affected_tickets,
      status: 'created',
    });
  } catch (error) {
    logger.error('Error creating incident', error);
    res.status(500).json({ error: 'Failed to create incident' });
  }
});

export default router;
