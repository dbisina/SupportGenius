import { Swords, Gavel, ArrowRight } from 'lucide-react';

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

export default function DebateLog({ transcript }: { transcript: DebateTranscript }) {
  if (!transcript || !transcript.turns?.length) return null;

  return (
    <div className="mt-4 space-y-4">
      {/* Header Banner */}
      <div className="flex items-center space-x-3 px-4 py-3 rounded-xl bg-violet-500/10 border border-violet-500/20">
        <Swords className="w-5 h-5 text-violet-400" />
        <div>
          <h4 className="text-sm font-bold text-violet-300 uppercase tracking-wider">Adversarial Peer Review</h4>
          <p className="text-xs text-violet-400/60">Two AI personas debate the optimal resolution</p>
        </div>
        {transcript.consensus_reached && (
          <span className="ml-auto px-2.5 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-bold uppercase tracking-wider border border-green-500/20">
            Consensus
          </span>
        )}
      </div>

      {/* Initial Proposal */}
      <div className="flex justify-center">
        <div className="bg-slate-800/80 border border-slate-700/50 rounded-xl px-4 py-3 max-w-md text-center">
          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Decision Agent Proposes</span>
          <p className="text-sm text-white font-semibold capitalize mt-1">{transcript.initial_proposal.action_type?.replace(/_/g, ' ')}</p>
          <p className="text-xs text-slate-400 mt-1">{transcript.initial_proposal.reasoning}</p>
          {transcript.initial_proposal.parameters && Object.keys(transcript.initial_proposal.parameters).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2 justify-center">
              {Object.entries(transcript.initial_proposal.parameters).map(([k, v]) => (
                <span key={k} className="px-1.5 py-0.5 bg-slate-700 rounded text-[11px] text-slate-300">
                  {k}: <span className="text-white">{String(v)}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Conversation */}
      <div className="space-y-3 py-2">
        {transcript.turns.map((turn, i) => {
          const isOptimist = turn.role === 'optimist';
          return (
            <div 
              key={i} 
              className={`flex ${isOptimist ? 'justify-start' : 'justify-end'}`}
            >
              <div className={`flex items-start space-x-3 max-w-[80%] ${!isOptimist ? 'flex-row-reverse space-x-reverse' : ''}`}>
                {/* Avatar */}
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm shadow-lg border-2 ${
                  isOptimist 
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/30 border-emerald-400/30' 
                    : 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/30 border-amber-400/30'
                }`}>
                  {isOptimist ? '🛡️' : '⚖️'}
                </div>

                {/* Chat Bubble */}
                <div className={`rounded-2xl px-4 py-3 border backdrop-blur-sm ${
                  isOptimist
                    ? 'bg-emerald-500/10 border-emerald-500/20 rounded-tl-sm'
                    : 'bg-amber-500/10 border-amber-500/20 rounded-tr-sm'
                }`}>
                  {/* Role Label */}
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${
                      isOptimist ? 'text-emerald-400' : 'text-amber-400'
                    }`}>
                      {isOptimist ? '🟢 Optimist · Customer Advocate' : '🟠 Pragmatist · Policy Guardian'}
                    </span>
                  </div>

                  {/* Proposed Action */}
                  <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize mb-2 ${
                    isOptimist ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    Proposes: {turn.proposed_action?.replace(/_/g, ' ')}
                  </div>

                  {/* Argument - the main "chat message" */}
                  <p className="text-sm text-slate-200 leading-relaxed mb-2">
                    {turn.argument}
                  </p>

                  {/* Parameters */}
                  {turn.proposed_parameters && Object.keys(turn.proposed_parameters).length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {Object.entries(turn.proposed_parameters)
                        .filter(([, v]) => v !== null && v !== undefined && v !== '' && v !== 'none')
                        .map(([k, v]) => (
                          <span key={k} className={`px-1.5 py-0.5 rounded text-[11px] ${
                            isOptimist ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'
                          }`}>
                            {k.replace(/_/g, ' ')}: <span className="text-white">{typeof v === 'boolean' ? (v ? 'yes' : 'no') : String(v)}</span>
                          </span>
                        ))}
                    </div>
                  )}

                  {/* Key Points */}
                  {turn.key_points?.length > 0 && (
                    <div className="space-y-1 pt-2 border-t border-white/5">
                      {turn.key_points.map((kp, ki) => (
                        <div key={ki} className="flex items-start space-x-2 text-xs">
                          <span className={`mt-0.5 ${isOptimist ? 'text-emerald-500' : 'text-amber-500'}`}>→</span>
                          <span className="text-slate-400">{kp}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Confidence */}
                  <div className={`mt-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono ${
                    isOptimist ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    confidence: {(turn.confidence * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Verdict Banner */}
      <div className="relative bg-violet-500/10 border border-violet-500/30 rounded-2xl p-5 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 via-transparent to-violet-500/5 pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center border border-violet-500/30">
              <Gavel className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-violet-400">Final Verdict</span>
              <span className="text-sm text-white font-semibold capitalize ml-2">
                {transcript.winner === 'consensus' ? '🤝 Consensus Reached' : `${transcript.winner === 'optimist' ? '🟢' : '🟠'} ${transcript.winner} Prevails`}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3 mb-2">
            <span className="text-xs text-slate-500">Final action:</span>
            <span className="px-3 py-1 bg-violet-500/20 text-violet-300 rounded-lg text-xs font-bold capitalize border border-violet-500/20">
              {transcript.final_action_type?.replace(/_/g, ' ')}
            </span>
          </div>

          {transcript.changes_from_original && transcript.changes_from_original.length > 0 && (
            <div className="flex items-center flex-wrap gap-1 mb-2 mt-3 px-3 py-2 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/20">
              <ArrowRight className="w-3 h-3 text-fuchsia-400" />
              <span className="text-xs text-fuchsia-400 font-bold uppercase tracking-wider">Debate Changed:</span>
              {transcript.changes_from_original.map((change, i) => (
                <span key={i} className="px-2 py-0.5 bg-fuchsia-500/15 text-fuchsia-300 rounded text-[11px] font-medium">{change}</span>
              ))}
            </div>
          )}

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

          <p className="text-sm text-slate-300 leading-relaxed">{transcript.final_reasoning}</p>
          {transcript.judge_rationale && (
            <p className="text-xs text-slate-500 mt-2 italic border-t border-white/5 pt-2">
              🧑‍⚖️ Judge: {transcript.judge_rationale}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
