import { Bot, Zap } from 'lucide-react';

export default function Agents() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-bold mb-2">AI Agents</h2>
        <p className="text-slate-400">Monitor agent status and performance</p>
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AgentCard
          name="Triage Agent"
          description="Categorizes tickets and extracts key entities"
          tool="Search API"
          status="active"
          confidence={92}
          processedToday={145}
        />
        <AgentCard
          name="Research Agent"
          description="Gathers context from Elasticsearch"
          tool="Search API + ES|QL"
          status="active"
          confidence={88}
          processedToday={142}
        />
        <AgentCard
          name="Decision Agent"
          description="Determines resolution path using pattern analysis"
          tool="ES|QL"
          status="active"
          confidence={90}
          processedToday={138}
        />
        <AgentCard
          name="Execution Agent"
          description="Performs actions via Elastic Workflows"
          tool="Workflows"
          status="active"
          confidence={95}
          processedToday={135}
        />
        <AgentCard
          name="Quality Agent"
          description="Validates decisions and learns from outcomes"
          tool="Search + Workflows"
          status="active"
          confidence={93}
          processedToday={135}
        />
      </div>
    </div>
  );
}

function AgentCard({
  name,
  description,
  tool,
  status,
  confidence,
  processedToday,
}: {
  name: string;
  description: string;
  tool: string;
  status: 'active' | 'idle' | 'error';
  confidence: number;
  processedToday: number;
}) {
  const statusColors = {
    active: 'bg-green-500',
    idle: 'bg-yellow-500',
    error: 'bg-red-500',
  };

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 hover:border-primary-400 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="bg-primary-500 bg-opacity-20 p-3 rounded-lg">
            <Bot className="w-6 h-6 text-primary-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{name}</h3>
            <div className="flex items-center space-x-2 mt-1">
              <div className={`w-2 h-2 rounded-full ${statusColors[status]} animate-pulse`} />
              <span className="text-xs text-slate-400 capitalize">{status}</span>
            </div>
          </div>
        </div>
      </div>

      <p className="text-sm text-slate-400 mb-4">{description}</p>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Tool</span>
          <div className="flex items-center space-x-1 text-primary-400">
            <Zap className="w-4 h-4" />
            <span className="font-medium">{tool}</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Confidence</span>
          <div className="flex items-center space-x-2">
            <div className="w-24 bg-slate-700 rounded-full h-2">
              <div
                className="bg-primary-400 h-2 rounded-full"
                style={{ width: `${confidence}%` }}
              />
            </div>
            <span className="text-white font-medium">{confidence}%</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Processed Today</span>
          <span className="text-white font-medium">{processedToday}</span>
        </div>
      </div>
    </div>
  );
}
