import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { SubmitTicketRequest, SubmitTicketResponse } from '../models/types';
import { TicketOrchestrator, pipelineEvents, PipelineEvent } from '../services/orchestrator';

const router = Router();
const orchestrator = new TicketOrchestrator();

/**
 * POST /api/tickets/submit
 * Submit a new support ticket for automated resolution
 */
router.post('/submit', async (req, res) => {
  try {
    const ticketRequest: SubmitTicketRequest = req.body;

    // Validate request
    if (!ticketRequest.customer_email || !ticketRequest.subject || !ticketRequest.description) {
      res.status(400).json({
        error: 'Missing required fields: customer_email, subject, description',
      });
      return;
    }

    // Generate ticket ID
    const ticket_id = `TKT-${uuidv4().substring(0, 8).toUpperCase()}`;
    const mode = ticketRequest.mode || 'orchestrated';

    logger.info('New ticket submitted', { ticket_id, mode, ...ticketRequest });

    // Start processing — mode determines pipeline vs single-call
    if (mode === 'autonomous') {
      orchestrator.processTicketAutonomous(ticket_id, ticketRequest).catch((error) => {
        logger.error('Autonomous ticket processing failed', { ticket_id, error });
      });
    } else {
      orchestrator.processTicket(ticket_id, ticketRequest).catch((error) => {
        logger.error('Ticket processing failed', { ticket_id, error });
      });
    }

    const response: SubmitTicketResponse = {
      ticket_id,
      status: 'processing',
      estimated_resolution: mode === 'autonomous' ? '30 seconds' : '5 minutes',
      agent_assigned: mode === 'autonomous' ? 'Autonomous Agent' : 'Triage Agent',
    };

    res.status(202).json(response);
  } catch (error) {
    logger.error('Error submitting ticket', error);
    res.status(500).json({ error: 'Failed to submit ticket' });
  }
});

/**
 * GET /api/tickets/:id/stream
 * SSE endpoint for live pipeline events — watch agents think in real-time
 */
router.get('/:id/stream', (req, res) => {
  const { id } = req.params;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  // Send initial connection event
  res.write(`data: ${JSON.stringify({ type: 'connected', ticket_id: id, message: 'Connected to pipeline stream' })}\n\n`);

  const onEvent = (event: PipelineEvent) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  pipelineEvents.on(`ticket:${id}`, onEvent);

  // Clean up on disconnect
  req.on('close', () => {
    pipelineEvents.off(`ticket:${id}`, onEvent);
  });
});

/**
 * GET /api/tickets/:id/trace
 * Get the full pipeline trace for a ticket — agent reasoning, tool calls, timing, tokens.
 */
router.get('/:id/trace', async (req, res) => {
  try {
    const { id } = req.params;
    const trace = await orchestrator.getTicketTrace(id);
    res.json(trace);
  } catch (error) {
    logger.error('Error retrieving ticket trace', error);
    res.status(500).json({ error: 'Failed to retrieve ticket trace' });
  }
});

/**
 * GET /api/tickets/:id
 * Get ticket status and details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const ticket = await orchestrator.getTicketStatus(id);

    if (!ticket) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }

    res.json(ticket);
  } catch (error) {
    logger.error('Error retrieving ticket', error);
    res.status(500).json({ error: 'Failed to retrieve ticket' });
  }
});

/**
 * GET /api/tickets
 * List all tickets with optional filters
 */
router.get('/', async (req, res) => {
  try {
    const { status, category, limit = 50, offset = 0 } = req.query;

    const tickets = await orchestrator.listTickets({
      status: status as string,
      category: category as string,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });

    res.json(tickets);
  } catch (error) {
    logger.error('Error listing tickets', error);
    res.status(500).json({ error: 'Failed to list tickets' });
  }
});

export default router;
