import { Router } from 'express';
import { logger } from '../utils/logger';
import { MetricsService } from '../services/metrics';

const router = Router();
const metricsService = new MetricsService();

/**
 * GET /api/metrics
 * Get system performance metrics
 */
router.get('/', async (req, res) => {
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
router.get('/realtime', async (req, res) => {
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

export default router;
