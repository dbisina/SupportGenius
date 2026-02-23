import { useEffect, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertCircle, CheckCircle2, Clock, TrendingUp, Zap, Bot, Activity, ExternalLink } from 'lucide-react';
import { getMetrics, getAgentActivity, getImpactMetrics } from '../services/api';

interface ActivityEvent {
  id: string;
  agent: string;
  action: string;
  ticket_id: string;
  timestamp: string;
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState<any>(null);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [impact, setImpact] = useState<any>(null);

  // Mock chart data - in a real app this would come from the API
  const chartData = [
    { name: '00:00', tickets: 12, resolved: 10 },
    { name: '04:00', tickets: 8, resolved: 6 },
    { name: '08:00', tickets: 45, resolved: 32 },
    { name: '12:00', tickets: 89, resolved: 65 },
    { name: '16:00', tickets: 72, resolved: 58 },
    { name: '20:00', tickets: 24, resolved: 20 },
    { name: '23:59', tickets: 15, resolved: 14 },
  ];

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [metricsData, activityData, impactData] = await Promise.all([
        getMetrics(),
        getAgentActivity(10).catch(() => []),
        getImpactMetrics().catch(() => null),
      ]);
      setMetrics(metricsData);
      setActivity(prev => {
        const newEventsArray = Array.isArray(activityData) ? activityData : [];
        const combined = [...newEventsArray, ...prev];
        const unique = combined.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
        return unique.slice(0, 15);
      });
      setImpact(impactData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-4xl font-bold tracking-tight text-white mb-2">Command Center</h2>
          <p className="text-slate-400 max-w-2xl">Real-time supervision of autonomous support agents.</p>
        </div>
        <div className="flex space-x-3">
          <div className="hidden md:flex items-center px-4 py-2 rounded-xl bg-white/10 border border-white/10 text-sm text-slate-300 backdrop-blur-md shadow-inner">
             <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-2 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>
             Live Data Feed
          </div>
          <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-xl font-medium transition-all duration-300 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-1 active:scale-95 text-sm flex items-center group">
            <Bot className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform" />
            Deploy Agent
          </button>
        </div>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Metric Cards - Row 1 */}
        <BentoCard 
          title="Active Tickets" 
          value={metrics?.total_tickets || "142"} 
          trend="+12%" 
          trendUp={false}
          icon={AlertCircle}
          color="text-rose-400"
          bg="bg-rose-500/10"
          className="col-span-1"
        />
        <BentoCard 
          title="Avg Resolution" 
          value={metrics?.avg_resolution_time ? `${metrics.avg_resolution_time}m` : "1h 24m"} 
          trend="-8%" 
          trendUp={true}
          icon={Clock}
          color="text-indigo-400"
          bg="bg-indigo-500/10"
          className="col-span-1"
        />
        <BentoCard 
          title="Automated Rate" 
          value={metrics?.automation_rate ? `${Number(metrics.automation_rate).toFixed(2)}%` : "64.00%"} 
          trend="+5%" 
          trendUp={true}
          icon={Zap}
          color="text-amber-400"
          bg="bg-amber-500/10"
          className="col-span-1"
        />
        <BentoCard 
          title="Customer CSAT" 
          value={metrics?.customer_satisfaction || "98.2%"} 
          trend="+2%" 
          trendUp={true}
          icon={CheckCircle2}
          color="text-emerald-400"
          bg="bg-emerald-500/10"
          className="col-span-1"
        />

        {/* Main Chart - Large Block */}
        <div className="col-span-1 md:col-span-2 lg:col-span-3 glass-panel rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
            <button aria-label="Open in full view" className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors">
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
          <div className="mb-6">
            <h3 className="font-semibold text-lg text-white flex items-center">
               Traffic Volume
               <span className="ml-3 text-xs font-normal text-slate-500 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">Real-time</span>
            </h3>
            <p className="text-sm text-slate-400">Incoming tickets vs Automated resolutions</p>
          </div>
          <div className="h-[280px] w-full -ml-4 pr-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTickets" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#f8fafc', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                  itemStyle={{ color: '#e2e8f0' }}
                  cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
                />
                <Area type="monotone" dataKey="tickets" stroke="#818cf8" strokeWidth={3} fillOpacity={1} fill="url(#colorTickets)" />
                <Area type="monotone" dataKey="resolved" stroke="#34d399" strokeWidth={3} fillOpacity={1} fill="url(#colorResolved)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Feed - Vertical Strip */}
        <div className="col-span-1 lg:col-start-4 lg:row-start-2 lg:row-span-2 glass-panel rounded-2xl p-0 flex flex-col overflow-hidden h-[400px] lg:h-auto">
          <div className="p-5 border-b border-white/5 bg-white/5 backdrop-blur-sm flex justify-between items-center">
            <h3 className="font-semibold text-white flex items-center">
              <Activity className="w-4 h-4 mr-2 text-indigo-400" />
              Live Operations
            </h3>
            <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-950/20">
            {activity.length > 0 ? (
              activity.map((event) => (
                <div key={event.id} className="flex items-start space-x-3 group text-sm animate-slide-in">
                  <div className="mt-1.5 min-w-[8px]">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-indigo-500/20 group-hover:ring-indigo-500/40 transition-all"></div>
                  </div>
                  <div className="font-mono">
                    <p className="text-slate-300 leading-tight">
                      <span className="text-indigo-400 font-bold">[{event.agent}]</span> {event.action}
                    </p>
                    <span className="text-xs text-slate-600 block mt-1">{getTimeAgo(event.timestamp)}</span>
                  </div>
                </div>
              ))
            ) : (
               [1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-start space-x-3 opacity-30 animate-pulse">
                  <div className="w-2 h-2 mt-2 rounded-full bg-slate-700"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-slate-700 rounded w-3/4"></div>
                    <div className="h-2 bg-slate-800 rounded w-1/4"></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Impact Panel - Horizontal Strip */}
        {impact && (
          <div className="col-span-1 md:col-span-2 lg:col-span-3 glass-panel rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent pointer-events-none" />
            
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start space-x-4">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                  <TrendingUp className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">Efficiency Gains</h3>
                  <p className="text-sm text-slate-400">AI vs Manual Baseline Comparison</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 flex-1">
                 <div className="text-center md:text-left">
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Cost Saved</p>
                    <p className="text-2xl font-bold text-emerald-400">${(impact.impact?.cost_savings || 0).toLocaleString()}</p>
                 </div>
                 <div className="text-center md:text-left">
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Time Saved</p>
                    <p className="text-2xl font-bold text-blue-400 font-mono">{(impact.impact?.time_saved_hours || 0).toLocaleString()}h</p>
                 </div>
                 <div className="text-center md:text-left">
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Full Auto</p>
                    <p className="text-2xl font-bold text-white">{impact.automated?.count || 0}</p>
                 </div>
                 <div className="text-center md:text-left">
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Confidence</p>
                    <p className="text-2xl font-bold text-purple-400">{((impact.automated?.avg_confidence || 0) * 100).toFixed(0)}%</p>
                 </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function BentoCard({ title, value, trend, trendUp, icon: Icon, color, bg, className }: any) {
  return (
    <div className={`glass-panel rounded-2xl p-6 relative overflow-hidden group hover:border-white/10 transition-all duration-300 ${className}`}>
      <div className={`absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition-opacity`}>
        <div className={`p-2 rounded-lg ${bg}`}>
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
      </div>
      
      <div className="relative z-10 mt-2">
        <h3 className="text-3xl font-bold text-white tracking-tight mb-1 group-hover:scale-110 transition-transform duration-500 origin-left text-glow">{value}</h3>
        <p className="text-sm text-slate-400 font-medium mb-4">{title}</p>
        
        {trend && (
          <div className="flex items-center space-x-2">
            <span className={`flex items-center text-xs font-bold px-2 py-0.5 rounded-full backdrop-blur-md ${trendUp ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
              <TrendingUp className={`w-3 h-3 mr-1 ${!trendUp && 'rotate-180'}`} />
              {trend}
            </span>
            <span className="text-xs text-slate-500">vs last week</span>
          </div>
        )}
      </div>
      
      {/* Decorative gradient glow */}
      <div className={`absolute -bottom-4 -right-4 w-24 h-24 ${bg} blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
    </div>
  );
}
