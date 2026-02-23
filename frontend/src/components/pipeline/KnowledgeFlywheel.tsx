import { BookOpen, Lightbulb, TrendingUp } from 'lucide-react';

interface KnowledgeFlywheelProps {
  similarTickets: number;
  knowledgeArticles: number;
  shouldUpdateKnowledge: boolean;
  knowledgeUpdate?: string;
  improvements?: string[];
}

export default function KnowledgeFlywheel({
  similarTickets,
  knowledgeArticles,
  shouldUpdateKnowledge,
  knowledgeUpdate,
  improvements,
}: KnowledgeFlywheelProps) {
  return (
    <div className="bg-slate-800 rounded-lg p-5 border border-slate-700">
      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center space-x-2">
        <BookOpen className="w-4 h-4" />
        <span>Knowledge Flywheel</span>
      </h3>

      <div className="space-y-4">
        {/* Consulted knowledge */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-900 rounded p-3 text-center">
            <p className="text-2xl font-bold text-blue-400">{similarTickets}</p>
            <p className="text-xs text-slate-500 mt-1">Similar Resolutions</p>
          </div>
          <div className="bg-slate-900 rounded p-3 text-center">
            <p className="text-2xl font-bold text-cyan-400">{knowledgeArticles}</p>
            <p className="text-xs text-slate-500 mt-1">KB Articles Used</p>
          </div>
        </div>

        {/* New knowledge contributed */}
        {shouldUpdateKnowledge && knowledgeUpdate && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
            <div className="flex items-center space-x-2 text-green-400 text-sm font-medium mb-2">
              <Lightbulb className="w-4 h-4" />
              <span>New Knowledge Contributed</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">{knowledgeUpdate}</p>
          </div>
        )}

        {/* Improvements */}
        {improvements && improvements.length > 0 && (
          <div>
            <p className="text-xs text-slate-500 mb-1.5">Suggested Improvements</p>
            <ul className="space-y-1">
              {improvements.map((imp, i) => (
                <li key={i} className="text-xs text-slate-400 flex items-start space-x-2">
                  <span className="text-slate-600 mt-0.5">&#8226;</span>
                  <span>{imp}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Flywheel diagram */}
        <div className="flex items-center justify-center space-x-2 text-xs text-slate-500 pt-2 border-t border-slate-700">
          <span className="text-slate-400">Past Resolutions</span>
          <TrendingUp className="w-3 h-3" />
          <span className="text-slate-400">Knowledge Base</span>
          <TrendingUp className="w-3 h-3" />
          <span className="text-green-400 font-medium">Faster Future Resolutions</span>
        </div>
      </div>
    </div>
  );
}
