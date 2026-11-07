export interface FarmSetup {
  lat: number;
  lng: number;
  name?: string;
  crop?: string;
}

const SETUP_KEY = 'kulima_consumer_setup';
const CACHE_PREFIX = 'kulima_cache:';

export function getSetup(): FarmSetup | null {
  try {
    const raw = localStorage.getItem(SETUP_KEY);
    return raw ? (JSON.parse(raw) as FarmSetup) : null;
  } catch {
    return null;
  }
}

export function saveSetup(setup: FarmSetup): void {
  localStorage.setItem(SETUP_KEY, JSON.stringify(setup));
}

export interface Cached<T> {
  data: T;
  fetchedAt: number;
  stale: boolean;
}

/**
 * Fetch with a localStorage cache. Fresh within ttlMs; on network/server
 * failure the last cached copy is returned flagged `stale` (offline fallback).
 */
export async function cached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number
): Promise<Cached<T>> {
  const storageKey = CACHE_PREFIX + key;
  let entry: { data: T; fetchedAt: number } | null = null;
  try {
    const raw = localStorage.getItem(storageKey);
    entry = raw ? (JSON.parse(raw) as { data: T; fetchedAt: number }) : null;
  } catch {
    entry = null;
  }

  if (entry && Date.now() - entry.fetchedAt < ttlMs) {
    return { ...entry, stale: false };
  }

  try {
    const data = await fetcher();
    const fetchedAt = Date.now();
    try {
      localStorage.setItem(storageKey, JSON.stringify({ data, fetchedAt }));
    } catch {
      // Storage full — serve fresh data without caching
    }
    return { data, fetchedAt, stale: false };
  } catch (err) {
    if (entry) return { ...entry, stale: true };
    throw err;
  }
}

export function formatAge(timestamp: number): string {
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.round(hours / 24)} day(s) ago`;
}
