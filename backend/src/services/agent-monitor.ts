import { elasticsearchClient } from '../config/elasticsearch';
import { logger } from '../utils/logger';

/**
 * AgentMonitor tracks agent activity and status from Elasticsearch
 */
export class AgentMonitor {
  async getAgentStatus() {
    try {
      // Query agent_activity index for latest status per agent
      const response = await elasticsearchClient.search({
        index: 'agent_activity',
        body: {
          size: 0,
          aggs: {
            by_agent: {
              terms: { field: 'agent.keyword', size: 10 },
              aggs: {
                latest: {
                  top_hits: { size: 1, sort: [{ timestamp: { order: 'desc' } }] },
                },
                total_actions: { value_count: { field: 'action.keyword' } },
              },
            },
          },
        },
      });

      const aggs: any = response.aggregations;
      const buckets = aggs?.by_agent?.buckets || [];

      const agentNames = ['TriageAgent', 'ResearchAgent', 'DecisionAgent', 'ExecutionAgent', 'QualityAgent'];
      const status: Record<string, any> = {};

      for (const name of agentNames) {
        const bucket = buckets.find((b: any) => b.key === name);
        const latest = bucket?.latest?.hits?.hits?.[0]?._source;

        status[name.replace('Agent', '').toLowerCase()] = {
          active: true,
          current_task: latest?.action || null,
          last_active: latest?.timestamp || null,
          total_processed: bucket?.total_actions?.value || 0,
        };
      }

      return status;
    } catch (error) {
      logger.warn('Error getting agent status, returning defaults', { error });
      return {
        triage: { active: true, current_task: null, total_processed: 0 },
        research: { active: true, current_task: null, total_processed: 0 },
        decision: { active: true, current_task: null, total_processed: 0 },
        execution: { active: true, current_task: null, total_processed: 0 },
        quality: { active: true, current_task: null, total_processed: 0 },
      };
    }
  }

  async getRecentActivity(limit: number) {
    try {
      const response = await elasticsearchClient.search({
        index: 'agent_activity',
        body: {
          query: { match_all: {} },
          sort: [{ timestamp: { order: 'desc' } }],
          size: limit,
        },
      });

      return response.hits.hits.map((hit: any) => ({
        ...hit._source,
        id: hit._id,
      }));
    } catch (error) {
      logger.warn('Error getting agent activity', { error });
      return [];
    }
  }
}
