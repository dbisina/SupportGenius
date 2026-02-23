import { useEffect, useState } from 'react';
import { Zap, RefreshCw, Terminal, Shield, Brain, Network, Cpu, ArrowRight, Database } from 'lucide-react';
import { getAgentStatus } from '../services/api';

interface AgentInfo {
  active: boolean;
  current_task: string | null;
  last_active: string | null;
  total_processed: number;
}

const AGENT_CONFIG: Record<string, { name: string; role: string; icon: any; color: string; description: string }> = {
  triage: {
    name: 'Triage Unit',
    role: 'Classification',
    icon: Brain,
    color: 'text-purple-400',
    description: 'Analyzes incoming request intent and sentiment.',
  },
  research: {
    name: 'Research Unit',
    role: 'Context Retrieval',
    icon: Network,
    color: 'text-blue-400',
    description: 'Queries knowledge base for relevant context.',
  },
  decision: {
    name: 'Decision Core',
    role: 'Reasoning',
    icon: Cpu,
    color: 'text-emerald-400',
    description: 'Formulates response strategy and logic.',
  },
  execution: {
    name: 'Execution Unit',
    role: 'Action',
    icon: Zap,
    color: 'text-amber-400',
    description: 'Performs tools calls and drafts final response.',
  },
  quality: {
    name: 'QA Sentinel',
    role: 'Validation',
    icon: Shield,
    color: 'text-rose-400',
    description: 'Ensures safety and policy compliance.',
  },
};

const PIPELINE_ORDER = ['triage', 'research', 'decision', 'execution', 'quality'];

export default function Agents() {
  const [agents, setAgents] = useState<Record<string, AgentInfo>>({});
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  useEffect(() => {
    loadAgents();
    const interval = setInterval(loadAgents, 3000); 
    return () => clearInterval(interval);
  }, []);

  const loadAgents = async () => {
    try {
      const status = await getAgentStatus();
      setAgents(status);
    } catch (error) {
      console.error('Failed to load agent status:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-bold tracking-tight text-white mb-2">Neural Swarm</h2>
          <p className="text-slate-400 max-w-2xl">Live visualization of the autonomous agent pipeline.</p>
        </div>
        <div className="flex space-x-3">
          <div className="hidden md:flex items-center px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-sm text-slate-300">
             <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-2"></span>
             Swarm Active
          </div>
          <button
            onClick={loadAgents}
            disabled={loading}
            className="flex items-center space-x-2 bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-xl transition-colors disabled:opacity-50 text-sm font-medium border border-white/5"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Pipeline Visualization */}
      <div className="glass-panel rounded-3xl p-8 lg:p-12 relative overflow-hidden min-h-[400px] flex items-center justify-center">
        {/* Background Grid */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
        <div className="absolute inset-0 bg-slate-950/50 pointer-events-none"></div>
        
        {/* Connecting Lines (SVG) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(99, 102, 241, 0.1)" />
              <stop offset="50%" stopColor="rgba(99, 102, 241, 0.5)" />
              <stop offset="100%" stopColor="rgba(99, 102, 241, 0.1)" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Main Horizontal Line */}
          <line 
            x1="10%" y1="50%" x2="90%" y2="50%" 
            stroke="url(#lineGradient)" 
            strokeWidth="2"
            strokeDasharray="4 4" 
            className="animate-pulse"
          />
          {/* Animated Packet */}
          <circle r="3" fill="#818cf8" filter="url(#glow)">
            <animateMotion 
              dur="4s" 
              repeatCount="indefinite"
              path="M 100,200 L 1100,200" // Approximation, in real app needs responsive calculation
              calcMode="linear"
            />
          </circle>
        </svg>

        <div className="relative z-10 flex flex-wrap justify-center gap-8 lg:gap-16 w-full max-w-6xl">
          {PIPELINE_ORDER.map((key, index) => {
            const config = AGENT_CONFIG[key];
            const agentData = agents[key];
            const isActive = agentData?.active;
            const Icon = config.icon;
            const isSelected = selectedAgent === key;

            return (
              <div key={key} className="relative group perspective-1000">
                {/* Connector Arrow (except last) */}
                {index < PIPELINE_ORDER.length - 1 && (
                  <div className="absolute top-1/2 -right-12 lg:-right-20 -translate-y-1/2 text-slate-700 hidden lg:block">
                    <ArrowRight className="w-6 h-6 opacity-20 group-hover:opacity-50 transition-opacity" />
                  </div>
                )}

                <button
                  onClick={() => setSelectedAgent(isSelected ? null : key)}
                  className={`w-48 relative transition-all duration-500 transform-gpu ${isSelected ? 'scale-110 -translate-y-4' : 'hover:scale-105 hover:-translate-y-2'}`}
                >
                  <div className={`glass-panel rounded-2xl p-0.5 overflow-hidden transition-all duration-500 ${isActive ? 'shadow-[0_0_30px_rgba(99,102,241,0.3)] border-indigo-500/50' : 'border-white/5 opacity-80'}`}>
                    <div className="bg-slate-950/90 rounded-2xl p-5 h-full relative overflow-hidden">
                      {/* Active Glow Background */}
                      {isActive && (
                        <div className="absolute inset-0 bg-indigo-500/10 animate-pulse-slow pointer-events-none" />
                      )}

                      <div className="flex flex-col items-center text-center relative z-10">
                        <div className={`p-3 rounded-xl mb-3 transition-colors duration-300 ${isActive ? 'bg-indigo-500/20' : 'bg-white/5'} ring-1 ring-white/10`}>
                          <Icon className={`w-8 h-8 ${config.color} ${isActive ? 'animate-pulse' : 'opacity-50'}`} />
                        </div>
                        
                        <h3 className="font-bold text-white text-lg mb-0.5">{config.name}</h3>
                        <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-3">{config.role}</p>
                        
                        {isActive ? (
                          <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                            <span className="text-[10px] font-bold text-emerald-400 uppercase">Processing</span>
                          </div>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-600 uppercase border border-white/5 px-2 py-0.5 rounded-full">Standby</span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail View / Agent Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6 min-h-[300px]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-lg text-white flex items-center">
              <Terminal className="w-5 h-5 mr-2 text-indigo-400" />
              Swarm Intelligence Logs
            </h3>
            <div className="flex space-x-2">
               <span className="w-3 h-3 rounded-full bg-rose-500/20 border border-rose-500/50"></span>
               <span className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/50"></span>
               <span className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/50"></span>
            </div>
          </div>
          
          <div className="font-mono text-sm space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex space-x-3 text-slate-400 hover:bg-white/5 p-2 rounded transition-colors group cursor-default">
                <span className="text-slate-600 whitespace-nowrap">14:2{i}:45</span>
                <span>
                   <span className="text-indigo-400 font-bold">[Decision Core]</span> Evaluating confidence score for response to Ticket #2938... <span className="text-emerald-500">98% OK</span>
                </span>
              </div>
            ))}
            {/* Real logs would be mapped here */}
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6">
           <h3 className="font-semibold text-lg text-white mb-4 flex items-center">
              <Database className="w-5 h-5 mr-2 text-purple-400" />
              Knowledge Hits
           </h3>
           <div className="space-y-4">
              <div className="bg-white/5 rounded-xl p-4 border border-white/5 hover:border-purple-500/30 transition-all cursor-pointer">
                 <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">PDF</span>
                    <span className="text-[10px] text-slate-500">98% match</span>
                 </div>
                 <p className="text-sm font-medium text-slate-200">Return_Policy_2024.pdf</p>
                 <p className="text-xs text-slate-500 mt-1 line-clamp-2">Standard return window is 30 days for all electronics and 60 days for...</p>
              </div>
              
              <div className="bg-white/5 rounded-xl p-4 border border-white/5 hover:border-purple-500/30 transition-all cursor-pointer">
                 <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">Notion</span>
                    <span className="text-[10px] text-slate-500">84% match</span>
                 </div>
                 <p className="text-sm font-medium text-slate-200">Troubleshooting Guide: Device Sync</p>
                 <p className="text-xs text-slate-500 mt-1 line-clamp-2">If device fails to sync, first ensure bluetooth permissions are enabled...</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
