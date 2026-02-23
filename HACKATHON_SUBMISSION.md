# SupportGenius AI - Elasticsearch Agent Builder Hackathon

> **Two modes of AI support resolution** built on Elastic Agent Builder: an **Autonomous Agent** that resolves tickets in a single converse call (Agent Builder as designed), and an **Orchestrated Pipeline** of 6 specialized agents with debate, simulation, and self-improvement. Toggle between them in the UI.

---

## TL;DR

SupportGenius registers **7 custom agents** and **10 custom tools** (5 index search + 5 ES|QL) in Elastic Agent Builder, then offers two resolution modes:

1. **Autonomous Mode** (1 converse call) -- A single agent with ALL 10 tools autonomously researches, decides, and resolves the ticket. This demonstrates Agent Builder's native autonomous reasoning: the agent selects which tools to use and in what order.

2. **Orchestrated Mode** (16+ converse calls) -- Six specialized agents in a pipeline: Triage, Research, Decision (with adversarial debate), Simulation, Execution, Quality. Each agent uses `conversationId` for multi-turn reasoning. Shows what you can build on top of Agent Builder for complex workflows.

**The differentiator:** Two AI perspectives debate every non-trivial resolution before it executes — an Optimist maximizing customer satisfaction and a Pragmatist enforcing policy, each with isolated `conversationId`s so neither can see the other's reasoning. This adversarial dynamic produces negotiated outcomes that neither agent would reach alone. We show both approaches side-by-side: Autonomous for speed, Orchestrated for transparency. See [CRITIQUE_LOG.md](CRITIQUE_LOG.md) for honest self-assessment of what works and what doesn't.

---

## The Problem

Ecommerce support teams spend 60-80% of their time on manual, repetitive tasks:

- Searching order histories and customer profiles across multiple systems
- Finding relevant policies and past resolutions in knowledge bases
- Making judgment calls on refund amounts, exchanges, and escalations
- Executing multi-step workflows (issue refund, send label, notify customer)

**Industry baseline:** 84 minutes average resolution time, $28 cost per ticket, inconsistent quality.

---

## The Solution

SupportGenius offers **two resolution modes**, both built on Elastic Agent Builder:

### Mode 1: Autonomous Agent (Single Converse Call)

```
Ticket In --> Autonomous Agent (all 10 tools) --> Ticket Resolved
```

One agent, one call, all tools. The `supportgenius-autonomous` agent is registered with ALL 10 Elasticsearch tools. When a ticket arrives, we send a single `converse()` call. Agent Builder's LLM autonomously decides which tools to use: it searches customer profiles, finds similar tickets, checks policies, queries resolution success rates, and produces a full resolution -- all in one conversation turn.

**This is Agent Builder working as designed.** No scripting, no orchestration. The agent reasons and acts autonomously.

### Mode 2: Orchestrated Pipeline (6 Agents, 16+ LLM Steps)

```
Ticket In --> Triage (2 phases) --> Research (1-3 phases, adaptive)
         --> Decision (2 phases) --> Adversarial Debate (4 turns)
         --> Simulation (2 phases) --> Execution (2 phases)
         --> Quality (2 phases) --> KB Update --> Ticket Resolved
```

Six specialized agents, each with `conversationId` for multi-turn reasoning. The triage agent assesses ticket complexity and sets an adaptive token budget that controls how many research phases run and whether simulation is skipped for simple tickets. After the Decision Agent proposes a resolution, an adversarial debate between Optimist and Pragmatist perspectives negotiates the final parameters.

**This shows what you can build on top of Agent Builder** for workflows that need transparency, auditability, and multi-perspective reasoning.

---

## Agent Builder Integration

### 7 Custom Agents (registered via `POST /api/agent_builder/agents`)

| Agent | ID | Tools Assigned | Role |
|-------|-----|----------------|------|
| **Autonomous** | `supportgenius-autonomous` | **All 10 tools** | End-to-end resolution in 1 converse call |
| Triage | `supportgenius-triage` | 2 index search, 1 ES\|QL | Categorize, extract entities, assess complexity |
| Research | `supportgenius-research` | 5 index search, 1 ES\|QL | Multi-phase context gathering across all indexes |
| Decision | `supportgenius-decision` | 2 index search, 2 ES\|QL | Determine resolution path using historical analytics |
| Simulation | `supportgenius-simulation` | 1 index search, 1 ES\|QL | Project outcomes across optimistic/moderate/worst-case |
| Execution | `supportgenius-execution` | 2 index search | Execute workflow templates, generate customer notifications |
| Quality | `supportgenius-quality` | 1 index search, 1 ES\|QL | Score resolution quality, write back to knowledge base |

### 10 Custom Tools (registered via `POST /api/agent_builder/tools`)

**5 Index Search Tools** -- one per Elasticsearch index with full field descriptions so Agent Builder's LLM constructs effective queries:
- `supportgenius.search_support_tickets` -- past tickets for pattern matching
- `supportgenius.search_customer_profiles` -- customer history, VIP status, lifetime value
- `supportgenius.search_product_catalog` -- product details, warranty, defect rates
- `supportgenius.search_knowledge_base` -- KB articles and past resolutions
- `supportgenius.search_resolution_actions` -- workflow templates and success rates

**5 ES|QL Tools** -- parameterized analytical queries:
- `supportgenius.esql_resolution_success_rates` -- historical success by action type
- `supportgenius.esql_category_metrics` -- per-category performance metrics
- `supportgenius.esql_trending_issues` -- emerging issue detection
- `supportgenius.esql_quality_assessment` -- quality benchmarks
- Dynamic tool synthesis for unknown action types (runtime registration)

### Converse API Usage

Every agent call goes through `POST /api/agent_builder/converse` with:
- `agentId` -- the registered agent
- `conversationId` -- enables multi-turn within each agent (2-3 phases)
- Structured prompts with context from previous agents
- Full response parsing: reasoning steps, tool calls, parameters, and results

---

## Advanced Features

### 1. Adversarial Peer Review (Agent Debate)

After the Decision Agent proposes a resolution, two perspectives debate using the same Agent Builder agent but with **isolated conversations** (separate `conversationId` per role, so neither sees the other's system prompt):

- **Optimist** (2 turns, own conversation): Advocates for maximum customer satisfaction
- **Pragmatist** (2 turns, own conversation): Protects company margins and enforces policy

Arguments are passed as quoted context between conversations, not shared memory. The debate negotiates specific parameters (refund amounts, shipping priority, coupon values). If both converge on the same action type, consensus is reached. Otherwise, a scoring heuristic weighted by customer VIP status picks the winner.

**Example debate transcript** (refund dispute, VIP customer, triage fault=`shared_fault`):

```
Optimist Turn 1: "Customer is VIP with $3,400 LTV. Full $89 refund + $20 coupon
  maximizes retention probability to 0.94. Projected LTV impact: +$180. Churn
  risk drops -0.15. This is the optimal long-term play."

Pragmatist Turn 1: "Triage flagged shared_fault — listing was ambiguous but
  customer did not read the description. Return policy permits store credit only.
  Full refund sets a dangerous precedent for this product category (32% repeat
  claimants in ES|QL data). Recommend: store credit $89, no coupon."

Optimist Turn 2: "VIP churn risk at 0.31 without goodwill gesture. A $10 coupon
  recovers 0.18 of churn delta at $10 cost vs $180 LTV upside. The math favors
  partial concession even under shared-fault policy."

Pragmatist Turn 2: "Concede on coupon only. Final position: store credit $89
  + $10 coupon. Maintains policy boundary on store-credit-vs-refund while
  acknowledging ambiguous listing. No expedited replacement."

→ Consensus: store_credit $89 + coupon $10
  Winner: Pragmatist (VIP weight 0.6, policy score 0.72 vs Optimist 0.68)
  Changes from original: amount capped at store credit, coupon $10 added
```

### 2. Adaptive Token Budget

Triage assesses ticket complexity (simple/moderate/complex) and sets a token budget that controls:
- Research depth: 1 phase (simple) to 3 phases (complex)
- Simulation: skipped entirely for simple tickets (visible as "Adaptive Skip" in the UI)
- Per-agent token usage tracked and visualized in real-time

### 3. Agent Memory Injection

Before Research Phase 1, the orchestrator queries `pipeline_traces` for the 3 most recent completed decision traces **filtered by the current ticket's category**. Past action types, confidence levels, and reasoning are injected into the research prompt as agent memory -- so the system learns from its own history on similar tickets.

### 4. Phase Error Recovery

Every agent Phase 2+ is wrapped in try/catch with intelligent fallback:
- Research Phase 2/3 failure: falls back to Phase 1 results
- Simulation Phase 2 failure: defaults to moderate scenario from Phase 1
- Decision Phase 2 failure: uses Phase 1 action with reduced confidence

No agent failure crashes the pipeline.

### 5. Dynamic Tool Synthesis

When the Execution Agent encounters an unknown action type, the system:
1. Searches the knowledge base for relevant documentation
2. Synthesizes a tool specification based on discovered docs
3. Registers the tool with Agent Builder via the Kibana API (`POST /api/agent_builder/tools`)
4. **Assigns the tool to the execution agent** via Kibana API (`PUT /api/agent_builder/agents/:id`) -- updating the agent's `tool_ids` so it can actually use the new tool
5. Executes with the synthesized tool available

### 6. Recursive Self-Optimization

The Quality Agent doesn't just score -- it writes successful resolutions back to the `knowledge_base` index with rich metadata (category, action type, confidence, customer context). The next ticket that hits Research will find this new article, creating a genuine learning flywheel.

### 7. Zero-Day Incident Detection

Background polling (30s interval) uses ES aggregations to detect:
- **Ticket surges** by category (last 2 hours)
- **Quality degradation** (24h confidence vs 7-day baseline)
- **Keyword clustering** via `significant_terms` aggregation
- Auto-notification toast when new critical incidents appear

### 8. Confidence Heatmap

Per-agent confidence visualization with color-coded bars (green/yellow/red), "Self-Doubt" indicators when confidence drops below 60%, and human review flags.

---

## Benchmark Results (20-Scenario Test Suite)

Results from `elasticsearch/scripts/benchmark.js` across 20 hand-crafted ticket scenarios covering all 5 categories:

| Category | Tickets | Correct Category | Correct Action | Fault Assessed |
|----------|---------|-----------------|----------------|----------------|
| Refund | 5 | 5/5 (100%) | 4/5 (80%) | 5/5 (100%) |
| Shipping | 4 | 4/4 (100%) | 4/4 (100%) | N/A |
| Product Issue | 4 | 3/4 (75%) | 3/4 (75%) | 4/4 (100%) |
| Account | 4 | 4/4 (100%) | 4/4 (100%) | N/A |
| Billing | 3 | 3/3 (100%) | 3/3 (100%) | N/A |
| **Total** | **20** | **19/20 (95%)** | **18/20 (90%)** | **9/9 (100%)** |

Run the benchmark yourself: `cd elasticsearch && npm run benchmark`

---

## Technical Architecture

```
                    React Dashboard (Vite + TailwindCSS)
                              |
                         REST API + SSE
                              |
                    Node.js Orchestrator (Express + TypeScript)
                              |
                 POST /api/agent_builder/converse
                              |
        +----------+----------+----------+----------+----------+
        |          |          |          |          |          |
     Triage    Research   Decision   Simulation Execution  Quality
     Agent      Agent      Agent      Agent      Agent     Agent
        |          |          |          |          |          |
        +-----+----+----+----+----+----+----+-----+----+-----+
              |         |         |         |          |
         index_search  esql   index_search  esql   index_search
              |         |         |         |          |
              +---------+---------+---------+----------+
                              |
                    Elasticsearch 8.x
                     (6 indexes, 870+ documents)
```

### Elasticsearch Indexes

| Index | Documents | Purpose |
|-------|-----------|---------|
| `support_tickets` | 200+ | Ticket state, resolution history |
| `customer_profiles` | 100+ | Customer 360: orders, returns, LTV, VIP |
| `product_catalog` | 100+ | Products, warranties, defect rates |
| `knowledge_base` | 150+ | KB articles + AI-generated resolutions |
| `resolution_actions` | 50+ | Workflow templates and success rates |
| `pipeline_traces` | Growing | Full agent pipeline traces with tool calls |

### Stack

- **Agent Builder**: 7 agents + 10 tools, registered via Kibana API
- **Backend**: Node.js, Express, TypeScript
- **Frontend**: React 18, TypeScript, TailwindCSS, Vite, Recharts
- **Database**: Elasticsearch 8.x
- **LLM**: Managed by Agent Builder (Claude via Elastic's LLM connector)
- **Real-time**: SSE (Server-Sent Events) for live pipeline streaming

---

## What We Liked About Agent Builder

1. **`nlQuery` interface** -- Agents construct effective queries from natural language without manual query DSL. The LLM picks the right query type (keyword, full-text, structured) based on intent.

2. **Parameterized ES|QL tools** -- `?param` syntax lets us define precise analytical queries that agents fill dynamically. The piped syntax (`FROM | WHERE | STATS | SORT`) is natural for complex aggregations.

3. **Converse API transparency** -- Responses include reasoning steps, tool calls with parameters, and results. We log everything to `pipeline_traces`, making the system fully auditable.

4. **`conversationId` for multi-turn** -- Agents maintain context across phases without re-sending the full conversation. This enabled our multi-step agent design (2-3 phases per agent).

5. **Runtime tool registration** -- We can register new tools at runtime via the Kibana API, enabling dynamic tool synthesis for unknown action types.

## Challenges

1. **JSON output parsing** -- Agent Builder returns natural language. Getting reliable structured JSON required careful prompt engineering with explicit format instructions and multi-layer fallback parsing (code fences, raw JSON extraction, regex).

2. **Tool parameter schema** -- Undocumented requirements (e.g., `type: "string"` not `"keyword"`, `description` required). Discovered through iterative API calls.

3. **Multi-agent state** -- Each converse call is a new conversation. We serialize context between agents and use `conversationId` for intra-agent state.

---

## Impact Metrics (Real Data)

| Metric | AI (SupportGenius) | Industry Baseline (Human) |
|--------|-------------------|--------------------------|
| Cost per ticket | ~$0.45 (LLM tokens) | $28.00 |
| Resolution time | Seconds | 84 minutes |
| Consistency | Deterministic pipeline | Varies by agent |
| Availability | 24/7 | Business hours |
| Learning | Auto KB updates | Manual documentation |

The Dashboard shows real-time AI vs Human baseline comparisons computed from actual ticket data.

---

## Repository Structure

```
SupportGenius/
+-- backend/src/
|   +-- services/
|   |   +-- agent-builder.ts    # Agent Builder client (7 agents, 10 tools, converse API)
|   |   +-- orchestrator.ts     # Autonomous + orchestrated modes, debate, memory, adaptive budget
|   |   +-- pipeline/
|   |   |   +-- persistence.ts  # Elasticsearch CRUD (extracted from orchestrator)
|   |   |   +-- helpers.ts      # Pure trace-builder functions
|   |   +-- context-builder.ts  # 100x RAG context augmentation (parallel ES queries)
|   |   +-- metrics.ts          # Impact metrics, flywheel data, ES|QL query tracking
|   |   +-- agent-monitor.ts    # Agent activity tracking
|   +-- agents/                 # Agent definitions (triage, research, decision, etc.)
|   +-- routes/                 # REST API + SSE endpoints
|   +-- config/                 # Elasticsearch client
+-- frontend/src/
|   +-- pages/                  # Dashboard, Tickets, Analytics, Agents, TicketDetail
|   +-- components/
|   |   +-- PipelineView.tsx    # Live pipeline visualization with adaptive skip badges
|   |   +-- pipeline/           # DebateLog, ConfidenceHeatmap, LiveThinkingFeed, etc.
|   |   +-- dashboard/          # IncidentPanel with proactive notification
+-- elasticsearch/
|   +-- mappings/               # 6 index mappings
|   +-- scripts/                # Seed data (870+ documents)
+-- CRITIQUE_LOG.md             # Self-critique and iterative design log
+-- SETUP.md                    # Setup instructions
```

---

## Demo Highlights

1. **Adversarial Debate** --> Watch Optimist and Pragmatist negotiate refund amounts in real-time, each reasoning from an isolated conversation, with the final outcome shown as a scored decision
2. **Adaptive Skip** --> Submit a simple ticket and watch simulation get skipped automatically, with teal "ADAPTIVE" badge and token budget savings shown live
3. **Autonomous Mode** --> Single agent with all 10 tools resolves a ticket in one converse call — Agent Builder working as designed
4. **Orchestrated Mode** --> Toggle to 6-agent pipeline, watch each agent reason in real-time via SSE with full tool call visibility
5. **Confidence Heatmap** --> Green/yellow/red per-agent confidence with "Self-Doubt" indicators when confidence drops below 60%
6. **Token Budget** --> Per-agent token usage bars showing how adaptive depth control reduces cost on simple tickets
7. **Incident Detection** --> Auto-notification toast when ticket surge or quality degradation is detected via ES aggregations
8. **Knowledge Flywheel** --> Chart showing KB growth with quality-gated writes (only resolutions scoring ≥0.7 get written back)
9. **Impact Dashboard** --> AI vs Human cost/time comparison from real ticket data
10. **Self-Critique Log** --> [CRITIQUE_LOG.md](CRITIQUE_LOG.md) documents every design flaw found and how it was addressed

---

## License

MIT
