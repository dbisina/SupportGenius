import DebateLog from './DebateLog';

export default function AgentResultSummary({ agent, result }: { agent: string; result: any }) {
  if (!result) return null;

  switch (agent) {
    case 'triage':
      return (
        <div>
          <h4 className="text-sm font-medium text-slate-300 mb-2">Classification</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-slate-500">Category:</span> <span className="text-white capitalize">{result.category}</span></div>
            <div><span className="text-slate-500">Priority:</span> <span className="text-white capitalize">{result.priority}</span></div>
            <div><span className="text-slate-500">Sentiment:</span> <span className="text-white capitalize">{result.sentiment}</span></div>
            <div><span className="text-slate-500">Confidence:</span> <span className="text-white">{((result.confidence || 0) * 100).toFixed(0)}%</span></div>
            {result.entities && (
              <>
                {result.entities.customer_id && <div><span className="text-slate-500">Customer:</span> <code className="text-cyan-400 text-xs">{result.entities.customer_id}</code></div>}
                {result.entities.order_id && <div><span className="text-slate-500">Order:</span> <code className="text-cyan-400 text-xs">{result.entities.order_id}</code></div>}
                {result.entities.product_id && <div><span className="text-slate-500">Product:</span> <code className="text-cyan-400 text-xs">{result.entities.product_id}</code></div>}
              </>
            )}
          </div>
        </div>
      );

    case 'research':
      return (
        <div>
          <h4 className="text-sm font-medium text-slate-300 mb-2">Research Findings</h4>
          <div className="space-y-2 text-sm">
            <div className="flex space-x-6">
              <span><span className="text-slate-500">Similar tickets:</span> <span className="text-white">{result.similar_tickets?.length || 0}</span></span>
              <span><span className="text-slate-500">KB articles:</span> <span className="text-white">{result.knowledge_articles?.length || 0}</span></span>
              <span><span className="text-slate-500">Actions available:</span> <span className="text-white">{result.available_actions?.length || 0}</span></span>
            </div>
            {result.customer && (
              <div className="bg-slate-900 rounded p-3 flex items-center space-x-4">
                <span className="text-white font-medium">{result.customer.name || 'Unknown'}</span>
                {result.customer.vip && <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs font-medium">VIP</span>}
                <span className="text-slate-500">LTV: ${result.customer.lifetime_value?.toLocaleString() || '0'}</span>
                <span className="text-slate-500">{result.customer.total_orders || 0} orders</span>
              </div>
            )}
            {result.trending_pattern && (
              <div className="bg-orange-500/10 border border-orange-500/30 rounded p-2 text-orange-300 text-xs">
                Trending pattern detected — this issue is affecting multiple customers
              </div>
            )}
            {result.research_summary && <p className="text-slate-400 text-xs italic">{result.research_summary}</p>}
          </div>
        </div>
      );

    case 'decision':
      return (
        <div>
          <h4 className="text-sm font-medium text-slate-300 mb-2">Resolution Decision</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center space-x-4">
              <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded font-medium capitalize">{result.action_type?.replace(/_/g, ' ')}</span>
              <span className={result.should_automate ? 'text-green-400' : 'text-yellow-400'}>
                {result.should_automate ? 'Automated' : 'Escalated'}
              </span>
              <span className="text-slate-400">Confidence: {((result.confidence || 0) * 100).toFixed(0)}%</span>
            </div>
            {result.business_rules_applied?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                <span className="text-slate-500 text-xs mr-1">Rules applied:</span>
                {result.business_rules_applied.map((rule: string, i: number) => (
                  <span key={i} className="px-2 py-0.5 bg-slate-700 rounded text-xs text-slate-300">{rule}</span>
                ))}
              </div>
            )}
            {result.reasoning && <p className="text-slate-400">{result.reasoning}</p>}
          </div>
          {result.debate_transcript && <DebateLog transcript={result.debate_transcript} />}
        </div>
      );

    case 'simulation':
      return (
        <div>
          <h4 className="text-sm font-medium text-slate-300 mb-2">Shadow Simulation</h4>
          <div className="space-y-3 text-sm">
            {result.scenarios?.length > 0 && (
              <div className="space-y-2">
                {result.scenarios.map((s: any, i: number) => {
                  const colors = ['text-green-400 bg-green-500/10 border-green-500/30', 'text-blue-400 bg-blue-500/10 border-blue-500/30', 'text-orange-400 bg-orange-500/10 border-orange-500/30'];
                  return (
                    <div key={i} className={`rounded p-3 border ${colors[i] || colors[2]}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium capitalize">{s.name || `Scenario ${i + 1}`}</span>
                        <span className="text-xs">{s.satisfaction_estimate ? `${(s.satisfaction_estimate * 100).toFixed(0)}% satisfaction` : ''}</span>
                      </div>
                      <p className="text-xs text-slate-400">{s.description || s.action_type}</p>
                      {s.projected_ltv_impact !== undefined && (
                        <span className={`text-xs mt-1 inline-block ${s.projected_ltv_impact >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          LTV impact: {s.projected_ltv_impact >= 0 ? '+' : ''}{typeof s.projected_ltv_impact === 'number' ? `$${s.projected_ltv_impact.toFixed(0)}` : s.projected_ltv_impact}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {result.recommended_action && (
              <div className="flex items-center space-x-3">
                <span className="text-slate-500">Recommended:</span>
                <span className="px-3 py-1 bg-teal-500/20 text-teal-400 rounded font-medium capitalize">{result.recommended_action.replace(/_/g, ' ')}</span>
                {result.projected_roi !== undefined && (
                  <span className="text-green-400 text-xs">ROI: {result.projected_roi}x</span>
                )}
              </div>
            )}
            {result.confidence !== undefined && (
              <div className="text-slate-400 text-xs">Simulation confidence: {((result.confidence || 0) * 100).toFixed(0)}%</div>
            )}
          </div>
        </div>
      );

    case 'execution':
      return (
        <div>
          <h4 className="text-sm font-medium text-slate-300 mb-2">Execution Result</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center space-x-4">
              <span className={`font-medium ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                {result.success ? 'Success' : 'Failed'}
              </span>
              {result.workflow_id && <code className="text-slate-500 text-xs">{result.workflow_id}</code>}
            </div>
            {result.steps_completed?.length > 0 && (
              <div className="flex space-x-2">
                {result.steps_completed.map((step: string, i: number) => (
                  <span key={i} className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">{step}</span>
                ))}
              </div>
            )}
            {result.customer_notification && (
              <p className="text-slate-400"><span className="text-slate-500">Notification:</span> {result.customer_notification}</p>
            )}
          </div>
          {result.tool_synthesis && (
            <div className="mt-3 bg-fuchsia-500/10 border border-fuchsia-500/30 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-fuchsia-400">Dynamic Tool Synthesis</span>
              </div>
              <div className="font-mono text-xs text-fuchsia-300">
                <div className="text-slate-500">// Auto-synthesized tool</div>
                <div>function <span className="text-fuchsia-200">{result.tool_synthesis.tool_name}</span>({result.tool_synthesis.parameters?.join(', ')}) {'{'}</div>
                <div className="pl-4 text-slate-400">// Source: {result.tool_synthesis.source || 'knowledge_base'}</div>
                <div>{'}'}</div>
              </div>
            </div>
          )}
        </div>
      );

    case 'quality':
      return (
        <div>
          <h4 className="text-sm font-medium text-slate-300 mb-2">Quality Assessment</h4>
          <div className="space-y-3 text-sm">
            <div className="flex items-center space-x-4">
              <span className="text-2xl font-bold text-white">{((result.quality_score || 0) * 100).toFixed(0)}%</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${result.passed ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {result.passed ? 'PASSED' : 'NEEDS REVIEW'}
              </span>
            </div>
            {result.scores && typeof result.scores === 'object' && (
              <div className="space-y-1.5">
                {Object.entries(result.scores).map(([key, val]) => {
                  const numVal = typeof val === 'number' ? val : parseFloat(String(val)) || 0;
                  return (
                    <div key={key} className="flex items-center space-x-3">
                      <span className="text-slate-500 capitalize w-28 text-xs">{key.replace(/_/g, ' ')}</span>
                      <div className="flex-1 bg-slate-700 rounded-full h-1.5">
                        <div className="bg-blue-400 h-1.5 rounded-full transition-all duration-500" style={{ width: `${numVal * 100}%` }} />
                      </div>
                      <span className="text-white text-xs w-8 text-right">{(numVal * 100).toFixed(0)}%</span>
                    </div>
                  );
                })}
              </div>
            )}
            {result.feedback && <p className="text-slate-400 text-xs">{result.feedback}</p>}
            {result.improvements?.length > 0 && (
              <div>
                <span className="text-slate-500 text-xs">Suggested improvements:</span>
                <ul className="list-disc pl-4 text-xs text-slate-400 mt-1">
                  {result.improvements.map((imp: string, i: number) => <li key={i}>{imp}</li>)}
                </ul>
              </div>
            )}
          </div>
        </div>
      );

    default:
      return null;
  }
}
