import { describe, it, expect, beforeEach } from 'vitest';
import { CacheService } from './CacheService.js';

describe('CacheService', () => {
  let cache: CacheService;

  beforeEach(() => {
    cache = new CacheService('test');
  });

  describe('key generation', () => {
    it('should generate weather cache key', () => {
      expect(CacheService.weatherKey(6.5, 3.4, 'current')).toBe('weather:current:6.50:3.40');
    });

    it('should generate forecast cache key', () => {
      expect(CacheService.weatherKey(6.5, 3.4, 'forecast_7')).toBe('weather:forecast_7:6.50:3.40');
    });

    it('should generate location cache key', () => {
      expect(CacheService.locationKey('Lagos')).toBe('location:lagos');
    });

    it('should generate intelligence cache key with crop', () => {
      expect(CacheService.intelligenceKey(6.5, 3.4, 'maize')).toBe(
        'intelligence:6.50:3.40:maize'
      );
    });

    it('should generate intelligence cache key without crop', () => {
      expect(CacheService.intelligenceKey(6.5, 3.4)).toBe('intelligence:6.50:3.40');
    });
  });

  describe('in-memory cache', () => {
    it('should store and retrieve values', async () => {
      await cache.set('key1', { foo: 'bar' }, 60);
      const result = await cache.get<{ foo: string }>('key1');
      expect(result).toEqual({ foo: 'bar' });
    });

    it('should return null for missing keys', async () => {
      const result = await cache.get('nonexistent');
      expect(result).toBeNull();
    });

    it('should delete cached values', async () => {
      await cache.set('key2', { data: 123 }, 60);
      await cache.del('key2');
      const result = await cache.get('key2');
      expect(result).toBeNull();
    });

    it('should handle complex nested objects', async () => {
      const complexData = {
        weather: { temp: 30, humidity: 75 },
        risks: [{ type: 'rain', severity: 'high' }],
        metadata: { source: 'open-meteo', timestamp: Date.now() },
      };
      await cache.set('complex', complexData, 60);
      const result = await cache.get<typeof complexData>('complex');
      expect(result).toEqual(complexData);
    });
  });
});
