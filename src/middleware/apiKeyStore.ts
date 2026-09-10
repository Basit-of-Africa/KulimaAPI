/**
 * Shared In-Memory API Key Store
 *
 * Used as a fallback when PostgreSQL is unavailable.
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

const store = new Map<string, StoredApiKey>();
let dbAvailable = true;

export function getDbAvailable(): boolean {
  return dbAvailable;
}

export function setDbAvailable(available: boolean): void {
  dbAvailable = available;
}

export function storeApiKey(key: StoredApiKey): void {
  store.set(key.id, key);
  // Also index by prefix for fast lookup
  store.set(key.keyPrefix, key);
  log.info({ keyId: key.id, keyPrefix: key.keyPrefix }, 'API key stored in-memory');
}

export function lookupByKeyPrefix(keyPrefix: string): StoredApiKey | undefined {
  return store.get(keyPrefix);
}

export function getAllKeys(): StoredApiKey[] {
  const seen = new Set<string>();
  const keys: StoredApiKey[] = [];
  for (const [_, key] of store) {
    if (!seen.has(key.id)) {
      seen.add(key.id);
      keys.push(key);
    }
  }
  return keys;
}

export function deleteKey(keyId: string): boolean {
  // Find and delete by id
  const key = store.get(keyId);
  if (key) {
    store.delete(key.id);
    store.delete(key.keyPrefix);
    return true;
  }
  return false;
}
