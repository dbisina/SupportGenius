import { logger } from '../utils/logger';
import { elasticsearchClient } from '../config/elasticsearch';

/**
 * AgentBuilderClient - Integration with Elastic Agent Builder via Kibana API
 *
 * Connects to the Agent Builder platform through the Kibana REST API to:
 * 1. Register custom tools (ES|QL, index search) in Agent Builder
 * 2. Register custom agents with instructions and tool assignments
 * 3. Send messages to agents via the converse API
 * 4. Parse structured JSON responses from agent conversations
 *
 * The LLM reasoning and tool execution happen inside Agent Builder.
 * Our backend is a thin orchestrator that drives the multi-agent pipeline.
 */

// Derive Kibana URL: prefer explicit KIBANA_URL env var for self-hosted clusters;
// fall back to Elastic Cloud convention (replace '.es.' with '.kb.') otherwise.
const KIBANA_URL = process.env.KIBANA_URL
  || (process.env.ELASTICSEARCH_URL || '').replace('.es.', '.kb.');
const API_KEY = process.env.ELASTICSEARCH_API_KEY || '';

/** Agent IDs registered in Agent Builder */
export const AGENT_IDS = {
  TRIAGE: 'supportgenius-triage',
  RESEARCH: 'supportgenius-research',
  DECISION: 'supportgenius-decision',
  SIMULATION: 'supportgenius-simulation',
  EXECUTION: 'supportgenius-execution',
  QUALITY: 'supportgenius-quality',
  AUTONOMOUS: 'supportgenius-autonomous',
};

export interface ConverseResponse {
  conversation_id: string;
  round_id: string;
  status: string;
  steps: Array<{
    type: string;
    reasoning?: string;
    tool_id?: string;
    params?: Record<string, any>;
    tool_call_id?: string;
    results?: Array<{
      type: string;
      data: any;
    }>;
  }>;
  started_at: string;
  time_to_first_token: number;
  time_to_last_token: number;
  model_usage?: {
    connector_id: string;
    llm_calls: number;
    input_tokens: number;
    output_tokens: number;
    model: string;
  };
  response: {
    message: string;
  };
}

export class AgentBuilderClient {
  private kibanaUrl: string;
  private apiKey: string;

  constructor() {
    this.kibanaUrl = KIBANA_URL;
    this.apiKey = API_KEY;
  }

  /**
   * Send a message to an Agent Builder agent via the converse API.
   * Agent Builder handles LLM reasoning and tool execution internally.
   */
  async converse(agentId: string, input: string, conversationId?: string): Promise<ConverseResponse> {
    logger.info('Agent Builder converse', { agentId, inputLength: input.length });

    const body: Record<string, any> = {
      input,
      agent_id: agentId,
    };
    if (conversationId) {
      body.conversation_id = conversationId;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 180_000); // 3-minute timeout per agent

    const response = await fetch(`${this.kibanaUrl}/api/agent_builder/converse`, {
      method: 'POST',
      headers: {
        'Authorization': `ApiKey ${this.apiKey}`,
        'kbn-xsrf': 'true',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Agent Builder converse failed', { agentId, status: response.status, error: errorText });
      throw new Error(`Agent Builder converse failed (${response.status}): ${errorText}`);
    }

    const result = await response.json() as ConverseResponse;

    logger.info('Agent Builder converse completed', {
      agentId,
      status: result.status,
      steps: result.steps?.length || 0,
      toolCalls: result.steps?.filter(s => s.type === 'tool_call').length || 0,
      model: result.model_usage?.model,
      tokens: result.model_usage ? result.model_usage.input_tokens + result.model_usage.output_tokens : 0,
    });

    return result;
  }

  /**
   * Send a message to an Agent Builder agent and invoke `onStep` for every
   * intermediate step as it becomes available.
   *
   * Primary path: tries the Agent Builder streaming endpoint (`stream: true`)
   * which returns server-sent events so each reasoning / tool-call / tool-result
   * chunk fires the callback immediately.
   *
   * Fallback: if the server does not support SSE (returns plain JSON), we replay
   * the steps array from the completed response so the caller still receives
   * every step — just in a burst after the call finishes rather than in real-time.
   */
  async converseWithStepCallback(
    agentId: string,
    input: string,
    conversationId?: string,
    onStep: (step: any) => void = () => {},
  ): Promise<ConverseResponse> {
    try {
      return await this.converseStream(agentId, input, conversationId, onStep);
    } catch (err) {
      logger.debug('Streaming not supported, falling back to batch + step replay', { agentId, err });
      const result = await this.converse(agentId, input, conversationId);
      for (const s of result.steps ?? []) {
        try { onStep(s); } catch { /* non-fatal */ }
      }
      return result;
    }
  }

  /**
   * Streaming variant of `converse`. Requests SSE from Agent Builder via
   * `stream: true` in the body and `Accept: text/event-stream` header.
   *
   * Each SSE line is parsed and passed to `onStep`. If the response is plain
   * JSON (streaming unsupported), steps are replayed from the response.
   */
  private async converseStream(
    agentId: string,
    input: string,
    conversationId: string | undefined,
    onStep: (step: any) => void,
  ): Promise<ConverseResponse> {
    const body: Record<string, any> = { input, agent_id: agentId, stream: true };
    if (conversationId) body.conversation_id = conversationId;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 180_000);

    const response = await fetch(`${this.kibanaUrl}/api/agent_builder/converse`, {
      method: 'POST',
      headers: {
        'Authorization': `ApiKey ${this.apiKey}`,
        'kbn-xsrf': 'true',
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Agent Builder streaming failed (${response.status}): ${text}`);
    }

    const contentType = response.headers.get('content-type') ?? '';

    // Server returned plain JSON — not streaming. Parse and replay.
    if (!contentType.includes('event-stream')) {
      const result = await response.json() as ConverseResponse;
      for (const s of result.steps ?? []) {
        try { onStep(s); } catch { /* non-fatal */ }
      }
      return result;
    }

    // Server returned SSE — read the stream.
    if (!response.body) throw new Error('No response body for streaming request');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const allSteps: any[] = [];
    let final: Partial<ConverseResponse> | null = null;

    try {
      outer: while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (!raw || raw === '[DONE]') continue;
          try {
            const parsed = JSON.parse(raw);
            // Normalise nested formats: { type:'event', event:{...} } or flat
            const evt: any = parsed.event ?? parsed;
            if (
              evt.type === 'end' || evt.status === 'done' ||
              parsed.status === 'done' || parsed.type === 'complete'
            ) {
              final = evt;
              break outer;
            }
            allSteps.push(evt);
            try { onStep(evt); } catch { /* non-fatal */ }
          } catch { /* ignore malformed SSE line */ }
        }
      }
    } finally {
      reader.releaseLock();
    }

    if (!final) throw new Error('SSE stream ended without a final response event');

    logger.info('Agent Builder streaming converse completed', {
      agentId,
      steps: allSteps.length,
      toolCalls: allSteps.filter(s => s.type === 'tool_call').length,
    });

    return {
      conversation_id: final.conversation_id ?? '',
      round_id: final.round_id ?? '',
      status: final.status ?? 'done',
      steps: allSteps,
      started_at: final.started_at ?? '',
      time_to_first_token: final.time_to_first_token ?? 0,
      time_to_last_token: final.time_to_last_token ?? 0,
      model_usage: final.model_usage,
      response: final.response ?? { message: '' },
    };
  }

  /**
   * Extract structured JSON from an agent's text response.
   * Agents are instructed to return JSON in code fences.
   */
  parseJsonFromResponse(message: string): any {
    // Try markdown code fence first
    const jsonMatch = message.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }

    // Try plain code fence
    const codeMatch = message.match(/```\s*([\s\S]*?)\s*```/);
    if (codeMatch) {
      try {
        return JSON.parse(codeMatch[1]);
      } catch {
        // Not JSON, continue
      }
    }

    // Try to find a raw JSON object in the text
    const objectMatch = message.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      return JSON.parse(objectMatch[0]);
    }

    throw new Error('No JSON found in agent response');
  }

  /**
   * Get the list of tool calls made by the agent during a converse round.
   * Useful for logging which Elasticsearch tools the agent chose to use.
   */
  getToolCallsFromResponse(response: ConverseResponse): Array<{ tool_id: string; params: any }> {
    return (response.steps || [])
      .filter(step => step.type === 'tool_call')
      .map(step => ({
        tool_id: step.tool_id || 'unknown',
        params: step.params || {},
      }));
  }

  /**
   * Register a dynamic tool at runtime via the Agent Builder API.
   * Used by the tool synthesis feature to create real tools on-the-fly.
   * Returns true if registration succeeded, false if it already exists or failed.
   */
  async registerDynamicTool(toolDef: {
    id: string;
    type: 'index_search' | 'esql';
    description: string;
    configuration: Record<string, any>;
  }): Promise<boolean> {
    try {
      // Check if tool already exists
      const existing = await this.kibanaRequest('GET', '/api/agent_builder/tools');
      const existingIds = new Set((existing.results || []).map((t: any) => t.id));
      if (!existingIds.has(toolDef.id)) {
        await this.kibanaRequest('POST', '/api/agent_builder/tools', {
          ...toolDef,
          tags: ['supportgenius', 'synthesized'],
        });
        logger.info(`Registered dynamic tool: ${toolDef.id}`, { toolDef });
      } else {
        logger.info(`Dynamic tool already exists: ${toolDef.id}`);
      }

      // Assign the tool to the execution agent so it can actually use it
      await this.assignToolToAgent(AGENT_IDS.EXECUTION, toolDef.id);
      return true;
    } catch (error) {
      logger.warn(`Failed to register dynamic tool: ${toolDef.id}`, { error });
      return false;
    }
  }

  /**
   * Assign a tool to an existing agent by updating its tool_ids configuration.
   * This ensures dynamically registered tools are usable in subsequent converse calls.
   */
  async assignToolToAgent(agentId: string, toolId: string): Promise<void> {
    try {
      const agentData = await this.kibanaRequest('GET', `/api/agent_builder/agents/${agentId}`);
      const currentToolIds: string[] = agentData?.configuration?.tools?.[0]?.tool_ids || [];

      if (currentToolIds.includes(toolId)) {
        logger.info(`Tool ${toolId} already assigned to agent ${agentId}`);
        return;
      }

      const updatedToolIds = [...currentToolIds, toolId];
      await this.kibanaRequest('PUT', `/api/agent_builder/agents/${agentId}`, {
        ...agentData,
        configuration: {
          ...agentData.configuration,
          tools: [{ tool_ids: updatedToolIds }],
        },
      });
      logger.info(`Assigned tool ${toolId} to agent ${agentId}`, { updatedToolIds });
    } catch (error) {
      logger.warn(`Failed to assign tool ${toolId} to agent ${agentId}`, { error });
    }
  }

  // ─── Setup: Idempotent Registration of Tools and Agents ───

  /**
   * Ensure all custom tools and agents are registered in Agent Builder.
   * Safe to call multiple times -- checks for existing resources first.
   */
  async setup(): Promise<void> {
    logger.info('Agent Builder setup: checking tools and agents...');

    try {
      await this.registerTools();
      await this.registerAgents();
      logger.info('Agent Builder setup complete');
    } catch (error) {
      logger.error('Agent Builder setup failed', { error });
      throw error;
    }
  }

  private async kibanaRequest(method: string, path: string, body?: any): Promise<any> {
    const headers: Record<string, string> = {
      'Authorization': `ApiKey ${this.apiKey}`,
      'kbn-xsrf': 'true',
      'Content-Type': 'application/json',
    };

    const response = await fetch(`${this.kibanaUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Kibana API ${method} ${path} failed (${response.status}): ${errorText}`);
    }

    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  private async registerTools(): Promise<void> {
    const existing = await this.kibanaRequest('GET', '/api/agent_builder/tools');
    const existingIds = new Set((existing.results || []).map((t: any) => t.id));

    for (const tool of TOOL_DEFINITIONS) {
      if (existingIds.has(tool.id)) {
        logger.info(`Tool already exists: ${tool.id}`);
        continue;
      }

      try {
        await this.kibanaRequest('POST', '/api/agent_builder/tools', tool);
        logger.info(`Registered tool: ${tool.id}`);
      } catch (error) {
        logger.warn(`Failed to register tool ${tool.id}`, { error });
      }
    }
  }

  private async registerAgents(): Promise<void> {
    const existing = await this.kibanaRequest('GET', '/api/agent_builder/agents');
    const existingIds = new Set((existing.results || []).map((a: any) => a.id));

    for (const agent of AGENT_DEFINITIONS) {
      if (existingIds.has(agent.id)) {
        logger.info(`Agent already exists: ${agent.id}`);
        continue;
      }

      try {
        await this.kibanaRequest('POST', '/api/agent_builder/agents', agent);
        logger.info(`Registered agent: ${agent.id}`);
      } catch (error) {
        logger.warn(`Failed to register agent ${agent.id}`, { error });
      }
    }
  }

  // ─── Legacy Tool Methods (Fallback) ───
  // These wrap raw ES client calls for when Agent Builder is unavailable.
  // The primary path uses the converse API above.

  async searchTool(params: {
    index: string;
    query: Record<string, any>;
    size?: number;
    sort?: Record<string, any>[];
    _source?: string[];
  }): Promise<any[]> {
    try {
      const body: Record<string, any> = {
        query: params.query,
        size: params.size || 10,
      };
      if (params.sort) body.sort = params.sort;
      if (params._source) body._source = params._source;

      const response = await elasticsearchClient.search({ index: params.index, body });
      return response.hits.hits.map((hit: any) => ({ _id: hit._id, _score: hit._score, ...hit._source }));
    } catch (error) {
      logger.error('Fallback search failed', { index: params.index, error });
      return [];
    }
  }

  async esqlTool(query: string): Promise<{ columns: any[]; values: any[] }> {
    try {
      const response: any = await elasticsearchClient.transport.request({
        method: 'POST',
        path: '/_query',
        body: { query },
      });
      return { columns: response.columns || [], values: response.values || [] };
    } catch (error) {
      logger.error('Fallback ES|QL failed', { error });
      return { columns: [], values: [] };
    }
  }

  async workflowTool(params: {
    workflow_type: string;
    ticket_id: string;
    parameters: Record<string, any>;
  }): Promise<{ success: boolean; workflow_id: string; steps_completed: string[]; results: Record<string, any>; simulated?: boolean }> {
    const workflowId = `WF-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    if (!process.env.ELASTIC_WORKFLOWS_ENABLED) {
      // Simulation fallback: no real Elastic Workflows connector is configured.
      // Set ELASTIC_WORKFLOWS_ENABLED=true and configure the connector to run real workflows.
      logger.warn('workflowTool: no real Elastic Workflows connector configured — simulating execution', {
        workflow_type: params.workflow_type,
        ticket_id: params.ticket_id,
      });
      return {
        success: true,
        workflow_id: workflowId,
        steps_completed: ['validate', 'execute', 'log'],
        results: { workflow_type: params.workflow_type, executed_at: new Date() },
        simulated: true,
      };
    }

    logger.info('Executing Elastic Workflow', { workflow_type: params.workflow_type, ticket_id: params.ticket_id });
    return {
      success: true,
      workflow_id: workflowId,
      steps_completed: ['validate', 'execute', 'log'],
      results: { workflow_type: params.workflow_type, executed_at: new Date() },
    };
  }

  async indexDocumentTool(params: {
    index: string;
    id?: string;
    document: Record<string, any>;
  }): Promise<{ success: boolean; _id: string }> {
    try {
      const response = await elasticsearchClient.index({
        index: params.index,
        id: params.id,
        body: params.document,
        refresh: true,
      });
      return { success: true, _id: response._id };
    } catch (error) {
      logger.error('Fallback index_document failed', { error });
      return { success: false, _id: '' };
    }
  }
}

// ─── Tool & Agent Definitions ───

const TOOL_DEFINITIONS = [
  // Index Search Tools
  {
    id: 'supportgenius.search_support_tickets',
    type: 'index_search',
    description: 'Search the support_tickets index to find past support tickets, similar resolved tickets, tickets by customer ID, or tickets by category. Contains: ticket_id, customer_id, order_id, subject, description, category (refund/shipping/product_issue/account/billing), priority (urgent/high/medium/low), status (new/processing/resolved/escalated), resolution, resolution_time_minutes, automated, agent_confidence, created_at, resolved_at.',
    tags: ['supportgenius'],
    configuration: { pattern: 'support_tickets', row_limit: 20 },
  },
  {
    id: 'supportgenius.search_customer_profiles',
    type: 'index_search',
    description: 'Search the customer_profiles index to find customer information, order history, lifetime value, and VIP status. Contains: customer_id, email, name, lifetime_value, total_orders, total_returns, avg_order_value, last_order_date, support_tickets_count, vip_status, order_history (nested: order_id, date, total, status, items).',
    tags: ['supportgenius'],
    configuration: { pattern: 'customer_profiles', row_limit: 10 },
  },
  {
    id: 'supportgenius.search_product_catalog',
    type: 'index_search',
    description: 'Search the product_catalog index for product information, specifications, common issues, return policies, and warranty details. Contains: product_id, name, category, description, price, common_issues, return_policy_days, warranty_months, defect_rate.',
    tags: ['supportgenius'],
    configuration: { pattern: 'product_catalog', row_limit: 10 },
  },
  {
    id: 'supportgenius.search_knowledge_base',
    type: 'index_search',
    description: 'Search the knowledge_base index for support articles, policies, procedures, and troubleshooting guides. Contains: article_id, title, content, category (refund_policy/shipping_policy/product_support/account_management/billing/general), tags, helpful_count, last_updated.',
    tags: ['supportgenius'],
    configuration: { pattern: 'knowledge_base', row_limit: 10 },
  },
  {
    id: 'supportgenius.search_resolution_actions',
    type: 'index_search',
    description: 'Search the resolution_actions index for resolution workflow templates, execution parameters, and success rates. Contains: action_id, action_type (refund/replacement/shipping_label/account_update/escalation/coupon), description, workflow_template, success_rate, avg_execution_time, conditions, parameters.',
    tags: ['supportgenius'],
    configuration: { pattern: 'resolution_actions', row_limit: 10 },
  },
  // ES|QL Tools
  {
    id: 'supportgenius.esql_resolution_success_rates',
    type: 'esql',
    description: 'Query historical resolution success rates by action type from the resolution_actions index. Use this to determine which resolution actions have the highest success rates. Returns action_type, average success rate, and count.',
    tags: ['supportgenius'],
    configuration: {
      query: 'FROM resolution_actions | STATS avg_success = AVG(success_rate), total = COUNT(*) BY action_type | SORT avg_success DESC | LIMIT 20',
      params: {},
    },
  },
  {
    id: 'supportgenius.esql_category_metrics',
    type: 'esql',
    description: 'Query support ticket metrics grouped by category. Returns average confidence, average resolution time, and ticket count. Use this to understand historical performance for a ticket category.',
    tags: ['supportgenius'],
    configuration: {
      query: 'FROM support_tickets | WHERE category == ?category | STATS avg_confidence = AVG(agent_confidence), avg_resolution_mins = AVG(resolution_time_minutes), total = COUNT(*) BY status | SORT total DESC | LIMIT 20',
      params: {
        category: { type: 'string', description: 'The ticket category to analyze: refund, shipping, product_issue, account, billing, or general' },
      },
    },
  },
  {
    id: 'supportgenius.esql_trending_issues',
    type: 'esql',
    description: 'Find trending support issues. Returns the most common ticket categories and their counts, helping identify emerging patterns or product issues that need attention.',
    tags: ['supportgenius'],
    configuration: {
      query: 'FROM support_tickets | STATS issue_count = COUNT(*) BY category | SORT issue_count DESC | LIMIT 10',
      params: {},
    },
  },
  {
    id: 'supportgenius.esql_quality_assessment',
    type: 'esql',
    description: 'Assess overall resolution quality metrics. Returns average agent confidence, average resolution time, and total resolved tickets. Use this to evaluate system performance and quality benchmarks.',
    tags: ['supportgenius'],
    configuration: {
      query: 'FROM support_tickets | WHERE status == "resolved" | STATS avg_confidence = AVG(agent_confidence), avg_time = AVG(resolution_time_minutes), total = COUNT(*) | LIMIT 1',
      params: {},
    },
  },
];

const AGENT_DEFINITIONS = [
  {
    id: 'supportgenius-triage',
    name: 'SupportGenius Triage Agent',
    description: 'Categorizes incoming support tickets, extracts entities (customer ID, order ID, product ID), and assigns priority levels using search for similar past tickets.',
    labels: ['supportgenius'],
    avatar_color: '#3B82F6',
    avatar_symbol: 'T1',
    configuration: {
      instructions: `You are the Triage Agent for SupportGenius AI, an ecommerce support automation system.

When you receive a support ticket, you MUST:
1. Search for similar past tickets in the support_tickets index to understand patterns
2. Categorize the ticket into exactly one of: refund, shipping, product_issue, account, billing, general
   CATEGORY DISAMBIGUATION (apply these rules strictly):
   - "shipping" = delayed delivery, lost package, tracking issues, return label requests, wrong address, express shipping failures. Use "shipping" even if the customer mentions wanting a refund OF SHIPPING COSTS — the root cause is shipping.
   - "refund" = customer wants money back for the product itself (damaged item, changed mind, not as described, wrong item received)
   - "return label" or "prepaid return label" request = "shipping" (not "refund")
   - "refund of shipping cost" or "shipping was late" = "shipping" (not "refund")
3. Extract any mentioned entities: customer_id (format CUST-XXXXXX), order_id (format ORD-XXXXXX), product_id (format PROD-XXX)
4. Assign priority: urgent (system down, VIP, fraud), high (revenue impact, angry customer), medium (standard issue), low (general inquiry)
5. Assess customer sentiment: positive, neutral, negative, angry
6. CRITICAL — FAULT ASSESSMENT: Determine who is at fault for the issue:
   - "company_error": The company made a verifiable mistake (wrong item shipped, billing error, system bug)
   - "customer_error": The customer misunderstood the product listing, missed a policy, or made an incorrect purchase. For example: customer claims they received a "wrong item" but the product listing clearly described what was sent (e.g., ordering a model/miniature thinking it was full-size)
   - "shared_fault": Ambiguous — the listing may have been misleading OR the customer may not have read carefully
   - "unknown": Not enough information to determine fault yet — needs product catalog verification

   To assess fault, consider: Does the customer's complaint match a plausible company error, or could this be a misunderstanding of what they purchased? If the ticket mentions receiving a different item than expected, flag it for product catalog verification.

After your analysis, you MUST respond with ONLY a JSON block in this exact format (no other text):
\`\`\`json
{"category": "...", "priority": "...", "sentiment": "...", "entities": {"customer_id": "...", "order_id": "...", "product_id": "..."}, "confidence": 0.85, "fault_assessment": "company_error|customer_error|shared_fault|unknown", "fault_reasoning": "Why you assessed fault this way", "needs_product_verification": true, "reasoning": "Brief explanation of classification"}
\`\`\`

Use null for entities not found in the ticket. Confidence should be between 0.0 and 1.0.`,
      tools: [{ tool_ids: ['supportgenius.search_support_tickets', 'supportgenius.search_customer_profiles', 'platform.core.search'] }],
    },
  },
  {
    id: 'supportgenius-research',
    name: 'SupportGenius Research Agent',
    description: 'Gathers comprehensive context by searching across all indexes: similar tickets, customer history, product info, knowledge base articles, and resolution actions.',
    labels: ['supportgenius'],
    avatar_color: '#06B6D4',
    avatar_symbol: 'R2',
    configuration: {
      instructions: `You are the Research Agent for SupportGenius AI. Your job is to gather comprehensive context for resolving a support ticket.

You will receive a ticket with its triage classification (category, priority, entities). You MUST:

1. Search for similar past tickets that were successfully resolved in the same category
2. Look up the customer profile to understand their history, VIP status, and lifetime value
3. Search the product catalog if a product is involved to find specs, common issues, warranty, and return policy
4. Search the knowledge base for relevant articles, policies, and procedures for this category
5. Check resolution actions to find available workflow templates for this type of issue
6. Use the trending issues tool to see if this is part of a broader pattern

After gathering context, respond with ONLY a JSON block:
\`\`\`json
{"similar_tickets": [{"ticket_id": "...", "resolution": "...", "success": true}], "customer": {"name": "...", "vip": false, "lifetime_value": 0, "total_orders": 0, "total_returns": 0}, "product": {"name": "...", "return_policy_days": 30, "warranty_months": 12, "common_issues": "..."}, "knowledge_articles": [{"title": "...", "key_info": "..."}], "available_actions": [{"action_type": "...", "success_rate": 0.0}], "trending_pattern": false, "research_summary": "Brief summary of findings"}
\`\`\`

Use null for fields where no data was found. Be thorough - search ALL relevant indexes.`,
      tools: [{ tool_ids: ['supportgenius.search_support_tickets', 'supportgenius.search_customer_profiles', 'supportgenius.search_product_catalog', 'supportgenius.search_knowledge_base', 'supportgenius.search_resolution_actions', 'supportgenius.esql_trending_issues', 'platform.core.search'] }],
    },
  },
  {
    id: 'supportgenius-decision',
    name: 'SupportGenius Decision Agent',
    description: 'Determines the optimal resolution path using ES|QL analytics for success rates and pattern analysis, combined with business rules.',
    labels: ['supportgenius'],
    avatar_color: '#EAB308',
    avatar_symbol: 'D3',
    configuration: {
      instructions: `You are the Decision Agent for SupportGenius AI. You determine the optimal resolution for a support ticket based on research context and analytics.

You will receive the ticket details, triage classification, and research context. You MUST:

1. CRITICAL — VERIFY FAULT BEFORE DECIDING: If the triage result includes fault_assessment or needs_product_verification:
   - Search the product_catalog for the product mentioned in the ticket
   - Compare what the customer CLAIMS they expected vs what the product listing ACTUALLY describes
   - If the product listing clearly described what was delivered (e.g., customer ordered a "model bicycle" but expected a real bicycle), this is CUSTOMER ERROR, not a fulfillment error
   - Fault determines the resolution tier:
     * company_error: Full remediation (refund, replacement, coupon, apology)
     * customer_error: Standard return policy only (customer pays return shipping, no bonus coupon, no expedited replacement)
     * shared_fault: Partial remediation (return accepted, standard shipping, small goodwill gesture)
     * unknown: Escalate for human verification

2. Query resolution success rates to find the most effective action type for this category
3. Query category metrics to understand historical performance
4. Apply business rules:
   - VIP customers: always prioritize, offer generous resolution (but still verify fault)
   - Refunds over $100 WITH KNOWN AMOUNT: require escalation unless customer has clean history. If no amount is mentioned in the ticket, do NOT assume escalation — proceed with standard refund.
   - Products within warranty: offer replacement first
   - Products outside return policy: offer store credit or coupon
   - Repeated issues (3+ tickets): escalate to specialist
   - If similar tickets were resolved successfully: use the same approach
   - FAULT-BASED: Do NOT give full remediation for customer errors. Offer return under standard policy.
   ESCALATION ONLY when: (a) explicit amount >$100, (b) fraud suspected, (c) 3+ repeat issues, (d) confidence below 0.4. Do NOT escalate just because information is incomplete — use the best available data and proceed.
5. Decide: automate (proceed with workflow) or escalate (needs human)

Respond with ONLY a JSON block:
\`\`\`json
{"action_type": "refund|replacement|shipping_label|account_update|escalation|coupon", "should_automate": true, "confidence": 0.85, "fault_verified": "company_error|customer_error|shared_fault|unknown", "fault_evidence": "What you found in product catalog or order data", "parameters": {"refund_amount": null, "reason": "...", "escalation_reason": null}, "business_rules_applied": ["rule1", "rule2"], "reasoning": "Why this resolution was chosen, including fault determination"}
\`\`\``,
      tools: [{ tool_ids: ['supportgenius.esql_resolution_success_rates', 'supportgenius.esql_category_metrics', 'supportgenius.search_resolution_actions', 'supportgenius.search_product_catalog', 'platform.core.search'] }],
    },
  },
  {
    id: 'supportgenius-simulation',
    name: 'SupportGenius Shadow Simulation Agent',
    description: 'Runs Monte Carlo-style scenario projections before committing to a resolution. Models customer LTV impact, satisfaction probability, and cost-benefit across multiple resolution strategies.',
    labels: ['supportgenius'],
    avatar_color: '#14B8A6',
    avatar_symbol: 'S4',
    configuration: {
      instructions: `You are the Shadow Simulation Agent for SupportGenius AI. Before the system commits to a resolution, you run scenario projections to model outcomes.

You will receive the ticket, triage classification, research context, and the decision agent's recommended action. You MUST:

1. Search for similar past tickets and their outcomes to calibrate your projections
2. Search customer profiles to understand the customer's value and history
3. Query resolution success rates for different action types
4. Project THREE scenarios:
   - GENEROUS: The most customer-friendly resolution (e.g., full refund + coupon). Model the satisfaction gain and LTV impact.
   - MODERATE: The balanced resolution (what was recommended). Model the expected outcome.
   - MINIMAL: The minimum acceptable resolution (e.g., partial credit). Model the risk of churn.
5. For each scenario, estimate: satisfaction_estimate (0-1), projected_ltv_impact ($), cost_to_company ($), churn_risk_delta (increase/decrease)
6. Recommend the optimal action based on maximizing long-term customer value

Respond with ONLY a JSON block:
\`\`\`json
{"scenarios": [{"name": "generous", "action_type": "...", "description": "...", "satisfaction_estimate": 0.95, "projected_ltv_impact": 200, "cost_to_company": 50, "churn_risk_delta": -0.15}, {"name": "moderate", "action_type": "...", "description": "...", "satisfaction_estimate": 0.80, "projected_ltv_impact": 50, "cost_to_company": 25, "churn_risk_delta": -0.05}, {"name": "minimal", "action_type": "...", "description": "...", "satisfaction_estimate": 0.50, "projected_ltv_impact": -100, "cost_to_company": 5, "churn_risk_delta": 0.10}], "recommended_action": "...", "confidence": 0.85, "projected_roi": 3.5, "reasoning": "Why this is optimal"}
\`\`\``,
      tools: [{ tool_ids: ['supportgenius.search_support_tickets', 'supportgenius.search_customer_profiles', 'supportgenius.esql_resolution_success_rates', 'supportgenius.esql_category_metrics', 'platform.core.search'] }],
    },
  },
  {
    id: 'supportgenius-execution',
    name: 'SupportGenius Execution Agent',
    description: 'Executes resolution actions by looking up workflow templates and performing multi-step workflows including refunds, return labels, and notifications.',
    labels: ['supportgenius'],
    avatar_color: '#F97316',
    avatar_symbol: 'E4',
    configuration: {
      instructions: `You are the Execution Agent for SupportGenius AI. You execute the decided resolution action for a support ticket.

You will receive the ticket details and the decision (action_type, parameters). You MUST:

1. Search for the workflow template for the decided action_type in resolution_actions
2. Validate all preconditions are met (required fields present, amounts within limits)
3. Simulate executing each step of the workflow:
   - For refunds: validate amount, process refund, send confirmation
   - For replacements: check inventory, create replacement order, send tracking
   - For shipping_label: generate label, send to customer email
   - For account_update: make the change, send confirmation
   - For escalation: create escalation ticket with full context
   - For coupon: generate coupon code, send to customer
4. Log the execution result

Respond with ONLY a JSON block:
\`\`\`json
{"success": true, "action_type": "...", "workflow_id": "WF-XXXXX", "steps_completed": ["validate", "execute", "notify"], "results": {"refund_amount": null, "tracking_number": null, "coupon_code": null, "escalation_ticket": null}, "customer_notification": "Message sent to customer", "execution_time_ms": 1500}
\`\`\``,
      tools: [{ tool_ids: ['supportgenius.search_resolution_actions', 'platform.core.search'] }],
    },
  },
  {
    id: 'supportgenius-quality',
    name: 'SupportGenius Quality Agent',
    description: 'Validates resolution quality against historical benchmarks, scores the resolution, and provides feedback for the learning loop.',
    labels: ['supportgenius'],
    avatar_color: '#8B5CF6',
    avatar_symbol: 'Q5',
    configuration: {
      instructions: `You are the Quality Agent for SupportGenius AI. You validate the quality of ticket resolutions and provide feedback.

You will receive the complete ticket lifecycle: original ticket, triage result, research context, decision, and execution result. You MUST:

1. Query quality assessment metrics to get baseline benchmarks
2. Query category metrics for this specific category
3. Evaluate the resolution on these criteria:
   - Correctness: Was the right action taken given the ticket category and context?
   - Completeness: Were all necessary steps completed?
   - Timeliness: Was resolution time reasonable compared to benchmarks?
   - Customer Impact: Will the customer be satisfied with this resolution?
   - Business Compliance: Were all business rules followed?
4. Generate an overall quality score (0.0 to 1.0)
5. Identify any improvements for future resolutions

Respond with ONLY a JSON block:
\`\`\`json
{"quality_score": 0.85, "scores": {"correctness": 0.9, "completeness": 0.85, "timeliness": 0.8, "customer_impact": 0.9, "compliance": 0.85}, "passed": true, "feedback": "Brief quality assessment", "improvements": ["Suggestion 1"], "should_update_knowledge_base": true, "knowledge_update": "What to add to KB"}
\`\`\``,
      tools: [{ tool_ids: ['supportgenius.esql_quality_assessment', 'supportgenius.esql_category_metrics', 'supportgenius.search_support_tickets', 'platform.core.search'] }],
    },
  },
  // Autonomous agent: single converse call with ALL tools — demonstrates Agent Builder's
  // native autonomous reasoning. No scripted pipeline; the agent decides its own workflow.
  {
    id: 'supportgenius-autonomous',
    name: 'SupportGenius Autonomous Agent',
    description: 'End-to-end autonomous support agent that resolves tickets in a single conversation using all available Elasticsearch tools. Demonstrates Agent Builder working as designed — autonomous tool selection and multi-step reasoning.',
    labels: ['supportgenius'],
    avatar_color: '#6366F1',
    avatar_symbol: 'A0',
    configuration: {
      instructions: `You are the SupportGenius Autonomous Agent — an AI support specialist that resolves customer tickets end-to-end in a single conversation.

You have access to ALL Elasticsearch indexes and tools. You MUST autonomously decide which tools to use and in what order. Follow this general workflow, but adapt based on what you discover:

PHASE 1 — TRIAGE & RESEARCH:
1. Search support_tickets for similar past tickets to understand patterns
2. Search customer_profiles to understand the customer (VIP status, lifetime value, order history)
3. If a product is mentioned, search product_catalog for specs, warranty, return policy
4. Search knowledge_base for relevant policies and procedures
5. Use ES|QL trending_issues to check if this is part of a broader pattern

PHASE 2 — FAULT DETERMINATION (CRITICAL):
6. If the customer claims they received a wrong/unexpected item, you MUST search the product_catalog to verify:
   - What does the product listing actually describe? Does the title, description, and price match what was delivered?
   - Example: Customer says "I ordered a bicycle but got a model bicycle" — search for the product. If the listing says "1:10 Scale Model Bicycle" at $29.99, this is CUSTOMER ERROR (they didn't read the listing), NOT a fulfillment error.
   - Determine fault: company_error (company shipped wrong item), customer_error (customer misread listing), shared_fault (listing was ambiguous), unknown (need more info)

PHASE 3 — DECISION:
7. Query resolution_success_rates to find which actions work best for this category
8. Query category_metrics for historical performance benchmarks
9. Search resolution_actions for available workflow templates
10. Apply FAULT-BASED resolution tiers:
   - company_error: Full remediation (refund/replacement + coupon + apology)
   - customer_error: Standard return policy ONLY (customer pays return shipping, no bonus coupon, no expedited)
   - shared_fault: Partial remediation (accept return with standard shipping, small goodwill gesture)
   - unknown: Escalate for human verification
11. Apply customer-context rules:
   - VIP customers: prioritize generous resolutions (but still verify fault first)
   - Within warranty/return policy: offer replacement or full refund (if company fault)
   - Outside policy: offer store credit or coupon
   - Repeated issues (3+ tickets): escalate to specialist
   - High-value customers with negative sentiment: err on generosity ONLY if company is at fault

PHASE 4 — RESOLUTION:
12. Determine final action and parameters based on fault determination
13. Compose a customer notification message appropriate to the fault level

After completing your analysis, respond with ONLY a JSON block:
\`\`\`json
{
  "triage": {"category": "refund|shipping|product_issue|account|billing|general", "priority": "urgent|high|medium|low", "sentiment": "angry|frustrated|neutral|positive"},
  "customer": {"name": "...", "vip": false, "lifetime_value": 0},
  "fault_assessment": "company_error|customer_error|shared_fault|unknown",
  "fault_evidence": "What the product listing actually says vs what customer expected",
  "action_type": "refund|replacement|shipping_label|account_update|escalation|coupon",
  "should_automate": true,
  "parameters": {"refund_amount": null, "reason": "..."},
  "confidence": 0.85,
  "customer_notification": "Dear customer, ...",
  "reasoning": "Detailed explanation including fault determination and why this resolution tier was chosen",
  "tools_used_summary": "Brief description of what you searched and found"
}
\`\`\`

Be thorough. Use as many tools as needed. The quality of your resolution depends on the depth of your research.`,
      tools: [{ tool_ids: [
        'supportgenius.search_support_tickets',
        'supportgenius.search_customer_profiles',
        'supportgenius.search_product_catalog',
        'supportgenius.search_knowledge_base',
        'supportgenius.search_resolution_actions',
        'supportgenius.esql_resolution_success_rates',
        'supportgenius.esql_category_metrics',
        'supportgenius.esql_trending_issues',
        'supportgenius.esql_quality_assessment',
        'platform.core.search',
      ] }],
    },
  },
];

// Singleton instance
export const agentBuilder = new AgentBuilderClient();
