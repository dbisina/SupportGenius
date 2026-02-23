import { AlertTriangle, Activity } from 'lucide-react';

interface AgentConfidence {
  agent: string;
  confidence: number;
}

const AGENT_ORDER = ['triage', 'research', 'decision', 'simulation', 'execution', 'quality'];

const AGENT_LABELS: Record<string, string> = {
  triage: 'Triage',
  research: 'Research',
  decision: 'Decision',
  simulation: 'Simulation',
  execution: 'Execution',
  quality: 'Quality',
};

function getConfidenceColor(c: number) {
  if (c >= 0.8) return 'bg-green-500';
  if (c >= 0.6) return 'bg-yellow-500';
  return 'bg-red-500';
}

function getConfidenceTextColor(c: number) {
  if (c >= 0.8) return 'text-green-400';
  if (c >= 0.6) return 'text-yellow-400';
  return 'text-red-400';
}

export default function ConfidenceHeatmap({ traces }: { traces: any[] }) {
  if (!traces || traces.length === 0) return null;

  const agentConfidences: AgentConfidence[] = AGENT_ORDER
    .map(agent => {
      const trace = traces.find((t: any) => t.agent === agent && t.status === 'completed');
      return trace ? { agent, confidence: trace.confidence || trace.result?.confidence || 0 } : null;
    })
    .filter(Boolean) as AgentConfidence[];

  if (agentConfidences.length === 0) return null;

  const avgConfidence = agentConfidences.reduce((sum, a) => sum + a.confidence, 0) / agentConfidences.length;
  const needsReview = agentConfidences.some(a => a.confidence < 0.6);

  return (
    <div className="bg-slate-800 rounded-lg p-5 border border-slate-700">
      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center space-x-2">
        <Activity className="w-4 h-4" />
        <span>Confidence Heatmap</span>
      </h3>

      {/* Overall confidence */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-slate-500">Overall</span>
        <span className={`text-lg font-bold ${getConfidenceTextColor(avgConfidence)}`}>
          {(avgConfidence * 100).toFixed(0)}%
        </span>
      </div>

      {/* Per-agent bars */}
      <div className="space-y-2.5">
        {agentConfidences.map(({ agent, confidence }) => (
          <div key={agent}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-400">{AGENT_LABELS[agent]}</span>
              <div className="flex items-center space-x-2">
                {confidence < 0.6 && <AlertTriangle className="w-3 h-3 text-red-400" />}
                <span className={getConfidenceTextColor(confidence)}>
                  {(confidence * 100).toFixed(0)}%
                </span>
              </div>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-700 ease-out ${getConfidenceColor(confidence)}`}
                style={{ width: `${Math.min(100, confidence * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Human review banner */}
      {needsReview && (
        <div className="mt-4 flex items-center space-x-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span className="text-xs text-red-300">Human review recommended — low confidence detected</span>
        </div>
      )}
    </div>
  );
}
