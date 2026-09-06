import crypto from 'crypto';
import { db, apiKeys, organisations } from '../database/index.js';
import { eq, sql } from 'drizzle-orm';
import { createChildLogger } from '../logger.js';

const log = createChildLogger('api-key-manager');

// ─── Key Generation ──────────────────────────────────────────────────────────

/**
 * Generate a new API key pair.
 *
 * Format: `kulima_` + 48-char random hex string
 * The prefix is stored in plaintext for fast lookup.
 * The full key is returned once to the user.
 * We only store the prefix + a hash in the database.
 *
 * In a production system you'd use bcrypt to hash the full key.
 * For MVP we use SHA-256 for simplicity and speed.
 */
export function generateApiKey(): { rawKey: string; keyPrefix: string; keyHash: string } {
  const randomBytes = crypto.randomBytes(24);
  const rawKey = `kulima_${randomBytes.toString('hex')}`;
  const keyPrefix = rawKey.slice(0, 12); // "kulima_XXXX"
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

  return { rawKey, keyPrefix, keyHash };
}

/**
 * Verify a raw API key against a stored hash.
 */
export function verifyApiKey(rawKey: string, storedHash: string): boolean {
  const computedHash = crypto.createHash('sha256').update(rawKey).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(computedHash, 'hex'), Buffer.from(storedHash, 'hex'));
}

// ─── Key CRUD ────────────────────────────────────────────────────────────────

export interface CreateApiKeyResult {
  id: string;
  rawKey: string;
  keyPrefix: string;
  name: string;
  rateLimit: number;
  monthlyQuota: number;
  createdAt: Date;
}

/**
 * Create a new API key for an organisation.
 * Returns the raw key once — it cannot be retrieved again.
 */
export async function createApiKey(
  orgId: string,
  name: string,
  options?: { rateLimit?: number; monthlyQuota?: number }
): Promise<CreateApiKeyResult> {
  const { rawKey, keyPrefix, keyHash } = generateApiKey();

  const [inserted] = await db
    .insert(apiKeys)
    .values({
      orgId,
      name,
      keyHash,
      keyPrefix,
      rateLimit: options?.rateLimit ?? 1000,
      monthlyQuota: options?.monthlyQuota ?? 1000,
    })
    .returning({
      id: apiKeys.id,
      createdAt: apiKeys.createdAt,
    });

  log.info({ keyId: inserted.id, orgId, name }, 'API key created');

  return {
    id: inserted.id,
    rawKey,
    keyPrefix,
    name,
    rateLimit: options?.rateLimit ?? 1000,
    monthlyQuota: options?.monthlyQuota ?? 1000,
    createdAt: inserted.createdAt,
  };
}

/**
 * Revoke an API key (soft-delete by setting status to 'revoked').
 */
export async function revokeApiKey(keyId: string): Promise<boolean> {
  const [updated] = await db
    .update(apiKeys)
    .set({ status: 'revoked' })
    .where(eq(apiKeys.id, keyId))
    .returning({ id: apiKeys.id });

  if (updated) {
    log.info({ keyId }, 'API key revoked');
    return true;
  }
  return false;
}

/**
 * Rotate an API key — revoke old one, create new one.
 */
export async function rotateApiKey(
  keyId: string,
  newName?: string
): Promise<CreateApiKeyResult | null> {
  // Look up the old key to get org and settings
  const [oldKey] = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.id, keyId))
    .limit(1);

  if (!oldKey) return null;

  // Revoke old
  await revokeApiKey(keyId);

  // Create new
  return createApiKey(oldKey.orgId, newName || oldKey.name || 'Rotated Key', {
    rateLimit: oldKey.rateLimit,
    monthlyQuota: oldKey.monthlyQuota,
  });
}
