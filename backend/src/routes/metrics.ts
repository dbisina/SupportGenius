import { Router } from 'express';
import { logger } from '../utils/logger';
import { MetricsService } from '../services/metrics';

const router = Router();
const metricsService = new MetricsService();

/**
 * GET /api/metrics
 * Get system performance metrics
 */
router.get('/', async (_req, res) => {
  try {
    const metrics = await metricsService.getMetrics();
    res.json(metrics);
  } catch (error) {
    logger.error('Error retrieving metrics', error);
    res.status(500).json({ error: 'Failed to retrieve metrics' });
  }
});

/**
 * GET /api/metrics/realtime
 * Get real-time metrics for the dashboard
 */
router.get('/realtime', async (_req, res) => {
  try {
    const realtime = await metricsService.getRealtimeMetrics();
    res.json(realtime);
  } catch (error) {
    logger.error('Error retrieving realtime metrics', error);
    res.status(500).json({ error: 'Failed to retrieve realtime metrics' });
  }
});

/**
 * GET /api/metrics/trends
 * Get historical trend data
 */
router.get('/trends', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const trends = await metricsService.getTrends(parseInt(days as string));
    res.json(trends);
  } catch (error) {
    logger.error('Error retrieving trends', error);
    res.status(500).json({ error: 'Failed to retrieve trends' });
  }
});

/**
 * GET /api/metrics/knowledge
 * Get knowledge flywheel statistics
 */
router.get('/knowledge', async (_req, res) => {
  try {
    const stats = await metricsService.getKnowledgeStats();
    res.json(stats);
  } catch (error) {
    logger.error('Error retrieving knowledge stats', error);
    res.status(500).json({ error: 'Failed to retrieve knowledge stats' });
  }
});

/**
 * GET /api/metrics/esql-queries
 * Get ES|QL queries agents have written
 */
router.get('/esql-queries', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const queries = await metricsService.getEsqlQueries(parseInt(limit as string));
    res.json(queries);
  } catch (error) {
    logger.error('Error retrieving ES|QL queries', error);
    res.status(500).json({ error: 'Failed to retrieve ES|QL queries' });
  }
});

/**
 * GET /api/metrics/flywheel
 * Get flywheel data (automation rate vs KB articles over time)
 */
router.get('/flywheel', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const data = await metricsService.getFlywheelData(parseInt(days as string));
    res.json(data);
  } catch (error) {
    logger.error('Error retrieving flywheel data', error);
    res.status(500).json({ error: 'Failed to retrieve flywheel data' });
  }
});

/**
 * GET /api/metrics/impact
 * Get real impact metrics with baseline comparisons
 */
router.get('/impact', async (_req, res) => {
  try {
    const impact = await metricsService.getImpactMetrics();
    res.json(impact);
  } catch (error) {
    logger.error('Error retrieving impact metrics', error);
    res.status(500).json({ error: 'Failed to retrieve impact metrics' });
  }
});

export default router;
