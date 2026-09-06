import { describe, it, expect } from 'vitest';
import { evaluateAdvancedRules, ADVANCED_RULES } from './rulesEngineV2.js';
import type { RuleContext } from './rulesEngineV2.js';

function makeContext(overrides: Partial<RuleContext> = {}): RuleContext {
  return {
    weather: {
      temperatureC: 28,
      humidityPercent: 75,
      windSpeedKmh: 10,
      precipitationMm: 0,
      source: 'test',
      retrievedAt: new Date().toISOString(),
      validFrom: new Date().toISOString(),
      validUntil: new Date().toISOString(),
    },
    forecast: {
      latitude: 9,
      longitude: 7.5,
      timezone: 'Africa/Lagos',
      days: Array.from({ length: 7 }, (_, i) => ({
        date: `2026-09-${String(i + 1).padStart(2, '0')}`,
        temperatureMinC: 22,
        temperatureMaxC: 32,
        precipitationMm: 5,
        precipitationProbability: 0.6,
      })),
      source: 'test',
      retrievedAt: new Date().toISOString(),
    },
    ...overrides,
  };
}

describe('Advanced Rules Engine v2', () => {
  describe('ADVANCED_RULES registry', () => {
    it('should have at least 5 rules', () => {
      expect(ADVANCED_RULES.length).toBeGreaterThanOrEqual(5);
    });

    it('each rule should have required fields', () => {
      for (const rule of ADVANCED_RULES) {
        expect(rule.id).toBeTruthy();
        expect(rule.name).toBeTruthy();
        expect(rule.category).toBeTruthy();
        expect(typeof rule.evaluate).toBe('function');
      }
    });
  });

  describe('Cumulative Rainfall Rule', () => {
    it('should trigger on heavy forecast rainfall', () => {
      const ctx = makeContext({
        forecast: {
          latitude: 9,
          longitude: 7.5,
          timezone: 'Africa/Lagos',
          days: Array.from({ length: 7 }, (_, i) => ({
            date: `2026-09-${String(i + 1).padStart(2, '0')}`,
            temperatureMinC: 22,
            temperatureMaxC: 32,
            precipitationMm: 25, // 175mm over 7 days
            precipitationProbability: 0.8,
          })),
          source: 'test',
          retrievedAt: new Date().toISOString(),
        },
      });
      const result = evaluateAdvancedRules(ctx);
      const rainfallOutcome = result.triggeredRules.find((r) => r.category === 'rainfall');
      expect(rainfallOutcome).toBeDefined();
      expect(rainfallOutcome!.severity).toMatch(/high|critical/);
    });

    it('should not trigger on light rainfall', () => {
      const ctx = makeContext({
        forecast: {
          latitude: 9,
          longitude: 7.5,
          timezone: 'Africa/Lagos',
          days: Array.from({ length: 7 }, (_, i) => ({
            date: `2026-09-${String(i + 1).padStart(2, '0')}`,
            temperatureMinC: 22,
            temperatureMaxC: 32,
            precipitationMm: 2,
            precipitationProbability: 0.3,
          })),
          source: 'test',
          retrievedAt: new Date().toISOString(),
        },
      });
      const result = evaluateAdvancedRules(ctx);
      const rainfallOutcome = result.triggeredRules.find((r) => r.category === 'rainfall');
      expect(rainfallOutcome).toBeUndefined();
    });
  });

  describe('Pest/Disease Risk Rule', () => {
    it('should detect fungal risk in warm humid conditions', () => {
      const ctx = makeContext({
        weather: {
          temperatureC: 28,
          humidityPercent: 90,
          windSpeedKmh: 5,
          precipitationMm: 2,
          source: 'test',
          retrievedAt: new Date().toISOString(),
          validFrom: new Date().toISOString(),
          validUntil: new Date().toISOString(),
        },
      });
      const result = evaluateAdvancedRules(ctx);
      const pestOutcome = result.triggeredRules.find((r) => r.category === 'pest_disease');
      expect(pestOutcome).toBeDefined();
      expect(pestOutcome!.title.toLowerCase()).toContain('fungal');
    });

    it('should detect insect risk in warm dry conditions', () => {
      const ctx = makeContext({
        weather: {
          temperatureC: 32,
          humidityPercent: 40,
          windSpeedKmh: 10,
          precipitationMm: 0,
          source: 'test',
          retrievedAt: new Date().toISOString(),
          validFrom: new Date().toISOString(),
          validUntil: new Date().toISOString(),
        },
      });
      const result = evaluateAdvancedRules(ctx);
      const pestOutcome = result.triggeredRules.find((r) => r.category === 'pest_disease');
      expect(pestOutcome).toBeDefined();
      expect(pestOutcome!.title.toLowerCase()).toContain('insect');
    });

    it('should not trigger in cool dry conditions', () => {
      const ctx = makeContext({
        weather: {
          temperatureC: 18,
          humidityPercent: 45,
          windSpeedKmh: 10,
          precipitationMm: 0,
          source: 'test',
          retrievedAt: new Date().toISOString(),
          validFrom: new Date().toISOString(),
          validUntil: new Date().toISOString(),
        },
      });
      const result = evaluateAdvancedRules(ctx);
      const pestOutcome = result.triggeredRules.find((r) => r.category === 'pest_disease');
      expect(pestOutcome).toBeUndefined();
    });
  });

  describe('Irrigation Scheduling Rule', () => {
    it('should recommend irrigation when water deficit is high', () => {
      const ctx = makeContext({
        weather: {
          temperatureC: 35,
          humidityPercent: 30,
          windSpeedKmh: 15,
          precipitationMm: 0,
          source: 'test',
          retrievedAt: new Date().toISOString(),
          validFrom: new Date().toISOString(),
          validUntil: new Date().toISOString(),
        },
        forecast: {
          latitude: 9,
          longitude: 7.5,
          timezone: 'Africa/Lagos',
          days: Array.from({ length: 7 }, (_, i) => ({
            date: `2026-09-${String(i + 1).padStart(2, '0')}`,
            temperatureMinC: 25,
            temperatureMaxC: 38,
            precipitationMm: 0,
            precipitationProbability: 0.1,
          })),
          source: 'test',
          retrievedAt: new Date().toISOString(),
        },
        cropProfile: {
          cropName: 'maize',
          displayName: 'Maize',
          baseTemperature: 10,
          totalGdd: 2700,
          totalDays: 120,
          optimalPlantingMonths: [4, 5, 6, 7],
          minRainfallSeason: 90,
          stages: [],
        },
        currentStage: {
          name: 'tasseling',
          displayName: 'Tasseling & Silking',
          order: 3,
          minDays: 45,
          maxDays: 65,
          gddRange: { min: 800, max: 1400 },
          temperatureRange: { min: 15, max: 35, optimal: 25 },
          rainfallNeed: { min: 5, max: 10 },
          criticalWaterDays: 21,
          risks: [],
          recommendations: [],
          isCritical: true,
        },
      });
      const result = evaluateAdvancedRules(ctx);
      const irrigationOutcome = result.triggeredRules.find((r) => r.category === 'irrigation');
      expect(irrigationOutcome).toBeDefined();
      expect(irrigationOutcome!.severity).toMatch(/high|critical/);
    });
  });

  describe('Harvest Timing Rule', () => {
    it('should warn about rain during harvest', () => {
      const ctx = makeContext({
        forecast: {
          latitude: 9,
          longitude: 7.5,
          timezone: 'Africa/Lagos',
          days: Array.from({ length: 7 }, (_, i) => ({
            date: `2026-09-${String(i + 1).padStart(2, '0')}`,
            temperatureMinC: 22,
            temperatureMaxC: 32,
            precipitationMm: 15,
            precipitationProbability: 0.8,
          })),
          source: 'test',
          retrievedAt: new Date().toISOString(),
        },
        cropProfile: {
          cropName: 'maize',
          displayName: 'Maize',
          baseTemperature: 10,
          totalGdd: 2700,
          totalDays: 120,
          optimalPlantingMonths: [4, 5, 6, 7],
          minRainfallSeason: 90,
          stages: [],
        },
        currentStage: {
          name: 'maturity',
          displayName: 'Maturity & Harvest',
          order: 5,
          minDays: 100,
          maxDays: 120,
          gddRange: { min: 2300, max: 2700 },
          temperatureRange: { min: 10, max: 35, optimal: 20 },
          rainfallNeed: { min: 0, max: 2 },
          criticalWaterDays: 0,
          risks: [],
          recommendations: [],
          isCritical: false,
        },
      });
      const result = evaluateAdvancedRules(ctx);
      const harvestOutcome = result.triggeredRules.find((r) => r.category === 'harvest');
      expect(harvestOutcome).toBeDefined();
      expect(harvestOutcome!.title).toContain('Rain Warning');
    });

    it('should not trigger harvest rule for non-maturity stages', () => {
      const ctx = makeContext({
        cropProfile: {
          cropName: 'maize',
          displayName: 'Maize',
          baseTemperature: 10,
          totalGdd: 2700,
          totalDays: 120,
          optimalPlantingMonths: [4, 5, 6, 7],
          minRainfallSeason: 90,
          stages: [],
        },
        currentStage: {
          name: 'vegetative',
          displayName: 'Vegetative Growth',
          order: 2,
          minDays: 10,
          maxDays: 45,
          gddRange: { min: 120, max: 800 },
          temperatureRange: { min: 15, max: 35, optimal: 27 },
          rainfallNeed: { min: 3, max: 8 },
          criticalWaterDays: 0,
          risks: [],
          recommendations: [],
          isCritical: false,
        },
      });
      const result = evaluateAdvancedRules(ctx);
      const harvestOutcome = result.triggeredRules.find((r) => r.category === 'harvest');
      expect(harvestOutcome).toBeUndefined();
    });
  });

  describe('Composite Risk Score', () => {
    it('should return low score when no rules triggered', () => {
      const ctx = makeContext({
        weather: {
          temperatureC: 22,
          humidityPercent: 50,
          windSpeedKmh: 5,
          precipitationMm: 0,
          source: 'test',
          retrievedAt: new Date().toISOString(),
          validFrom: new Date().toISOString(),
          validUntil: new Date().toISOString(),
        },
      });
      const result = evaluateAdvancedRules(ctx);
      expect(result.overallScore).toBe(0);
      expect(result.overallSeverity).toBe('low');
      expect(result.triggeredRules.length).toBe(0);
    });

    it('should have meaningful summary', () => {
      const ctx = makeContext({
        weather: {
          temperatureC: 30,
          humidityPercent: 92,
          windSpeedKmh: 5,
          precipitationMm: 2,
          source: 'test',
          retrievedAt: new Date().toISOString(),
          validFrom: new Date().toISOString(),
          validUntil: new Date().toISOString(),
        },
      });
      const result = evaluateAdvancedRules(ctx);
      expect(result.summary).toBeTruthy();
      expect(result.summary.length).toBeGreaterThan(10);
    });
  });

  describe('Wind Spray Advisory', () => {
    it('should trigger on high wind', () => {
      const ctx = makeContext({
        weather: {
          temperatureC: 28,
          humidityPercent: 60,
          windSpeedKmh: 25,
          precipitationMm: 0,
          source: 'test',
          retrievedAt: new Date().toISOString(),
          validFrom: new Date().toISOString(),
          validUntil: new Date().toISOString(),
        },
      });
      const result = evaluateAdvancedRules(ctx);
      const windOutcome = result.triggeredRules.find((r) => r.category === 'wind');
      expect(windOutcome).toBeDefined();
    });

    it('should not trigger on calm conditions', () => {
      const ctx = makeContext({
        weather: {
          temperatureC: 28,
          humidityPercent: 60,
          windSpeedKmh: 5,
          precipitationMm: 0,
          source: 'test',
          retrievedAt: new Date().toISOString(),
          validFrom: new Date().toISOString(),
          validUntil: new Date().toISOString(),
        },
      });
      const result = evaluateAdvancedRules(ctx);
      const windOutcome = result.triggeredRules.find((r) => r.category === 'wind');
      expect(windOutcome).toBeUndefined();
    });
  });
});
