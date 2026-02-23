import { useEffect, useState, useRef } from 'react';
import { Clock, MessageSquare, DollarSign, Star } from 'lucide-react';

interface ResolutionComparisonProps {
  totalDurationMs: number;
  totalTokens: number;
  qualityScore: number;
  ticketStatus: string;
  resolution?: string;
}

const TRADITIONAL = {
  firstResponseHours: 24,
  emailsBackAndForth: 3.2,
  avgCostDollars: 45,
  satisfactionPercent: 68,
};

const TOKEN_COST_PER_1K = 0.003;

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

export default function ResolutionComparison({
  totalDurationMs,
  totalTokens,
  qualityScore,
  ticketStatus,
  resolution,
}: ResolutionComparisonProps) {
  const durationSeconds = totalDurationMs / 1000;
  const tokenCost = (totalTokens / 1000) * TOKEN_COST_PER_1K;
  const timeSavedSeconds = TRADITIONAL.firstResponseHours * 3600 - durationSeconds;
  const costSaved = TRADITIONAL.avgCostDollars - tokenCost;

  const animatedTimeSaved = useAnimatedCounter(timeSavedSeconds, 2000, 0);
  const animatedCostSaved = useAnimatedCounter(costSaved, 2000, 2);

  const formatTimeSaved = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h}h ${m}m ${s}s`;
  };

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-bold text-white">Resolution Comparison</h3>
        <p className="text-sm text-slate-400 mt-1">
          {ticketStatus === 'resolved' ? 'Ticket resolved' : 'Ticket escalated'}
          {resolution && <span> — {resolution}</span>}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Traditional Support */}
        <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-5 space-y-4">
          <h4 className="text-red-400 font-semibold text-sm">Traditional Support</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center space-x-2 text-slate-400">
                <Clock className="w-4 h-4" />
                <span>First Response</span>
              </span>
              <span className="text-red-300 font-medium">24 hours</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center space-x-2 text-slate-400">
                <MessageSquare className="w-4 h-4" />
                <span>Interactions</span>
              </span>
              <span className="text-red-300 font-medium">3.2 emails</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center space-x-2 text-slate-400">
                <DollarSign className="w-4 h-4" />
                <span>Cost</span>
              </span>
              <span className="text-red-300 font-medium">$45.00</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center space-x-2 text-slate-400">
                <Star className="w-4 h-4" />
                <span>Satisfaction</span>
              </span>
              <span className="text-red-300 font-medium">68%</span>
            </div>
          </div>
        </div>

        {/* SupportGenius AI */}
        <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-5 space-y-4">
          <h4 className="text-green-400 font-semibold text-sm">SupportGenius AI</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center space-x-2 text-slate-400">
                <Clock className="w-4 h-4" />
                <span>Resolution Time</span>
              </span>
              <span className="text-green-400 font-medium">{durationSeconds.toFixed(1)}s</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center space-x-2 text-slate-400">
                <MessageSquare className="w-4 h-4" />
                <span>Interactions</span>
              </span>
              <span className="text-green-400 font-medium">1 (instant)</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center space-x-2 text-slate-400">
                <DollarSign className="w-4 h-4" />
                <span>Cost</span>
              </span>
              <span className="text-green-400 font-medium">${tokenCost.toFixed(4)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center space-x-2 text-slate-400">
                <Star className="w-4 h-4" />
                <span>Quality Score</span>
              </span>
              <span className="text-green-400 font-medium">{((qualityScore || 0) * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Savings callout */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-center">
          <p className="text-xs text-slate-400 mb-1">Time Saved</p>
          <p className="text-xl font-bold text-green-400">{formatTimeSaved(animatedTimeSaved)}</p>
        </div>
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-center">
          <p className="text-xs text-slate-400 mb-1">Cost Saved</p>
          <p className="text-xl font-bold text-green-400">${animatedCostSaved.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
}
