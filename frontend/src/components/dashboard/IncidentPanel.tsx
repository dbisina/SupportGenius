import { useEffect, useState, useRef } from 'react';
import { AlertTriangle, Shield, Tag, Radio, Plus, X, Bell } from 'lucide-react';
import { detectIncidents, createIncident } from '../../services/api';

interface IncidentData {
  timestamp: string;
  surges: { category: string; count: number; severity: string; message: string }[];
  quality_issues: { category: string; overall_confidence: number; recent_confidence: number; severity: string; message: string }[];
  category_health: { category: string; total: number; automated: number; escalated: number; avg_confidence: number; health: string }[];
  keyword_clusters: { term: string; doc_count: number; score: number; severity: string }[];
  incidents_count: number;
}

const SEVERITY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
  warning: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  info: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
};

const HEALTH_DOT: Record<string, string> = {
  green: 'bg-green-400',
  yellow: 'bg-yellow-400',
  red: 'bg-red-400',
};

export default function IncidentPanel() {
  const [data, setData] = useState<IncidentData | null>(null);
  const [creating, setCreating] = useState(false);
  const [notification, setNotification] = useState<{ message: string; severity: string } | null>(null);
  const prevCountRef = useRef<number>(0);

  useEffect(() => {
    loadIncidents();
    const interval = setInterval(loadIncidents, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadIncidents = async () => {
    try {
      const result = await detectIncidents();
      // Detect new incidents since last poll
      const newCount = result.incidents_count + (result.keyword_clusters?.length || 0);
      if (prevCountRef.current > 0 && newCount > prevCountRef.current) {
        const diff = newCount - prevCountRef.current;
        const hasCrit = result.surges?.some((s: any) => s.severity === 'critical') || result.keyword_clusters?.some((k: any) => k.severity === 'critical');
        setNotification({
          message: `${diff} new ${hasCrit ? 'critical ' : ''}incident${diff > 1 ? 's' : ''} detected`,
          severity: hasCrit ? 'critical' : 'warning',
        });
        setTimeout(() => setNotification(null), 8000);
      }
      prevCountRef.current = newCount;
      setData(result);
    } catch {
      // silent
    }
  };

  const handleCreateIncident = async (cluster: { term: string; severity: string }) => {
    setCreating(true);
    try {
      await createIncident({
        keyword_cluster: cluster.term,
        affected_tickets: [],
        severity: cluster.severity,
      });
      await loadIncidents();
    } catch {
      // silent
    } finally {
      setCreating(false);
    }
  };

  if (!data) return null;

  const totalIssues = data.incidents_count + (data.keyword_clusters?.length || 0);
  const hasCritical = data.surges.some(s => s.severity === 'critical') || data.keyword_clusters?.some(k => k.severity === 'critical');

  return (
    <>
    {/* Notification toast — slides in on new incidents */}
    {notification && (
      <div className={`fixed top-4 right-4 z-50 flex items-center space-x-3 px-4 py-3 rounded-lg shadow-lg border animate-fade-in ${
        notification.severity === 'critical'
          ? 'bg-red-950 border-red-500/50 text-red-300'
          : 'bg-amber-950 border-amber-500/50 text-amber-300'
      }`}>
        <Bell className="w-4 h-4 flex-shrink-0 animate-pulse" />
        <span className="text-sm font-medium">{notification.message}</span>
        <button type="button" onClick={() => setNotification(null)} className="ml-2 opacity-60 hover:opacity-100" title="Dismiss notification">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    )}
    <div className={`bg-card border rounded-xl p-6 shadow-sm ${hasCritical ? 'border-red-500/50' : 'border-border'}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${hasCritical ? 'bg-red-500/10' : 'bg-amber-500/10'}`}>
            <Shield className={`w-5 h-5 ${hasCritical ? 'text-red-400' : 'text-amber-400'}`} />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Incident Detection</h3>
            <p className="text-xs text-muted-foreground">Real-time anomaly monitoring</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {totalIssues > 0 && (
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${hasCritical ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
              {totalIssues} {totalIssues === 1 ? 'alert' : 'alerts'}
            </span>
          )}
          <Radio className="w-3.5 h-3.5 text-green-400 animate-pulse" />
        </div>
      </div>

      {/* Category Health Dots */}
      {data.category_health?.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-4">
          {data.category_health.map(ch => (
            <div key={ch.category} className="flex items-center space-x-1.5">
              <div className={`w-2 h-2 rounded-full ${HEALTH_DOT[ch.health] || 'bg-slate-400'}`} />
              <span className="text-xs text-muted-foreground capitalize">{ch.category.replace(/_/g, ' ')}</span>
              <span className="text-xs text-foreground">{(ch.avg_confidence * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Surges */}
      {data.surges.length > 0 && (
        <div className="space-y-2 mb-3">
          {data.surges.map((s, i) => {
            const style = SEVERITY_STYLES[s.severity] || SEVERITY_STYLES.info;
            return (
              <div key={i} className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${style.bg} border ${style.border}`}>
                <AlertTriangle className={`w-3.5 h-3.5 flex-shrink-0 ${style.text}`} />
                <span className={`text-xs ${style.text}`}>{s.message}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Quality Issues */}
      {data.quality_issues.length > 0 && (
        <div className="space-y-2 mb-3">
          {data.quality_issues.map((q, i) => (
            <div key={i} className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-amber-400" />
              <span className="text-xs text-amber-400">{q.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Keyword Clusters */}
      {data.keyword_clusters?.length > 0 && (
        <div className="mt-3">
          <div className="flex items-center space-x-2 mb-2">
            <Tag className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Keyword Clusters</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {data.keyword_clusters.map((kc, i) => {
              const style = SEVERITY_STYLES[kc.severity] || SEVERITY_STYLES.info;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleCreateIncident(kc)}
                  disabled={creating}
                  className={`inline-flex items-center space-x-1 px-2 py-1 rounded text-xs ${style.bg} ${style.text} border ${style.border} hover:opacity-80 transition-opacity disabled:opacity-50`}
                  title="Click to create incident"
                >
                  <span>{kc.term}</span>
                  <span className="text-[10px] opacity-70">({kc.doc_count})</span>
                  <Plus className="w-3 h-3 opacity-50" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* All clear */}
      {totalIssues === 0 && (!data.keyword_clusters || data.keyword_clusters.length === 0) && (
        <div className="text-center py-4 text-muted-foreground text-sm">
          All systems nominal — no anomalies detected
        </div>
      )}
    </div>
    </>
  );
}
