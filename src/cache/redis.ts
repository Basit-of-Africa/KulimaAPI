import Redis from 'ioredis';
import { env } from '../config/env.js';
import { createChildLogger } from '../logger.js';

const log = createChildLogger('redis');

let client: Redis | null = null;

/**
 * Get or create the Redis client singleton.
 * Returns null if Redis is unavailable (graceful degradation).
 */
export function getRedisClient(): Redis | null {
  if (client) return client;

  try {
    client = new Redis(env.redis.url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) {
          log.warn('Redis retry limit reached — running without cache');
          return null;
        }
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
      connectTimeout: 3000,
    });

    client.on('connect', () => log.info('Redis connected'));
    client.on('error', (err) => {
      log.error({ err }, 'Redis error');
      client = null;
    });
    client.on('close', () => {
      log.warn('Redis connection closed');
      client = null;
    });

    client.connect().catch(() => {
      log.warn('Redis unavailable — running without cache');
      client = null;
    });

    return client;
  } catch {
    return null;
  }
}

/**
 * Graceful Redis shutdown.
 */
export async function closeRedis(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
  }
}
