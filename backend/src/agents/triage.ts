import { logger } from '../utils/logger';
import { SubmitTicketRequest, TriageResult, TicketCategory, TicketPriority } from '../models/types';

/**
 * TriageAgent - Categorizes tickets and extracts key entities
 * Uses Elasticsearch Search API
 */
export class TriageAgent {
  async process(ticket_id: string, request: SubmitTicketRequest): Promise<TriageResult> {
    logger.info('TriageAgent processing', { ticket_id });

    try {
      // TODO: Implement AI-powered triage logic
      // - Use LLM to categorize ticket
      // - Extract entities (customer_id, order_id, product_id)
      // - Assign priority based on sentiment and urgency

      const result: TriageResult = {
        agent_name: 'TriageAgent',
        confidence: 0.9,
        decision: 'Ticket categorized and entities extracted',
        category: this.categorizeTicket(request),
        priority: this.assignPriority(request),
        extracted_entities: this.extractEntities(request),
        next_agent: 'ResearchAgent',
        timestamp: new Date(),
      };

      return result;
    } catch (error) {
      logger.error('TriageAgent failed', { ticket_id, error });
      throw error;
    }
  }

  private categorizeTicket(request: SubmitTicketRequest): TicketCategory {
    // Simple keyword-based categorization (will be replaced with AI)
    const text = `${request.subject} ${request.description}`.toLowerCase();

    if (text.includes('refund') || text.includes('money back')) return 'refund';
    if (text.includes('shipping') || text.includes('delivery') || text.includes('tracking'))
      return 'shipping';
    if (text.includes('defect') || text.includes('broken') || text.includes('damaged'))
      return 'product_issue';
    if (text.includes('account') || text.includes('login') || text.includes('password'))
      return 'account';

    return 'other';
  }

  private assignPriority(request: SubmitTicketRequest): TicketPriority {
    const text = `${request.subject} ${request.description}`.toLowerCase();

    if (text.includes('urgent') || text.includes('asap') || text.includes('immediately'))
      return 'urgent';
    if (text.includes('important') || text.includes('soon')) return 'high';

    return 'medium';
  }

  private extractEntities(request: SubmitTicketRequest): {
    customer_id?: string;
    order_id?: string;
    product_id?: string;
  } {
    // TODO: Implement entity extraction using NER or LLM
    return {
      order_id: request.order_id,
    };
  }
}
