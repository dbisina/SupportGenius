import { useState, useEffect, useCallback } from 'react';
import { getTicketTrace } from '../services/api';
import AgentResultSummary from './pipeline/AgentResultSummary';
import SentimentBanner from './pipeline/SentimentBanner';
import CustomerResponsePreview from './pipeline/CustomerResponsePreview';
import ResolutionComparison from './pipeline/ResolutionComparison';
import LiveThinkingFeed from './pipeline/LiveThinkingFeed';
import {
  Search, Brain, Scale, Sparkles, Zap, Shield,
  ChevronDown, ChevronRight,
  CheckCircle, XCircle, Loader2,
  Clock, Cpu, Database, FastForward,
} from 'lucide-react';

interface ToolCallTrace {
  tool_id: string;
  params: Record<string, any>;
  results: any[];
}

interface PipelineTrace {
  ticket_id: string;
  agent: string;
  step_number: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  reasoning: string[];
  tool_calls: ToolCallTrace[];
  llm_calls: number;
  input_tokens: number;
  output_tokens: number;
  model: string;
  result: any;
  confidence: number;
  raw_response: string;
}

interface PipelineTraceResponse {
  ticket_id: string;
  ticket: any;
  traces: PipelineTrace[];
  pipeline_status: 'pending' | 'running' | 'completed' | 'failed';
  total_duration_ms: number;
  total_tokens: number;
  total_llm_calls: number;
}

const AGENT_CONFIG = [
  { key: 'triage', label: 'Triage', icon: Search, color: 'blue', step: 1 },
  { key: 'research', label: 'Research', icon: Brain, color: 'cyan', step: 2 },
  { key: 'decision', label: 'Decision', icon: Scale, color: 'yellow', step: 3 },
  { key: 'simulation', label: 'Simulation', icon: Sparkles, color: 'teal', step: 4 },
  { key: 'execution', label: 'Execution', icon: Zap, color: 'orange', step: 5 },
  { key: 'quality', label: 'Quality', icon: Shield, color: 'purple', step: 6 },
];

interface PipelineViewProps {
  ticketId: string;
  mode: 'live' | 'replay';
  onComplete?: () => void;
}

export default function PipelineView({ ticketId, mode, onComplete }: PipelineViewProps) {
  const [data, setData] = useState<PipelineTraceResponse | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const fetchTrace = useCallback(async () => {
    try {
      const result = await getTicketTrace(ticketId);
      setData(result);

      if (mode === 'live') {
        const completed = (result.traces || [])
          .filter((t: PipelineTrace) => t.status === 'completed')
          .sort((a: PipelineTrace, b: PipelineTrace) => b.step_number - a.step_number);
        if (completed.length > 0) {
          setExpandedSteps(prev => new Set([...prev, completed[0].step_number]));
        }
      }

      if (result.pipeline_status === 'completed' || result.pipeline_status === 'failed') {
        setDone(true);
        onComplete?.();
      }

      return result.pipeline_status;
    } catch (err: any) {
      setError(err.message || 'Failed to load trace');
      return 'failed';
    }
  }, [ticketId, mode, onComplete]);

  useEffect(() => {
    fetchTrace();

    if (mode === 'live') {
      const interval = setInterval(async () => {
        const status = await fetchTrace();
        if (status === 'completed' || status === 'failed') {
          clearInterval(interval);
        }
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [fetchTrace, mode]);

  const toggleStep = (step: number) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(step)) next.delete(step);
      else next.add(step);
      return next;
    });
  };

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-center">
        <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
        <p className="text-red-300">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        <span className="ml-3 text-slate-400">Loading pipeline trace...</span>
      </div>
    );
  }

  const traceMap = new Map((data.traces || []).map(t => [t.agent, t]));

  const triageResult = traceMap.get('triage')?.result;
  const researchResult = traceMap.get('research')?.result;
  const executionResult = traceMap.get('execution')?.result;
  const decisionResult = traceMap.get('decision')?.result;
  const qualityResult = traceMap.get('quality')?.result;

  return (
    <div className="space-y-6">
      {/* Sentiment Banner - shows after triage completes */}
      {triageResult && (
        <SentimentBanner
          sentiment={triageResult.sentiment}
          priority={triageResult.priority}
          category={triageResult.category}
          confidence={triageResult.confidence}
          customerName={researchResult?.customer?.name}
          isVip={researchResult?.customer?.vip}
          lifetimeValue={researchResult?.customer?.lifetime_value}
        />
      )}

      {/* Live Thinking Feed — visible while pipeline is running */}
      {mode === 'live' && !done && (
        <LiveThinkingFeed ticketId={ticketId} mode="live" />
      )}

      {/* Pipeline summary */}
      <div className="flex items-center justify-between text-sm text-slate-400">
        <div className="flex items-center space-x-4">
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            data.pipeline_status === 'completed' ? 'bg-green-500/20 text-green-400' :
            data.pipeline_status === 'running' ? 'bg-blue-500/20 text-blue-400' :
            data.pipeline_status === 'failed' ? 'bg-red-500/20 text-red-400' :
            'bg-slate-700 text-slate-400'
          }`}>
            {data.pipeline_status === 'running' && <Loader2 className="w-3 h-3 animate-spin inline mr-1" />}
            {data.pipeline_status.toUpperCase()}
          </span>
        </div>
        {data.total_duration_ms > 0 && (
          <div className="flex items-center space-x-4">
            <span className="flex items-center"><Clock className="w-3.5 h-3.5 mr-1" />{(data.total_duration_ms / 1000).toFixed(1)}s</span>
            <span className="flex items-center"><Cpu className="w-3.5 h-3.5 mr-1" />{data.total_tokens.toLocaleString()} tokens</span>
            <span className="flex items-center"><Database className="w-3.5 h-3.5 mr-1" />{data.total_llm_calls} LLM calls</span>
          </div>
        )}
      </div>

      {/* Pipeline stages visualization */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
        <div className="flex items-center justify-between">
          {AGENT_CONFIG.map((agent, idx) => {
            const trace = traceMap.get(agent.key);
            const status = trace?.status || 'pending';
            const Icon = agent.icon;

            return (
              <div key={agent.key} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className={`
                    w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-500
                    ${status === 'completed' ? 'border-green-500 bg-green-500/20' : ''}
                    ${status === 'running' ? 'border-blue-500 bg-blue-500/20 animate-pulse' : ''}
                    ${status === 'failed' ? 'border-red-500 bg-red-500/20' : ''}
                    ${status === 'skipped' ? 'border-teal-500/50 bg-teal-500/10' : ''}
                    ${status === 'pending' ? 'border-slate-600 bg-slate-800' : ''}
                  `}>
                    {status === 'running' && <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />}
                    {status === 'completed' && <CheckCircle className="w-5 h-5 text-green-400" />}
                    {status === 'failed' && <XCircle className="w-5 h-5 text-red-400" />}
                    {status === 'pending' && <Icon className="w-5 h-5 text-slate-500" />}
                    {status === 'skipped' && <FastForward className="w-5 h-5 text-teal-400" />}
                  </div>
                  <span className="text-xs mt-2 text-slate-400 font-medium">{agent.label}</span>
                  {status === 'skipped' && (
                    <span className="text-[10px] text-teal-400 font-medium">ADAPTIVE</span>
                  )}
                  {trace?.duration_ms != null && trace.duration_ms > 0 && (
                    <span className="text-xs text-slate-500">{(trace.duration_ms / 1000).toFixed(1)}s</span>
                  )}
                  {trace?.status === 'completed' && (trace.confidence || trace.result?.confidence) && (() => {
                    const c = trace.confidence || trace.result?.confidence || 0;
                    const dotColor = c >= 0.8 ? 'bg-green-400' : c >= 0.6 ? 'bg-yellow-400' : 'bg-red-400';
                    return <div className={`w-2 h-2 rounded-full mt-1 ${dotColor}`} title={`${(c * 100).toFixed(0)}% confidence`} />;
                  })()}
                </div>
                {idx < AGENT_CONFIG.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-3 transition-colors duration-500 ${
                    status === 'completed' ? 'bg-green-500/50' : 'bg-slate-700'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Stage details */}
      <div className="space-y-3">
        {AGENT_CONFIG.map(agent => {
          const trace = traceMap.get(agent.key);
          if (!trace || trace.status === 'pending') return null;

          const expanded = expandedSteps.has(trace.step_number);
          const Icon = agent.icon;

          return (
            <div key={agent.key} className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleStep(trace.step_number)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-750 transition-colors text-left"
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-5 h-5 ${
                    trace.status === 'completed' ? 'text-green-400' :
                    trace.status === 'running' ? 'text-blue-400' :
                    trace.status === 'skipped' ? 'text-teal-400' :
                    'text-red-400'
                  }`} />
                  <span className="font-medium text-white">{agent.label} Agent</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    trace.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                    trace.status === 'running' ? 'bg-blue-500/20 text-blue-400' :
                    trace.status === 'skipped' ? 'bg-teal-500/20 text-teal-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>{trace.status === 'skipped' ? 'adaptive skip' : trace.status}</span>
                </div>
                <div className="flex items-center space-x-4 text-sm text-slate-400">
                  {trace.duration_ms != null && trace.duration_ms > 0 && <span>{(trace.duration_ms / 1000).toFixed(1)}s</span>}
                  {trace.tool_calls?.length > 0 && <span>{trace.tool_calls.length} tools</span>}
                  {(trace.input_tokens > 0 || trace.output_tokens > 0) && (
                    <span>{(trace.input_tokens + trace.output_tokens).toLocaleString()} tokens</span>
                  )}
                  {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </div>
              </button>

              {expanded && (
                <div className="border-t border-slate-700 p-4 space-y-4">
                  {/* Adaptive skip explanation */}
                  {trace.status === 'skipped' && (
                    <div className="flex items-center space-x-3 px-3 py-2.5 rounded-lg bg-teal-500/10 border border-teal-500/20">
                      <FastForward className="w-4 h-4 text-teal-400 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-teal-300 font-medium">Adaptive Token Budget Skip</p>
                        <p className="text-xs text-teal-400/70 mt-0.5">
                          Triage assessed this ticket as low-complexity. This agent was skipped to conserve tokens and reduce latency.
                        </p>
                      </div>
                    </div>
                  )}
                  {/* Reasoning */}
                  {trace.reasoning?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-300 mb-2">Reasoning</h4>
                      <div className="space-y-2">
                        {trace.reasoning.map((r, i) => (
                          <p key={i} className="text-sm text-slate-400 pl-3 border-l-2 border-blue-500/50">{r}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tool calls */}
                  {trace.tool_calls?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-300 mb-2">Elasticsearch Tools Used</h4>
                      <div className="space-y-2">
                        {trace.tool_calls.map((tc, i) => (
                          <div key={i} className="bg-slate-900 rounded p-3">
                            <code className="text-sm text-cyan-400">{tc.tool_id}</code>
                            {tc.params && Object.keys(tc.params).length > 0 && (
                              <pre className="text-xs text-slate-500 mt-1 overflow-x-auto">
                                {JSON.stringify(tc.params, null, 2)}
                              </pre>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Agent-specific result */}
                  {trace.result && <AgentResultSummary agent={trace.agent} result={trace.result} />}

                  {/* Token usage footer */}
                  {trace.status === 'completed' && (
                    <div className="flex items-center space-x-6 text-xs text-slate-500 pt-2 border-t border-slate-700">
                      <span>LLM calls: {trace.llm_calls}</span>
                      <span>Input: {trace.input_tokens.toLocaleString()} tokens</span>
                      <span>Output: {trace.output_tokens.toLocaleString()} tokens</span>
                      {trace.model && <span>Model: {trace.model}</span>}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Customer Response Preview */}
      {executionResult && (
        <CustomerResponsePreview
          customerNotification={executionResult.customer_notification || ''}
          actionType={executionResult.action_type || decisionResult?.action_type || ''}
          results={executionResult.results || {}}
          success={executionResult.success ?? false}
          customerName={researchResult?.customer?.name}
          ticketSubject={data.ticket?.subject}
          isEscalated={decisionResult?.should_automate === false}
          escalationReason={decisionResult?.parameters?.escalation_reason}
        />
      )}

      {/* Resolution Comparison */}
      {done && data.pipeline_status === 'completed' && (
        <ResolutionComparison
          totalDurationMs={data.total_duration_ms}
          totalTokens={data.total_tokens}
          qualityScore={qualityResult?.quality_score || 0}
          ticketStatus={data.ticket?.status || ''}
          resolution={data.ticket?.resolution}
        />
      )}
    </div>
  );
}
