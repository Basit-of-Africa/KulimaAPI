import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import crypto from 'crypto';

// The database is unreachable for every query in this file.
const select = vi.fn(() => {
  throw Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:5432'), { code: 'ECONNREFUSED' });
});
vi.mock('../database/index.js', () => ({
  db: { select: (...a: any[]) => (select as any)(...a) },
  apiKeys: {},
  organisations: {},
}));

const { env } = await import('../config/env.js');
const { authenticateApiKey } = await import('./auth.js');
const { storeApiKey, _clearApiKeyStoreForTests } = await import('./apiKeyStore.js');
const { _resetDbAvailabilityForTests, isDbAvailable } = await import('../database/availability.js');

const RAW_KEY = 'kulima_' + 'ab'.repeat(24);
const hash = (k: string) => crypto.createHash('sha256').update(k).digest('hex');

let app: FastifyInstance;
const originalFallback = env.allowMemoryFallback;

beforeEach(async () => {
  _resetDbAvailabilityForTests();
  _clearApiKeyStoreForTests();
  select.mockClear();
  storeApiKey({
    id: 'mem-key',
    orgId: 'org-1',
    name: 'dev key',
    keyHash: hash(RAW_KEY),
    keyPrefix: RAW_KEY.slice(0, 12),
    status: 'active',
    rateLimit: 1000,
    monthlyQuota: 1000,
    createdAt: new Date().toISOString(),
  });

  app = Fastify();
  app.get('/protected', { preHandler: [authenticateApiKey] }, async (req) => ({ orgId: req.apiKey?.orgId }));
  await app.ready();
});

afterEach(async () => {
  env.allowMemoryFallback = originalFallback;
  await app.close();
});

const call = (key: string) =>
  app.inject({ method: 'GET', url: '/protected', headers: { authorization: `Bearer ${key}` } });

describe('auth when the database is down — production', () => {
  beforeEach(() => {
    env.allowMemoryFallback = false;
  });

  it('returns 503 with Retry-After, even for a key that exists in memory', async () => {
    const res = await call(RAW_KEY);
    expect(res.statusCode).toBe(503);
    expect(res.headers['retry-after']).toBe('10');
  });

  it('stops hitting the database while the circuit is open', async () => {
    await call(RAW_KEY);
    expect(select).toHaveBeenCalledTimes(1);
    expect(isDbAvailable()).toBe(false);
    await call(RAW_KEY);
    expect(select).toHaveBeenCalledTimes(1); // fast-fail, no second attempt within the window
  });
});

describe('auth when the database is down — development fallback', () => {
  beforeEach(() => {
    env.allowMemoryFallback = true;
  });

  it('accepts an in-memory key on an exact match', async () => {
    const res = await call(RAW_KEY);
    expect(res.statusCode).toBe(200);
    expect(res.json().orgId).toBe('org-1');
  });

  it('rejects a different key that shares the same 12-character prefix', async () => {
    const forged = RAW_KEY.slice(0, 12) + 'f'.repeat(RAW_KEY.length - 12);
    const res = await call(forged);
    expect(res.statusCode).not.toBe(200);
  });
});
