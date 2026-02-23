import { logger } from '../utils/logger';
import { DecisionResult, ExecutionResult } from '../models/types';
import { agentBuilder } from '../services/agent-builder';

/**
 * ExecutionAgent - Performs actions via Elastic Workflows
 *
 * Uses the Agent Builder workflow tool to execute multi-step workflows
 * including refunds, shipping labels, exchanges, and notifications.
 * Each workflow is validated, executed, and logged to Elasticsearch.
 */
export class ExecutionAgent {
  async process(ticket_id: string, decisionResult: DecisionResult): Promise<ExecutionResult> {
    logger.info('ExecutionAgent processing', { ticket_id, action: decisionResult.action_type });

    try {
      // Build workflow parameters from the decision
      const workflowParams = this.buildWorkflowParams(decisionResult);

      // Execute via Agent Builder workflow tool
      const workflowResult = await agentBuilder.workflowTool({
        workflow_type: decisionResult.action_type,
        ticket_id,
        parameters: workflowParams,
      });

      logger.info('ExecutionAgent workflow completed', {
        ticket_id,
        workflow_id: workflowResult.workflow_id,
        success: workflowResult.success,
        steps: workflowResult.steps_completed,
      });

      // Send customer notification if the primary action succeeded
      if (workflowResult.success && decisionResult.action_type !== 'email_notification') {
        await this.sendCustomerNotification(ticket_id, decisionResult, workflowResult);
      }

      const result: ExecutionResult = {
        agent_name: 'ExecutionAgent',
        confidence: workflowResult.success ? 0.95 : 0.3,
        decision: workflowResult.success
          ? `Workflow ${workflowResult.workflow_id} completed: ${decisionResult.action_type}`
          : `Workflow failed: ${workflowResult.results.error || 'Unknown error'}`,
        action_executed: decisionResult.action_type,
        execution_details: {
          workflow_id: workflowResult.workflow_id,
          steps_completed: workflowResult.steps_completed,
          ...workflowResult.results,
        },
        success: workflowResult.success,
        next_agent: 'QualityAgent',
        timestamp: new Date(),
      };

      return result;
    } catch (error) {
      logger.error('ExecutionAgent failed', { ticket_id, error });

      return {
        agent_name: 'ExecutionAgent',
        confidence: 0,
        decision: 'Execution failed',
        action_executed: decisionResult.action_type,
        execution_details: null,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Build workflow parameters from the decision result
   */
  private buildWorkflowParams(decision: DecisionResult): Record<string, any> {
    const params: Record<string, any> = {
      action_type: decision.action_type,
      confidence: decision.confidence,
      reasoning: decision.decision,
    };

    switch (decision.action_type) {
      case 'refund':
        params.amount = decision.calculated_amount || 0;
        break;
      case 'exchange':
        params.product_id = decision.data?.product_id;
        break;
      case 'shipping_label':
        params.order_id = decision.data?.order_id;
        break;
      case 'email_notification':
        params.template = 'resolution_update';
        params.customer_email = decision.data?.customer_email;
        break;
      case 'account_update':
        params.field = decision.data?.field || 'general';
        break;
      case 'escalate':
        params.priority = decision.data?.escalation_priority || 'high';
        params.reason = decision.escalation_reason;
        break;
    }

    return params;
  }

  /**
   * Send a follow-up notification to the customer about the resolution
   */
  private async sendCustomerNotification(
    ticket_id: string,
    decision: DecisionResult,
    workflowResult: any
  ): Promise<void> {
    try {
      await agentBuilder.workflowTool({
        workflow_type: 'email_notification',
        ticket_id,
        parameters: {
          template: `${decision.action_type}_confirmation`,
          customer_email: decision.data?.customer_email,
          details: workflowResult.results.execution,
        },
      });
      logger.info('Customer notification sent', { ticket_id });
    } catch (error) {
      // Notification failure shouldn't fail the main workflow
      logger.warn('Failed to send customer notification', { ticket_id, error });
    }
  }
}
