import { logger } from '../../utils/logger';
import { SupportTicket, TicketStatus, PipelineTrace, PipelineTraceResponse } from '../../models/types';
import { elasticsearchClient, INDEXES } from '../../config/elasticsearch';

/**
 * TicketPersistence — all Elasticsearch read/write operations for the pipeline.
 * Extracted from TicketOrchestrator to keep the orchestrator focused on pipeline logic.
 */
export class TicketPersistence {

  async saveTicket(ticket_id: string, ticket: Partial<SupportTicket>): Promise<void> {
    try {
      await elasticsearchClient.index({
        index: INDEXES.SUPPORT_TICKETS,
        id: ticket_id,
        body: ticket,
        refresh: true,
      });
    } catch (error) {
      logger.error('Failed to save ticket', { ticket_id, error });
    }
  }

  async updateTicketStatus(ticket_id: string, status: TicketStatus): Promise<void> {
    try {
      await elasticsearchClient.update({
        index: INDEXES.SUPPORT_TICKETS,
        id: ticket_id,
        body: { doc: { status } },
        refresh: true,
      });
    } catch (error) {
      logger.warn('Failed to update ticket status', { ticket_id, status, error });
    }
  }

  async updateTicketFields(ticket_id: string, fields: Partial<SupportTicket>): Promise<void> {
    try {
      await elasticsearchClient.update({
        index: INDEXES.SUPPORT_TICKETS,
        id: ticket_id,
        body: { doc: fields },
        refresh: true,
      });
    } catch (error) {
      logger.warn('Failed to update ticket fields', { ticket_id, error });
    }
  }

  async logActivity(ticket_id: string, agent: string, action: string): Promise<void> {
    try {
      await elasticsearchClient.index({
        index: 'agent_activity',
        body: {
          ticket_id,
          agent,
          action,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      logger.warn('Failed to log activity', { ticket_id, agent, error });
    }
  }

  async saveTrace(trace: PipelineTrace): Promise<void> {
    try {
      const docId = `${trace.ticket_id}-${trace.agent}`;
      await elasticsearchClient.index({
        index: INDEXES.PIPELINE_TRACES,
        id: docId,
        body: trace,
        refresh: true,
      });
    } catch (error) {
      logger.warn('Failed to save pipeline trace', { ticket_id: trace.ticket_id, agent: trace.agent, error });
    }
  }

  async getTicketStatus(ticket_id: string): Promise<SupportTicket | null> {
    // Try direct get by _id first (tickets created by orchestrator)
    try {
      const response = await elasticsearchClient.get({
        index: INDEXES.SUPPORT_TICKETS,
        id: ticket_id,
      });

      if (response.found) {
        return response._source as SupportTicket;
      }
    } catch (error: any) {
      if (error.meta?.statusCode !== 404) {
        logger.error('Error retrieving ticket by id', { ticket_id, error });
      }
    }

    // Fallback: search by ticket_id field (seeded tickets)
    try {
      const searchResponse = await elasticsearchClient.search({
        index: INDEXES.SUPPORT_TICKETS,
        body: {
          query: { term: { ticket_id } },
          size: 1,
        },
      });

      const hits = (searchResponse as any).hits.hits;
      if (hits.length > 0) {
        return hits[0]._source as SupportTicket;
      }
      return null;
    } catch (error: any) {
      logger.error('Error searching ticket', { ticket_id, error });
      return null;
    }
  }

  async listTickets(filters: {
    status?: string;
    category?: string;
    limit: number;
    offset: number;
  }): Promise<SupportTicket[]> {
    try {
      const must: any[] = [];

      if (filters.status) {
        must.push({ term: { status: filters.status } });
      }
      if (filters.category) {
        must.push({ term: { category: filters.category } });
      }

      const query = must.length > 0
        ? { bool: { must } }
        : { match_all: {} };

      const response = await elasticsearchClient.search({
        index: INDEXES.SUPPORT_TICKETS,
        body: {
          query,
          sort: [{ created_at: { order: 'desc' } }],
          size: filters.limit,
          from: filters.offset,
        },
      });

      return response.hits.hits.map((hit: any) => ({
        ...hit._source,
        ticket_id: hit._source.ticket_id || hit._id,
      }));
    } catch (error) {
      logger.error('Error listing tickets', { error });
      return [];
    }
  }

  async getTicketTrace(ticket_id: string): Promise<PipelineTraceResponse> {
    const [ticket, traceResponse] = await Promise.all([
      this.getTicketStatus(ticket_id),
      elasticsearchClient.search({
        index: INDEXES.PIPELINE_TRACES,
        body: {
          query: { term: { ticket_id } },
          sort: [{ step_number: { order: 'asc' } }],
          size: 10,
        },
      }).catch(() => ({ hits: { hits: [] } })),
    ]);

    const traces: PipelineTrace[] = (traceResponse as any).hits.hits.map(
      (hit: any) => hit._source as PipelineTrace,
    );

    const completedTraces = traces.filter(t => t.status === 'completed');
    const hasRunning = traces.some(t => t.status === 'running');
    const hasFailed = traces.some(t => t.status === 'failed');

    let pipelineStatus: 'pending' | 'running' | 'completed' | 'failed';
    if (hasFailed) pipelineStatus = 'failed';
    else if (hasRunning) pipelineStatus = 'running';
    else if (completedTraces.length >= 6 || traces.some(t => t.status === 'skipped'))
      pipelineStatus = 'completed';
    else if (traces.length === 0) {
      const ticketStatus = ticket?.status;
      if (ticketStatus === 'resolved') pipelineStatus = 'completed';
      else if (ticketStatus === 'escalated') pipelineStatus = 'failed';
      else if (ticketStatus && ticketStatus !== 'new') pipelineStatus = 'running';
      else pipelineStatus = 'pending';
    }
    else pipelineStatus = 'running';

    return {
      ticket_id,
      ticket,
      traces,
      pipeline_status: pipelineStatus,
      total_duration_ms: completedTraces.reduce((sum, t) => sum + (t.duration_ms || 0), 0),
      total_tokens: completedTraces.reduce(
        (sum, t) => sum + (t.input_tokens || 0) + (t.output_tokens || 0), 0,
      ),
      total_llm_calls: completedTraces.reduce((sum, t) => sum + (t.llm_calls || 0), 0),
    };
  }
}
