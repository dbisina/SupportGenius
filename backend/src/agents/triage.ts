import { logger } from '../utils/logger';
import { SubmitTicketRequest, TriageResult, TicketCategory, TicketPriority } from '../models/types';

/**
 * TriageAgent - Legacy standalone agent (unused).
 * LLM-powered triage is now handled by Agent Builder.
 * Retained as a rule-based fallback.
 */
export class TriageAgent {
  async process(ticket_id: string, request: SubmitTicketRequest): Promise<TriageResult> {
    logger.info('TriageAgent processing', { ticket_id });

    // Legacy standalone agent — LLM calls now handled by Agent Builder.
    // Falls back to rule-based triage.
    return this.fallbackTriage(ticket_id, request);
  }

  /**
   * Rule-based fallback if LLM is unavailable
   */
  private fallbackTriage(ticket_id: string, request: SubmitTicketRequest): TriageResult {
    logger.warn('Using fallback rule-based triage', { ticket_id });

    const text = `${request.subject} ${request.description}`.toLowerCase();

    let category: TicketCategory = 'other';
    if (text.includes('refund') || text.includes('money back')) category = 'refund';
    else if (text.includes('shipping') || text.includes('delivery') || text.includes('tracking'))
      category = 'shipping';
    else if (text.includes('defect') || text.includes('broken') || text.includes('damaged'))
      category = 'product_issue';
    else if (text.includes('account') || text.includes('login') || text.includes('password'))
      category = 'account';

    let priority: TicketPriority = 'medium';
    if (text.includes('urgent') || text.includes('asap')) priority = 'urgent';
    else if (text.includes('important')) priority = 'high';

    return {
      agent_name: 'TriageAgent',
      confidence: 0.6, // Lower confidence for fallback
      decision: `Rule-based triage: ${category} (fallback mode)`,
      category,
      priority,
      extracted_entities: { order_id: request.order_id },
      next_agent: 'ResearchAgent',
      timestamp: new Date(),
    };
  }
}
