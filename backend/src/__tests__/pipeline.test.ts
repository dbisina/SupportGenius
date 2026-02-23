/**
 * pipeline.test.ts - Integration tests for SupportGenius pipeline
 * All external dependencies are mocked.
 */

// Mock: Elasticsearch
jest.mock("../config/elasticsearch", () => ({
  elasticsearchClient: { get: jest.fn(), search: jest.fn(), index: jest.fn(), update: jest.fn() },
  INDEXES: {
    SUPPORT_TICKETS: "support_tickets", PIPELINE_TRACES: "pipeline_traces",
    RESOLUTION_ACTIONS: "resolution_actions", CUSTOMER_PROFILES: "customer_profiles",
    PRODUCT_CATALOG: "product_catalog", KNOWLEDGE_BASE: "knowledge_base",
  },
}));

// Mock: Agent Builder
// We use jest.requireActual to keep AgentBuilderClient as a real class
// (its constructor only sets env-var properties, no network calls).
// Only the singleton agentBuilder instance methods are mocked so that
// tests control tool call behavior without hitting real Kibana endpoints.
jest.mock("../services/agent-builder", () => {
  const actual = jest.requireActual("../services/agent-builder");
  return {
    ...actual,
    agentBuilder: {
      converse: jest.fn(),
      parseJsonFromResponse: jest.fn(),
      getToolCallsFromResponse: jest.fn().mockReturnValue([]),
      esqlTool: jest.fn().mockResolvedValue({ columns: [], values: [] }),
      searchTool: jest.fn().mockResolvedValue([]),
      indexDocumentTool: jest.fn().mockResolvedValue({ success: true, _id: "test-id" }),
    },
  };
});

// Mock: Context Builder
jest.mock("../services/context-builder", () => ({
  ContextBuilder: jest.fn().mockImplementation(() => ({
    buildContext: jest.fn().mockResolvedValue({
      customerProfile: null, similarTickets: [], relevantArticles: [],
      productInfo: null, resolutionActions: [], recentActivitySummary: "",
    }),
  })),
}));

// Imports
import { AgentBuilderClient } from "../services/agent-builder";
import { agentBuilder } from "../services/agent-builder";
import { elasticsearchClient } from "../config/elasticsearch";
import { QualityAgent } from "../agents/quality";
import { TicketOrchestrator } from "../services/orchestrator";
import { TriageResult, ResearchResult, DecisionResult, ExecutionResult } from "../models/types";

function makeMockConverseResponse(message: string) {
  return {
    conversation_id: "conv-test-1", round_id: "round-test-1", status: "success",
    steps: [], started_at: new Date().toISOString(),
    time_to_first_token: 100, time_to_last_token: 500,
    response: { message },
  };
}

function makeTriageResult(overrides: Partial<TriageResult> = {}): TriageResult {
  return {
    agent_name: "TriageAgent", confidence: 0.9, decision: "refund request",
    category: "refund", priority: "medium",
    extracted_entities: { customer_id: "cust-001", order_id: "order-123" },
    timestamp: new Date(), ...overrides,
  };
}

function makeResearchResult(overrides: Partial<ResearchResult> = {}): ResearchResult {
  return {
    agent_name: "ResearchAgent", confidence: 0.85, decision: "customer eligible for refund",
    similar_tickets: [], relevant_articles: [],
    timestamp: new Date(), ...overrides,
  };
}

function makeDecisionResult(overrides: Partial<DecisionResult> = {}): DecisionResult {
  return {
    agent_name: "DecisionAgent", confidence: 0.88, decision: "approve refund",
    resolution_path: "automated", action_type: "refund", should_escalate: false,
    timestamp: new Date(), ...overrides,
  };
}

function makeExecutionResult(overrides: Partial<ExecutionResult> = {}): ExecutionResult {
  return {
    agent_name: "ExecutionAgent", confidence: 0.85, decision: "refund processed",
    action_executed: "refund",
    execution_details: { amount: 49.99, method: "original_payment" },
    success: true, timestamp: new Date(), ...overrides,
  };
}

describe("SupportGenius Pipeline - Integration Tests", () => {

  beforeEach(() => { jest.clearAllMocks(); });

  // Test 1: parseJsonFromResponse handles valid JSON in markdown code fence
  describe("Test 1: AgentBuilderClient.parseJsonFromResponse - valid JSON in markdown code fence", () => {
    it("correctly parses a ConverseResponse whose message wraps JSON in json fences", () => {
      const client = new AgentBuilderClient();
      const payload = { category: "refund", priority: "high", confidence: 0.95 };
      const mockMessage = "```json\n" + JSON.stringify(payload) + "\n```";
      const response = makeMockConverseResponse(mockMessage);
      const parsed = client.parseJsonFromResponse(response.response.message);
      expect(parsed).toEqual(payload);
      expect(parsed.category).toBe("refund");
      expect(parsed.confidence).toBe(0.95);
    });
  });

  // Test 2: Quality gate blocks low-confidence writes
  describe("Test 2: QualityAgent - quality gate blocks writes on low-confidence execution", () => {
    it("does NOT pass validation when execution confidence is 0.3 and success is false", async () => {
      const mockIndexDocumentTool = agentBuilder.indexDocumentTool as jest.Mock;
      const mockEsqlTool = agentBuilder.esqlTool as jest.Mock;
      mockEsqlTool.mockResolvedValue({ columns: [], values: [] });
      const agent = new QualityAgent();
      const result = await agent.process(
        "ticket-low-confidence",
        makeTriageResult(), makeResearchResult(), makeDecisionResult(),
        makeExecutionResult({ confidence: 0.3, success: false, execution_details: null }),
      );
      // validateExecution checks: success, execution_details, confidence >= 0.5
      expect(result.validation_passed).toBe(false);
      // searchTool returns [] by default so no second indexDocumentTool call
      expect(mockIndexDocumentTool.mock.calls.length).toBeLessThanOrEqual(1);
    });
  });

  // Test 3: Quality gate allows high-confidence writes
  describe("Test 3: QualityAgent - quality gate allows indexDocumentTool on high-confidence execution", () => {
    it("calls indexDocumentTool twice when execution confidence is 0.85 and success is true", async () => {
      const mockIndexDocumentTool = agentBuilder.indexDocumentTool as jest.Mock;
      const mockEsqlTool = agentBuilder.esqlTool as jest.Mock;
      mockEsqlTool.mockResolvedValue({ columns: [], values: [] });
      const mockSearchTool = agentBuilder.searchTool as jest.Mock;
      mockSearchTool.mockResolvedValue([
        { _id: "action-1", action_type: "refund", success_rate: 0.9, total_executions: 10 },
      ]);
      const agent = new QualityAgent();
      const result = await agent.process(
        "ticket-high-confidence",
        makeTriageResult(), makeResearchResult(), makeDecisionResult(),
        makeExecutionResult({
          confidence: 0.85, success: true,
          execution_details: { amount: 49.99, method: "original_payment" },
        }),
      );
      expect(result.validation_passed).toBe(true);
      expect(mockIndexDocumentTool).toHaveBeenCalledTimes(2);
      const firstCallArgs = mockIndexDocumentTool.mock.calls[0][0];
      expect(firstCallArgs.index).toBe("support_tickets");
      expect(firstCallArgs.id).toBe("ticket-high-confidence");
    });
  });

  // Test 4: TicketOrchestrator.getTicketStatus handles 404 gracefully
  describe("Test 4: TicketOrchestrator.getTicketStatus - handles 404 without throwing", () => {
    it("returns null when elasticsearchClient.get throws a 404 and search returns empty", async () => {
      const mockGet = elasticsearchClient.get as jest.Mock;
      const mockSearch = elasticsearchClient.search as jest.Mock;
      const notFoundError = Object.assign(new Error("Not found"), { meta: { statusCode: 404 } });
      mockGet.mockRejectedValue(notFoundError);
      mockSearch.mockResolvedValue({ hits: { hits: [], total: { value: 0 } } });
      const orchestrator = new TicketOrchestrator();
      const result = await orchestrator.getTicketStatus("ticket-nonexistent-999");
      expect(result).toBeNull();
      expect(mockGet).toHaveBeenCalledWith({ index: "support_tickets", id: "ticket-nonexistent-999" });
      expect(mockSearch).toHaveBeenCalled();
    });
  });

  // Test 5: AgentBuilderClient.parseJsonFromResponse handles all formats
  describe("Test 5: AgentBuilderClient.parseJsonFromResponse - handles all response formats", () => {
    let client: AgentBuilderClient;
    beforeEach(() => { client = new AgentBuilderClient(); });

    it("parses JSON from a markdown json code fence", () => {
      const payload = { action: "refund", amount: 49.99 };
      const message = "```json\n" + JSON.stringify(payload) + "\n```";
      expect(client.parseJsonFromResponse(message)).toEqual(payload);
    });

    it("parses JSON from a plain code fence", () => {
      const payload = { status: "ok", count: 3 };
      const message = "```\n" + JSON.stringify(payload) + "\n```";
      expect(client.parseJsonFromResponse(message)).toEqual(payload);
    });

    it("parses raw JSON object embedded in surrounding text", () => {
      const payload = { priority: "high", category: "shipping" };
      const message = "Here is my analysis: " + JSON.stringify(payload) + " Hope that helps.";
      expect(client.parseJsonFromResponse(message)).toEqual(payload);
    });

    it("throws an error when no JSON can be found in the response", () => {
      const message = "This is a plain text response with no JSON whatsoever.";
      expect(() => client.parseJsonFromResponse(message)).toThrow("No JSON found in agent response");
    });
  });

});
