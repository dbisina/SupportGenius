import { useEffect, useState } from 'react';
import { TrendingUp, Clock, CheckCircle, DollarSign } from 'lucide-react';
import MetricsCard from '../components/MetricsCard';
import { getMetrics } from '../services/api';

export default function Dashboard() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const loadMetrics = async () => {
    try {
      const data = await getMetrics();
      setMetrics(data);
    } catch (error) {
      console.error('Failed to load metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-bold mb-2">Dashboard</h2>
        <p className="text-slate-400">Real-time system performance and metrics</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricsCard
          title="Automation Rate"
          value={`${metrics?.automation_rate.toFixed(1) || 0}%`}
          change={+12}
          icon={TrendingUp}
          trend="up"
        />
        <MetricsCard
          title="Avg Resolution Time"
          value={`${metrics?.avg_resolution_time || 0}m`}
          change={-65}
          icon={Clock}
          trend="down"
        />
        <MetricsCard
          title="Tickets Resolved"
          value={metrics?.automated_tickets || 0}
          change={+23}
          icon={CheckCircle}
          trend="up"
        />
        <MetricsCard
          title="Cost Savings"
          value={`$${(metrics?.cost_savings || 0).toLocaleString()}`}
          change={+89}
          icon={DollarSign}
          trend="up"
        />
      </div>

      {/* Charts and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tickets by Category */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h3 className="text-xl font-semibold mb-4">Tickets by Category</h3>
          <div className="space-y-3">
            {metrics?.by_category &&
              Object.entries(metrics.by_category).map(([category, count]) => (
                <div key={category} className="flex items-center justify-between">
                  <span className="text-slate-300 capitalize">{category.replace('_', ' ')}</span>
                  <div className="flex items-center space-x-3">
                    <div className="w-32 bg-slate-700 rounded-full h-2">
                      <div
                        className="bg-primary-400 h-2 rounded-full"
                        style={{
                          width: `${((count as number) / metrics.total_tickets) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-white font-medium w-12 text-right">{count as number}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h3 className="text-xl font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-3">
            <ActivityItem
              agent="Triage Agent"
              action="Categorized ticket TKT-A3F2"
              time="2 min ago"
              status="success"
            />
            <ActivityItem
              agent="Research Agent"
              action="Found 5 similar tickets"
              time="3 min ago"
              status="success"
            />
            <ActivityItem
              agent="Execution Agent"
              action="Processed refund $49.99"
              time="5 min ago"
              status="success"
            />
            <ActivityItem
              agent="Quality Agent"
              action="Validated resolution"
              time="6 min ago"
              status="success"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ActivityItem({
  agent,
  action,
  time,
  status,
}: {
  agent: string;
  action: string;
  time: string;
  status: 'success' | 'error' | 'warning';
}) {
  const statusColors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
  };

  return (
    <div className="flex items-start space-x-3">
      <div className={`w-2 h-2 rounded-full mt-2 ${statusColors[status]}`} />
      <div className="flex-1">
        <p className="text-white font-medium">{agent}</p>
        <p className="text-sm text-slate-400">{action}</p>
      </div>
      <span className="text-xs text-slate-500">{time}</span>
    </div>
  );
}
