import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db, apiKeys, organisations } from '../database/index.js';
import { eq, sql, and, gte } from 'drizzle-orm';
import { revokeApiKey, rotateApiKey } from '../middleware/apiKeyManager.js';
import { authenticateApiKey } from '../middleware/auth.js';
import { createChildLogger } from '../logger.js';
import crypto from 'crypto';

const log = createChildLogger('routes/auth');

// ─── In-memory store (used when DB is unavailable) ───────────────────────────
interface InMemoryKey {
  id: string;
  orgId: string;
  name: string;
  keyHash: string;
  keyPrefix: string;
  rawKey: string;
  status: string;
  rateLimit: number;
  monthlyQuota: number;
  createdAt: string;
}

const memStore: Map<string, InMemoryKey> = new Map();
let dbAvailable = true;

function generateKey(): { rawKey: string; keyPrefix: string; keyHash: string } {
  const rawKey = `kulima_${crypto.randomBytes(24).toString('hex')}`;
  const keyPrefix = rawKey.slice(0, 12);
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
  return { rawKey, keyPrefix, keyHash };
}

function isDbAvailable(): boolean {
  return dbAvailable;
}

export default async function authRoutes(app: FastifyInstance) {
  // ─── POST /v1/auth/keys — Create API Key ──────────────────────────────
  app.post('/v1/auth/keys', {
    schema: {
      description: 'Create a new API key',
      tags: ['Auth'],
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          orgId: { type: 'string', description: 'Organisation UUID. Auto-created if not found.' },
          name: { type: 'string' },
          rateLimit: { type: 'integer' },
          monthlyQuota: { type: 'integer' },
        },
      },
    },
    handler: async (request, reply) => {
      const { orgId: inputOrgId, name, rateLimit, monthlyQuota } = request.body as any;

      if (isDbAvailable()) {
        try {
          let orgId = inputOrgId;

          // Auto-create organisation if orgId not provided or doesn't exist
          if (!orgId) {
            const [newOrg] = await db
              .insert(organisations)
              .values({ name: `${name}'s Organisation` })
              .returning({ id: organisations.id });
            orgId = newOrg.id;
            log.info({ orgId }, 'Auto-created organisation');
          } else {
            const [existing] = await db
              .select()
              .from(organisations)
              .where(eq(organisations.id, orgId))
              .limit(1);

            if (!existing) {
              const [newOrg] = await db
                .insert(organisations)
                .values({ id: orgId, name: `${name}'s Organisation` })
                .returning({ id: organisations.id });
              orgId = newOrg.id;
              log.info({ orgId }, 'Auto-created organisation');
            }
          }

          // Use the existing createApiKey function
          const { createApiKey: createDbKey } = await import('../middleware/apiKeyManager.js');
          const key = await createDbKey(orgId, name, { rateLimit, monthlyQuota });

          log.info({ keyId: key.id, orgId }, 'API key created via DB');

          return reply.code(201).send({
            id: key.id,
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
          dbAvailable = false;
        }
      }

      // In-memory fallback
      const { rawKey, keyPrefix, keyHash } = generateKey();
      const id = crypto.randomUUID();
      const orgId = inputOrgId || crypto.randomUUID();

      const key: InMemoryKey = {
        id,
        orgId,
        name,
        keyHash,
        keyPrefix,
        rawKey,
        status: 'active',
        rateLimit: rateLimit || 1000,
        monthlyQuota: monthlyQuota || 1000,
        createdAt: new Date().toISOString(),
      };

      memStore.set(id, key);
      log.info({ keyId: id, orgId }, 'API key created (in-memory)');

      return reply.code(201).send({
        id: key.id,
        key: key.rawKey,
        keyPrefix: key.keyPrefix,
        name: key.name,
        rateLimit: key.rateLimit,
        monthlyQuota: key.monthlyQuota,
        createdAt: key.createdAt,
        _warning: 'Save this key now. It will not be shown again.',
      });
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
      const revoked = await revokeApiKey(keyId);

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
      const newKey = await rotateApiKey(keyId);

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
