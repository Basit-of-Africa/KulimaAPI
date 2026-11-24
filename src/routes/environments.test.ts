import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';

// Every database call fails as if Postgres were down. In development mode the
// routes fall back to memory; in production they must return 503.
vi.mock('../database/index.js', () => {
  const fail = () => {
    throw Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' });
  };
  const db = { select: fail, insert: fail, update: fail, delete: fail };
  return {
    db,
    environments: {},
    environmentCrops: {},
    environmentReadings: {},
    controlActions: {},
    nutrientSchedules: {},
  };
});

vi.mock('../providers/index.js', () => ({ getWeatherProvider: () => ({}) }));
vi.mock('../middleware/usage.js', () => ({ trackUsage: async () => {} }));

// "Bearer org-a" / "Bearer org-b" authenticate as those orgs; no header → 401.
vi.mock('../middleware/auth.js', () => ({
  authenticateApiKey: async (request: any, reply: any) => {
    const m = /^Bearer (org-[ab])$/.exec(request.headers.authorization || '');
    if (!m) return reply.code(401).send({ error: 'Unauthorized' });
    request.apiKey = { id: m[1], orgId: m[1], keyPrefix: 'x', status: 'active', rateLimit: 1000, monthlyQuota: 1000 };
  },
}));

const { env } = await import('../config/env.js');
const { default: environmentRoutes } = await import('./environments.js');
const { errorHandler } = await import('../middleware/errors.js');
const { _resetDbAvailabilityForTests } = await import('../database/availability.js');

let app: FastifyInstance;
const originalFallback = env.allowMemoryFallback;

beforeEach(async () => {
  _resetDbAvailabilityForTests();
  app = Fastify();
  app.setErrorHandler(errorHandler);
  await app.register(environmentRoutes);
  await app.ready();
});

afterEach(async () => {
  env.allowMemoryFallback = originalFallback;
  await app.close();
});

const newEnv = { name: 'Greenhouse 1', type: 'greenhouse', latitude: 9.05, longitude: 7.49 };
const as = (org: 'org-a' | 'org-b') => ({ authorization: `Bearer ${org}` });

describe('development fallback (database down)', () => {
  beforeEach(() => {
    env.allowMemoryFallback = true;
  });

  it("keeps each organisation's environments private", async () => {
    const created = await app.inject({ method: 'POST', url: '/v2/environments', headers: as('org-a'), payload: newEnv });
    expect(created.statusCode).toBe(201);
    const id = created.json().id;

    expect((await app.inject({ method: 'GET', url: `/v2/environments/${id}`, headers: as('org-a') })).statusCode).toBe(200);

    // Another organisation can't read, change or delete it — it looks like it doesn't exist.
    expect((await app.inject({ method: 'GET', url: `/v2/environments/${id}`, headers: as('org-b') })).statusCode).toBe(404);
    expect((await app.inject({ method: 'PATCH', url: `/v2/environments/${id}`, headers: as('org-b'), payload: { name: 'pwned' } })).statusCode).toBe(404);
    expect((await app.inject({ method: 'DELETE', url: `/v2/environments/${id}`, headers: as('org-b') })).statusCode).toBe(404);
    expect((await app.inject({ method: 'GET', url: `/v2/environments/${id}/readings`, headers: as('org-b') })).statusCode).toBe(404);
    expect((await app.inject({ method: 'GET', url: `/v2/environments/${id}/nutrients`, headers: as('org-b') })).statusCode).toBe(404);

    const listB = await app.inject({ method: 'GET', url: '/v2/environments', headers: as('org-b') });
    expect(listB.json().count).toBe(0);
    const listA = await app.inject({ method: 'GET', url: '/v2/environments', headers: as('org-a') });
    expect(listA.json().environments.map((e: any) => e.id)).toContain(id);
  });

  it('requires a key — no more listing every organisation anonymously', async () => {
    await app.inject({ method: 'POST', url: '/v2/environments', headers: as('org-a'), payload: newEnv });
    expect((await app.inject({ method: 'GET', url: '/v2/environments' })).statusCode).toBe(401);
  });
});

describe('production (database down)', () => {
  beforeEach(() => {
    env.allowMemoryFallback = false;
  });

  it('returns 503 instead of saving to memory', async () => {
    const res = await app.inject({ method: 'POST', url: '/v2/environments', headers: as('org-a'), payload: newEnv });
    expect(res.statusCode).toBe(503);
    expect(res.headers['retry-after']).toBe('10');
  });

  it('returns 503 for reads too', async () => {
    const res = await app.inject({ method: 'GET', url: '/v2/environments', headers: as('org-a') });
    expect(res.statusCode).toBe(503);
  });
});
