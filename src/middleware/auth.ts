import type { FastifyRequest, FastifyReply } from 'fastify';
import { db, apiKeys, organisations } from '../database/index.js';
import { eq, and, gt } from 'drizzle-orm';
import { createChildLogger } from '../logger.js';
import { lookupByKeyPrefix, setDbAvailable, getDbAvailable } from './apiKeyStore.js';

const log = createChildLogger('auth');

// ─── API Key Validation ──────────────────────────────────────────────────────

export interface AuthenticatedKey {
  id: string;
  orgId: string;
  keyPrefix: string;
  status: string;
  rateLimit: number;
  monthlyQuota: number;
}

declare module 'fastify' {
  interface FastifyRequest {
    apiKey?: AuthenticatedKey;
  }
}

/**
 * Auth middleware — validates the `Authorization: Bearer <key>` header.
 *
 * The raw key is looked up by its prefix for fast initial filtering,
 * then the full hash is verified.
 *
 * For MVP, we do a simple prefix match against stored keys.
 * In production, use bcrypt.compare or SHA-256 hash comparison.
 */
export async function authenticateApiKey(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.code(401).send({
      error: 'Unauthorized',
      message: 'Missing or invalid Authorization header. Expected: Bearer <api_key>',
    });
  }

  const rawKey = authHeader.slice(7).trim();

  if (!rawKey || rawKey.length < 10) {
    return reply.code(401).send({
      error: 'Unauthorized',
      message: 'Invalid API key format.',
    });
  }

  // Extract prefix (first 12 chars) for quick lookup
  const keyPrefix = rawKey.slice(0, 12);

  try {
    const rows = await db
      .select({
        id: apiKeys.id,
        orgId: apiKeys.orgId,
        keyPrefix: apiKeys.keyPrefix,
        status: apiKeys.status,
        rateLimit: apiKeys.rateLimit,
        monthlyQuota: apiKeys.monthlyQuota,
        expiresAt: apiKeys.expiresAt,
      })
      .from(apiKeys)
      .where(eq(apiKeys.keyPrefix, keyPrefix))
      .limit(1);

    if (rows.length === 0) {
      log.warn({ keyPrefix }, 'API key not found');
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Invalid API key.',
      });
    }

    const key = rows[0];

    // Check status
    if (key.status !== 'active') {
      return reply.code(403).send({
        error: 'Forbidden',
        message: `API key is ${key.status}.`,
      });
    }

    // Check expiry
    if (key.expiresAt && new Date(key.expiresAt) < new Date()) {
      return reply.code(403).send({
        error: 'Forbidden',
        message: 'API key has expired.',
      });
    }

    // Attach to request
    request.apiKey = {
      id: key.id,
      orgId: key.orgId,
      keyPrefix: key.keyPrefix,
      status: key.status,
      rateLimit: key.rateLimit,
      monthlyQuota: key.monthlyQuota,
    };
  } catch (err) {
    // DB unavailable — try in-memory fallback
    setDbAvailable(false);
    const memKey = lookupByKeyPrefix(keyPrefix);
    if (memKey && memKey.status === 'active') {
      request.apiKey = {
        id: memKey.id,
        orgId: memKey.orgId,
        keyPrefix: memKey.keyPrefix,
        status: memKey.status,
        rateLimit: memKey.rateLimit,
        monthlyQuota: memKey.monthlyQuota,
      };
      return;
    }
    log.error(err, 'Auth middleware error');
    return reply.code(500).send({
      error: 'Internal Error',
      message: 'Authentication service unavailable.',
    });
  }
}

/**
 * Optional auth — same as authenticateApiKey but doesn't fail if no key provided.
 * Useful for endpoints that behave differently with/without auth.
 */
export async function optionalAuth(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return;

  // Try to authenticate but swallow errors
  try {
    await authenticateApiKey(request, _reply);
  } catch {
    // Ignore — optional auth should never block
  }
}
