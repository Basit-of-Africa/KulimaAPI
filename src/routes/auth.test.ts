import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const ORG_A = '11111111-1111-4111-8111-111111111111';
const ORG_B = '22222222-2222-4222-8222-222222222222';
const NEW_ORG = '33333333-3333-4333-8333-333333333333';

const state = vi.hoisted(() => ({
  orgs: new Map<string, { id: string; plan: string; monthlyQuota: number }>(),
  inserted: [] as any[],
}));

vi.mock('../database/index.js', () => {
  const db = {
    select: () => ({
      from: () => ({
        where: () => ({
          // The route looks up the caller's org; the test sets a single "current" org.
          limit: async () => {
            const org = state.orgs.get((globalThis as any).__lookupOrg);
            return org ? [org] : [];
          },
        }),
      }),
    }),
    insert: () => ({
      values: (v: any) => ({
        returning: async () => {
          state.inserted.push(v);
          const org = { id: NEW_ORG, plan: 'free', monthlyQuota: 1000 };
          state.orgs.set(NEW_ORG, org);
          return [org];
        },
      }),
    }),
  };
  return { db, apiKeys: {}, organisations: {} };
});

const createApiKey = vi.fn(async (orgId: string, name: string, opts: any) => ({
  id: 'key-id',
  rawKey: 'kulima_' + 'a'.repeat(48),
  keyPrefix: 'kulima_aaaaa',
  name,
  rateLimit: opts.rateLimit,
  monthlyQuota: opts.monthlyQuota,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  orgId,
}));
const revokeApiKey = vi.fn(async (_keyId: string, _orgId: string) => true);
const rotateApiKey = vi.fn(async (_keyId: string, _orgId: string) => null);

vi.mock('../middleware/apiKeyManager.js', () => ({
  createApiKey: (...a: any[]) => (createApiKey as any)(...a),
  revokeApiKey: (...a: any[]) => (revokeApiKey as any)(...a),
  rotateApiKey: (...a: any[]) => (rotateApiKey as any)(...a),
}));

// Header "Bearer org-a" authenticates as ORG_A; anything else is rejected.
vi.mock('../middleware/auth.js', () => ({
  authenticateApiKey: async (request: any, reply: any) => {
    const h = request.headers.authorization;
    if (h === 'Bearer org-a') {
      (globalThis as any).__lookupOrg = ORG_A;
      request.apiKey = { id: 'caller-key', orgId: ORG_A, keyPrefix: 'kulima_caller', status: 'active', rateLimit: 1000, monthlyQuota: 1000 };
      return;
    }
    return reply.code(401).send({ error: 'Unauthorized', message: 'Invalid API key.' });
  },
}));

const { default: authRoutes } = await import('./auth.js');

// ─── Setup ───────────────────────────────────────────────────────────────────

let app: FastifyInstance;

beforeEach(async () => {
  state.orgs.clear();
  state.inserted.length = 0;
  state.orgs.set(ORG_A, { id: ORG_A, plan: 'developer', monthlyQuota: 50000 });
  (globalThis as any).__lookupOrg = undefined;
  createApiKey.mockClear();
  revokeApiKey.mockClear();
  rotateApiKey.mockClear();

  app = Fastify();
  await app.register(rateLimit, { max: 1000, timeWindow: '1 minute' });
  await app.register(authRoutes);
  await app.ready();
});

afterEach(async () => {
  await app.close();
});

const post = (body: unknown, auth?: string) =>
  app.inject({
    method: 'POST',
    url: '/v1/auth/keys',
    headers: auth ? { authorization: auth } : {},
    payload: body as any,
  });

// ─── POST /v1/auth/keys ──────────────────────────────────────────────────────

describe('POST /v1/auth/keys — unauthenticated sign-up', () => {
  it('creates a brand-new organisation and returns its id', async () => {
    const res = await post({ name: 'Ada' });
    expect(res.statusCode).toBe(201);
    expect(res.json().orgId).toBe(NEW_ORG);
    expect(state.inserted).toHaveLength(1);
    expect(state.inserted[0]).not.toHaveProperty('id'); // id is server-generated
    expect(createApiKey).toHaveBeenCalledWith(NEW_ORG, 'Ada', expect.any(Object));
  });

  it('rejects an orgId so nobody can mint keys for an existing organisation', async () => {
    const res = await post({ name: 'Mallory', orgId: ORG_A });
    expect(res.statusCode).toBe(403);
    expect(createApiKey).not.toHaveBeenCalled();
    expect(state.inserted).toHaveLength(0);
  });

  it('ignores caller-supplied rate limits and quotas', async () => {
    const res = await post({ name: 'Greedy', rateLimit: 999999999, monthlyQuota: 999999999 });
    expect(res.statusCode).toBe(201);
    const opts = createApiKey.mock.calls[0][2];
    expect(opts.rateLimit).toBe(1000); // free plan default
    expect(opts.monthlyQuota).toBe(1000);
  });

  it('enforces a tight per-IP sign-up limit', async () => {
    const limit = parseInt(process.env.SIGNUP_RATE_LIMIT_PER_HOUR || '10', 10);
    for (let i = 0; i < limit; i++) {
      expect((await post({ name: `u${i}` })).statusCode).toBe(201);
    }
    expect((await post({ name: 'one-too-many' })).statusCode).toBe(429);
  });
});

describe('POST /v1/auth/keys — authenticated', () => {
  it("creates a key in the caller's organisation with its plan limits", async () => {
    const res = await post({ name: 'Second key' }, 'Bearer org-a');
    expect(res.statusCode).toBe(201);
    expect(res.json().orgId).toBe(ORG_A);
    expect(state.inserted).toHaveLength(0);
    const [orgId, , opts] = createApiKey.mock.calls[0];
    expect(orgId).toBe(ORG_A);
    expect(opts.rateLimit).toBe(10000); // developer plan
    expect(opts.monthlyQuota).toBe(50000); // from the organisation row
  });

  it('accepts an orgId that matches the caller', async () => {
    const res = await post({ name: 'k', orgId: ORG_A }, 'Bearer org-a');
    expect(res.statusCode).toBe(201);
  });

  it("rejects an orgId for someone else's organisation", async () => {
    const res = await post({ name: 'k', orgId: ORG_B }, 'Bearer org-a');
    expect(res.statusCode).toBe(403);
    expect(createApiKey).not.toHaveBeenCalled();
  });

  it('returns 401 for an invalid key instead of falling through to sign-up', async () => {
    const res = await post({ name: 'k' }, 'Bearer wrong');
    expect(res.statusCode).toBe(401);
    expect(state.inserted).toHaveLength(0);
    expect(createApiKey).not.toHaveBeenCalled();
  });
});

// ─── Revoke / rotate are scoped to the caller's org ──────────────────────────

describe('revoke and rotate', () => {
  const KEY = '44444444-4444-4444-8444-444444444444';

  it("revoke passes the caller's orgId", async () => {
    const res = await app.inject({ method: 'DELETE', url: `/v1/auth/keys/${KEY}`, headers: { authorization: 'Bearer org-a' } });
    expect(res.statusCode).toBe(200);
    expect(revokeApiKey).toHaveBeenCalledWith(KEY, ORG_A);
  });

  it('revoke of a key outside the org is a 404', async () => {
    revokeApiKey.mockResolvedValueOnce(false);
    const res = await app.inject({ method: 'DELETE', url: `/v1/auth/keys/${KEY}`, headers: { authorization: 'Bearer org-a' } });
    expect(res.statusCode).toBe(404);
  });

  it("rotate passes the caller's orgId", async () => {
    const res = await app.inject({ method: 'POST', url: `/v1/auth/keys/${KEY}/rotate`, headers: { authorization: 'Bearer org-a' } });
    expect(res.statusCode).toBe(404); // mock returns null → not found in caller's org
    expect(rotateApiKey).toHaveBeenCalledWith(KEY, ORG_A);
  });
});
