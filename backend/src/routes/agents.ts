import { Router } from 'express';
import { logger } from '../utils/logger';
import { AgentMonitor } from '../services/agent-monitor';

const router = Router();
const agentMonitor = new AgentMonitor();

/**
 * GET /api/agents/status
 * Get current status of all agents
 */
router.get('/status', async (_req, res) => {
  try {
    const status = await agentMonitor.getAgentStatus();
    res.json(status);
  } catch (error) {
    logger.error('Error retrieving agent status', error);
    res.status(500).json({ error: 'Failed to retrieve agent status' });
  }
});

/**
 * GET /api/agents/activity
 * Get recent agent activity
 */
router.get('/activity', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const activity = await agentMonitor.getRecentActivity(parseInt(limit as string));
    res.json(activity);
  } catch (error) {
    logger.error('Error retrieving agent activity', error);
    res.status(500).json({ error: 'Failed to retrieve agent activity' });
  }
});

export default router;
