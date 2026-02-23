import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { elasticsearchClient } from './config/elasticsearch';
import ticketRoutes from './routes/tickets';
import metricsRoutes from './routes/metrics';
import agentRoutes from './routes/agents';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    query: req.query,
    body: req.body,
  });
  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
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

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
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
    // Test Elasticsearch connection
    const esConnected = await elasticsearchClient.ping();
    if (!esConnected) {
      throw new Error('Failed to connect to Elasticsearch');
    }
    logger.info('Elasticsearch connection established');

    app.listen(PORT, () => {
      logger.info(`🚀 SupportGenius AI server running on port ${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔍 Elasticsearch: ${process.env.ELASTICSEARCH_URL}`);
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

start();
