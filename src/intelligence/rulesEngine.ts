import type { CurrentWeather, WeatherForecast } from '../providers/weather/WeatherProvider.js';
import type { CropProfile } from './types.js';
import { createChildLogger } from '../logger.js';

const log = createChildLogger('rules-engine');

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RuleCondition {
  type: string;
  [key: string]: any;
}

export interface Rule {
  id: string;
  name: string;
  description: string;
  category: string;
  crops: string[] | null;
  conditions: RuleCondition;
  recommendation: string;
  severity: string;
}

export interface RuleResult {
  ruleId: string;
  ruleName: string;
  category: string;
  triggered: boolean;
  severity: string;
  reason: string;
  evidence: Record<string, any>;
  confidence: number;
}

// ─── Rules Engine ────────────────────────────────────────────────────────────

/**
 * Evaluate a set of agricultural rules against current weather data.
 */
export function evaluateRules(
  rules: Rule[],
  weather: CurrentWeather,
  forecast?: WeatherForecast,
  crop?: CropProfile
): RuleResult[] {
  const results: RuleResult[] = [];

  for (const rule of rules) {
    // Skip rules for specific crops if we're not checking that crop
    if (rule.crops && crop && !rule.crops.includes(crop.name)) {
      continue;
    }

    // Skip rules that only apply to specific crops when no crop is specified
    if (rule.crops && !crop) {
      continue;
    }

    try {
      const result = evaluateRule(rule, weather, forecast, crop);
      results.push(result);
    } catch (err) {
      log.error({ ruleId: rule.id, error: err }, 'Rule evaluation failed');
      results.push({
        ruleId: rule.id,
        ruleName: rule.name,
        category: rule.category,
        triggered: false,
        severity: rule.severity,
        reason: `Rule evaluation error: ${(err as Error).message}`,
        evidence: {},
        confidence: 0,
      });
    }
  }

  return results;
}

/**
 * Evaluate a single rule.
 */
function evaluateRule(
  rule: Rule,
  weather: CurrentWeather,
  forecast?: WeatherForecast,
  crop?: CropProfile
): RuleResult {
  const conditions = rule.conditions;
  const evidence: Record<string, any> = {};
  let triggered = false;
  let reason = '';

  switch (conditions.type) {
    case 'heavy_rainfall': {
      const threshold = conditions.thresholdMm || 50;
      if (weather.precipitationMm >= threshold) {
        triggered = true;
        const severity =
          weather.precipitationMm >= (conditions.severity_thresholds?.extreme || 120)
            ? 'extreme'
            : weather.precipitationMm >= (conditions.severity_thresholds?.severe || 80)
              ? 'severe'
              : 'moderate';
        reason = `Rainfall of ${weather.precipitationMm}mm exceeds ${threshold}mm threshold (${severity}).`;
        evidence.rainfallMm = weather.precipitationMm;
        evidence.thresholdMm = threshold;
        evidence.severity = severity;
      }
      break;
    }

    case 'dry_spell': {
      const minDays = conditions.minDaysNoRain || 7;
      // We check current precipitation — a full dry spell check would need
      // historical data. For now, flag if current precip is very low.
      if (weather.precipitationMm <= (conditions.maxDailyRainMm || 2.5)) {
        // This is a simplified check; real implementation would look at multi-day history
        triggered = false; // Can't determine dry spell from single data point
        reason = `Current precipitation (${weather.precipitationMm}mm) is low, but dry spell requires ${minDays}+ days of data.`;
        evidence.currentPrecipitation = weather.precipitationMm;
        evidence.requiredDays = minDays;
      }
      break;
    }

    case 'high_temperature': {
      const maxTemp = crop ? crop.maxTemperatureC : 35;
      const excess = conditions.excessDegreesC || 5;
      if (weather.temperatureC > maxTemp + excess) {
        triggered = true;
        reason = `Temperature of ${weather.temperatureC}°C exceeds crop threshold of ${maxTemp + excess}°C.`;
        evidence.currentTemp = weather.temperatureC;
        evidence.cropMaxTemp = maxTemp;
        evidence.excessDegrees = weather.temperatureC - maxTemp;
      }
      break;
    }

    case 'strong_wind': {
      const threshold = conditions.thresholdKmh || 40;
      if (weather.windSpeedKmh >= threshold) {
        triggered = true;
        const severity =
          weather.windSpeedKmh >= (conditions.severity_thresholds?.extreme || 80)
            ? 'extreme'
            : weather.windSpeedKmh >= (conditions.severity_thresholds?.severe || 60)
              ? 'severe'
              : 'moderate';
        reason = `Wind speed of ${weather.windSpeedKmh}km/h exceeds ${threshold}km/h threshold (${severity}).`;
        evidence.windSpeedKmh = weather.windSpeedKmh;
        evidence.thresholdKmh = threshold;
        evidence.severity = severity;
      }
      break;
    }

    case 'excessive_humidity': {
      const threshold = conditions.thresholdPercent || 85;
      if (weather.humidityPercent >= threshold) {
        triggered = true;
        reason = `Humidity of ${weather.humidityPercent}% exceeds ${threshold}% threshold. Fungal disease risk elevated.`;
        evidence.humidityPercent = weather.humidityPercent;
        evidence.thresholdPercent = threshold;
      }
      break;
    }

    case 'flood_risk': {
      // Simplified: check if current precipitation is very high
      const intensityThreshold = conditions.intensityMmPerHour || 20;
      if (weather.precipitationMm > intensityThreshold) {
        triggered = true;
        reason = `High precipitation intensity (${weather.precipitationMm}mm) suggests elevated flood risk.`;
        evidence.precipitationMm = weather.precipitationMm;
        evidence.intensityThreshold = intensityThreshold;
      }
      break;
    }

    case 'planting_window': {
      // Check if conditions are suitable for planting
      const minRain = conditions.minRainfallMm || 20;
      if (weather.precipitationMm >= minRain) {
        triggered = true;
        reason = `Current rainfall of ${weather.precipitationMm}mm meets minimum planting threshold of ${minRain}mm.`;
        evidence.rainfallMm = weather.precipitationMm;
        evidence.thresholdMm = minRain;
        severity: 'info';
      }
      break;
    }

    default:
      reason = `Unknown rule type: ${conditions.type}`;
  }

  return {
    ruleId: rule.id,
    ruleName: rule.name,
    category: rule.category,
    triggered,
    severity: rule.severity,
    reason,
    evidence,
    confidence: triggered ? 75 : 0, // Simplified confidence
  };
}
