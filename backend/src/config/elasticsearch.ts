import { Client } from '@elastic/elasticsearch';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';

dotenv.config();

// Elasticsearch client configuration
const config: any = {
  node: process.env.ELASTICSEARCH_URL,
};

// Add authentication based on what's available
if (process.env.ELASTICSEARCH_API_KEY) {
  config.auth = {
    apiKey: process.env.ELASTICSEARCH_API_KEY,
  };
} else if (process.env.ELASTICSEARCH_USERNAME && process.env.ELASTICSEARCH_PASSWORD) {
  config.auth = {
    username: process.env.ELASTICSEARCH_USERNAME,
    password: process.env.ELASTICSEARCH_PASSWORD,
  };
}

export const elasticsearchClient = new Client(config);

// Test connection on initialization
(async () => {
  try {
    const info = await elasticsearchClient.info();
    logger.info('Elasticsearch client initialized', {
      cluster_name: info.cluster_name,
      version: info.version.number,
    });
  } catch (error) {
    logger.error('Failed to initialize Elasticsearch client', error);
  }
})();

// Index names
export const INDEXES = {
  SUPPORT_TICKETS: 'support_tickets',
  CUSTOMER_PROFILES: 'customer_profiles',
  PRODUCT_CATALOG: 'product_catalog',
  KNOWLEDGE_BASE: 'knowledge_base',
  RESOLUTION_ACTIONS: 'resolution_actions',
};
