import { describe, it, expect, beforeEach } from 'vitest';
import { NigeriaGeoProvider } from './NigeriaGeoProvider.js';

describe('NigeriaGeoProvider', () => {
  let provider: NigeriaGeoProvider;

  beforeEach(() => {
    provider = new NigeriaGeoProvider();
  });

  describe('resolveLocation', () => {
    it('should resolve a known state name', async () => {
      const result = await provider.resolveLocation('Lagos');
      expect(result).not.toBeNull();
      expect(result!.name).toBe('Lagos');
      expect(result!.state).toBe('Lagos');
      expect(result!.country).toBe('Nigeria');
      expect(result!.latitude).toBe(6.5);
      expect(result!.longitude).toBe(3.4);
    });

    it('should resolve case-insensitively', async () => {
      const result = await provider.resolveLocation('kano');
      expect(result).not.toBeNull();
      expect(result!.state).toBe('Kano');
    });

    it('should resolve partial matches', async () => {
      const result = await provider.resolveLocation('ben');
      expect(result).not.toBeNull();
      expect(result!.state).toBe('Benue');
    });

    it('should resolve FCT', async () => {
      const result = await provider.resolveLocation('FCT');
      expect(result).not.toBeNull();
      expect(result!.state).toBe('FCT');
    });

    it('should return null for unknown location', async () => {
      const result = await provider.resolveLocation('Atlantis');
      expect(result).toBeNull();
    });
  });

  describe('reverseGeocode', () => {
    it('should return nearest state for Lagos coordinates', async () => {
      const result = await provider.reverseGeocode(6.5, 3.4);
      expect(result).not.toBeNull();
      expect(result!.state).toBe('Lagos');
    });

    it('should return nearest state for northern coordinates', async () => {
      const result = await provider.reverseGeocode(12.0, 8.5);
      expect(result).not.toBeNull();
      expect(result!.state).toBe('Kano');
    });
  });

  describe('isAvailable', () => {
    it('should be available by default', () => {
      expect(provider.isAvailable()).toBe(true);
    });
  });
});
