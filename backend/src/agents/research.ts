import { logger } from '../utils/logger';
import { TriageResult, ResearchResult } from '../models/types';
import { agentBuilder } from '../services/agent-builder';
import { INDEXES } from '../config/elasticsearch';

/**
 * ResearchAgent - Gathers context from Elasticsearch
 *
 * Uses Agent Builder search tool (keyword + relevance search) for finding
 * similar tickets, customer profiles, knowledge articles, and product info.
 * Uses Agent Builder ES|QL tool for pattern analysis across historical data.
 */
export class ResearchAgent {
  async process(ticket_id: string, triageResult: TriageResult): Promise<ResearchResult> {
    logger.info('ResearchAgent processing', { ticket_id, category: triageResult.category });

    try {
      // Parallel queries via Agent Builder search tool
      const [customerProfile, similarTickets, knowledgeArticles, productInfo] = await Promise.all([
        this.getCustomerProfile(triageResult.extracted_entities.customer_id),
        this.findSimilarTickets(triageResult.category, triageResult.decision),
        this.searchKnowledgeBase(triageResult.category, triageResult.decision),
        this.getProductInfo(triageResult.extracted_entities.product_id),
      ]);

      // Use Agent Builder ES|QL tool for pattern analysis
      const patterns = await this.analyzePatterns(triageResult.category);

      logger.info('ResearchAgent completed', {
        ticket_id,
        similar_tickets_found: similarTickets.length,
        articles_found: knowledgeArticles.length,
        patterns_detected: patterns.length,
        has_customer: !!customerProfile,
      });

      const result: ResearchResult = {
        agent_name: 'ResearchAgent',
        confidence: this.calculateConfidence(similarTickets, knowledgeArticles, customerProfile),
        decision: `Found ${similarTickets.length} similar tickets and ${knowledgeArticles.length} relevant articles`,
        customer_profile: customerProfile,
        similar_tickets: similarTickets,
        relevant_articles: knowledgeArticles,
        product_info: productInfo,
        data: { patterns },
        next_agent: 'DecisionAgent',
        timestamp: new Date(),
      };

      return result;
    } catch (error) {
      logger.error('ResearchAgent failed', { ticket_id, error });
      throw error;
    }
  }

  private async getCustomerProfile(customer_id?: string) {
    if (!customer_id) return undefined;

    try {
      const results = await agentBuilder.searchTool({
        index: INDEXES.CUSTOMER_PROFILES,
        query: { term: { customer_id } },
        size: 1,
      });

      return results[0] || undefined;
    } catch (error) {
      logger.warn('Failed to retrieve customer profile', { customer_id, error });
      return undefined;
    }
  }

  private async findSimilarTickets(category: string, description: string) {
    try {
      // Primary: category + resolved + text relevance matching
      const results = await agentBuilder.searchTool({
        index: INDEXES.SUPPORT_TICKETS,
        query: {
          bool: {
            must: [
              { term: { category } },
              { term: { status: 'resolved' } },
            ],
            should: [
              { term: { automated: true } },
              {
                match: {
                  description: {
                    query: description,
                    boost: 2,
                  },
                },
              },
              {
                match: {
                  subject: {
                    query: description,
                    boost: 1.5,
                  },
                },
              },
            ],
            filter: [
              { range: { agent_confidence: { gte: 0.7 } } },
            ],
            minimum_should_match: 1,
          },
        },
        sort: [{ _score: { order: 'desc' } }, { created_at: { order: 'desc' } }],
        size: 5,
      });

      if (results.length > 0) return results;

      // Fallback: broader search without text matching
      return await agentBuilder.searchTool({
        index: INDEXES.SUPPORT_TICKETS,
        query: {
          bool: {
            must: [
              { term: { category } },
              { term: { status: 'resolved' } },
            ],
          },
        },
        sort: [{ created_at: { order: 'desc' } }],
        size: 5,
      });
    } catch (error) {
      logger.warn('Failed to find similar tickets', { category, error });
      return [];
    }
  }

  private async searchKnowledgeBase(category: string, queryText: string) {
    try {
      const categoryMap: Record<string, string[]> = {
        refund: ['Refund Policy', 'Returns', 'refund'],
        shipping: ['Shipping', 'shipping'],
        product_issue: ['Product Issues', 'Returns', 'product_issue'],
        account: ['Account', 'account'],
        other: [],
      };

      const kbCategories = categoryMap[category] || [];

      const query: Record<string, any> = {
        bool: {
          should: [
            ...(kbCategories.length > 0
              ? [{ terms: { category: kbCategories } }]
              : []),
            {
              multi_match: {
                query: queryText,
                fields: ['title^2', 'content', 'tags'],
              },
            },
          ],
          minimum_should_match: 1,
        },
      };

      return await agentBuilder.searchTool({
        index: INDEXES.KNOWLEDGE_BASE,
        query,
        sort: [{ helpful_count: { order: 'desc' } }],
        size: 3,
      });
    } catch (error) {
      logger.warn('Failed to search knowledge base', { category, error });
      return [];
    }
  }

  private async getProductInfo(product_id?: string) {
    if (!product_id) return undefined;

    try {
      const results = await agentBuilder.searchTool({
        index: INDEXES.PRODUCT_CATALOG,
        query: { term: { product_id } },
        size: 1,
      });

      return results[0] || undefined;
    } catch (error) {
      logger.warn('Failed to retrieve product info', { product_id, error });
      return undefined;
    }
  }

  private async analyzePatterns(category: string) {
    try {
      const result = await agentBuilder.esqlTool(`
        FROM ${INDEXES.SUPPORT_TICKETS}
        | WHERE category == "${category}" AND status == "resolved"
        | STATS
            total_count = COUNT(*),
            avg_resolution_time = AVG(resolution_time_minutes),
            avg_confidence = AVG(agent_confidence)
        | LIMIT 10
      `);

      return result.values || [];
    } catch (error) {
      logger.warn('ES|QL pattern analysis failed', { category, error });
      return [];
    }
  }

  private calculateConfidence(
    similarTickets: any[],
    articles: any[],
    customerProfile: any
  ): number {
    let confidence = 0.7;
    if (similarTickets.length >= 3) confidence += 0.1;
    if (similarTickets.length >= 5) confidence += 0.05;
    if (articles.length > 0) confidence += 0.05;
    if (customerProfile) confidence += 0.05;
    return Math.min(confidence, 0.99);
  }
}
