import { useEffect, useState, useRef } from 'react';
import { Users, Clock, DollarSign, Zap } from 'lucide-react';

interface ImpactScoreboardProps {
  totalTickets: number;
  automatedTickets: number;
  automationRate: number;
  avgResolutionTime: number;
  costSavings: number;
  customerSatisfaction: number;
}

function useAnimatedCounter(target: number, duration: number = 1500, decimals: number = 0) {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (target <= 0) { setValue(0); return; }
    const start = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Number((eased * target).toFixed(decimals)));
      if (progress < 1) frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration, decimals]);

  return value;
}

const TRADITIONAL = {
  firstResponseHours: 24,
  resolutionHours: 72,
  costPerTicket: 45,
  satisfaction: 68,
};

export default function ImpactScoreboard({
  totalTickets,
  automatedTickets,
  automationRate,
  avgResolutionTime,
  costSavings,
  customerSatisfaction,
}: ImpactScoreboardProps) {
  const animatedAutomated = useAnimatedCounter(automatedTickets, 2000);
  const animatedCostSaved = useAnimatedCounter(costSavings, 2000);
  const animatedRate = useAnimatedCounter(automationRate, 2000, 1);
  const waitTimeEliminatedHours = automatedTickets * TRADITIONAL.firstResponseHours;
  const animatedWaitTime = useAnimatedCounter(waitTimeEliminatedHours, 2000);

  return (
    <div className="space-y-6">
      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-500/20 to-green-600/5 border border-green-500/30 rounded-xl p-5">
          <div className="flex items-center space-x-2 text-green-400 mb-3">
            <Zap className="w-5 h-5" />
            <span className="text-sm font-medium">Resolved Without Humans</span>
          </div>
          <p className="text-3xl font-bold text-white">{animatedAutomated}</p>
          <p className="text-xs text-slate-400 mt-1">of {totalTickets} total tickets</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/5 border border-blue-500/30 rounded-xl p-5">
          <div className="flex items-center space-x-2 text-blue-400 mb-3">
            <Clock className="w-5 h-5" />
            <span className="text-sm font-medium">Wait Time Eliminated</span>
          </div>
          <p className="text-3xl font-bold text-white">{animatedWaitTime.toLocaleString()}h</p>
          <p className="text-xs text-slate-400 mt-1">vs 24h traditional first response</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/5 border border-emerald-500/30 rounded-xl p-5">
          <div className="flex items-center space-x-2 text-emerald-400 mb-3">
            <DollarSign className="w-5 h-5" />
            <span className="text-sm font-medium">Support Costs Saved</span>
          </div>
          <p className="text-3xl font-bold text-white">${animatedCostSaved.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-1">at $45/ticket traditional cost</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/5 border border-purple-500/30 rounded-xl p-5">
          <div className="flex items-center space-x-2 text-purple-400 mb-3">
            <Users className="w-5 h-5" />
            <span className="text-sm font-medium">Instant Resolution Rate</span>
          </div>
          <p className="text-3xl font-bold text-white">{animatedRate}%</p>
          <p className="text-xs text-slate-400 mt-1">customers served instantly</p>
        </div>
      </div>

      {/* Before/After Comparison */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5 space-y-4">
          <h4 className="text-red-400 font-semibold text-sm">Before SupportGenius</h4>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">First Response</span>
              <span className="text-red-300 font-medium">{TRADITIONAL.firstResponseHours} hours</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Resolution Time</span>
              <span className="text-red-300 font-medium">{TRADITIONAL.resolutionHours} hours</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Cost per Ticket</span>
              <span className="text-red-300 font-medium">${TRADITIONAL.costPerTicket}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Satisfaction</span>
              <span className="text-red-300 font-medium">{TRADITIONAL.satisfaction}%</span>
            </div>
          </div>
        </div>

        <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-5 space-y-4">
          <h4 className="text-green-400 font-semibold text-sm">After SupportGenius</h4>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">First Response</span>
              <span className="text-green-400 font-medium">Instant</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Resolution Time</span>
              <span className="text-green-400 font-medium">{avgResolutionTime > 0 ? `${avgResolutionTime}s` : 'Instant'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Cost per Ticket</span>
              <span className="text-green-400 font-medium">&lt;$1</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Satisfaction</span>
              <span className="text-green-400 font-medium">{customerSatisfaction > 0 ? `${customerSatisfaction}%` : 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
