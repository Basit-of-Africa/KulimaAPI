import type { FastifyRequest, FastifyReply } from 'fastify';
import { getRedisClient } from '../cache/redis.js';
import { createChildLogger } from '../logger.js';
import { env } from '../config/env.js';

const log = createChildLogger('rate-limit');

/**
 * Per-key fixed-window rate limiter backed by Redis.
 *
 * If Redis is unavailable, each server counts in memory. With several servers
 * that would let a customer make N× their limit, so each server enforces only
 * its share: limit / INSTANCE_COUNT (rounded up, at least 1).
 */

const memoryCounters = new Map<string, { count: number; windowStart: number }>();
const MAX_MEMORY_COUNTERS = 50_000;
let warnedFallback = false;

/** The limit this server enforces on its own when Redis is down. */
export function perInstanceLimit(maxRequests: number, instanceCount = env.instanceCount): number {
  return Math.max(1, Math.ceil(maxRequests / Math.max(1, instanceCount)));
}

function pruneExpiredCounters(now: number, windowMs: number): void {
  if (memoryCounters.size < MAX_MEMORY_COUNTERS) return;
  for (const [k, c] of memoryCounters) {
    if (now - c.windowStart > windowMs) memoryCounters.delete(k);
  }
}

/** For tests only. */
export function _resetRateLimitForTests(): void {
  memoryCounters.clear();
  warnedFallback = false;
}

export async function perKeyRateLimit(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  if (!request.apiKey) return; // Skip unauthenticated — global rate limit handles those

  const keyId = request.apiKey.id;
  const maxRequests = request.apiKey.rateLimit;
  const windowSeconds = 60;
  const windowKey = `ratelimit:${keyId}:${Math.floor(Date.now() / (windowSeconds * 1000))}`;

  const redis = getRedisClient();

  if (redis) {
    try {
      const current = await redis.incr(windowKey);
      if (current === 1) {
        await redis.expire(windowKey, windowSeconds);
      }

      if (current > maxRequests) {
        const retryAfter = await redis.ttl(windowKey);
        return reply.code(429).send({
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Max ${maxRequests} requests per minute.`,
          retryAfter,
        });
      }

      reply.header('X-RateLimit-Limit', maxRequests);
      reply.header('X-RateLimit-Remaining', Math.max(0, maxRequests - current));
      return;
    } catch (err) {
      log.error({ err }, 'Redis rate limit failed — falling back to memory');
    }
  }

  // In-memory fallback: this server enforces only its share of the limit.
  const max = perInstanceLimit(maxRequests);
  if (!warnedFallback) {
    warnedFallback = true;
    log.warn({ instanceCount: env.instanceCount }, 'Redis unavailable — enforcing per-server share of rate limits');
  }
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  pruneExpiredCounters(now, windowMs);
  const counter = memoryCounters.get(keyId);

  if (!counter || now - counter.windowStart > windowMs) {
    memoryCounters.set(keyId, { count: 1, windowStart: now });
    reply.header('X-RateLimit-Limit', max);
    reply.header('X-RateLimit-Remaining', max - 1);
    return;
  }

  counter.count++;
  if (counter.count > max) {
    const retryAfter = Math.ceil((counter.windowStart + windowMs - now) / 1000);
    return reply.code(429).send({
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Max ${max} requests per minute.`,
      retryAfter,
    });
  }

  reply.header('X-RateLimit-Limit', max);
  reply.header('X-RateLimit-Remaining', Math.max(0, max - counter.count));
}
