import { describe, it, expect } from 'vitest';
import { evaluateRules } from './rulesEngine.js';
import type { CurrentWeather, WeatherForecast } from '../providers/weather/WeatherProvider.js';
import type { Rule } from './rulesEngine.js';

function makeWeather(overrides: Partial<CurrentWeather> = {}): CurrentWeather {
  return {
    temperatureC: 30,
    humidityPercent: 70,
    windSpeedKmh: 15,
    precipitationMm: 0,
    source: 'test',
    retrievedAt: new Date().toISOString(),
    validFrom: new Date().toISOString(),
    validUntil: new Date().toISOString(),
    ...overrides,
  };
}

function makeRule(overrides: Partial<Rule> = {}): Rule {
  return {
    id: 'test-rule',
    name: 'Test Rule',
    description: 'A test rule',
    category: 'test',
    crops: null,
    conditions: { type: 'test' },
    recommendation: 'Do something',
    severity: 'medium',
    ...overrides,
  };
}

describe('Rules Engine', () => {
  describe('evaluateRules', () => {
    it('should return empty array for no rules', () => {
      const results = evaluateRules([], makeWeather());
      expect(results).toEqual([]);
    });

    it('should skip crop-specific rules when no crop is provided', () => {
      const rule = makeRule({ crops: ['maize'] });
      const results = evaluateRules([rule], makeWeather());
      expect(results).toHaveLength(0);
    });

    it('should evaluate crop-specific rules when crop matches', () => {
      const rule = makeRule({
        id: 'maize-rule',
        crops: ['maize'],
        conditions: { type: 'high_temperature', excessDegreesC: 5 },
      });
      const weather = makeWeather({ temperatureC: 41 });
      const results = evaluateRules([rule], weather, undefined, { name: 'maize' } as any);
      expect(results).toHaveLength(1);
      expect(results[0].triggered).toBe(true);
    });

    it('should return result with error for unknown rule type', () => {
      const rule = makeRule({ conditions: { type: 'unknown_type' } });
      const results = evaluateRules([rule], makeWeather());
      expect(results).toHaveLength(1);
      expect(results[0].reason).toContain('Unknown rule type');
    });
  });

  describe('heavy_rainfall rule', () => {
    it('should trigger when rainfall exceeds threshold', () => {
      const rule = makeRule({
        conditions: {
          type: 'heavy_rainfall',
          thresholdMm: 50,
          severity_thresholds: { moderate: 50, severe: 80, extreme: 120 },
        },
      });
      const weather = makeWeather({ precipitationMm: 60 });
      const results = evaluateRules([rule], weather);
      expect(results[0].triggered).toBe(true);
      expect(results[0].severity).toBe('medium'); // from rule default
    });

    it('should not trigger when rainfall is below threshold', () => {
      const rule = makeRule({
        conditions: { type: 'heavy_rainfall', thresholdMm: 50 },
      });
      const weather = makeWeather({ precipitationMm: 10 });
      const results = evaluateRules([rule], weather);
      expect(results[0].triggered).toBe(false);
    });
  });

  describe('strong_wind rule', () => {
    it('should trigger when wind exceeds threshold', () => {
      const rule = makeRule({
        conditions: {
          type: 'strong_wind',
          thresholdKmh: 40,
          severity_thresholds: { moderate: 40, severe: 60, extreme: 80 },
        },
      });
      const weather = makeWeather({ windSpeedKmh: 50 });
      const results = evaluateRules([rule], weather);
      expect(results[0].triggered).toBe(true);
      expect(results[0].evidence.windSpeedKmh).toBe(50);
    });

    it('should not trigger when wind is below threshold', () => {
      const rule = makeRule({
        conditions: { type: 'strong_wind', thresholdKmh: 40 },
      });
      const weather = makeWeather({ windSpeedKmh: 20 });
      const results = evaluateRules([rule], weather);
      expect(results[0].triggered).toBe(false);
    });
  });

  describe('excessive_humidity rule', () => {
    it('should trigger when humidity exceeds threshold', () => {
      const rule = makeRule({
        conditions: { type: 'excessive_humidity', thresholdPercent: 85 },
      });
      const weather = makeWeather({ humidityPercent: 90 });
      const results = evaluateRules([rule], weather);
      expect(results[0].triggered).toBe(true);
      expect(results[0].reason.toLowerCase()).toContain('fungal disease risk');
    });

    it('should not trigger when humidity is below threshold', () => {
      const rule = makeRule({
        conditions: { type: 'excessive_humidity', thresholdPercent: 85 },
      });
      const weather = makeWeather({ humidityPercent: 70 });
      const results = evaluateRules([rule], weather);
      expect(results[0].triggered).toBe(false);
    });
  });

  describe('high_temperature rule', () => {
    it('should trigger when temp exceeds default max + excess', () => {
      const rule = makeRule({
        conditions: { type: 'high_temperature', excessDegreesC: 5 },
      });
      const weather = makeWeather({ temperatureC: 41 });
      const results = evaluateRules([rule], weather);
      expect(results[0].triggered).toBe(true); // 41 > 35 + 5 = 40
    });

    it('should use crop max temp when crop is provided', () => {
      const rule = makeRule({
        conditions: { type: 'high_temperature', excessDegreesC: 5 },
      });
      const weather = makeWeather({ temperatureC: 39 });
      const crop = { name: 'maize', maxTemperatureC: 33 } as any;
      const results = evaluateRules([rule], weather, undefined, crop);
      expect(results[0].triggered).toBe(true); // 39 > 33 + 5 = 38
    });
  });
});
