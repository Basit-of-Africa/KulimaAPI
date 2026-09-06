import { describe, it, expect } from 'vitest';
import { analyseTrend, calculateRainfallAccumulation } from './trendAnalysis.js';

describe('Trend Analysis', () => {
  describe('analyseTrend', () => {
    it('should detect increasing trend', () => {
      const data = [
        { date: '2026-06-01', value: 10 },
        { date: '2026-06-02', value: 15 },
        { date: '2026-06-03', value: 20 },
        { date: '2026-06-04', value: 25 },
        { date: '2026-06-05', value: 30 },
      ];
      const result = analyseTrend(data);
      expect(result.direction).toBe('increasing');
      expect(result.magnitude).toBeGreaterThan(0);
    });

    it('should detect decreasing trend', () => {
      const data = [
        { date: '2026-06-01', value: 30 },
        { date: '2026-06-02', value: 25 },
        { date: '2026-06-03', value: 20 },
        { date: '2026-06-04', value: 15 },
        { date: '2026-06-05', value: 10 },
      ];
      const result = analyseTrend(data);
      expect(result.direction).toBe('decreasing');
      expect(result.magnitude).toBeLessThan(0);
    });

    it('should detect stable trend', () => {
      const data = [
        { date: '2026-06-01', value: 20 },
        { date: '2026-06-02', value: 20 },
        { date: '2026-06-03', value: 20 },
        { date: '2026-06-04', value: 20 },
        { date: '2026-06-05', value: 20 },
      ];
      const result = analyseTrend(data);
      expect(result.direction).toBe('stable');
    });

    it('should handle single data point', () => {
      const data = [{ date: '2026-06-01', value: 15 }];
      const result = analyseTrend(data);
      expect(result.direction).toBe('stable');
      expect(result.average).toBe(15);
    });

    it('should handle empty data', () => {
      const result = analyseTrend([]);
      expect(result.direction).toBe('stable');
      expect(result.average).toBe(0);
    });

    it('should calculate correct statistics', () => {
      const data = [
        { date: '2026-06-01', value: 10 },
        { date: '2026-06-02', value: 20 },
        { date: '2026-06-03', value: 30 },
      ];
      const result = analyseTrend(data);
      expect(result.average).toBe(20);
      expect(result.min).toBe(10);
      expect(result.max).toBe(30);
      expect(result.total).toBe(60);
    });

    it('should detect anomalies', () => {
      const data = [
        { date: '2026-06-01', value: 20 },
        { date: '2026-06-02', value: 20 },
        { date: '2026-06-03', value: 20 },
        { date: '2026-06-04', value: 20 },
        { date: '2026-06-05', value: 100 },
      ];
      const result = analyseTrend(data);
      expect(result.anomaly).toBe(true);
    });
  });

  describe('calculateRainfallAccumulation', () => {
    it('should calculate accumulation over window', () => {
      const rainfall = [
        { date: '2026-06-01', value: 5 },
        { date: '2026-06-02', value: 10 },
        { date: '2026-06-03', value: 3 },
        { date: '2026-06-04', value: 7 },
        { date: '2026-06-05', value: 2 },
      ];
      const result = calculateRainfallAccumulation(rainfall, 3);
      expect(result.total).toBe(12); // 3+7+2
      expect(result.daily.length).toBe(3);
    });

    it('should handle window larger than data', () => {
      const rainfall = [
        { date: '2026-06-01', value: 5 },
        { date: '2026-06-02', value: 10 },
      ];
      const result = calculateRainfallAccumulation(rainfall, 7);
      expect(result.total).toBe(15);
      expect(result.daily.length).toBe(2);
    });
  });
});
