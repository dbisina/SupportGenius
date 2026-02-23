import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, RefreshCw, Code2, Database, Workflow } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, ComposedChart, Area,
} from 'recharts';
import { getTrends, getMetrics, getEsqlQueries, getFlywheelData } from '../services/api';

interface TrendDay {
  date: string;
  total: number;
  automated: number;
  resolved: number;
  avg_resolution_time: number;
  avg_confidence: number;
}

const tooltipStyle = {
  contentStyle: { background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' },
  itemStyle: { color: '#e2e8f0' },
  labelStyle: { color: '#94a3b8' },
};

export default function Analytics() {
  const [trends, setTrends] = useState<TrendDay[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [esqlQueries, setEsqlQueries] = useState<any[]>([]);
  const [flywheelData, setFlywheelData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    loadData();
  }, [days]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [trendsData, metricsData, esqlData, fwData] = await Promise.all([
        getTrends(days),
        getMetrics(),
        getEsqlQueries(15).catch(() => []),
        getFlywheelData(days).catch(() => []),
      ]);
      setTrends(trendsData.data || []);
      setMetrics(metricsData);
      setEsqlQueries(esqlData || []);
      setFlywheelData(fwData || []);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Format trend data for Recharts
  const chartData = trends.map(day => ({
    ...day,
    label: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    confidence: day.avg_confidence || 0,
    resolution_time: day.avg_resolution_time || 0,
  }));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold mb-2">Analytics</h2>
          <p className="text-slate-400">Performance trends and insights</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            title="Select time period"
            className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="flex items-center space-x-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-center space-x-3 mb-2">
              <BarChart3 className="w-5 h-5 text-primary-400" />
              <span className="text-slate-400">Total Tickets</span>
            </div>
            <p className="text-3xl font-bold">{metrics.total_tickets}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-center space-x-3 mb-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              <span className="text-slate-400">Automation Rate</span>
            </div>
            <p className="text-3xl font-bold">{metrics.automation_rate.toFixed(1)}%</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-center space-x-3 mb-2">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              <span className="text-slate-400">Avg Confidence</span>
            </div>
            <p className="text-3xl font-bold">{metrics.customer_satisfaction}%</p>
          </div>
        </div>
      )}

      {/* Daily Volume Bar Chart */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h3 className="text-xl font-semibold mb-6">Daily Ticket Volume</h3>
        {loading ? (
          <div className="flex items-center justify-center h-72">
            <RefreshCw className="w-8 h-8 text-slate-400 animate-spin" />
          </div>
        ) : chartData.length > 0 ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip {...tooltipStyle} />
                <Legend wrapperStyle={{ color: '#94a3b8' }} />
                <Bar dataKey="total" name="Total" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="automated" name="Automated" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-slate-400 text-center py-8">No trend data available for this period.</p>
        )}
      </div>

      {/* Confidence & Resolution Time Line Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h3 className="text-xl font-semibold mb-6">Confidence Trend</h3>
          {chartData.length > 0 ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} domain={[0, 100]} />
                  <Tooltip {...tooltipStyle} />
                  <Line
                    type="monotone"
                    dataKey="confidence"
                    name="Confidence %"
                    stroke="#22d3ee"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-slate-400 text-center py-8">No data available.</p>
          )}
        </div>

        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h3 className="text-xl font-semibold mb-6">Resolution Time Trend</h3>
          {chartData.length > 0 ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip {...tooltipStyle} />
                  <Line
                    type="monotone"
                    dataKey="resolution_time"
                    name="Avg Time (s)"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-slate-400 text-center py-8">No data available.</p>
          )}
        </div>
      </div>

      {/* Knowledge Flywheel Effect */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <div className="flex items-center space-x-3 mb-6">
          <Workflow className="w-5 h-5 text-green-400" />
          <div>
            <h3 className="text-xl font-semibold">Knowledge Flywheel Effect</h3>
            <p className="text-slate-400 text-sm">As the knowledge base grows, automation rate improves</p>
          </div>
        </div>
        {flywheelData.length > 0 ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={flywheelData.map(d => ({
                ...d,
                label: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} />
                <YAxis yAxisId="left" stroke="#10b981" fontSize={12} domain={[0, 100]} label={{ value: 'Automation %', angle: -90, position: 'insideLeft', fill: '#10b981', fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" stroke="#6366f1" fontSize={12} label={{ value: 'KB Articles', angle: 90, position: 'insideRight', fill: '#6366f1', fontSize: 11 }} />
                <Tooltip {...tooltipStyle} />
                <Legend wrapperStyle={{ color: '#94a3b8' }} />
                <Area yAxisId="left" type="monotone" dataKey="automation_rate" name="Automation Rate %" fill="#10b98133" stroke="#10b981" strokeWidth={2} />
                <Line yAxisId="right" type="monotone" dataKey="kb_articles" name="KB Articles" stroke="#6366f1" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-slate-400 text-center py-8">No flywheel data available yet. Process tickets to see the learning loop.</p>
        )}
      </div>

      {/* Agent ES|QL Queries */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <div className="flex items-center space-x-3 mb-6">
          <Code2 className="w-5 h-5 text-cyan-400" />
          <div>
            <h3 className="text-xl font-semibold">Agent ES|QL Queries</h3>
            <p className="text-slate-400 text-sm">Real Elasticsearch queries written by AI agents during ticket resolution</p>
          </div>
        </div>
        {esqlQueries.length > 0 ? (
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {esqlQueries.map((q, i) => (
              <div key={i} className="bg-slate-900 rounded-lg p-4 border border-slate-700/50">
                <div className="flex items-center space-x-3 mb-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    q.agent === 'triage' ? 'bg-blue-500/20 text-blue-400' :
                    q.agent === 'research' ? 'bg-cyan-500/20 text-cyan-400' :
                    q.agent === 'decision' ? 'bg-yellow-500/20 text-yellow-400' :
                    q.agent === 'execution' ? 'bg-orange-500/20 text-orange-400' :
                    'bg-slate-700 text-slate-300'
                  }`}>{q.agent}</span>
                  <code className="text-xs text-slate-500">{q.tool_id}</code>
                  <span className="text-xs text-slate-600 ml-auto">{q.ticket_id}</span>
                </div>
                <pre className="text-sm text-cyan-300 font-mono whitespace-pre-wrap">{q.query}</pre>
                {q.params && Object.keys(q.params).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {Object.entries(q.params).map(([k, v]) => (
                      <span key={k} className="px-1.5 py-0.5 bg-slate-800 rounded text-[11px] text-slate-400">
                        {k}: <span className="text-slate-300">{String(v)}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center py-8 text-slate-400">
            <Database className="w-5 h-5 mr-2" />
            <span>No ES|QL queries recorded yet. Process tickets to see agent queries.</span>
          </div>
        )}
      </div>

      {/* Category & Status Breakdown */}
      {metrics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h3 className="text-xl font-semibold mb-4">By Status</h3>
            <div className="space-y-3">
              {Object.entries(metrics.by_status)
                .filter(([, count]) => (count as number) > 0)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <span className="text-slate-300 capitalize">{status}</span>
                    <span className="text-white font-medium">{count as number}</span>
                  </div>
                ))}
            </div>
          </div>

          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h3 className="text-xl font-semibold mb-4">By Category</h3>
            <div className="space-y-3">
              {Object.entries(metrics.by_category)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .map(([category, count]) => (
                  <div key={category} className="flex items-center justify-between">
                    <span className="text-slate-300 capitalize">{category.replace(/_/g, ' ')}</span>
                    <span className="text-white font-medium">{count as number}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
