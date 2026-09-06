import { getRedisClient } from './redis.js';
import { createChildLogger } from '../logger.js';

const log = createChildLogger('cache');

// ─── Cache Service ───────────────────────────────────────────────────────────

/**
 * In-memory fallback cache when Redis is unavailable.
 */
const memoryCache = new Map<string, { data: string; expiresAt: number }>();

export class CacheService {
  private prefix: string;

  constructor(prefix = 'kulima') {
    this.prefix = prefix;
  }

  private keyParts(...parts: string[]): string {
    return [this.prefix, ...parts].join(':');
  }

  /**
   * Get a cached value by key.
   * Tries Redis first, falls back to in-memory cache.
   */
  async get<T>(key: string): Promise<T | null> {
    const fullKey = this.keyParts(key);

    // Try Redis
    const redis = getRedisClient();
    if (redis) {
      try {
        const raw = await redis.get(fullKey);
        if (raw) {
          log.debug({ key: fullKey }, 'Cache hit (Redis)');
          return JSON.parse(raw) as T;
        }
      } catch (err) {
        log.error({ err, key: fullKey }, 'Redis get failed');
      }
    }

    // Fallback to memory
    const cached = memoryCache.get(fullKey);
    if (cached && cached.expiresAt > Date.now()) {
      log.debug({ key: fullKey }, 'Cache hit (memory)');
      return JSON.parse(cached.data) as T;
    }

    log.debug({ key: fullKey }, 'Cache miss');
    return null;
  }

  /**
   * Set a cached value with a TTL in seconds.
   */
  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    const fullKey = this.keyParts(key);
    const serialized = JSON.stringify(value);
    const expiresAt = Date.now() + ttlSeconds * 1000;

    // Try Redis
    const redis = getRedisClient();
    if (redis) {
      try {
        await redis.setex(fullKey, ttlSeconds, serialized);
        log.debug({ key: fullKey, ttl: ttlSeconds }, 'Cache set (Redis)');
      } catch (err) {
        log.error({ err, key: fullKey }, 'Redis set failed');
      }
    }

    // Also store in memory as fallback
    memoryCache.set(fullKey, { data: serialized, expiresAt });
  }

  /**
   * Delete a cached value.
   */
  async del(key: string): Promise<void> {
    const fullKey = this.keyParts(key);

    const redis = getRedisClient();
    if (redis) {
      try {
        await redis.del(fullKey);
      } catch (err) {
        log.error({ err, key: fullKey }, 'Redis del failed');
      }
    }

    memoryCache.delete(fullKey);
  }

  /**
   * Generate a cache key for weather data.
   */
  static weatherKey(lat: number, lng: number, type: string): string {
    return `weather:${type}:${lat.toFixed(2)}:${lng.toFixed(2)}`;
  }

  /**
   * Generate a cache key for location data.
   */
  static locationKey(query: string): string {
    return `location:${query.toLowerCase().trim()}`;
  }

  /**
   * Generate a cache key for intelligence results.
   */
  static intelligenceKey(lat: number, lng: number, crop?: string): string {
    const base = `intelligence:${lat.toFixed(2)}:${lng.toFixed(2)}`;
    return crop ? `${base}:${crop}` : base;
  }
}

export const cache = new CacheService();
