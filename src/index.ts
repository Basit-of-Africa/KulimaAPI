import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
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
import webhookRoutes from './routes/webhooks.js';
import locationRoutes from './routes/locations.js';
import cropRoutes from './routes/crops.js';
import satelliteRoutes from './routes/satellite.js';
import farmsV2Routes from './routes/farmsV2.js';
import platformRoutes from './routes/platform.js';
import environmentRoutes from './routes/environments.js';
import { getWeatherProvider, getGeoProvider } from './providers/index.js';
import { startHealthCheckCron, stopHealthCheckCron } from './cache/healthCheck.js';
import { startWebhookProcessor, stopWebhookProcessor } from './webhooks/delivery.js';

const log = createChildLogger('server');

// Background service handles
let healthCheckInterval: NodeJS.Timeout | null = null;
let webhookInterval: NodeJS.Timeout | null = null;

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

// ─── Swagger / OpenAPI ──────────────────────────────────────────────────────
await app.register(swagger, {
  openapi: {
    openapi: '3.1.0',
    info: {
      title: 'KulimaAPI',
      description:
        'Agriculture Intelligence API for Nigerian Farmers.\n\n' +
        'Turn raw environmental data into actionable agricultural decisions.\n' +
        'Provides weather data, agricultural rules, risk assessments, and\n' +
        'location-specific recommendations backed by evidence and confidence scores.',
      version: '1.0.0',
      contact: { name: 'KulimaAPI Support' },
      license: { name: 'MIT' },
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Local development' },
      { url: 'https://api.kulima.io', description: 'Production' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'API Key',
          description: 'Your KulimaAPI key. Format: kulima_xxxxxxxx',
        },
      },
    },
    tags: [
      { name: 'System', description: 'Health checks and system status' },
      { name: 'Auth', description: 'API key management' },
      { name: 'Intelligence', description: 'Agricultural intelligence and recommendations' },
      { name: 'Weather', description: 'Weather data and forecasts' },
      { name: 'Location', description: 'Location resolution and geocoding' },
      { name: 'Farms', description: 'Farm registration and management' },
      { name: 'Account', description: 'Account and usage information' },
    ],
  },
});

await app.register(swaggerUi, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: true,
    filter: true,
  },
});

// ─── Register Routes ────────────────────────────────────────────────────────
await app.register(authRoutes);
await app.register(intelligenceRoutes);
await app.register(weatherRoutes);
await app.register(farmRoutes);
await app.register(webhookRoutes);
await app.register(locationRoutes);
await app.register(cropRoutes);
await app.register(satelliteRoutes);
await app.register(farmsV2Routes);
await app.register(platformRoutes);
await app.register(environmentRoutes);

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
  },
  handler: async () => {
    const dbOk = await testDatabaseConnection();
    const weatherProvider = getWeatherProvider();
    const geoProvider = getGeoProvider();

    return {
      database: dbOk ? 'connected' : 'disconnected',
      weather: weatherProvider.isAvailable() ? 'operational' : 'degraded',
      geo: geoProvider.isAvailable() ? 'operational' : 'degraded',
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

      // Start background services
      healthCheckInterval = startHealthCheckCron();
      webhookInterval = startWebhookProcessor();
    } else {
      log.warn('⚠️  Database unavailable — running without persistence');
    }

    await app.listen({ port: env.port, host: env.host });
    log.info(`🚀 KulimaAPI running at http://${env.host}:${env.port}`);
    log.info(`📖 Environment: ${env.nodeEnv}`);
    log.info(`📚 Swagger docs at http://${env.host}:${env.port}/docs`);
  } catch (err) {
    log.error(err, 'Failed to start server');
    process.exit(1);
  }
}

// ─── Graceful Shutdown ───────────────────────────────────────────────────────
const shutdown = async (signal: string) => {
  log.info(`${signal} received — shutting down`);

  // Stop background services
  if (healthCheckInterval) stopHealthCheckCron(healthCheckInterval);
  if (webhookInterval) stopWebhookProcessor(webhookInterval);

  await app.close();
  await closeRedis();
  await closeDatabaseConnection();
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// ─── Launch ──────────────────────────────────────────────────────────────────
start();
