import { describe, it, expect } from 'vitest';
import {
  getCropGrowthProfile,
  getAllCropGrowthProfiles,
  MAIZE_GROWTH,
  RICE_GROWTH,
  CASSAVA_GROWTH,
} from './growthStages.js';

describe('Crop Growth Stages', () => {
  describe('getCropGrowthProfile', () => {
    it('should return maize profile', () => {
      const profile = getCropGrowthProfile('maize');
      expect(profile).not.toBeNull();
      expect(profile!.cropName).toBe('maize');
      expect(profile!.displayName).toBe('Maize (Corn)');
      expect(profile!.stages.length).toBe(5);
    });

    it('should return rice profile', () => {
      const profile = getCropGrowthProfile('rice');
      expect(profile).not.toBeNull();
      expect(profile!.cropName).toBe('rice');
      expect(profile!.stages.length).toBe(4);
    });

    it('should return cassava profile', () => {
      const profile = getCropGrowthProfile('cassava');
      expect(profile).not.toBeNull();
      expect(profile!.totalDays).toBe(360);
    });

    it('should be case-insensitive', () => {
      expect(getCropGrowthProfile('Maize')).not.toBeNull();
      expect(getCropGrowthProfile('RICE')).not.toBeNull();
    });

    it('should return null for unknown crop', () => {
      expect(getCropGrowthProfile('banana')).toBeNull();
    });
  });

  describe('getAllCropGrowthProfiles', () => {
    it('should return all profiles', () => {
      const profiles = getAllCropGrowthProfiles();
      expect(profiles.length).toBeGreaterThanOrEqual(7);
    });

    it('should include all expected crops', () => {
      const profiles = getAllCropGrowthProfiles();
      const names = profiles.map((p) => p.cropName);
      expect(names).toContain('maize');
      expect(names).toContain('rice');
      expect(names).toContain('cassava');
      expect(names).toContain('sorghum');
      expect(names).toContain('cowpea');
      expect(names).toContain('groundnut');
      expect(names).toContain('yam');
    });
  });

  describe('Maize Growth Profile', () => {
    it('should have stages in order', () => {
      const stages = MAIZE_GROWTH.stages;
      for (let i = 0; i < stages.length; i++) {
        expect(stages[i].order).toBe(i + 1);
      }
    });

    it('should have tasseling as critical stage', () => {
      const tasseling = MAIZE_GROWTH.stages.find((s) => s.name === 'tasseling');
      expect(tasseling).toBeDefined();
      expect(tasseling!.isCritical).toBe(true);
    });

    it('should have GDD ranges that are contiguous', () => {
      const stages = MAIZE_GROWTH.stages;
      for (let i = 1; i < stages.length; i++) {
        expect(stages[i].gddRange.min).toBe(stages[i - 1].gddRange.max);
      }
    });

    it('should have base temperature of 10°C', () => {
      expect(MAIZE_GROWTH.baseTemperature).toBe(10);
    });

    it('should have total GDD of 2700', () => {
      expect(MAIZE_GROWTH.totalGdd).toBe(2700);
    });
  });

  describe('Rice Growth Profile', () => {
    it('should have germination as critical stage', () => {
      const germination = RICE_GROWTH.stages.find((s) => s.name === 'germination');
      expect(germination).toBeDefined();
      expect(germination!.isCritical).toBe(true);
    });

    it('should have reproductive as critical stage', () => {
      const reproductive = RICE_GROWTH.stages.find((s) => s.name === 'reproductive');
      expect(reproductive).toBeDefined();
      expect(reproductive!.isCritical).toBe(true);
    });
  });
});
