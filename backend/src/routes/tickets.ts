import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { SubmitTicketRequest, SubmitTicketResponse } from '../models/types';
import { TicketOrchestrator } from '../services/orchestrator';

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
      return res.status(400).json({
        error: 'Missing required fields: customer_email, subject, description',
      });
    }

    // Generate ticket ID
    const ticket_id = `TKT-${uuidv4().substring(0, 8).toUpperCase()}`;

    logger.info('New ticket submitted', { ticket_id, ...ticketRequest });

    // Start orchestration process (async)
    orchestrator.processTicket(ticket_id, ticketRequest).catch((error) => {
      logger.error('Ticket processing failed', { ticket_id, error });
    });

    const response: SubmitTicketResponse = {
      ticket_id,
      status: 'processing',
      estimated_resolution: '5 minutes',
      agent_assigned: 'Triage Agent',
    };

    res.status(202).json(response);
  } catch (error) {
    logger.error('Error submitting ticket', error);
    res.status(500).json({ error: 'Failed to submit ticket' });
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
      return res.status(404).json({ error: 'Ticket not found' });
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
