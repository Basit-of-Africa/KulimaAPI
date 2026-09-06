import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { env } from './config/env.js';
import { logger, createChildLogger } from './logger.js';
import { testDatabaseConnection, closeDatabaseConnection } from './database/connection.js';
import { closeRedis } from './cache/redis.js';
import { errorHandler, notFoundHandler } from './middleware/errors.js';
import { perKeyRateLimit } from './middleware/rateLimit.js';
import authRoutes from './routes/auth.js';
import intelligenceRoutes from './routes/intelligence.js';
import weatherRoutes from './routes/weather.js';
import farmRoutes from './routes/farms.js';

const log = createChildLogger('server');

// ─── Fastify Instance ────────────────────────────────────────────────────────
const app = Fastify({
  logger: {
    level: env.logLevel,
    // Fastify will use its own pino instance; we bridge it to our logger
    transport:
      env.nodeEnv === 'development'
        ? {
            target: 'pino-pretty',
            options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
          }
        : undefined,
  },
  genReqId: () => crypto.randomUUID(),
});

// ─── Plugins ─────────────────────────────────────────────────────────────────
await app.register(cors, {
  origin: env.cors.origin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
});

await app.register(helmet);

await app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
});

// ─── Register Routes ────────────────────────────────────────────────────────
await app.register(authRoutes);
await app.register(intelligenceRoutes);
await app.register(weatherRoutes);
await app.register(farmRoutes);

// ─── Error Handlers ────────────────────────────────────────────────────────
app.setErrorHandler(errorHandler);
app.setNotFoundHandler(notFoundHandler);

// ─── Health Endpoints ────────────────────────────────────────────────────────
app.get('/health', {
  schema: {
    description: 'Basic health check',
    tags: ['System'],
    response: {
      200: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          timestamp: { type: 'string' },
          uptime: { type: 'number' },
        },
      },
    },
  },
  handler: async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  },
});

app.get('/health/providers', {
  schema: {
    description: 'Provider health status',
    tags: ['System'],
    response: {
      200: {
        type: 'object',
        properties: {
          database: { type: 'string' },
          timestamp: { type: 'string' },
        },
      },
    },
  },
  handler: async () => {
    const dbOk = await testDatabaseConnection();
    return {
      database: dbOk ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    };
  },
});

// ─── Root Endpoint ───────────────────────────────────────────────────────────
app.get('/', async () => {
  return {
    name: 'KulimaAPI',
    version: '1.0.0',
    description: 'Agriculture Intelligence API for Nigerian Farmers',
    docs: '/docs',
  };
});

// ─── Start Server ────────────────────────────────────────────────────────────
async function start() {
  try {
    // Test database connection
    const dbConnected = await testDatabaseConnection();
    if (dbConnected) {
      log.info('✅ Database connected');
    } else {
      log.warn('⚠️  Database unavailable — running without persistence');
    }

    await app.listen({ port: env.port, host: env.host });
    log.info(`🚀 KulimaAPI running at http://${env.host}:${env.port}`);
    log.info(`📖 Environment: ${env.nodeEnv}`);
  } catch (err) {
    log.error(err, 'Failed to start server');
    process.exit(1);
  }
}

// ─── Graceful Shutdown ───────────────────────────────────────────────────────
const shutdown = async (signal: string) => {
  log.info(`${signal} received — shutting down`);
  await app.close();
  await closeRedis();
  await closeDatabaseConnection();
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// ─── Launch ──────────────────────────────────────────────────────────────────
start();
