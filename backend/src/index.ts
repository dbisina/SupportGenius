import dns from 'dns';
dns.setDefaultResultOrder('ipv4first'); // avoid slow IPv6 fallback on Windows
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { elasticsearchClient, INDEXES } from './config/elasticsearch';
import { agentBuilder } from './services/agent-builder';
import ticketRoutes from './routes/tickets';
import metricsRoutes from './routes/metrics';
import agentRoutes from './routes/agents';
import incidentRoutes from './routes/incidents';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    query: req.query,
    body: req.body,
  });
  next();
});

// Health check endpoint
app.get('/health', async (_req, res) => {
  try {
    const esHealth = await elasticsearchClient.ping();
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      elasticsearch: esHealth ? 'connected' : 'disconnected',
    });
  } catch (error) {
    logger.error('Health check failed', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Elasticsearch connection failed',
    });
  }
});

// API routes
app.use('/api/tickets', ticketRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/incidents', incidentRoutes);

// Error handling middleware
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
});

// Start server
async function start() {
  try {
    // Test Elasticsearch connection — non-fatal so the server still starts
    // in degraded mode (routes work, ES-backed features return errors gracefully).
    let esReady = false;
    try {
      esReady = await elasticsearchClient.ping();
      if (esReady) {
        logger.info('Elasticsearch connection established');
      } else {
        logger.warn('Elasticsearch ping returned false — running in degraded mode. Check ELASTICSEARCH_URL in .env');
      }
    } catch (pingErr: any) {
      logger.warn(`Elasticsearch unreachable (${pingErr?.message ?? pingErr}) — running in degraded mode. Check ELASTICSEARCH_URL in .env`);
    }

    // Ensure pipeline_traces index exists with correct mapping
    try {
      const pipelineTracesMapping = {
        mappings: {
          dynamic: false as const,
          properties: {
            ticket_id: { type: 'keyword' as const },
            agent: { type: 'keyword' as const },
            step_number: { type: 'integer' as const },
            status: { type: 'keyword' as const },
            started_at: { type: 'date' as const },
            completed_at: { type: 'date' as const },
            duration_ms: { type: 'integer' as const },
            reasoning: { type: 'text' as const },
            tool_calls: { type: 'object' as const, enabled: false },
            llm_calls: { type: 'integer' as const },
            input_tokens: { type: 'integer' as const },
            output_tokens: { type: 'integer' as const },
            model: { type: 'keyword' as const },
            result: { type: 'object' as const, enabled: false },
            confidence: { type: 'float' as const },
            raw_response: { type: 'text' as const, index: false },
          },
        },
      };
      const tracesExists = await elasticsearchClient.indices.exists({ index: INDEXES.PIPELINE_TRACES });
      if (!tracesExists) {
        await elasticsearchClient.indices.create({
          index: INDEXES.PIPELINE_TRACES,
          body: pipelineTracesMapping,
        });
        logger.info('Created pipeline_traces index');
      }
    } catch (indexError) {
      logger.warn('pipeline_traces index setup failed (non-fatal)', { error: indexError });
    }

    // Register custom tools and agents in Elastic Agent Builder
    try {
      await agentBuilder.setup();
      logger.info('Agent Builder tools and agents registered');
    } catch (setupError) {
      logger.warn('Agent Builder setup failed (non-fatal)', { error: setupError });
    }

    app.listen(PORT, () => {
      logger.info(`SupportGenius AI server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Elasticsearch: ${process.env.ELASTICSEARCH_URL}`);
      logger.info(`Agent Builder: Tools and agents ready`);
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    // Don't exit — let the process crash naturally so the caller (e.g. nodemon) can report it.
    throw error;
  }
}

start();
