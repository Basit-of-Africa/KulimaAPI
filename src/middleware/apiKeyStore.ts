/**
 * Shared In-Memory API Key Store
 *
 * Used as a fallback when PostgreSQL is unavailable — development only.
 * In production (see database/availability.ts) nothing is read from or
 * written to this store.
 * Both the auth routes (creation) and auth middleware (validation)
 * reference this store.
 */

import { createChildLogger } from '../logger.js';

const log = createChildLogger('apiKeyStore');

export interface StoredApiKey {
  id: string;
  orgId: string;
  name: string;
  keyHash: string;
  keyPrefix: string;
  status: string;
  rateLimit: number;
  monthlyQuota: number;
  createdAt: string;
}

// Indexed by id and by the full SHA-256 hash of the key. Lookups for
// authentication go by hash, so a key is only accepted if it matches exactly.
const byId = new Map<string, StoredApiKey>();
const byHash = new Map<string, StoredApiKey>();

export function storeApiKey(key: StoredApiKey): void {
  byId.set(key.id, key);
  byHash.set(key.keyHash, key);
  log.info({ keyId: key.id, keyPrefix: key.keyPrefix }, 'API key stored in-memory');
}

export function lookupByKeyHash(keyHash: string): StoredApiKey | undefined {
  return byHash.get(keyHash);
}

export function getAllKeys(): StoredApiKey[] {
  return Array.from(byId.values());
}

export function deleteKey(keyId: string): boolean {
  const key = byId.get(keyId);
  if (!key) return false;
  byId.delete(key.id);
  byHash.delete(key.keyHash);
  return true;
}

/** For tests only. */
export function _clearApiKeyStoreForTests(): void {
  byId.clear();
  byHash.clear();
}
