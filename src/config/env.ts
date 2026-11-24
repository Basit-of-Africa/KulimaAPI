import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env') });

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  logLevel: process.env.LOG_LEVEL || 'info',

  /**
   * Keep serving from in-memory stores when Postgres is down. Development
   * convenience only: always off in production, where the API returns 503.
   * Set ALLOW_MEMORY_FALLBACK=false to test production behaviour locally.
   */
  allowMemoryFallback:
    (process.env.NODE_ENV || 'development') !== 'production' &&
    process.env.ALLOW_MEMORY_FALLBACK !== 'false',

  /**
   * Number of API servers running. Used when Redis is down so per-server
   * rate-limit counters add up to the customer's limit instead of N times it.
   */
  instanceCount: Math.max(1, parseInt(process.env.INSTANCE_COUNT || '1', 10) || 1),

  database: {
    url: process.env.DATABASE_URL || 'postgresql://kulima:kulima_secret@localhost:5432/kulima_db',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  auth: {
    apiKeySaltRounds: parseInt(process.env.API_KEY_SALT_ROUNDS || '12', 10),
    jwtSecret: process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production',
  },

  providers: {
    openMeteo: {
      baseUrl: process.env.OPEN_METEO_BASE_URL || 'https://api.open-meteo.com',
      apiKey: process.env.OPEN_METEO_API_KEY || '',
    },
  },

  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-latest',
  },

  rateLimit: {
    free: parseInt(process.env.RATE_LIMIT_FREE || '1000', 10),
    developer: parseInt(process.env.RATE_LIMIT_DEVELOPER || '10000', 10),
    business: parseInt(process.env.RATE_LIMIT_BUSINESS || '100000', 10),
  },

  cache: {
    memoryMaxEntries: Math.max(100, parseInt(process.env.MEMORY_CACHE_MAX_ENTRIES || '5000', 10) || 5000),
    ttlCurrentWeather: parseInt(process.env.CACHE_TTL_CURRENT_WEATHER || '900', 10),
    ttlForecast: parseInt(process.env.CACHE_TTL_FORECAST || '3600', 10),
    ttlHistorical: parseInt(process.env.CACHE_TTL_HISTORICAL || '86400', 10),
    ttlLocation: parseInt(process.env.CACHE_TTL_LOCATION || '2592000', 10),
  },

  cors: {
    origin: (process.env.CORS_ORIGIN || 'http://localhost:3001').split(',').map((s: string) => s.trim()),
  },
} as const;
