import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db, apiKeys, organisations } from '../database/index.js';
import { eq, sql, and, gte } from 'drizzle-orm';
import { revokeApiKey, rotateApiKey } from '../middleware/apiKeyManager.js';
import { authenticateApiKey } from '../middleware/auth.js';
import { storeApiKey, lookupByKeyPrefix, getAllKeys, deleteKey, setDbAvailable, getDbAvailable } from '../middleware/apiKeyStore.js';
import { createChildLogger } from '../logger.js';
import { env as config } from '../config/index.js';
import crypto from 'crypto';

const log = createChildLogger('routes/auth');

// ─── In-memory store (used when DB is unavailable) ───────────────────────────

function generateKey(): { rawKey: string; keyPrefix: string; keyHash: string } {
  const rawKey = `kulima_${crypto.randomBytes(24).toString('hex')}`;
  const keyPrefix = rawKey.slice(0, 12);
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
  return { rawKey, keyPrefix, keyHash };
}

function isDbAvailable(): boolean {
  return getDbAvailable();
}

/**
 * Rate limit and quota for a new key come from the organisation's plan —
 * never from the request body, so callers cannot raise their own limits.
 */
function limitsForPlan(plan: string, orgMonthlyQuota: number): { rateLimit: number; monthlyQuota: number } {
  const perPlan = config.rateLimit as Record<string, number>;
  return {
    rateLimit: perPlan[plan] ?? config.rateLimit.free,
    monthlyQuota: orgMonthlyQuota,
  };
}

const FREE_DEFAULT_QUOTA = 1000;

// Unauthenticated calls create a brand-new organisation (sign-up), so they
// get a much tighter per-IP limit than authenticated key management.
const SIGNUP_LIMIT_PER_HOUR = parseInt(process.env.SIGNUP_RATE_LIMIT_PER_HOUR || '10', 10);
const AUTHED_KEY_CREATE_LIMIT_PER_HOUR = 60;

export default async function authRoutes(app: FastifyInstance) {
  // ─── POST /v1/auth/keys — Create API Key ──────────────────────────────
  //
  // Two modes:
  //  • No Authorization header → sign-up. Always creates a NEW organisation
  //    and returns its first key. Supplying an orgId is rejected, so nobody
  //    can mint a key for an organisation they don't control.
  //  • Valid Authorization header → creates an additional key for the
  //    caller's own organisation. An orgId, if supplied, must match it.
  app.post('/v1/auth/keys', {
    config: {
      rateLimit: {
        max: (req: FastifyRequest) =>
          req.headers.authorization ? AUTHED_KEY_CREATE_LIMIT_PER_HOUR : SIGNUP_LIMIT_PER_HOUR,
        timeWindow: '1 hour',
      },
    },
    schema: {
      description:
        'Create an API key. Without authentication this signs up a new organisation and returns its first key. ' +
        'With a valid API key it creates another key for your own organisation. ' +
        'Rate limits and quotas are set by your organisation\'s plan.',
      tags: ['Auth'],
      body: {
        type: 'object',
        required: ['name'],
        additionalProperties: false,
        properties: {
          orgId: {
            type: 'string',
            description: 'Optional. If given, must be the organisation of the authenticating key.',
          },
          name: { type: 'string', minLength: 1, maxLength: 100 },
        },
      },
    },
    handler: async (request, reply) => {
      const { orgId: requestedOrgId, name } = request.body as { orgId?: string; name: string };

      // Authenticate if the caller presented a key; a bad key is a 401, not a silent sign-up.
      if (request.headers.authorization) {
        await authenticateApiKey(request, reply);
        if (reply.sent) return reply;
      }
      const caller = request.apiKey;

      if (caller && requestedOrgId && requestedOrgId !== caller.orgId) {
        return reply.code(403).send({
          error: 'Forbidden',
          message: 'You can only create keys for your own organisation.',
        });
      }
      if (!caller && requestedOrgId) {
        return reply.code(403).send({
          error: 'Forbidden',
          message:
            'Creating a key for an existing organisation requires authentication with one of its API keys. ' +
            'Omit orgId to sign up a new organisation.',
        });
      }

      if (isDbAvailable()) {
        try {
          let orgId: string;
          let plan: string;
          let orgQuota: number;

          if (caller) {
            const [org] = await db
              .select({ id: organisations.id, plan: organisations.plan, monthlyQuota: organisations.monthlyQuota })
              .from(organisations)
              .where(eq(organisations.id, caller.orgId))
              .limit(1);
            if (!org) {
              return reply.code(403).send({ error: 'Forbidden', message: 'Organisation not found.' });
            }
            ({ id: orgId, plan, monthlyQuota: orgQuota } = org);
          } else {
            const [newOrg] = await db
              .insert(organisations)
              .values({ name: `${name}'s Organisation` })
              .returning({ id: organisations.id, plan: organisations.plan, monthlyQuota: organisations.monthlyQuota });
            ({ id: orgId, plan, monthlyQuota: orgQuota } = newOrg);
            log.info({ orgId }, 'Organisation created via sign-up');
          }

          const { createApiKey: createDbKey } = await import('../middleware/apiKeyManager.js');
          const key = await createDbKey(orgId, name, limitsForPlan(plan, orgQuota));

          log.info({ keyId: key.id, orgId }, 'API key created via DB');

          return reply.code(201).send({
            id: key.id,
            orgId,
            key: key.rawKey,
            keyPrefix: key.keyPrefix,
            name: key.name,
            rateLimit: key.rateLimit,
            monthlyQuota: key.monthlyQuota,
            createdAt: key.createdAt,
            _warning: 'Save this key now. It will not be shown again.',
          });
        } catch (err: any) {
          log.error({ err: err.message }, 'DB key creation failed, falling back to in-memory');
          setDbAvailable(false);
        }
      }

      // In-memory fallback — same ownership rules: the caller's org, or a fresh one.
      const { rawKey, keyPrefix, keyHash } = generateKey();
      const id = crypto.randomUUID();
      const orgId = caller?.orgId ?? crypto.randomUUID();
      const limits = limitsForPlan('free', FREE_DEFAULT_QUOTA);

      const key = {
        id,
        orgId,
        name,
        keyHash,
        keyPrefix,
        status: 'active',
        rateLimit: limits.rateLimit,
        monthlyQuota: limits.monthlyQuota,
        createdAt: new Date().toISOString(),
      };

      storeApiKey(key);
      log.info({ keyId: id, orgId }, 'API key created (in-memory)');

      return reply.code(201).send({
        id: key.id,
        orgId,
        key: rawKey,
        keyPrefix: key.keyPrefix,
        name: key.name,
        rateLimit: key.rateLimit,
        monthlyQuota: key.monthlyQuota,
        createdAt: key.createdAt,
        _warning: 'Save this key now. It will not be shown again.',
      });
    },
  });

  // ─── GET /v1/auth/keys — List API Keys ────────────────────────────────
  app.get('/v1/auth/keys', {
    preHandler: [authenticateApiKey],
    schema: {
      description: 'List API keys for your organisation',
      tags: ['Auth'],
    },
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const key = request.apiKey!;
      const orgId = key.orgId;

      let rows: any[] = [];
      if (isDbAvailable()) {
        try {
          rows = await db
            .select({
              id: apiKeys.id,
              name: apiKeys.name,
              keyPrefix: apiKeys.keyPrefix,
              status: apiKeys.status,
              rateLimit: apiKeys.rateLimit,
              monthlyQuota: apiKeys.monthlyQuota,
              createdAt: apiKeys.createdAt,
            })
            .from(apiKeys)
            .where(eq(apiKeys.orgId, orgId));
        } catch {
          // Fall through to in-memory
        }
      }

      if (rows.length === 0) {
        // Fallback: return keys from in-memory store
        rows = getAllKeys()
          .filter((k: any) => k.orgId === orgId)
          .map((k: any) => ({
            id: k.id,
            name: k.name,
            keyPrefix: k.keyPrefix,
            status: k.status,
            rateLimit: k.rateLimit,
            monthlyQuota: k.monthlyQuota,
            createdAt: k.createdAt,
          }));
      }

      // Mark the current key
      return {
        count: rows.length,
        keys: rows.map((r: any) => ({
          ...r,
          isCurrent: r.id === key.id,
          keyHash: undefined, // never expose hash
        })),
      };
    },
  });

  // ─── DELETE /v1/auth/keys/:keyId — Revoke API Key ─────────────────────
  app.delete('/v1/auth/keys/:keyId', {
    preHandler: [authenticateApiKey],
    schema: {
      description: 'Revoke an API key',
      tags: ['Auth'],
      params: {
        type: 'object',
        properties: {
          keyId: { type: 'string', format: 'uuid' },
        },
      },
    },
    handler: async (request, reply) => {
      const { keyId } = request.params as any;
      const revoked = await revokeApiKey(keyId, request.apiKey!.orgId);

      if (!revoked) {
        return reply.code(404).send({
          error: 'Not Found',
          message: `API key ${keyId} not found.`,
        });
      }

      return { success: true, message: 'API key revoked.' };
    },
  });

  // ─── POST /v1/auth/keys/:keyId/rotate — Rotate API Key ────────────────
  app.post('/v1/auth/keys/:keyId/rotate', {
    preHandler: [authenticateApiKey],
    schema: {
      description: 'Rotate an API key (revoke old, create new)',
      tags: ['Auth'],
      params: {
        type: 'object',
        properties: {
          keyId: { type: 'string', format: 'uuid' },
        },
      },
    },
    handler: async (request, reply) => {
      const { keyId } = request.params as any;
      const newKey = await rotateApiKey(keyId, request.apiKey!.orgId);

      if (!newKey) {
        return reply.code(404).send({
          error: 'Not Found',
          message: `API key ${keyId} not found.`,
        });
      }

      return reply.code(201).send({
        id: newKey.id,
        key: newKey.rawKey,
        keyPrefix: newKey.keyPrefix,
        name: newKey.name,
        _warning: 'Save this key now. It will not be shown again.',
      });
    },
  });

  // ─── GET /v1/account/usage — Get Usage Stats ──────────────────────────
  app.get('/v1/account/usage', {
    preHandler: [authenticateApiKey],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const key = request.apiKey!;

      // Get key details
      const [keyData] = await db
        .select()
        .from(apiKeys)
        .where(eq(apiKeys.id, key.id))
        .limit(1);

      if (!keyData) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'API key not found.',
        });
      }

      // Count usage this month
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      return {
        keyId: key.id,
        keyPrefix: key.keyPrefix,
        rateLimit: keyData.rateLimit,
        monthlyQuota: keyData.monthlyQuota,
        period: {
          start: monthStart.toISOString(),
          end: now.toISOString(),
        },
      };
    },
  });
}
