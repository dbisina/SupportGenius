import { useEffect, useState } from 'react';
import { BookOpen, TrendingUp, Lightbulb, Database } from 'lucide-react';
import { getKnowledgeStats } from '../../services/api';

interface KnowledgeStats {
  total_ai_articles: number;
  knowledge_contribution_rate: number;
  recent_contributions: { title: string; created_at: string }[];
}

export default function KnowledgeFlywheelDash() {
  const [stats, setStats] = useState<KnowledgeStats | null>(null);

  useEffect(() => {
    getKnowledgeStats().then(setStats).catch(console.error);
  }, []);

  if (!stats) return null;

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
      <h3 className="text-xl font-semibold mb-4 flex items-center space-x-2">
        <BookOpen className="w-5 h-5 text-green-400" />
        <span>Knowledge Flywheel</span>
      </h3>

      <div className="space-y-5">
        {/* Stats row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-900 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center space-x-2 text-blue-400 mb-2">
              <Database className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-white">{stats.total_ai_articles}</p>
            <p className="text-xs text-slate-500 mt-1">AI-Generated Articles</p>
          </div>
          <div className="bg-slate-900 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center space-x-2 text-green-400 mb-2">
              <Lightbulb className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-white">{stats.knowledge_contribution_rate}%</p>
            <p className="text-xs text-slate-500 mt-1">Tickets Contributing Knowledge</p>
          </div>
        </div>

        {/* Flywheel flow */}
        <div className="flex items-center justify-center space-x-3 py-3 bg-slate-900 rounded-lg">
          <span className="text-xs text-slate-400">Tickets</span>
          <TrendingUp className="w-3 h-3 text-slate-500" />
          <span className="text-xs text-blue-400 font-medium">AI Analysis</span>
          <TrendingUp className="w-3 h-3 text-slate-500" />
          <span className="text-xs text-cyan-400 font-medium">Knowledge Base</span>
          <TrendingUp className="w-3 h-3 text-slate-500" />
          <span className="text-xs text-green-400 font-medium">Better Resolutions</span>
        </div>

        {/* Recent contributions */}
        {stats.recent_contributions.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-slate-400 mb-2">Recent Contributions</h4>
            <div className="space-y-2">
              {stats.recent_contributions.slice(0, 5).map((contrib, i) => (
                <div key={i} className="flex items-center justify-between text-sm bg-slate-900 rounded p-2.5">
                  <span className="text-slate-300 truncate flex-1">{contrib.title}</span>
                  <span className="text-xs text-slate-500 ml-2 flex-shrink-0">
                    {new Date(contrib.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
