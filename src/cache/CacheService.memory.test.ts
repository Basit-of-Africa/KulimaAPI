import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Redis unavailable: only the in-memory layer is in play.
vi.mock('./redis.js', () => ({ getRedisClient: () => null }));

const { env } = await import('../config/env.js');
const { CacheService, _memoryCacheSizeForTests, _clearMemoryCacheForTests } = await import('./CacheService.js');

describe('in-memory cache bound', () => {
  const original = env.cache.memoryMaxEntries;
  const cache = new CacheService('mem-test');

  beforeEach(() => {
    _clearMemoryCacheForTests();
    env.cache.memoryMaxEntries = 3;
  });
  afterEach(() => {
    env.cache.memoryMaxEntries = original;
  });

  it('never grows past the configured size', async () => {
    for (let i = 0; i < 50; i++) await cache.set(`k${i}`, i, 60);
    expect(_memoryCacheSizeForTests()).toBe(3);
  });

  it('evicts the least recently used entry first', async () => {
    await cache.set('a', 1, 60);
    await cache.set('b', 2, 60);
    await cache.set('c', 3, 60);
    expect(await cache.get('a')).toBe(1); // touch "a" so "b" is now the oldest
    await cache.set('d', 4, 60);

    expect(await cache.get('b')).toBeNull();
    expect(await cache.get('a')).toBe(1);
    expect(await cache.get('c')).toBe(3);
    expect(await cache.get('d')).toBe(4);
  });

  it('drops expired entries when they are read', async () => {
    vi.useFakeTimers();
    try {
      await cache.set('short', 'x', 1);
      vi.advanceTimersByTime(1500);
      expect(await cache.get('short')).toBeNull();
      expect(_memoryCacheSizeForTests()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
