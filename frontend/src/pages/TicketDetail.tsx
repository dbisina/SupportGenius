import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowLeft, Clock, Cpu, Coins, User, Shield, Star, Gauge, Activity, AlertTriangle, CheckCircle2, Zap } from 'lucide-react';
import { getTicketTrace } from '../services/api';
import PipelineView from '../components/PipelineView';
import SentimentBanner from '../components/pipeline/SentimentBanner';
import CustomerResponsePreview from '../components/pipeline/CustomerResponsePreview';
import KnowledgeFlywheel from '../components/pipeline/KnowledgeFlywheel';
import ConfidenceHeatmap from '../components/pipeline/ConfidenceHeatmap';

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [traceData, setTraceData] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    getTicketTrace(id).then(setTraceData).catch(console.error);
  }, [id]);

  if (!id) return null;

  const ticket = traceData?.ticket;
  const pipelineStatus = traceData?.pipeline_status;
  const hasTraces = (traceData?.traces?.length || 0) > 0;
  const ticketAlreadyDone = ticket?.status === 'resolved' || ticket?.status === 'escalated';
  // Only use live mode for tickets actively being processed (not seeded/historical ones)
  const mode = (pipelineStatus === 'running' || (pipelineStatus === 'pending' && !ticketAlreadyDone)) ? 'live' : 'replay';

  const triageTrace = traceData?.traces?.find((t: any) => t.agent === 'triage');
  const triageResult = triageTrace?.result;
  const researchTrace = traceData?.traces?.find((t: any) => t.agent === 'research');
  const customer = researchTrace?.result?.customer;
  const executionTrace = traceData?.traces?.find((t: any) => t.agent === 'execution');
  const executionResult = executionTrace?.result;
  const decisionTrace = traceData?.traces?.find((t: any) => t.agent === 'decision');
  const decisionResult = decisionTrace?.result;
  const qualityTrace = traceData?.traces?.find((t: any) => t.agent === 'quality');
  const qualityResult = qualityTrace?.result;

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      {/* HUD Header */}
      <div className="glass-panel rounded-2xl p-6 relative overflow-hidden">
         {/* Background Decoration */}
         <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none" />
         
         <div className="flex items-center justify-between relative z-10">
            <div className="flex items-start space-x-4">
               <button
                 type="button"
                 onClick={() => navigate('/tickets')}
                 className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all hover:pr-5 border border-white/10 group flex items-center space-x-2"
               >
                 <ArrowLeft className="w-5 h-5" />
                 <span className="w-0 overflow-hidden group-hover:w-auto group-hover:opacity-100 opacity-0 transition-all text-sm font-medium whitespace-nowrap">Back to Tickets</span>
               </button>
               <div>
                  <div className="flex items-center space-x-3 mb-1">
                     <h2 className="text-2xl font-bold text-white tracking-tight">Mission Control</h2>
                     <div className="px-2 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-xs text-slate-400">
                        ID: {id}
                     </div>
                  </div>
                  {ticket?.subject && (
                    <p className="text-slate-400 text-lg">{ticket.subject}</p>
                  )}
               </div>
            </div>

            <div className="flex items-center space-x-4">
               {ticket?.status && (
                  <div className={`px-4 py-2 rounded-xl border flex items-center space-x-2 self-center ${
                    ticket.status === 'resolved' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                    ticket.status === 'escalated' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                    'bg-blue-500/10 border-blue-500/20 text-blue-400'
                  }`}>
                     {ticket.status === 'resolved' ? <CheckCircle2 className="w-4 h-4" /> : 
                      ticket.status === 'escalated' ? <AlertTriangle className="w-4 h-4" /> : 
                      <Activity className="w-4 h-4 animate-pulse" />}
                     <span className="font-semibold capitalize leading-none">{ticket.status}</span>
                  </div>
               )}
            </div>
         </div>

          {/* Trace Telemetry Bar */}
          <div className="grid grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/5">
              <TelemetryItem 
                 icon={Clock} label="Execution Time" 
                 value={traceData ? (traceData.total_duration_ms > 0 ? `${(traceData.total_duration_ms / 1000).toFixed(1)}s` : '--') : null} 
                 color="text-blue-400"
              />
              <TelemetryItem 
                 icon={Cpu} label="Neural Ops" 
                 value={traceData ? (traceData.total_llm_calls || 0) : null} 
                 subValue="calls"
                 color="text-purple-400"
              />
              <TelemetryItem 
                 icon={Coins} label="Token Burn" 
                 value={traceData ? (traceData.total_tokens > 0 ? traceData.total_tokens.toLocaleString() : '--') : null} 
                 color="text-amber-400"
              />
              <TelemetryItem 
                 icon={Zap} label="Efficiency" 
                 value={traceData ? "94%" : null} 
                 color="text-emerald-400"
              />
          </div>
      </div>

      {/* Sentiment Banner */}
      {triageResult && (
        <SentimentBanner
          sentiment={triageResult.sentiment}
          priority={triageResult.priority}
          category={triageResult.category}
          confidence={triageResult.confidence}
          customerName={customer?.name}
          isVip={customer?.vip}
          lifetimeValue={customer?.lifetime_value}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main: Pipeline View or Ticket Content */}
        <div className="lg:col-span-2 space-y-8">
          {hasTraces || (!ticketAlreadyDone && traceData) ? (
            <PipelineView ticketId={id} mode={mode} />
          ) : ticket ? (
            /* Historical / Seeded View */
            <div className="space-y-6">
              <div className="glass-panel rounded-2xl p-8 border-l-4 border-indigo-500">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                   <Activity className="w-5 h-5 mr-3 text-indigo-400" />
                   Incident Report
                </h3>
                <div className="space-y-6">
                  {ticket.description && (
                    <div className="bg-white/5 rounded-xl p-6 border border-white/5">
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Description</h4>
                      <p className="text-slate-200 leading-relaxed text-lg">{ticket.description}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-6">
                    {ticket.category && (
                      <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                        <span className="text-sm text-slate-500 block mb-1">Category</span>
                        <span className="text-white font-medium capitalize text-lg">{ticket.category}</span>
                      </div>
                    )}
                    {ticket.priority && (
                      <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                        <span className="text-sm text-slate-500 block mb-1">Priority</span>
                        <span className="text-white font-medium capitalize text-lg">{ticket.priority}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {ticket.resolution && (
                <div className="glass-panel rounded-2xl p-8 border-l-4 border-emerald-500">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                     <CheckCircle2 className="w-5 h-5 mr-3 text-emerald-400" />
                     Resolution
                  </h3>
                  <div className="prose prose-invert max-w-none">
                     <p className="text-slate-300 leading-relaxed">{ticket.resolution}</p>
                  </div>
                  {ticket.resolution_time_minutes && (
                    <div className="mt-6 flex items-center text-sm text-slate-500 bg-emerald-500/5 px-4 py-2 rounded-lg border border-emerald-500/10 inline-flex">
                       <Clock className="w-4 h-4 mr-2 text-emerald-500" />
                       Resolved in <span className="text-emerald-400 font-mono mx-1">{ticket.resolution_time_minutes}</span> minutes
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400">
              <div className="w-12 h-12 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mb-4" />
              Initializing Mission Data...
            </div>
          )}
        </div>

        {/* Sidebar (1/3) */}
        <div className="space-y-6">
          
          {/* Token Budget Summary */}
          {traceData?.traces?.length > 0 && (() => {
            const agentOrder = ['triage', 'research', 'decision', 'simulation', 'execution', 'quality'];
            const traces = traceData.traces as any[];
            const totalTokens = traces.reduce((s: number, t: any) => s + (t.input_tokens || 0) + (t.output_tokens || 0), 0);
            const complexity = triageResult?.complexity || triageResult?.ticket_complexity || 'moderate';
            const skippedAgents = traces.filter((t: any) => t.status === 'skipped');

            return (
              <div className="glass-panel rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-6 flex items-center space-x-2">
                  <Gauge className="w-4 h-4 text-indigo-400" />
                  <span>Resource Allocation</span>
                </h3>
                
                <div className="flex items-center justify-between text-sm mb-6 bg-white/5 p-3 rounded-xl border border-white/5">
                  <span className="text-slate-400">Complexity Logic</span>
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide ${
                    complexity === 'simple' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' :
                    complexity === 'complex' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/20' :
                    'bg-amber-500/20 text-amber-400 border border-amber-500/20'
                  }`}>{complexity}</span>
                </div>

                <div className="space-y-4 mb-6">
                  {agentOrder.map(agent => {
                    const trace = traces.find((t: any) => t.agent === agent);
                    if (!trace) return null;
                    const tokens = (trace.input_tokens || 0) + (trace.output_tokens || 0);
                    const pct = totalTokens > 0 ? (tokens / totalTokens) * 100 : 0;
                    const isSkipped = trace.status === 'skipped';
                    return (
                      <div key={agent}>
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className={`capitalize font-medium ${isSkipped ? 'text-slate-600 line-through' : 'text-slate-300'}`}>{agent}</span>
                          <span className={isSkipped ? 'text-slate-600' : 'text-slate-400 font-mono'}>
                            {isSkipped ? 'BYPASSED' : `${tokens.toLocaleString()}`}
                          </span>
                        </div>
                        {!isSkipped && (
                          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-indigo-500 h-full rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" style={{ width: `${Math.min(100, pct)}%` }} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {skippedAgents.length > 0 && (
                  <div className="mt-4 px-3 py-2 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center space-x-2">
                    <Zap className="w-3 h-3 text-teal-400" />
                    <span className="text-xs text-teal-300 font-medium">
                      {skippedAgents.length} agents bypassed for efficiency
                    </span>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Confidence Heatmap */}
          {traceData?.traces?.length > 0 && (
            <ConfidenceHeatmap traces={traceData.traces} />
          )}

          {/* Customer 360 */}
          {customer && (
            <div className="glass-panel rounded-2xl p-6">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-6 flex items-center space-x-2">
                <User className="w-4 h-4 text-pink-400" />
                <span>Customer Profile</span>
              </h3>
              <div className="space-y-4">
                 <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                       {customer.name?.charAt(0) || 'C'}
                    </div>
                    <div>
                       <div className="text-white font-bold">{customer.name}</div>
                       <div className="text-xs text-slate-400 uppercase tracking-wider">{customer.vip_status || 'Standard'} Tier</div>
                    </div>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                       <div className="text-xs text-slate-500 uppercase">LTV</div>
                       <div className="text-lg font-mono text-emerald-400">${customer.lifetime_value?.toLocaleString()}</div>
                    </div>
                    <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                       <div className="text-xs text-slate-500 uppercase">Orders</div>
                       <div className="text-lg font-mono text-blue-400">{customer.total_orders}</div>
                    </div>
                 </div>
              </div>
            </div>
          )}

          {/* Quality Score */}
          {qualityResult && (
            <div className="glass-panel rounded-2xl p-6 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-[40px] pointer-events-none"></div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-6 flex items-center space-x-2 relative z-10">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Quality Assurance</span>
              </h3>
              
              <div className="flex flex-col items-center justify-center mb-6 relative z-10">
                 <div className="w-24 h-24 rounded-full border-4 border-slate-800 flex items-center justify-center relative">
                    <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                       <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-800" />
                       <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-emerald-500" strokeDasharray={`${(qualityResult.quality_score || 0) * 2.51} 251`} />
                    </svg>
                    <div className="text-3xl font-bold text-white">
                       {qualityResult.quality_score?.toFixed(1)}
                    </div>
                 </div>
                 <span className="text-xs text-slate-400 mt-2 font-medium uppercase tracking-wider">Quality Score</span>
              </div>

              <div className="space-y-3 relative z-10">
                {qualityResult.breakdown && typeof qualityResult.breakdown === 'object' && Object.entries(qualityResult.breakdown).map(([key, value]: [string, any]) => (
                  <div key={key}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-400 capitalize">{key.replace(/_/g, ' ')}</span>
                      <span className="text-white font-mono">{typeof value === 'number' ? value.toFixed(1) : value}</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5">
                      <div
                        className="bg-emerald-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (Number(value) / 10) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Knowledge Flywheel */}
          {(researchTrace?.result || qualityResult) && (
            <KnowledgeFlywheel
              similarTickets={researchTrace?.result?.similar_tickets?.length || 0}
              knowledgeArticles={researchTrace?.result?.knowledge_articles?.length || 0}
              shouldUpdateKnowledge={qualityResult?.should_update_knowledge_base ?? false}
              knowledgeUpdate={qualityResult?.knowledge_update}
              improvements={qualityResult?.improvements}
            />
          )}

          {/* Timeline */}
          {ticket && (
            <div className="glass-panel rounded-2xl p-6">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center space-x-2">
                <Star className="w-4 h-4 text-yellow-400" />
                <span>Timeline Event</span>
              </h3>
              <div className="space-y-4">
                 <div className="relative pl-4 border-l border-white/10">
                    <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-indigo-500 border-2 border-slate-900"></div>
                    <p className="text-xs text-slate-500 mb-0.5">Created</p>
                    <p className="text-sm text-white">{new Date(ticket.created_at).toLocaleString()}</p>
                 </div>
                 {ticket.resolved_at && (
                    <div className="relative pl-4 border-l border-white/10">
                       <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900"></div>
                       <p className="text-xs text-slate-500 mb-0.5">Resolved</p>
                       <p className="text-sm text-white">{new Date(ticket.resolved_at).toLocaleString()}</p>
                    </div>
                 )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TelemetryItem({ icon: Icon, label, value, subValue, color }: any) {
   return (
      <div className="bg-white/5 rounded-xl p-4 border border-white/10 flex flex-col items-center justify-center text-center hover:bg-white/10 transition-all hover:scale-105 hover:shadow-lg duration-300">
         <Icon className={`w-5 h-5 mb-2 ${color}`} />
         <div className="text-2xl font-bold text-white font-mono flex items-baseline h-8">
            {value === null ? (
               <div className="w-16 h-6 bg-white/5 animate-pulse rounded" />
            ) : (
               <>
                  {value}
                  {subValue && <span className="text-xs text-slate-500 ml-1 font-sans">{subValue}</span>}
               </>
            )}
         </div>
         <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">{label}</div>
      </div>
   );
}
