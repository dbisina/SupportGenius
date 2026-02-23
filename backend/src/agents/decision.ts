import { logger } from '../utils/logger';
import { TriageResult, ResearchResult, DecisionResult, ActionType } from '../models/types';

/**
 * DecisionAgent - Legacy standalone agent (unused).
 * LLM-powered decisions are now handled by Agent Builder.
 * Retained as a rule-based fallback.
 */
export class DecisionAgent {
  async process(
    ticket_id: string,
    triageResult: TriageResult,
    researchResult: ResearchResult
  ): Promise<DecisionResult> {
    // Legacy standalone agent — LLM calls now handled by Agent Builder.
    // Falls back to rule-based decision.
    return this.fallbackDecision(ticket_id, triageResult, researchResult);
  }

  /**
   * Rule-based fallback if LLM is unavailable
   */
  private fallbackDecision(
    ticket_id: string,
    triageResult: TriageResult,
    researchResult: ResearchResult
  ): DecisionResult {
    logger.warn('Using fallback rule-based decision', { ticket_id });

    if (researchResult.customer_profile?.vip_status) {
      return {
        agent_name: 'DecisionAgent',
        confidence: 0.7,
        decision: 'VIP customer escalated to human agent (fallback mode)',
        resolution_path: 'escalated',
        action_type: 'escalate',
        should_escalate: true,
        escalation_reason: 'VIP customer requires human attention',
        timestamp: new Date(),
      };
    }

    const categoryToAction: Record<string, ActionType> = {
      refund: 'refund',
      shipping: 'shipping_label',
      product_issue: 'exchange',
      account: 'account_update',
      other: 'escalate',
    };

    const actionType = categoryToAction[triageResult.category] || 'escalate';

    return {
      agent_name: 'DecisionAgent',
      confidence: 0.6,
      decision: `Rule-based: ${actionType} for ${triageResult.category} (fallback mode)`,
      resolution_path: actionType === 'escalate' ? 'escalated' : 'automated',
      action_type: actionType,
      should_escalate: actionType === 'escalate',
      calculated_amount: actionType === 'refund' ? 50.0 : undefined,
      timestamp: new Date(),
    };
  }
}
