# SupportGenius AI

**Multi-agent ecommerce support automation with adversarial peer review — built on Elasticsearch Agent Builder**

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Elasticsearch](https://img.shields.io/badge/Elasticsearch-8.x-brightgreen.svg)](https://www.elastic.co/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-blue.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg)](https://reactjs.org/)

---

## TL;DR

SupportGenius registers 7 custom agents and 10 custom tools in Elastic Agent Builder, then offers two resolution modes: an **Autonomous Agent** that resolves tickets in a single converse call (Agent Builder working as designed), and an **Orchestrated Pipeline** of 6 specialized agents that uses adversarial debate, adaptive token budgets, and live SSE streaming. Both modes run in the same UI — toggle between them to see the contrast.

---

## The Novel Part: Adversarial Peer Review

After the Decision Agent proposes a resolution, two separate Agent Builder conversations debate it before the answer is committed.

**How it works:**

1. The Decision Agent produces a draft resolution — action type, refund amount, shipping priority, coupon value.
2. Two additional converse calls are made against the same agent (`supportgenius-decision`) but with **completely isolated `conversationId` values**. Neither conversation sees the other's system prompt.
   - **Optimist** (2 turns, own `conversationId`): Given the draft and the customer's full history, it argues for maximum customer satisfaction — higher refund, faster shipping, larger coupon.
   - **Pragmatist** (2 turns, own `conversationId`): Given the same draft and company margin data, it enforces policy — lower refund if warranty expired, standard shipping, no coupon stacking.
3. Arguments are passed as **quoted context strings** between conversations, not shared memory. Each perspective reads the other's argument as text and counters it.
4. Convergence check: if both agree on the same action type, consensus is reached and parameters are averaged. If they diverge, a scoring heuristic weighted by customer VIP status picks the winner.

**Why isolated `conversationId` matters:** If both perspectives shared a conversation, the second call's system prompt would contaminate the first. Isolation guarantees independent reasoning. Each agent genuinely argues its position without being anchored to what the other said.

The debate transcript is written to `pipeline_traces` and rendered in the UI as a turn-by-turn log with highlighted convergence or divergence points.

---

## Adaptive Token Budget

Triage assesses ticket complexity (`simple` / `moderate` / `complex`) and sets a token budget at the start of the pipeline. This budget controls two things downstream:

**Research depth:**
- `simple` — 1 research phase (basic customer lookup, one similar-ticket search)
- `moderate` — 2 research phases (adds product defect pattern query)
- `complex` — 3 research phases (adds ES|QL trending analysis and extended KB search)

**Simulation skip:**
- `simple` tickets bypass the Simulation Agent entirely. The UI marks these steps with an "ADAPTIVE SKIP" badge in teal so the behavior is visible, not hidden.
- `moderate` and `complex` tickets run the full Simulation Agent (optimistic / moderate / worst-case scenario projection).

Per-agent token usage is tracked and displayed as bars in the pipeline sidebar. Budget exhaustion at any phase triggers fallback to the previous phase's output rather than crashing the pipeline.

---

## Two Resolution Modes

Both modes register against the same 7 agents and 10 tools in Agent Builder. They exist to show two distinct design patterns.

### Autonomous Mode — 1 converse call

```
Ticket In --> Autonomous Agent (all 10 tools) --> Ticket Resolved
```

The `supportgenius-autonomous` agent is registered with all 10 tools. One call to `POST /api/agent_builder/converse`. Agent Builder's LLM autonomously selects which tools to invoke — customer profile lookup, similar-ticket search, ES|QL success rate query, KB search — and produces a complete resolution. No scripting, no orchestration layer. **This is Agent Builder working as designed.**

Use this to see raw autonomous reasoning. The pipeline view shows every tool call the agent made and in what order.

### Orchestrated Mode — 16+ converse calls

```
Ticket In
    |
    v
Triage Agent (2 phases, conversationId)
    |-- sets complexity + token budget
    v
Research Agent (1-3 phases, adaptive depth)
    |-- injects agent memory from past pipeline_traces
    v
Decision Agent (Phase 1: draft resolution)
    |
    +-- Optimist debate (2 turns, isolated conversationId)
    +-- Pragmatist debate (2 turns, isolated conversationId)
    |
    v
Decision Agent (Phase 2: final resolution after debate)
    |
    v
Simulation Agent (skipped if simple ticket)
    |-- 3-scenario outcome projection
    v
Execution Agent (2 phases)
    |-- dynamic tool synthesis for unknown action types
    v
Quality Agent (2 phases)
    |-- scores resolution, writes back to knowledge_base
    v
Ticket Resolved
```

Six specialized agents. Each uses `conversationId` for multi-turn reasoning (2–3 phases per agent). **This shows what you can build on top of Agent Builder** for workflows that need transparency, multi-perspective reasoning, and auditability.

---

## Architecture

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                    SupportGenius AI — System Architecture                    ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║   Customer Ticket (REST POST /api/tickets/submit)                            ║
║          |                                                                   ║
║          v                                                                   ║
║   ┌──────────────────────────────────────────────────────────────────────┐   ║
║   │          Node.js Orchestrator (Express + TypeScript)                 │   ║
║   │                    REST API  +  SSE streaming                        │   ║
║   └──────────────────────────────┬───────────────────────────────────────┘   ║
║                                  │  POST /api/agent_builder/converse          ║
║         ┌────────────────────────┴────────────────────────┐                  ║
║         │              MODE SELECT                         │                  ║
║         │                                                  │                  ║
║  ┌──────▼──────┐                              ┌───────────▼────────────────┐ ║
║  │  AUTONOMOUS │                              │     ORCHESTRATED PIPELINE  │ ║
║  │    AGENT    │                              │                            │ ║
║  │  (1 call,   │                              │ ┌────────┐  complexity     │ ║
║  │  all 10     │                              │ │ Triage │──> token budget │ ║
║  │  tools)     │                              │ │ ph.1-2 │                 │ ║
║  └──────┬──────┘                              │ └───┬────┘                 │ ║
║         │                                     │     │ simple/moderate/     │ ║
║         │ autonomous                          │     │ complex              │ ║
║         │ tool selection                      │     v                      │ ║
║         │                                     │ ┌──────────────────────┐   │ ║
║         │                                     │ │   Research Agent     │   │ ║
║         │                                     │ │   ph.1 (always)      │   │ ║
║         │                                     │ │   ph.2 (moderate+)   │   │ ║
║         │                                     │ │   ph.3 (complex only)│   │ ║
║         │                                     │ └───┬──────────────────┘   │ ║
║         │                                     │     │ + agent memory inject │ ║
║         │                                     │     v                      │ ║
║         │                                     │ ┌──────────────────────┐   │ ║
║         │                                     │ │   Decision Agent     │   │ ║
║         │                                     │ │   ph.1: draft        │   │ ║
║         │                                     │ │        |             │   │ ║
║         │                                     │ │   ADVERSARIAL DEBATE │   │ ║
║         │                                     │ │   ┌───────────────┐  │   │ ║
║         │                                     │ │   │  Optimist     │  │   │ ║
║         │                                     │ │   │  (convId: A)  │  │   │ ║
║         │                                     │ │   │  2 turns      │  │   │ ║
║         │                                     │ │   └───────┬───────┘  │   │ ║
║         │                                     │ │           │ args as  │   │ ║
║         │                                     │ │           │ quoted   │   │ ║
║         │                                     │ │           │ context  │   │ ║
║         │                                     │ │   ┌───────▼───────┐  │   │ ║
║         │                                     │ │   │  Pragmatist   │  │   │ ║
║         │                                     │ │   │  (convId: B)  │  │   │ ║
║         │                                     │ │   │  2 turns      │  │   │ ║
║         │                                     │ │   └───────┬───────┘  │   │ ║
║         │                                     │ │           │ converge?│   │ ║
║         │                                     │ │   ph.2: final        │   │ ║
║         │                                     │ └───┬──────────────────┘   │ ║
║         │                                     │     │                      │ ║
║         │                                     │     v                      │ ║
║         │                                     │ ┌──────────────────────┐   │ ║
║         │                                     │ │  Simulation Agent    │   │ ║
║         │                                     │ │  ph.1-2 (moderate+)  │   │ ║
║         │                                     │ │  [ADAPTIVE SKIP] ────┼──>│ ║
║         │                                     │ │  (simple tickets)    │   │ ║
║         │                                     │ └───┬──────────────────┘   │ ║
║         │                                     │     v                      │ ║
║         │                                     │ ┌──────────────────────┐   │ ║
║         │                                     │ │  Execution Agent     │   │ ║
║         │                                     │ │  ph.1-2              │   │ ║
║         │                                     │ │  + dynamic tool      │   │ ║
║         │                                     │ │    synthesis if new  │   │ ║
║         │                                     │ │    action type found │   │ ║
║         │                                     │ └───┬──────────────────┘   │ ║
║         │                                     │     v                      │ ║
║         │                                     │ ┌──────────────────────┐   │ ║
║         │                                     │ │  Quality Agent       │   │ ║
║         │                                     │ │  ph.1-2              │   │ ║
║         │                                     │ │  writes to KB index  │   │ ║
║         │                                     │ └──────────────────────┘   │ ║
║         │                                     └────────────────────────────┘ ║
║         │                                                   │                ║
║         └─────────────────────┬─────────────────────────────┘                ║
║                               │                                              ║
║   ┌───────────────────────────▼──────────────────────────────────────────┐   ║
║   │             10 Custom Tools (registered in Agent Builder)            │   ║
║   │                                                                      │   ║
║   │  INDEX SEARCH (5)                   ES|QL (5)                        │   ║
║   │  search_support_tickets             esql_resolution_success_rates    │   ║
║   │  search_customer_profiles           esql_category_metrics            │   ║
║   │  search_product_catalog             esql_trending_issues             │   ║
║   │  search_knowledge_base              esql_quality_assessment          │   ║
║   │  search_resolution_actions          [dynamic synthesis at runtime]   │   ║
║   └───────────────────────────┬──────────────────────────────────────────┘   ║
║                               │                                              ║
║   ┌───────────────────────────▼──────────────────────────────────────────┐   ║
║   │                  Elasticsearch 8.x  —  6 Indexes                    │   ║
║   │                                                                      │   ║
║   │  support_tickets    customer_profiles    product_catalog             │   ║
║   │  knowledge_base     resolution_actions   pipeline_traces             │   ║
║   └──────────────────────────────────────────────────────────────────────┘   ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### Agents and Tools

| Agent | Agent ID | Tools | Role |
|-------|----------|-------|------|
| Autonomous | `supportgenius-autonomous` | All 10 | End-to-end resolution in 1 converse call |
| Triage | `supportgenius-triage` | 2 index search, 1 ES\|QL | Classify, extract entities, set token budget |
| Research | `supportgenius-research` | 5 index search, 1 ES\|QL | Adaptive multi-phase context gathering |
| Decision | `supportgenius-decision` | 2 index search, 2 ES\|QL | Draft resolution + host adversarial debate |
| Simulation | `supportgenius-simulation` | 1 index search, 1 ES\|QL | 3-scenario outcome projection |
| Execution | `supportgenius-execution` | 2 index search | Execute workflow templates + dynamic tool synthesis |
| Quality | `supportgenius-quality` | 1 index search, 1 ES\|QL | Score resolution, write back to knowledge_base |

### Elasticsearch Indexes

| Index | Documents | Purpose |
|-------|-----------|---------|
| `support_tickets` | 200+ | Ticket state, resolution history |
| `customer_profiles` | 100+ | Customer 360: orders, returns, LTV, VIP status |
| `product_catalog` | 100+ | Products, warranties, defect rates |
| `knowledge_base` | 150+ | KB articles and AI-generated resolutions |
| `resolution_actions` | 50+ | Workflow templates and success rates |
| `pipeline_traces` | Growing | Full agent pipeline traces with tool calls and debate transcripts |

### Agent Builder Integration Points

Every agent call goes through `POST /api/agent_builder/converse` with:
- `agentId` — identifies the registered agent
- `conversationId` — enables multi-turn within a single agent (2–3 phases per agent; debate uses isolated IDs per role)
- Structured prompts with context forwarded from upstream agents
- Full response parsing: reasoning steps, tool calls with parameters, tool results

Agents and tools are registered at startup via `POST /api/agent_builder/agents` and `POST /api/agent_builder/tools`. The Execution Agent can register additional tools at runtime when it encounters an unknown action type.

---

## Impact Metrics

| Metric | SupportGenius (AI) | Human Baseline |
|--------|-------------------|----------------|
| Cost per ticket | ~$0.45 (LLM tokens) | $28.00 |
| Resolution time | Seconds | 84 minutes average |
| Availability | 24/7 | Business hours |
| Consistency | Deterministic pipeline | Varies by agent |
| Knowledge capture | Automatic KB writes after every resolved ticket | Manual documentation |
| Automation rate | 85% of common issue types | 0% automated |

The Dashboard computes and displays these comparisons in real time from actual ticket data in Elasticsearch.

---

## Quick Start

### Prerequisites

- Node.js 18+
- Elasticsearch 8.x (Elastic Cloud free trial works)
- npm

### 1. Clone

```bash
git clone https://github.com/yourusername/SupportGenius.git
cd SupportGenius
```

### 2. Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
cd ../elasticsearch && npm install
```

### 3. Configure environment

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```env
ELASTICSEARCH_URL=https://your-deployment.elastic.co:443
ELASTICSEARCH_API_KEY=your_api_key_here
PORT=5000
NODE_ENV=development
```

Edit `frontend/.env` (copy from `frontend/.env.example`):

```env
VITE_API_URL=http://localhost:5000/api
```

### 4. Set up Elasticsearch indexes and seed data

```bash
cd elasticsearch
node scripts/setup-indexes.js
node scripts/seed-data.js
```

Creates 6 indexes and loads 870+ documents.

### 5. Start the backend

```bash
cd backend
npm run dev
```

### 6. Start the frontend

```bash
cd frontend
npm run dev
```

Open `http://localhost:3000`.

### 7. Submit a test ticket

Navigate to the Tickets page, click New Ticket, and enter:
- Subject: `Refund request for damaged item`
- Description: `Order #12345 arrived with cracked screen, need full refund`
- Order ID: `ORD-12345`

Toggle between Autonomous and Orchestrated modes to see the contrast.

For detailed troubleshooting and environment configuration options, see [SETUP.md](SETUP.md).

---

## Project Structure

```
SupportGenius/
+-- backend/src/
|   +-- services/
|   |   +-- agent-builder.ts     # Agent Builder client: 7 agents, 10 tools, converse API
|   |   +-- orchestrator.ts      # Autonomous + orchestrated modes, debate, adaptive budget
|   |   +-- pipeline/
|   |   |   +-- persistence.ts   # Elasticsearch CRUD (extracted from orchestrator)
|   |   |   +-- helpers.ts       # Pure trace-builder functions
|   |   +-- context-builder.ts   # Parallel ES queries for RAG context augmentation
|   |   +-- metrics.ts           # Impact metrics and ES|QL query tracking
|   |   +-- agent-monitor.ts     # Agent activity tracking
|   +-- agents/                  # Agent prompt definitions and phase logic
|   +-- routes/                  # REST API endpoints + SSE stream
|   +-- config/                  # Elasticsearch client configuration
|   +-- models/                  # TypeScript types (PipelineTrace, DebateTranscript, etc.)
+-- frontend/src/
|   +-- pages/                   # Dashboard, Tickets, TicketDetail, Analytics, Agents
|   +-- components/
|   |   +-- PipelineView.tsx     # Live pipeline visualization with adaptive skip badges
|   |   +-- pipeline/            # DebateLog, ConfidenceHeatmap, LiveThinkingFeed
|   |   +-- dashboard/           # IncidentPanel with proactive surge detection
+-- elasticsearch/
|   +-- mappings/                # 6 index mappings with field descriptions
|   +-- scripts/                 # setup-indexes.js, seed-data.js, benchmark.js
+-- HACKATHON_SUBMISSION.md      # Detailed submission with benchmark results
+-- CRITIQUE_LOG.md              # Honest record of design decisions and tradeoffs
+-- SETUP.md                     # Extended setup guide with troubleshooting
```

---

## API Reference

### POST /api/tickets/submit

Submit a ticket for automated resolution.

Request:
```json
{
  "customer_email": "user@example.com",
  "subject": "Refund request for order #12345",
  "description": "Item arrived damaged, need refund",
  "order_id": "12345",
  "mode": "orchestrated"
}
```

Response:
```json
{
  "ticket_id": "TKT-67890",
  "status": "processing",
  "mode": "orchestrated"
}
```

### GET /api/tickets/:id

Get full ticket state including pipeline trace, debate transcript, agent confidence scores, and token usage.

### GET /api/tickets/:id/stream

SSE endpoint. Streams `PipelineEvent` objects in real time as each agent phase completes.

Event types: `thinking`, `tool_call`, `tool_result`, `decision`, `debate`, `confidence`, `tool_synthesis`, `complete`

### GET /api/metrics

Returns system performance metrics, AI vs human baseline comparison, and ES|QL query activity.

### GET /api/agents/status

Returns all 7 registered agents, their tool assignments, and activity counts.

---

## Demo

Demo video coming soon — watch the live pipeline visualization and debate transcript render in real time.

---

## Hackathon Submission

Full submission details, benchmark results, and the complete agent design rationale: [HACKATHON_SUBMISSION.md](HACKATHON_SUBMISSION.md)

Iterative design log including every issue encountered and how it was addressed: [CRITIQUE_LOG.md](CRITIQUE_LOG.md)

---

## Technology Stack

- **Agent framework**: Elasticsearch Agent Builder (7 agents, 10 tools)
- **Backend**: Node.js 18, Express, TypeScript
- **Frontend**: React 18, TypeScript, TailwindCSS, Vite, Recharts
- **Database**: Elasticsearch 8.x
- **Real-time**: Server-Sent Events (SSE) for live pipeline streaming
- **LLM**: Managed by Agent Builder via Elastic's LLM connector

---

## License

MIT — see [LICENSE](LICENSE).
