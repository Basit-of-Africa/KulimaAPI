import { describe, it, expect } from 'vitest';
import {
  calculateConfidence,
  assessDataCompleteness,
  assessForecastHorizon,
  assessVariableCount,
} from './confidence.js';
import type { CurrentWeather } from '../providers/weather/WeatherProvider.js';

describe('Confidence Calculation', () => {
  describe('calculateConfidence', () => {
    it('should return 100 for perfect factors', () => {
      const score = calculateConfidence({
        dataCompleteness: 1,
        providerReliability: 1,
        forecastHorizon: 1,
        variableCount: 1,
        cropProfileMatch: 1,
      });
      expect(score).toBe(100);
    });

    it('should return 0 for zero factors', () => {
      const score = calculateConfidence({
        dataCompleteness: 0,
        providerReliability: 0,
        forecastHorizon: 0,
        variableCount: 0,
        cropProfileMatch: 0,
      });
      expect(score).toBe(0);
    });

    it('should weight factors correctly', () => {
      // Only data completeness (30% weight) = 0.3 * 100 = 30
      const score = calculateConfidence({
        dataCompleteness: 1,
        providerReliability: 0,
        forecastHorizon: 0,
        variableCount: 0,
        cropProfileMatch: 0,
      });
      expect(score).toBe(30);
    });

    it('should clamp to 0-100 range', () => {
      const score = calculateConfidence({
        dataCompleteness: 1.5,
        providerReliability: 1.5,
        forecastHorizon: 1.5,
        variableCount: 1.5,
        cropProfileMatch: 1.5,
      });
      expect(score).toBe(100);
    });
  });

  describe('assessDataCompleteness', () => {
    it('should return 1.0 for complete data', () => {
      const weather: Partial<CurrentWeather> = {
        temperatureC: 30,
        humidityPercent: 75,
        windSpeedKmh: 12,
        precipitationMm: 5,
        weatherCondition: 'rain',
        pressureHpa: 1013,
        cloudCoverPercent: 60,
        source: 'test',
        retrievedAt: new Date().toISOString(),
        validFrom: new Date().toISOString(),
        validUntil: new Date().toISOString(),
      };
      expect(assessDataCompleteness(weather as CurrentWeather)).toBe(1.0);
    });

    it('should return lower score for missing fields', () => {
      const weather: Partial<CurrentWeather> = {
        temperatureC: 30,
        humidityPercent: 75,
        source: 'test',
        retrievedAt: new Date().toISOString(),
        validFrom: new Date().toISOString(),
        validUntil: new Date().toISOString(),
      };
      const score = assessDataCompleteness(weather as CurrentWeather);
      expect(score).toBeLessThan(1.0);
      expect(score).toBeGreaterThan(0);
    });

    it('should return 0 for empty weather', () => {
      const weather: Partial<CurrentWeather> = {
        source: 'test',
        retrievedAt: new Date().toISOString(),
        validFrom: new Date().toISOString(),
        validUntil: new Date().toISOString(),
      };
      expect(assessDataCompleteness(weather as CurrentWeather)).toBe(0);
    });
  });

  describe('assessForecastHorizon', () => {
    it('should return 1.0 for current weather (0 days)', () => {
      expect(assessForecastHorizon(0)).toBe(1.0);
    });

    it('should return 0.9 for 1-3 days', () => {
      expect(assessForecastHorizon(1)).toBe(0.9);
      expect(assessForecastHorizon(3)).toBe(0.9);
    });

    it('should return 0.7 for 4-7 days', () => {
      expect(assessForecastHorizon(4)).toBe(0.7);
      expect(assessForecastHorizon(7)).toBe(0.7);
    });

    it('should return 0.4 for 8-14 days', () => {
      expect(assessForecastHorizon(8)).toBe(0.4);
      expect(assessForecastHorizon(14)).toBe(0.4);
    });

    it('should return 0.2 for >14 days', () => {
      expect(assessForecastHorizon(15)).toBe(0.2);
      expect(assessForecastHorizon(30)).toBe(0.2);
    });
  });

  describe('assessVariableCount', () => {
    it('should return 1.0 for 6+ variables', () => {
      const weather: CurrentWeather = {
        temperatureC: 30,
        humidityPercent: 75,
        windSpeedKmh: 12,
        precipitationMm: 5,
        pressureHpa: 1013,
        cloudCoverPercent: 60,
        source: 'test',
        retrievedAt: new Date().toISOString(),
        validFrom: new Date().toISOString(),
        validUntil: new Date().toISOString(),
      };
      expect(assessVariableCount(weather)).toBe(1.0);
    });

    it('should return 0 for no variables', () => {
      const weather: CurrentWeather = {
        temperatureC: 0,
        humidityPercent: 0,
        windSpeedKmh: 0,
        precipitationMm: 0,
        source: 'test',
        retrievedAt: new Date().toISOString(),
        validFrom: new Date().toISOString(),
        validUntil: new Date().toISOString(),
      };
      expect(assessVariableCount(weather)).toBe(0);
    });

    it('should scale linearly', () => {
      const weather: CurrentWeather = {
        temperatureC: 30,
        humidityPercent: 75,
        windSpeedKmh: 12,
        precipitationMm: 0,
        source: 'test',
        retrievedAt: new Date().toISOString(),
        validFrom: new Date().toISOString(),
        validUntil: new Date().toISOString(),
      };
      // 3 non-zero variables / 6 expected = 0.5
      expect(assessVariableCount(weather)).toBe(0.5);
    });
  });
});
