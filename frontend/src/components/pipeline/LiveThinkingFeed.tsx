import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Brain, Search, Scale, Sparkles, Zap, Shield,
  MessageSquare, Database, Lightbulb, CheckCircle2, ArrowRight,
  Swords, Gauge, Code2, Terminal, ChevronRight
} from 'lucide-react';

interface PipelineEvent {
  ticket_id: string;
  timestamp: string;
  type: 'thinking' | 'tool_call' | 'tool_result' | 'decision' | 'status' | 'insight' | 'complete' | 'connected' | 'debate' | 'confidence' | 'tool_synthesis';
  agent: string;
  step: number;
  message: string;
  detail?: any;
}

const AGENT_META: Record<string, { icon: any; label: string; bg: string; border: string; text: string }> = {
  triage:     { icon: Search,   label: 'Triage',      bg: 'bg-blue-500/10',   border: 'border-blue-500/20',   text: 'text-blue-400' },
  research:   { icon: Brain,    label: 'Research',     bg: 'bg-cyan-500/10',   border: 'border-cyan-500/20',   text: 'text-cyan-400' },
  decision:   { icon: Scale,    label: 'Decision',     bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', text: 'text-yellow-400' },
  simulation: { icon: Sparkles, label: 'Simulation',   bg: 'bg-teal-500/10',   border: 'border-teal-500/20',   text: 'text-teal-400' },
  execution:  { icon: Zap,      label: 'Execution',    bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-400' },
  quality:    { icon: Shield,   label: 'Quality',      bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400' },
};

const EVENT_ICONS: Record<string, any> = {
  thinking:        MessageSquare,
  tool_call:       Terminal,
  tool_result:     Database,
  decision:        ArrowRight,
  status:          ChevronRight,
  insight:         Lightbulb,
  complete:        CheckCircle2,
  debate:          Swords,
  confidence:      Gauge,
  tool_synthesis:  Code2,
};

const TYPE_COLORS: Record<string, string> = {
  thinking:        'text-slate-500',
  tool_call:       'text-indigo-400',
  tool_result:     'text-slate-400',
  decision:        'text-white',
  status:          'text-slate-500',
  insight:         'text-emerald-400',
  complete:        'text-green-400',
  debate:          'text-violet-400',
  confidence:      'text-sky-400',
  tool_synthesis:  'text-fuchsia-400',
};

/** Collapsible tool-result block — shows count summary by default, full JSON on expand */
function ToolResultBlock({ detail }: { detail: any }) {
  const [expanded, setExpanded] = useState(false);
  const toggle = useCallback(() => setExpanded(p => !p), []);

  // Build a human-readable summary line
  const count = detail?.count;
  const summary = count !== undefined
    ? `${count} record${count !== 1 ? 's' : ''}`
    : null;
  const raw = JSON.stringify(detail, null, 2);
  const isLarge = raw.length > 300;

  return (
    <div className="ml-16 mt-1 mb-2 max-w-xl">
      {isLarge ? (
        <button
          onClick={toggle}
          className="flex items-center space-x-2 px-2 py-1 rounded bg-black/30 border border-white/5 text-[10px] text-slate-500 font-mono hover:border-white/10 transition-colors w-full text-left"
        >
          <span className="text-slate-600">{expanded ? '▾' : '▸'}</span>
          <span>{summary ?? `${raw.length} chars`} — click to {expanded ? 'collapse' : 'expand'}</span>
        </button>
      ) : null}
      {(!isLarge || expanded) && (
        <div className="p-2 rounded bg-black/30 border border-white/5 text-[10px] text-slate-500 font-mono overflow-x-auto mt-0.5">
          <pre className="whitespace-pre-wrap break-words">{raw}</pre>
        </div>
      )}
    </div>
  );
}

export default function LiveThinkingFeed({ ticketId, mode }: { ticketId: string; mode?: 'live' | 'replay' }) {
  const [events, setEvents] = useState<PipelineEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [currentAgent, setCurrentAgent] = useState<string | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const apiBase = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');
    const es = new EventSource(`${apiBase}/tickets/${ticketId}/stream`);
    eventSourceRef.current = es;

    es.onmessage = (e) => {
      try {
        const event: PipelineEvent = JSON.parse(e.data);
        if (event.type === 'connected') {
          setConnected(true);
          return;
        }
        setEvents(prev => [...prev, event]);
        if (event.type === 'status') {
          setCurrentAgent(event.agent);
        }
      } catch { /* ignore parse errors */ }
    };

    es.onerror = () => {
      setConnected(false);
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [ticketId]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [events]);

  // In live mode, always render the terminal shell (even before events arrive)
  if (events.length === 0 && !connected && mode !== 'live') {
    return null;
  }

  // Group events by agent
  const agentGroups: { agent: string; events: PipelineEvent[] }[] = [];
  let lastAgent = '';
  for (const ev of events) {
    if (ev.agent !== lastAgent) {
      agentGroups.push({ agent: ev.agent, events: [ev] });
      lastAgent = ev.agent;
    } else {
      agentGroups[agentGroups.length - 1].events.push(ev);
    }
  }

  return (
    <div className="glass-panel rounded-2xl overflow-hidden flex flex-col h-[500px] border border-white/5">
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-black/40 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="flex space-x-1.5">
             <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50"></div>
             <div className="w-2.5 h-2.5 rounded-full bg-amber-500/20 border border-amber-500/50"></div>
             <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50"></div>
          </div>
          <div className="h-4 w-px bg-white/10 mx-2"></div>
          <div className="flex items-center space-x-2">
             <Terminal className="w-3.5 h-3.5 text-slate-400" />
             <span className="text-xs font-mono text-slate-400">swarm_link_v1.sh</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
           {currentAgent && AGENT_META[currentAgent] && (
             <div className="flex items-center space-x-2 px-2 py-0.5 rounded bg-white/5 border border-white/5">
               <div className={`w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse`}></div>
               <span className="text-[10px] uppercase font-bold tracking-wider text-slate-300">{AGENT_META[currentAgent].label} Active</span>
             </div>
           )}
           <div className={`px-2 py-0.5 rounded text-[10px] font-mono border ${connected ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
              {connected ? 'CONNECTED' : 'OFFLINE'}
           </div>
        </div>
      </div>

      {/* Terminal Body */}
      <div ref={feedRef} className="flex-1 overflow-y-auto p-6 space-y-6 font-mono text-sm bg-black/20 custom-scrollbar">
        {agentGroups.map((group, gi) => {
          const meta = AGENT_META[group.agent] || { icon: Brain, label: group.agent, bg: 'bg-slate-500/10', border: 'border-slate-500/20', text: 'text-slate-400' };
          const AgentIcon = meta.icon;
          const isComplete = group.events.some(e => e.type === 'complete');
          const isLatestAgent = gi === agentGroups.length - 1;

          return (
            <div key={gi} className="relative group">
              {/* Agent Divider */}
              <div className="flex items-center space-x-3 mb-3 sticky top-0 bg-slate-950/80 backdrop-blur-sm z-10 py-2 -mx-2 px-2 rounded-lg">
                <div className={`p-1.5 rounded-lg ${meta.bg} border ${meta.border}`}>
                  <AgentIcon className={`w-3.5 h-3.5 ${meta.text}`} />
                </div>
                <span className={`text-xs font-bold uppercase tracking-widest ${meta.text}`}>{meta.label} Protocol</span>
                <div className="h-px flex-1 bg-white/5"></div>
              </div>

              {/* Event Logs */}
              <div className="pl-4 border-l border-white/5 space-y-2 ml-2.5">
                {group.events.map((ev, ei) => {
                  const EvIcon = EVENT_ICONS[ev.type] || MessageSquare;
                  const color = TYPE_COLORS[ev.type] || 'text-slate-400';

                  return (
                    <div
                      key={ei}
                      className={`text-xs md:text-sm group/line hover:bg-white/[0.02] -mx-2 px-2 py-0.5 rounded transition-colors`}
                    >
                      <div className="flex items-start space-x-3">
                        <span className="text-[10px] text-slate-700 w-12 flex-shrink-0 pt-0.5 font-sans">{ev.timestamp.split('T')[1].split('.')[0]}</span>
                        <EvIcon className={`w-3 h-3 mt-0.5 flex-shrink-0 opacity-50 ${color}`} />
                        <span className={`${color} leading-relaxed break-words`}>
                          {ev.message}
                        </span>
                      </div>

                      {/* Debate Block — Chat-style conversation */}
                      {ev.type === 'debate' && ev.detail?.role && (
                        <div className={`ml-6 mt-3 mb-3 max-w-2xl flex ${ev.detail.role === 'optimist' ? 'justify-start' : 'justify-end'}`}>
                          <div className={`flex items-start space-x-3 max-w-[85%] ${ev.detail.role === 'pragmatist' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                            {/* Avatar */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-black shadow-lg ${
                              ev.detail.role === 'optimist' 
                                ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/30' 
                                : 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/30'
                            }`}>
                              {ev.detail.role === 'optimist' ? '🛡️' : '⚖️'}
                            </div>
                            
                            {/* Chat Bubble */}
                            <div className={`rounded-2xl px-4 py-3 border backdrop-blur-sm ${
                              ev.detail.role === 'optimist'
                                ? 'bg-emerald-500/10 border-emerald-500/20 rounded-tl-sm'
                                : 'bg-amber-500/10 border-amber-500/20 rounded-tr-sm'
                            }`}>
                              {/* Role Label */}
                              <div className="flex items-center justify-between mb-1.5">
                                <span className={`text-[10px] font-bold uppercase tracking-widest ${
                                  ev.detail.role === 'optimist' ? 'text-emerald-400' : 'text-amber-400'
                                }`}>
                                  {ev.detail.role === 'optimist' ? '🟢 Optimist · Customer Advocate' : '🟠 Pragmatist · Policy Guardian'}
                                </span>
                              </div>

                              {/* Proposed Action */}
                              {ev.detail.proposed_action && (
                                <p className="text-sm text-white font-medium mb-2 leading-relaxed">
                                  "{ev.detail.proposed_action}"
                                </p>
                              )}

                              {/* Argument / Message */}
                              {ev.detail.argument && (
                                <p className="text-xs text-slate-300 leading-relaxed mb-2">
                                  {ev.detail.argument}
                                </p>
                              )}

                              {/* Key Points as conversational bullets */}
                              {ev.detail.key_points?.length > 0 && (
                                <div className="space-y-1 mt-2 pt-2 border-t border-white/5">
                                  {ev.detail.key_points.map((kp: string, ki: number) => (
                                    <div key={ki} className="flex items-start space-x-2 text-xs">
                                      <span className={`mt-0.5 ${ev.detail.role === 'optimist' ? 'text-emerald-500' : 'text-amber-500'}`}>→</span>
                                      <span className="text-slate-400">{kp}</span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Confidence Badge */}
                              {ev.detail.confidence != null && (
                                <div className={`mt-2 inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-mono ${
                                  ev.detail.role === 'optimist' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                                }`}>
                                  <span>confidence: {(ev.detail.confidence * 100).toFixed(0)}%</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Tool Call Block */}
                      {ev.type === 'tool_call' && ev.detail?.tool_name && (
                        <div className="ml-16 mt-1 mb-2">
                          <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded bg-indigo-500/10 border border-indigo-500/20 text-[10px] text-indigo-300 font-mono">
                            <span className="text-indigo-500 select-none">$</span>
                            <span className="font-semibold">
                              {ev.detail.tool_name
                                .replace(/^supportgenius\./, '')
                                .replace(/^platform\.core\./, '')
                                .replace(/_/g, ' ')}
                            </span>
                            {ev.detail.params && Object.keys(ev.detail.params).length > 0 && (
                              <span className="text-slate-500">
                                ({Object.entries(ev.detail.params as Record<string,unknown>)
                                  .slice(0, 2)
                                  .map(([k, v]) => `${k}: ${String(v).substring(0, 30)}`)
                                  .join(', ')}
                                {Object.keys(ev.detail.params).length > 2 ? ', ...' : ''})
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Tool Result Block */}
                      {ev.type === 'tool_result' && ev.detail && (
                        <ToolResultBlock detail={ev.detail} />
                      )}
                    </div>
                  );
                })}
                
                {/* Typing Indicator */}
                {!isComplete && isLatestAgent && (
                  <div className="flex items-center space-x-2 text-xs text-slate-600 pl-16 pt-2 pb-4">
                    <span className="w-1.5 h-3 bg-indigo-500 animate-pulse"></span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {events.length === 0 && connected && (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-4">
            <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center animate-pulse">
               <Terminal className="w-5 h-5 opacity-50" />
            </div>
            <p className="text-xs uppercase tracking-widest font-semibold">Awaiting Uplink...</p>
          </div>
        )}
      </div>
    </div>
  );
}
