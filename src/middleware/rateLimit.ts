import type { FastifyRequest, FastifyReply } from 'fastify';
import { getRedisClient } from '../cache/redis.js';
import { createChildLogger } from '../logger.js';

const log = createChildLogger('rate-limit');

/**
 * Per-key sliding window rate limiter backed by Redis.
 * Falls back to a simple in-memory counter if Redis is unavailable.
 */

const memoryCounters = new Map<string, { count: number; windowStart: number }>();

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

  // In-memory fallback
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const counter = memoryCounters.get(keyId);

  if (!counter || now - counter.windowStart > windowMs) {
    memoryCounters.set(keyId, { count: 1, windowStart: now });
    reply.header('X-RateLimit-Limit', maxRequests);
    reply.header('X-RateLimit-Remaining', maxRequests - 1);
    return;
  }

  counter.count++;
  if (counter.count > maxRequests) {
    const retryAfter = Math.ceil((counter.windowStart + windowMs - now) / 1000);
    return reply.code(429).send({
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Max ${maxRequests} requests per minute.`,
      retryAfter,
    });
  }

  reply.header('X-RateLimit-Limit', maxRequests);
  reply.header('X-RateLimit-Remaining', Math.max(0, maxRequests - counter.count));
}
