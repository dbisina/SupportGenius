import { Swords, Gavel, TrendingUp, ShieldAlert, ArrowRight } from 'lucide-react';

interface DebateTurn {
  role: 'optimist' | 'pragmatist';
  argument: string;
  proposed_action: string;
  proposed_parameters?: Record<string, any>;
  confidence: number;
  key_points: string[];
}

interface DebateTranscript {
  initial_proposal: { action_type: string; reasoning: string; parameters?: Record<string, any> };
  turns: DebateTurn[];
  consensus_reached: boolean;
  winner: 'optimist' | 'pragmatist' | 'consensus';
  final_action_type: string;
  final_parameters?: Record<string, any>;
  final_reasoning: string;
  judge_rationale?: string;
  changes_from_original?: string[];
}

const ROLE_STYLES = {
  optimist: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    label: 'Optimist',
    icon: TrendingUp,
    desc: 'Customer Advocate',
  },
  pragmatist: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    label: 'Pragmatist',
    icon: ShieldAlert,
    desc: 'Business Guardian',
  },
};

export default function DebateLog({ transcript }: { transcript: DebateTranscript }) {
  if (!transcript || !transcript.turns?.length) return null;

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center space-x-2 mb-3">
        <Swords className="w-4 h-4 text-violet-400" />
        <h4 className="text-sm font-semibold text-violet-300 uppercase tracking-wider">Adversarial Peer Review</h4>
        {transcript.consensus_reached && (
          <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">Consensus</span>
        )}
      </div>

      {/* Initial proposal */}
      <div className="bg-slate-900/60 border border-slate-700 rounded-lg p-3 text-xs">
        <span className="text-slate-500">Initial proposal:</span>{' '}
        <span className="text-white font-medium capitalize">{transcript.initial_proposal.action_type?.replace(/_/g, ' ')}</span>
        {transcript.initial_proposal.parameters && Object.keys(transcript.initial_proposal.parameters).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {Object.entries(transcript.initial_proposal.parameters).map(([k, v]) => (
              <span key={k} className="px-1.5 py-0.5 bg-slate-800 rounded text-[11px] text-slate-400">
                {k}: <span className="text-slate-300">{String(v)}</span>
              </span>
            ))}
          </div>
        )}
        <p className="text-slate-400 mt-1">{transcript.initial_proposal.reasoning}</p>
      </div>

      {/* Debate turns */}
      {transcript.turns.map((turn, i) => {
        const style = ROLE_STYLES[turn.role];
        const RoleIcon = style.icon;
        return (
          <div key={i} className={`${style.bg} border ${style.border} rounded-lg p-3`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <RoleIcon className={`w-3.5 h-3.5 ${style.text}`} />
                <span className={`text-xs font-semibold uppercase tracking-wider ${style.text}`}>{style.label}</span>
                <span className="text-slate-600 text-xs">{style.desc}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-500">Proposes:</span>
                <span className="text-xs text-white font-medium capitalize">{turn.proposed_action?.replace(/_/g, ' ')}</span>
                <span className="text-xs text-slate-500">{(turn.confidence * 100).toFixed(0)}%</span>
              </div>
            </div>
            <p className="text-xs text-slate-300 mb-2">{turn.argument}</p>
            {/* Show proposed parameters */}
            {turn.proposed_parameters && Object.keys(turn.proposed_parameters).length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {Object.entries(turn.proposed_parameters)
                  .filter(([, v]) => v !== null && v !== undefined && v !== '' && v !== 'none')
                  .map(([k, v]) => (
                    <span key={k} className={`px-1.5 py-0.5 rounded text-[11px] ${style.bg} ${style.text}`}>
                      {k.replace(/_/g, ' ')}: <span className="text-white">{typeof v === 'boolean' ? (v ? 'yes' : 'no') : String(v)}</span>
                    </span>
                  ))}
              </div>
            )}
            {turn.key_points?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {turn.key_points.map((kp, ki) => (
                  <span key={ki} className="px-1.5 py-0.5 bg-slate-700/60 rounded text-[11px] text-slate-300">{kp}</span>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Verdict */}
      <div className="bg-violet-500/10 border border-violet-500/30 rounded-lg p-3">
        <div className="flex items-center space-x-2 mb-2">
          <Gavel className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-violet-400">Verdict</span>
          <span className="text-xs text-white font-medium capitalize">
            {transcript.winner === 'consensus' ? 'Consensus Reached' : `${transcript.winner} Wins`}
          </span>
        </div>
        <div className="flex items-center space-x-3 mb-1">
          <span className="text-xs text-slate-500">Final action:</span>
          <span className="px-2 py-0.5 bg-violet-500/20 text-violet-300 rounded text-xs font-medium capitalize">
            {transcript.final_action_type?.replace(/_/g, ' ')}
          </span>
        </div>
        {/* Show what the debate actually changed */}
        {transcript.changes_from_original && transcript.changes_from_original.length > 0 && (
          <div className="flex items-center flex-wrap gap-1 mb-2">
            <ArrowRight className="w-3 h-3 text-fuchsia-400" />
            <span className="text-xs text-fuchsia-400 font-medium">Debate changed:</span>
            {transcript.changes_from_original.map((change, i) => (
              <span key={i} className="px-1.5 py-0.5 bg-fuchsia-500/15 text-fuchsia-300 rounded text-[11px]">{change}</span>
            ))}
          </div>
        )}
        {/* Show final parameters */}
        {transcript.final_parameters && Object.keys(transcript.final_parameters).length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {Object.entries(transcript.final_parameters)
              .filter(([, v]) => v !== null && v !== undefined && v !== '' && v !== 'none')
              .map(([k, v]) => (
                <span key={k} className="px-1.5 py-0.5 bg-violet-500/20 rounded text-[11px] text-violet-300">
                  {k.replace(/_/g, ' ')}: <span className="text-white">{typeof v === 'boolean' ? (v ? 'yes' : 'no') : String(v)}</span>
                </span>
              ))}
          </div>
        )}
        <p className="text-xs text-slate-400">{transcript.final_reasoning}</p>
        {transcript.judge_rationale && (
          <p className="text-xs text-slate-500 mt-1 italic">Judge: {transcript.judge_rationale}</p>
        )}
      </div>
    </div>
  );
}
