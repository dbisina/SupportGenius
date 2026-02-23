import { ConverseResponse } from '../agent-builder';
import { PipelineTrace, AgentName } from '../../models/types';

/**
 * Pure trace-builder functions extracted from TicketOrchestrator.
 * These have no side effects and no class dependencies.
 */

export function extractTrace(
  ticketId: string,
  agent: AgentName,
  stepNumber: number,
  response: ConverseResponse,
  parsedResult: any,
  stepStartTime: number,
): PipelineTrace {
  const reasoning = (response.steps || [])
    .filter(s => s.type === 'reasoning' && s.reasoning)
    .map(s => s.reasoning!);

  const toolCalls = (response.steps || [])
    .filter(s => s.type === 'tool_call')
    .map(s => ({
      tool_id: s.tool_id || 'unknown',
      params: s.params || {},
      results: s.results || [],
    }));

  const now = Date.now();
  return {
    ticket_id: ticketId,
    agent,
    step_number: stepNumber,
    status: 'completed',
    started_at: new Date(stepStartTime),
    completed_at: new Date(now),
    duration_ms: now - stepStartTime,
    reasoning,
    tool_calls: toolCalls,
    llm_calls: response.model_usage?.llm_calls || 0,
    input_tokens: response.model_usage?.input_tokens || 0,
    output_tokens: response.model_usage?.output_tokens || 0,
    model: response.model_usage?.model || 'unknown',
    result: parsedResult,
    confidence: parsedResult?.confidence ?? parsedResult?.quality_score ?? 0,
    raw_response: response.response.message,
  };
}

export function makeRunningTrace(
  ticketId: string,
  agent: AgentName,
  stepNumber: number,
  startTime: number,
): PipelineTrace {
  return {
    ticket_id: ticketId,
    agent,
    step_number: stepNumber,
    status: 'running',
    started_at: new Date(startTime),
    reasoning: [],
    tool_calls: [],
    llm_calls: 0,
    input_tokens: 0,
    output_tokens: 0,
    model: '',
    result: null,
    confidence: 0,
    raw_response: '',
  };
}

export function makeSkippedTrace(
  ticketId: string,
  agent: AgentName,
  stepNumber: number,
  reason: string,
): PipelineTrace {
  return {
    ticket_id: ticketId,
    agent,
    step_number: stepNumber,
    status: 'skipped',
    started_at: new Date(),
    reasoning: [reason],
    tool_calls: [],
    llm_calls: 0,
    input_tokens: 0,
    output_tokens: 0,
    model: '',
    result: null,
    confidence: 0,
    raw_response: '',
  };
}
