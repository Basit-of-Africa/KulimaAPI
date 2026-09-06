import type { FastifyInstance } from 'fastify';
import { db, apiKeys, organisations } from '../database/index.js';
import { eq, sql, and, gte } from 'drizzle-orm';
import { createApiKey, revokeApiKey, rotateApiKey } from '../middleware/apiKeyManager.js';
import { authenticateApiKey } from '../middleware/auth.js';
import { createChildLogger } from '../logger.js';

const log = createChildLogger('routes/auth');

export default async function authRoutes(app: FastifyInstance) {
  // ─── POST /v1/auth/keys — Create API Key ──────────────────────────────
  app.post('/v1/auth/keys', {
    schema: {
      description: 'Create a new API key',
      tags: ['Auth'],
      body: {
        type: 'object',
        required: ['orgId', 'name'],
        properties: {
          orgId: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          rateLimit: { type: 'integer' },
          monthlyQuota: { type: 'integer' },
        },
      },
    },
    handler: async (request, reply) => {
      const { orgId, name, rateLimit, monthlyQuota } = request.body as any;

      // Verify org exists
      const [org] = await db
        .select()
        .from(organisations)
        .where(eq(organisations.id, orgId))
        .limit(1);

      if (!org) {
        return reply.code(404).send({
          error: 'Not Found',
          message: `Organisation ${orgId} not found.`,
        });
      }

      const key = await createApiKey(orgId, name, { rateLimit, monthlyQuota });

      log.info({ keyId: key.id, orgId }, 'API key created via route');

      return reply.code(201).send({
        id: key.id,
        key: key.rawKey, // Only shown once!
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
    schema: {
      description: 'Get API usage statistics for the current key',
      tags: ['Account'],
    },
    handler: async (request, reply) => {
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

      const [usageResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(apiKeys)
        .where(
          and(
            eq(apiKeys.id, key.id)
          )
        );

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
