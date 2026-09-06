import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env') });

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  logLevel: process.env.LOG_LEVEL || 'info',

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

  rateLimit: {
    free: parseInt(process.env.RATE_LIMIT_FREE || '1000', 10),
    developer: parseInt(process.env.RATE_LIMIT_DEVELOPER || '10000', 10),
    business: parseInt(process.env.RATE_LIMIT_BUSINESS || '100000', 10),
  },

  cache: {
    ttlCurrentWeather: parseInt(process.env.CACHE_TTL_CURRENT_WEATHER || '900', 10),
    ttlForecast: parseInt(process.env.CACHE_TTL_FORECAST || '3600', 10),
    ttlHistorical: parseInt(process.env.CACHE_TTL_HISTORICAL || '86400', 10),
    ttlLocation: parseInt(process.env.CACHE_TTL_LOCATION || '2592000', 10),
  },

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  },
} as const;
