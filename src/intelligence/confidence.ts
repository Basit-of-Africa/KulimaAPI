import type { CurrentWeather, WeatherForecast } from '../providers/weather/WeatherProvider.js';
import { createChildLogger } from '../logger.js';

const log = createChildLogger('confidence');

// ─── Confidence Calculation ──────────────────────────────────────────────────

export interface ConfidenceFactors {
  dataCompleteness: number;  // 0-1: how many fields are non-null
  providerReliability: number; // 0-1: historical reliability of the source
  forecastHorizon: number;    // 0-1: degrades with forecast distance
  variableCount: number;      // 0-1: more variables = higher confidence
  cropProfileMatch: number;   // 0-1: how well the crop profile matches conditions
}

/**
 * Calculate an overall confidence score (0-100) based on multiple factors.
 *
 * Each factor is weighted:
 * - Data completeness: 30%
 * - Provider reliability: 15%
 * - Forecast horizon: 25%
 * - Variable count: 15%
 * - Crop profile match: 15%
 */
export function calculateConfidence(factors: ConfidenceFactors): number {
  const weights = {
    dataCompleteness: 0.30,
    providerReliability: 0.15,
    forecastHorizon: 0.25,
    variableCount: 0.15,
    cropProfileMatch: 0.15,
  };

  const score =
    factors.dataCompleteness * weights.dataCompleteness +
    factors.providerReliability * weights.providerReliability +
    factors.forecastHorizon * weights.forecastHorizon +
    factors.variableCount * weights.variableCount +
    factors.cropProfileMatch * weights.cropProfileMatch;

  return Math.round(Math.min(100, Math.max(0, score * 100)));
}

/**
 * Assess data completeness — what percentage of expected fields are present.
 */
export function assessDataCompleteness(weather: CurrentWeather): number {
  const expectedFields = [
    'temperatureC',
    'humidityPercent',
    'windSpeedKmh',
    'precipitationMm',
    'weatherCondition',
    'pressureHpa',
    'cloudCoverPercent',
  ];

  let present = 0;
  for (const field of expectedFields) {
    const value = (weather as any)[field];
    if (value !== undefined && value !== null && value !== 0) {
      present++;
    }
  }

  return present / expectedFields.length;
}

/**
 * Assess forecast horizon — confidence degrades with time.
 * 0 days ahead = 1.0, 7 days = 0.7, 14 days = 0.4
 */
export function assessForecastHorizon(daysAhead: number): number {
  if (daysAhead <= 0) return 1.0;
  if (daysAhead <= 3) return 0.9;
  if (daysAhead <= 7) return 0.7;
  if (daysAhead <= 14) return 0.4;
  return 0.2;
}

/**
 * Assess variable count — how many weather variables we have.
 */
export function assessVariableCount(weather: CurrentWeather): number {
  let count = 0;
  const variables = [
    weather.temperatureC,
    weather.humidityPercent,
    weather.windSpeedKmh,
    weather.precipitationMm,
    weather.pressureHpa,
    weather.cloudCoverPercent,
    weather.soilMoisture,
    weather.soilTemperatureC,
  ];

  for (const v of variables) {
    if (v !== undefined && v !== null) count++;
  }

  return Math.min(1, count / 6); // Normalize to 0-1, max at 6 variables
}
