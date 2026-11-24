import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';

// Redis is unavailable for this whole file.
vi.mock('../cache/redis.js', () => ({ getRedisClient: () => null }));

const { env } = await import('../config/env.js');
const { perKeyRateLimit, perInstanceLimit, _resetRateLimitForTests } = await import('./rateLimit.js');

describe('perInstanceLimit', () => {
  it("splits a key's limit across servers so the total stays the same", () => {
    expect(perInstanceLimit(1000, 1)).toBe(1000);
    expect(perInstanceLimit(1000, 4)).toBe(250);
    expect(perInstanceLimit(10, 3)).toBe(4); // rounds up
    expect(perInstanceLimit(1, 10)).toBe(1); // never below 1
    expect(perInstanceLimit(100, 0)).toBe(100); // bad config treated as 1
  });
});

describe('perKeyRateLimit without Redis', () => {
  let app: FastifyInstance;
  const originalCount = env.instanceCount;

  beforeEach(async () => {
    _resetRateLimitForTests();
    app = Fastify();
    app.addHook('preHandler', async (req) => {
      req.apiKey = { id: 'k1', orgId: 'o1', keyPrefix: 'p', status: 'active', rateLimit: 8, monthlyQuota: 1000 };
    });
    app.get('/x', { preHandler: [perKeyRateLimit] }, async () => ({ ok: true }));
    await app.ready();
  });

  afterEach(async () => {
    env.instanceCount = originalCount;
    await app.close();
  });

  it("enforces this server's share of the limit", async () => {
    env.instanceCount = 4; // 8 per minute across 4 servers → 2 here
    expect((await app.inject('/x')).statusCode).toBe(200);
    const second = await app.inject('/x');
    expect(second.statusCode).toBe(200);
    expect(second.headers['x-ratelimit-limit']).toBe('2');
    expect((await app.inject('/x')).statusCode).toBe(429);
  });
});
