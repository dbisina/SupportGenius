import { logger } from '../utils/logger';
import {
  TriageResult,
  ResearchResult,
  DecisionResult,
  ExecutionResult,
  QualityResult,
} from '../models/types';
import { agentBuilder } from '../services/agent-builder';
import { INDEXES } from '../config/elasticsearch';

/**
 * QualityAgent - Validates decisions and learns from outcomes
 *
 * Uses Agent Builder search tool to verify resolution quality and
 * the index_document tool to update the knowledge base with new
 * resolution patterns for continuous improvement.
 */
export class QualityAgent {
  async process(
    ticket_id: string,
    triageResult: TriageResult,
    researchResult: ResearchResult,
    decisionResult: DecisionResult,
    executionResult: ExecutionResult
  ): Promise<QualityResult> {
    logger.info('QualityAgent processing', { ticket_id });

    try {
      // Step 1: Validate execution success
      const validationPassed = this.validateExecution(executionResult);

      // Step 2: Check decision quality against similar resolved tickets
      const qualityScore = await this.assessDecisionQuality(
        triageResult,
        researchResult,
        decisionResult,
        executionResult
      );

      // Step 3: Generate feedback
      const feedback = this.generateFeedback(
        triageResult,
        researchResult,
        decisionResult,
        executionResult,
        qualityScore
      );

      // Step 4: Identify improvements
      const improvements = this.identifyImprovements(
        triageResult,
        researchResult,
        decisionResult,
        executionResult
      );

      // Step 5: Update knowledge base with this resolution for future learning
      await this.updateKnowledgeBase(ticket_id, {
        triageResult,
        researchResult,
        decisionResult,
        executionResult,
        qualityScore,
      });

      // Step 6: Update the resolution action success rate
      await this.updateActionSuccessRate(decisionResult.action_type, executionResult.success);

      const overallConfidence = this.calculateOverallConfidence(
        triageResult,
        researchResult,
        decisionResult,
        executionResult,
        qualityScore
      );

      const result: QualityResult = {
        agent_name: 'QualityAgent',
        confidence: overallConfidence,
        decision: validationPassed
          ? `Resolution validated (quality score: ${qualityScore.toFixed(2)})`
          : 'Resolution requires review',
        validation_passed: validationPassed,
        feedback,
        improvements,
        data: { quality_score: qualityScore },
        timestamp: new Date(),
      };

      logger.info('QualityAgent completed', {
        ticket_id,
        validation_passed: validationPassed,
        quality_score: qualityScore,
        confidence: overallConfidence,
      });

      return result;
    } catch (error) {
      logger.error('QualityAgent failed', { ticket_id, error });
      throw error;
    }
  }

  private validateExecution(executionResult: ExecutionResult): boolean {
    if (!executionResult.success) return false;
    if (!executionResult.execution_details) return false;
    if (executionResult.confidence < 0.5) return false;
    return true;
  }

  private async assessDecisionQuality(
    triageResult: TriageResult,
    researchResult: ResearchResult,
    decisionResult: DecisionResult,
    executionResult: ExecutionResult
  ): Promise<number> {
    try {
      const result = await agentBuilder.esqlTool(`
        FROM ${INDEXES.SUPPORT_TICKETS}
        | WHERE category == "${triageResult.category}" AND status == "resolved" AND automated == true
        | STATS
            total = COUNT(*),
            avg_confidence = AVG(agent_confidence),
            avg_resolution_time = AVG(resolution_time_minutes)
        | LIMIT 1
      `);

      if (result.values.length > 0) {
        const [, avgConfidence] = result.values[0];
        let score = 0.5;
        if (executionResult.success) score += 0.2;
        if (decisionResult.confidence >= (avgConfidence || 0.8)) score += 0.15;
        if (researchResult.similar_tickets.length > 0) score += 0.1;
        if (researchResult.customer_profile) score += 0.05;
        return Math.min(score, 1.0);
      }
    } catch (error) {
      logger.warn('Quality assessment ES|QL failed', { error });
    }

    let score = 0.6;
    if (executionResult.success) score += 0.2;
    if (decisionResult.confidence > 0.8) score += 0.1;
    if (researchResult.similar_tickets.length > 0) score += 0.1;
    return Math.min(score, 1.0);
  }

  private generateFeedback(
    triageResult: TriageResult,
    researchResult: ResearchResult,
    decisionResult: DecisionResult,
    executionResult: ExecutionResult,
    qualityScore: number
  ): string {
    const parts: string[] = [];

    if (!executionResult.success) {
      parts.push('Execution failed - requires manual intervention.');
    } else {
      parts.push(`Resolution completed via ${decisionResult.action_type}.`);
    }

    if (qualityScore >= 0.9) {
      parts.push('High confidence resolution matching historical patterns.');
    } else if (qualityScore >= 0.7) {
      parts.push('Acceptable resolution quality.');
    } else {
      parts.push('Low quality score - consider manual review.');
    }

    if (researchResult.similar_tickets.length > 0) {
      parts.push(`Based on ${researchResult.similar_tickets.length} similar past tickets.`);
    }

    if (triageResult.data?.sentiment === 'angry') {
      parts.push('Customer sentiment was negative - follow-up recommended.');
    }

    return parts.join(' ');
  }

  private identifyImprovements(
    triageResult: TriageResult,
    researchResult: ResearchResult,
    decisionResult: DecisionResult,
    executionResult: ExecutionResult
  ): string[] {
    const improvements: string[] = [];

    if (triageResult.confidence < 0.8) {
      improvements.push('Triage confidence below 80% - consider expanding categorization training data');
    }

    if (researchResult.similar_tickets.length === 0) {
      improvements.push('No similar tickets found - expanding search parameters may improve results');
    }

    if (researchResult.relevant_articles.length === 0) {
      improvements.push('No knowledge base articles matched - consider adding articles for this category');
    }

    if (decisionResult.confidence < 0.8) {
      improvements.push('Decision confidence below 80% - more historical data would help');
    }

    if (!executionResult.success) {
      improvements.push(`Execution failed for ${decisionResult.action_type} - review workflow configuration`);
    }

    return improvements;
  }

  private async updateKnowledgeBase(
    ticket_id: string,
    data: {
      triageResult: TriageResult;
      researchResult: ResearchResult;
      decisionResult: DecisionResult;
      executionResult: ExecutionResult;
      qualityScore: number;
    }
  ): Promise<void> {
    const { triageResult, researchResult, decisionResult, executionResult, qualityScore } = data;

    // Quality gate: skip writes for low-quality resolutions to prevent bias amplification
    if (qualityScore < 0.7) {
      logger.warn('Knowledge base write skipped: quality score below threshold', {
        ticket_id,
        qualityScore,
      });
      return;
    }

    // Deduplication: skip if a similar resolution for the same category was already
    // written within the last 24 hours to avoid flooding the KB with duplicates
    try {
      const dedupeResult = await agentBuilder.esqlTool(`
        FROM ${INDEXES.SUPPORT_TICKETS}
        | WHERE category == "${triageResult.category}" AND automated == true AND resolved_at >= NOW() - 1 days
        | STATS count = COUNT(*) BY category
        | LIMIT 1
      `);

      if (dedupeResult.values.length > 0 && dedupeResult.values[0][0] > 0) {
        logger.warn('Knowledge base write skipped: similar resolution exists', {
          ticket_id,
          category: triageResult.category,
          action_type: decisionResult.action_type,
        });
        return;
      }
    } catch (error) {
      // If the deduplication check fails, proceed with the write rather than
      // silently dropping a valid high-quality resolution
      logger.warn('Deduplication check failed, proceeding with knowledge base write', {
        ticket_id,
        error,
      });
    }

    try {
      await agentBuilder.indexDocumentTool({
        index: INDEXES.SUPPORT_TICKETS,
        id: ticket_id,
        document: {
          ticket_id,
          customer_id: triageResult.extracted_entities.customer_id || 'unknown',
          order_id: triageResult.extracted_entities.order_id,
          subject: triageResult.decision,
          description: `Auto-resolved: ${decisionResult.decision}`,
          category: triageResult.category,
          priority: triageResult.priority,
          status: executionResult.success ? 'resolved' : 'escalated',
          resolution: decisionResult.decision,
          resolution_time_minutes: Math.floor(
            (new Date().getTime() - triageResult.timestamp.getTime()) / 60000
          ),
          automated: true,
          agent_confidence: qualityScore,
          kb_write_confidence: qualityScore,
          created_at: triageResult.timestamp,
          resolved_at: new Date(),
          metadata: {
            triage_confidence: triageResult.confidence,
            research_confidence: researchResult.confidence,
            decision_confidence: decisionResult.confidence,
            execution_confidence: executionResult.confidence,
            quality_score: qualityScore,
            action_type: decisionResult.action_type,
            similar_tickets_found: researchResult.similar_tickets.length,
            articles_found: researchResult.relevant_articles.length,
          },
        },
      });

      logger.info('Knowledge base updated with resolution', { ticket_id });
    } catch (error) {
      logger.warn('Failed to update knowledge base', { ticket_id, error });
    }
  }

  private async updateActionSuccessRate(actionType: string, success: boolean): Promise<void> {
    try {
      const actions = await agentBuilder.searchTool({
        index: INDEXES.RESOLUTION_ACTIONS,
        query: { term: { action_type: actionType } },
        size: 1,
      });

      if (actions.length > 0) {
        const action = actions[0];
        const currentRate = action.success_rate || 0.85;
        const totalExecutions = (action.total_executions || 0) + 1;
        const newRate = success
          ? currentRate + (1 - currentRate) * (1 / totalExecutions)
          : currentRate - currentRate * (1 / totalExecutions);

        await agentBuilder.indexDocumentTool({
          index: INDEXES.RESOLUTION_ACTIONS,
          id: action._id,
          document: {
            ...action,
            success_rate: Math.max(0, Math.min(1, newRate)),
            total_executions: totalExecutions,
            updated_at: new Date(),
          },
        });
      }
    } catch (error) {
      logger.warn('Failed to update action success rate', { actionType, error });
    }
  }

  private calculateOverallConfidence(
    triageResult: TriageResult,
    researchResult: ResearchResult,
    decisionResult: DecisionResult,
    executionResult: ExecutionResult,
    qualityScore: number
  ): number {
    const weights = {
      triage: 0.15,
      research: 0.2,
      decision: 0.25,
      execution: 0.25,
      quality: 0.15,
    };

    return (
      triageResult.confidence * weights.triage +
      researchResult.confidence * weights.research +
      decisionResult.confidence * weights.decision +
      executionResult.confidence * weights.execution +
      qualityScore * weights.quality
    );
  }
}
