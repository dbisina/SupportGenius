import { LucideIcon } from 'lucide-react';

interface MetricsCardProps {
  title: string;
  value: string | number;
  change: number;
  icon: LucideIcon;
  trend: 'up' | 'down';
}

export default function MetricsCard({ title, value, change, icon: Icon, trend }: MetricsCardProps) {
  const trendColor = trend === 'up' ? 'text-green-400' : 'text-red-400';
  const trendBg = trend === 'up' ? 'bg-green-500' : 'bg-red-500';

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 hover:border-primary-400 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="bg-primary-500 bg-opacity-20 p-3 rounded-lg">
          <Icon className="w-6 h-6 text-primary-400" />
        </div>
        <div className={`flex items-center space-x-1 text-sm ${trendColor}`}>
          <span>{change > 0 ? '+' : ''}{change}%</span>
        </div>
      </div>

      <h3 className="text-sm text-slate-400 mb-1">{title}</h3>
      <p className="text-3xl font-bold text-white">{value}</p>

      <div className="mt-4">
        <div className="w-full bg-slate-700 rounded-full h-1">
          <div className={`${trendBg} h-1 rounded-full`} style={{ width: '70%' }} />
        </div>
      </div>
    </div>
  );
}
