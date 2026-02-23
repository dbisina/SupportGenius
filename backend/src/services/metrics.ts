import { elasticsearchClient, INDEXES } from '../config/elasticsearch';
import { logger } from '../utils/logger';
import { MetricsResponse } from '../models/types';

/**
 * MetricsService provides real system performance metrics from Elasticsearch
 */
export class MetricsService {
  async getMetrics(): Promise<MetricsResponse> {
    try {
      const response = await elasticsearchClient.search({
        index: INDEXES.SUPPORT_TICKETS,
        body: {
          size: 0,
          aggs: {
            total_tickets: { value_count: { field: 'ticket_id' } },
            automated_tickets: { filter: { term: { automated: true } } },
            avg_resolution_time: { avg: { field: 'resolution_time_minutes' } },
            avg_confidence: { avg: { field: 'agent_confidence' } },
            by_category: { terms: { field: 'category', size: 10 } },
            by_status: { terms: { field: 'status', size: 10 } },
          },
        },
      });

      const aggs: any = response.aggregations;
      const totalTickets = aggs?.total_tickets?.value || 0;
      const automatedCount = aggs?.automated_tickets?.doc_count || 0;
      const automationRate = totalTickets > 0 ? (automatedCount / totalTickets) * 100 : 0;
      const avgResolutionTime = aggs?.avg_resolution_time?.value || 0;
      const costSavings = automatedCount * 28;

      const byCategory: Record<string, number> = {
        refund: 0, shipping: 0, product_issue: 0, account: 0, other: 0,
      };
      for (const bucket of (aggs?.by_category?.buckets || [])) {
        byCategory[bucket.key] = bucket.doc_count;
      }

      const byStatus: Record<string, number> = {
        new: 0, processing: 0, researching: 0, deciding: 0,
        executing: 0, validating: 0, resolved: 0, escalated: 0,
      };
      for (const bucket of (aggs?.by_status?.buckets || [])) {
        byStatus[bucket.key] = bucket.doc_count;
      }

      return {
        total_tickets: totalTickets,
        automated_tickets: automatedCount,
        automation_rate: automationRate,
        avg_resolution_time: Math.round(avgResolutionTime),
        customer_satisfaction: aggs?.avg_confidence?.value
          ? Math.round(aggs.avg_confidence.value * 100)
          : 0,
        cost_savings: costSavings,
        by_category: byCategory as any,
        by_status: byStatus as any,
      };
    } catch (error) {
      logger.error('Error calculating metrics', error);
      return {
        total_tickets: 0, automated_tickets: 0, automation_rate: 0,
        avg_resolution_time: 0, customer_satisfaction: 0, cost_savings: 0,
        by_category: { refund: 0, shipping: 0, product_issue: 0, account: 0, other: 0 },
        by_status: { new: 0, processing: 0, researching: 0, deciding: 0, simulating: 0, executing: 0, validating: 0, resolved: 0, escalated: 0 },
      };
    }
  }

  async getRealtimeMetrics() {
    try {
      const response = await elasticsearchClient.search({
        index: INDEXES.SUPPORT_TICKETS,
        body: {
          size: 0,
          query: {
            bool: { must_not: [{ terms: { status: ['resolved', 'escalated'] } }] },
          },
          aggs: {
            active_count: { value_count: { field: 'ticket_id' } },
            by_status: { terms: { field: 'status', size: 10 } },
          },
        },
      });

      const aggs: any = response.aggregations;
      const activeTickets = aggs?.active_count?.value || 0;
      const processingStatuses = (aggs?.by_status?.buckets || [])
        .filter((b: any) => ['processing', 'researching', 'deciding', 'executing', 'validating'].includes(b.key));
      const agentsProcessing = processingStatuses.reduce((sum: number, b: any) => sum + b.doc_count, 0);

      return {
        active_tickets: activeTickets,
        agents_processing: agentsProcessing,
        avg_response_time: 0,
      };
    } catch (error) {
      logger.error('Error getting realtime metrics', error);
      return { active_tickets: 0, agents_processing: 0, avg_response_time: 0 };
    }
  }

  async getTrends(days: number) {
    try {
      const response = await elasticsearchClient.search({
        index: INDEXES.SUPPORT_TICKETS,
        body: {
          size: 0,
          query: { range: { created_at: { gte: `now-${days}d` } } },
          aggs: {
            daily: {
              date_histogram: { field: 'created_at', calendar_interval: 'day' },
              aggs: {
                automated: { filter: { term: { automated: true } } },
                resolved: { filter: { term: { status: 'resolved' } } },
                avg_resolution: { avg: { field: 'resolution_time_minutes' } },
                avg_confidence: { avg: { field: 'agent_confidence' } },
              },
            },
          },
        },
      });

      const buckets = (response.aggregations as any)?.daily?.buckets || [];

      return {
        period: days,
        data: buckets.map((bucket: any) => ({
          date: bucket.key_as_string,
          total: bucket.doc_count,
          automated: bucket.automated?.doc_count || 0,
          resolved: bucket.resolved?.doc_count || 0,
          avg_resolution_time: Math.round(bucket.avg_resolution?.value || 0),
          avg_confidence: bucket.avg_confidence?.value
            ? Math.round(bucket.avg_confidence.value * 100) : 0,
        })),
      };
    } catch (error) {
      logger.error('Error calculating trends', error);
      return { period: days, data: [] };
    }
  }

  async getEsqlQueries(limit: number = 20) {
    try {
      const response = await elasticsearchClient.search({
        index: INDEXES.PIPELINE_TRACES,
        body: {
          size: 50,
          query: {
            bool: {
              must: [
                { term: { status: 'completed' } },
                { exists: { field: 'tool_calls' } },
              ],
            },
          },
          sort: [{ completed_at: { order: 'desc' } }],
          _source: ['ticket_id', 'agent', 'tool_calls', 'completed_at'],
        },
      });

      // Build query representation from ACTUAL tool call data
      const queries: any[] = [];
      for (const hit of (response.hits?.hits || [])) {
        const src = hit._source as any;
        if (!src.tool_calls?.length) continue;
        for (const tc of src.tool_calls) {
          const toolId = tc.tool_id || 'unknown';
          const params = tc.params || {};

          // Reconstruct the actual query based on tool type and params
          let query: string;
          if (toolId.includes('esql') || toolId.includes('ESQL')) {
            // ES|QL tool — params contain the actual query
            query = params.query || `FROM ${toolId.split('.').pop()?.replace(/^esql_/, '') || 'index'}`;
          } else if (toolId.includes('search_') || toolId.includes('index_search')) {
            // Index search tool — build readable representation from actual params
            const index = toolId.split('.').pop()?.replace(/^search_/, '') || 'unknown';
            const paramParts = Object.entries(params)
              .filter(([k]) => k !== 'index' && k !== 'size')
              .map(([k, v]) => `${k}: ${JSON.stringify(v)}`);
            query = `INDEX ${index}\n  SEARCH ${paramParts.join(', ') || '*'}`;
          } else {
            // Other tool types — show raw params
            query = `${toolId}(${JSON.stringify(params)})`;
          }

          // Include actual results summary if available
          const resultsSummary = tc.results?.length
            ? `→ ${tc.results.length} result(s)`
            : '';

          queries.push({
            ticket_id: src.ticket_id,
            agent: src.agent,
            tool_id: toolId,
            query,
            params,
            results_count: tc.results?.length || 0,
            results_summary: resultsSummary,
            timestamp: src.completed_at,
          });
        }
      }

      return queries.slice(0, limit);
    } catch (error) {
      logger.error('Error getting ES|QL queries', error);
      return [];
    }
  }

  async getFlywheelData(days: number = 30) {
    try {
      const [ticketsResp, kbResp] = await Promise.all([
        elasticsearchClient.search({
          index: INDEXES.SUPPORT_TICKETS,
          body: {
            size: 0,
            query: { range: { created_at: { gte: `now-${days}d` } } },
            aggs: {
              daily: {
                date_histogram: { field: 'created_at', calendar_interval: 'day' },
                aggs: {
                  automated: { filter: { term: { automated: true } } },
                },
              },
            },
          },
        }),
        elasticsearchClient.search({
          index: INDEXES.KNOWLEDGE_BASE,
          body: {
            size: 0,
            query: { range: { last_updated: { gte: `now-${days}d` } } },
            aggs: {
              daily: {
                date_histogram: { field: 'last_updated', calendar_interval: 'day' },
              },
            },
          },
        }),
      ]);

      const ticketBuckets: any[] = (ticketsResp.aggregations as any)?.daily?.buckets || [];
      const kbBuckets: any[] = (kbResp.aggregations as any)?.daily?.buckets || [];

      // Merge into time series
      const dateMap = new Map<string, any>();
      let cumulativeKb = 0;

      for (const bucket of ticketBuckets) {
        const date = bucket.key_as_string;
        dateMap.set(date, {
          date,
          total_tickets: bucket.doc_count,
          automated_tickets: bucket.automated?.doc_count || 0,
          automation_rate: bucket.doc_count > 0 ? Math.round(((bucket.automated?.doc_count || 0) / bucket.doc_count) * 100) : 0,
          kb_articles: 0,
        });
      }

      for (const bucket of kbBuckets) {
        cumulativeKb += bucket.doc_count;
        const date = bucket.key_as_string;
        const entry = dateMap.get(date);
        if (entry) {
          entry.kb_articles = cumulativeKb;
        } else {
          dateMap.set(date, {
            date,
            total_tickets: 0,
            automated_tickets: 0,
            automation_rate: 0,
            kb_articles: cumulativeKb,
          });
        }
      }

      // Fill cumulative KB for dates without KB entries
      const sorted = [...dateMap.values()].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      let lastKb = 0;
      for (const entry of sorted) {
        if (entry.kb_articles > 0) {
          lastKb = entry.kb_articles;
        } else {
          entry.kb_articles = lastKb;
        }
      }

      return sorted;
    } catch (error) {
      logger.error('Error getting flywheel data', error);
      return [];
    }
  }

  async getKnowledgeStats() {
    try {
      const response = await elasticsearchClient.search({
        index: INDEXES.KNOWLEDGE_BASE,
        body: {
          size: 5,
          query: { prefix: { article_id: 'AUTO-' } },
          sort: [{ created_at: { order: 'desc' } }],
          aggs: {
            total_ai_articles: { value_count: { field: 'article_id' } },
          },
        },
      });

      const aggs: any = response.aggregations;
      const totalAiArticles = aggs?.total_ai_articles?.value || 0;

      const totalTicketsResp = await elasticsearchClient.count({
        index: INDEXES.SUPPORT_TICKETS,
      });
      const totalTickets = totalTicketsResp.count || 1;
      const contributionRate = totalTickets > 0 ? Math.round((totalAiArticles / totalTickets) * 100) : 0;

      const recentContributions = ((response.hits?.hits) || []).map((hit: any) => ({
        title: hit._source?.title || hit._source?.article_id || 'Untitled',
        created_at: hit._source?.created_at || new Date().toISOString(),
      }));

      return {
        total_ai_articles: totalAiArticles,
        knowledge_contribution_rate: Math.min(contributionRate, 100),
        recent_contributions: recentContributions,
      };
    } catch (error) {
      logger.error('Error getting knowledge stats', error);
      return { total_ai_articles: 0, knowledge_contribution_rate: 0, recent_contributions: [] };
    }
  }

  /**
   * Real impact metrics with baseline comparisons.
   * Compares automated vs manual resolution on actual data.
   */
  async getImpactMetrics() {
    try {
      const [automatedStats, manualStats, pipelineStats] = await Promise.all([
        // Automated resolution performance
        elasticsearchClient.search({
          index: INDEXES.SUPPORT_TICKETS,
          body: {
            size: 0,
            query: { bool: { must: [{ term: { automated: true } }, { term: { status: 'resolved' } }] } },
            aggs: {
              count: { value_count: { field: 'ticket_id' } },
              avg_confidence: { avg: { field: 'agent_confidence' } },
              avg_resolution_time: { avg: { field: 'resolution_time_minutes' } },
              by_category: {
                terms: { field: 'category', size: 10 },
                aggs: {
                  avg_confidence: { avg: { field: 'agent_confidence' } },
                  avg_time: { avg: { field: 'resolution_time_minutes' } },
                },
              },
            },
          },
        }),
        // Manual/escalated ticket performance (baseline)
        elasticsearchClient.search({
          index: INDEXES.SUPPORT_TICKETS,
          body: {
            size: 0,
            query: { bool: { must: [{ term: { automated: false } }] } },
            aggs: {
              count: { value_count: { field: 'ticket_id' } },
              avg_confidence: { avg: { field: 'agent_confidence' } },
              escalated: { filter: { term: { status: 'escalated' } } },
            },
          },
        }),
        // Pipeline trace performance
        elasticsearchClient.search({
          index: INDEXES.PIPELINE_TRACES,
          body: {
            size: 0,
            query: { term: { status: 'completed' } },
            aggs: {
              total_traces: { value_count: { field: 'ticket_id' } },
              avg_duration: { avg: { field: 'duration_ms' } },
              total_llm_calls: { sum: { field: 'llm_calls' } },
              total_input_tokens: { sum: { field: 'input_tokens' } },
              total_output_tokens: { sum: { field: 'output_tokens' } },
              by_agent: {
                terms: { field: 'agent', size: 10 },
                aggs: {
                  avg_duration: { avg: { field: 'duration_ms' } },
                  avg_confidence: { avg: { field: 'confidence' } },
                  total_tool_calls: { sum: { field: 'llm_calls' } },
                },
              },
            },
          },
        }),
      ]);

      const autoAggs: any = automatedStats.aggregations;
      const manualAggs: any = manualStats.aggregations;
      const pipeAggs: any = pipelineStats.aggregations;

      const automatedCount = autoAggs?.count?.value || 0;
      const manualCount = manualAggs?.count?.value || 0;
      const escalatedCount = manualAggs?.escalated?.doc_count || 0;

      // Per-agent performance breakdown
      const agentPerformance = (pipeAggs?.by_agent?.buckets || []).map((b: any) => ({
        agent: b.key,
        avg_duration_ms: Math.round(b.avg_duration?.value || 0),
        avg_confidence: b.avg_confidence?.value || 0,
        total_llm_calls: b.total_tool_calls?.value || 0,
        trace_count: b.doc_count,
      }));

      // Category breakdown for automated
      const categoryPerformance = (autoAggs?.by_category?.buckets || []).map((b: any) => ({
        category: b.key,
        count: b.doc_count,
        avg_confidence: b.avg_confidence?.value || 0,
        avg_resolution_time_min: Math.round(b.avg_time?.value || 0),
      }));

      const costPerTicketManual = 28; // Industry average: $28 per human-handled ticket
      const costPerTicketAI = 0.45; // Estimated LLM token cost per ticket

      return {
        automated: {
          count: automatedCount,
          avg_confidence: autoAggs?.avg_confidence?.value || 0,
          avg_resolution_time_min: Math.round(autoAggs?.avg_resolution_time?.value || 0),
        },
        baseline: {
          manual_count: manualCount,
          escalated_count: escalatedCount,
          avg_confidence: manualAggs?.avg_confidence?.value || 0,
        },
        impact: {
          automation_rate: (automatedCount + manualCount) > 0
            ? Math.round((automatedCount / (automatedCount + manualCount)) * 100) : 0,
          cost_savings: Math.round(automatedCount * (costPerTicketManual - costPerTicketAI)),
          cost_per_automated_ticket: costPerTicketAI,
          cost_per_manual_ticket: costPerTicketManual,
          time_saved_hours: Math.round((automatedCount * 84) / 60), // 84 min avg manual resolution
        },
        pipeline: {
          total_agent_steps: pipeAggs?.total_traces?.value || 0,
          avg_step_duration_ms: Math.round(pipeAggs?.avg_duration?.value || 0),
          total_llm_calls: pipeAggs?.total_llm_calls?.value || 0,
          total_tokens: (pipeAggs?.total_input_tokens?.value || 0) + (pipeAggs?.total_output_tokens?.value || 0),
          agent_performance: agentPerformance,
        },
        category_performance: categoryPerformance,
      };
    } catch (error) {
      logger.error('Error getting impact metrics', error);
      return null;
    }
  }
}
