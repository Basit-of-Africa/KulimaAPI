import { describe, it, expect } from 'vitest';
import {
  calculateDailyGdd,
  calculateAccumulatedGdd,
  estimateGrowthStage,
  calculateAvgDailyGdd,
  predictMaturityDate,
} from './gddCalculator.js';

describe('GDD Calculator', () => {
  describe('calculateDailyGdd', () => {
    it('should calculate GDD for a typical day', () => {
      // avg = (30+20)/2 = 25, GDD = 25-10 = 15
      const gdd = calculateDailyGdd(30, 20, 10);
      expect(gdd).toBe(15);
    });

    it('should return 0 when avg temp is below base', () => {
      const gdd = calculateDailyGdd(5, 2, 10);
      expect(gdd).toBe(0);
    });

    it('should handle equal temperatures', () => {
      const gdd = calculateDailyGdd(25, 25, 10);
      expect(gdd).toBe(15);
    });

    it('should handle base temperature of 0', () => {
      const gdd = calculateDailyGdd(20, 10, 0);
      expect(gdd).toBe(15);
    });
  });

  describe('calculateAccumulatedGdd', () => {
    it('should accumulate GDD over multiple days', () => {
      const temps = [
        { date: '2026-06-01', minC: 20, maxC: 30 },
        { date: '2026-06-02', minC: 18, maxC: 28 },
        { date: '2026-06-03', minC: 22, maxC: 32 },
      ];
      const result = calculateAccumulatedGdd(temps, 10);
      // Day 1: (30+20)/2-10 = 15
      // Day 2: (28+18)/2-10 = 13
      // Day 3: (32+22)/2-10 = 17
      // Total: 45
      expect(result.totalGdd).toBe(45);
      expect(result.daysElapsed).toBe(3);
    });

    it('should return 0 for empty array', () => {
      const result = calculateAccumulatedGdd([], 10);
      expect(result.totalGdd).toBe(0);
      expect(result.daysElapsed).toBe(0);
    });

    it('should handle sub-zero temperatures', () => {
      const temps = [{ date: '2026-01-01', minC: -5, maxC: 5 }];
      const result = calculateAccumulatedGdd(temps, 10);
      // avg = 0, GDD = max(0, 0-10) = 0
      expect(result.totalGdd).toBe(0);
    });
  });

  describe('estimateGrowthStage', () => {
    const stages = [
      { name: 'emergence', gddRange: { min: 0, max: 120 } },
      { name: 'vegetative', gddRange: { min: 120, max: 800 } },
      { name: 'flowering', gddRange: { min: 800, max: 1400 } },
      { name: 'maturity', gddRange: { min: 1400, max: 2700 } },
    ];

    it('should return emergence for low GDD', () => {
      expect(estimateGrowthStage(50, stages)).toBe('emergence');
    });

    it('should return vegetative for mid GDD', () => {
      expect(estimateGrowthStage(400, stages)).toBe('vegetative');
    });

    it('should return flowering for high GDD', () => {
      expect(estimateGrowthStage(1000, stages)).toBe('flowering');
    });

    it('should return maturity for very high GDD', () => {
      expect(estimateGrowthStage(2000, stages)).toBe('maturity');
    });

    it('should return last stage for GDD beyond all ranges', () => {
      expect(estimateGrowthStage(3000, stages)).toBe('maturity');
    });
  });

  describe('calculateAvgDailyGdd', () => {
    it('should calculate average', () => {
      const temps = [
        { date: '2026-06-01', minC: 20, maxC: 30 },
        { date: '2026-06-02', minC: 20, maxC: 30 },
      ];
      const avg = calculateAvgDailyGdd(temps, 10);
      expect(avg).toBe(15);
    });

    it('should return 0 for empty array', () => {
      expect(calculateAvgDailyGdd([], 10)).toBe(0);
    });
  });

  describe('predictMaturityDate', () => {
    it('should predict future maturity date', () => {
      const startDate = new Date('2026-06-01');
      const maturityDate = predictMaturityDate(500, 2700, 15, startDate);
      expect(maturityDate).not.toBeNull();
      expect(maturityDate!.getTime()).toBeGreaterThan(startDate.getTime());
    });

    it('should return today if already mature', () => {
      const startDate = new Date('2026-06-01');
      const maturityDate = predictMaturityDate(2800, 2700, 15, startDate);
      expect(maturityDate).not.toBeNull();
    });

    it('should return null if avg daily GDD is 0', () => {
      const maturityDate = predictMaturityDate(500, 2700, 0, new Date());
      expect(maturityDate).toBeNull();
    });
  });
});
