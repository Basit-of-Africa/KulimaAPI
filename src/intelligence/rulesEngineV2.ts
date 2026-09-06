/**
 * Advanced Rules Engine v2
 *
 * Enhanced rules with:
 * - Multi-day trend awareness
 * - Cumulative rainfall thresholds
 * - Pest/disease risk modelling
 * - Irrigation scheduling
 * - Harvest timing
 * - Composite risk scoring
 */

import type { CurrentWeather, WeatherForecast } from '../providers/weather/WeatherProvider.js';
import type { CropGrowthProfile, GrowthStage } from './growthStages.js';
import { analyseTrend, calculateRainfallAccumulation } from './trendAnalysis.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AdvancedRule {
  id: string;
  name: string;
  category: string;
  description: string;
  evaluate: (context: RuleContext) => RuleOutcome | null;
}

export interface RuleContext {
  weather: CurrentWeather;
  forecast: WeatherForecast;
  cropProfile?: CropGrowthProfile;
  currentStage?: GrowthStage;
  historicalRainfall?: Array<{ date: string; value: number }>;
  historicalTemperature?: Array<{ date: string; value: number }>;
}

export interface RuleOutcome {
  triggered: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  recommendation: string;
  confidence: number;
  evidence: Record<string, any>;
  category: string;
}

export interface CompositeRiskScore {
  overallScore: number; // 0-100
  overallSeverity: 'low' | 'medium' | 'high' | 'critical';
  categoryScores: Record<string, number>;
  triggeredRules: RuleOutcome[];
  summary: string;
}

// ─── Cumulative Rainfall Rule ────────────────────────────────────────────────

const cumulativeRainfallRule: AdvancedRule = {
  id: 'cumulative-rainfall',
  name: 'Cumulative Rainfall Alert',
  category: 'rainfall',
  description: 'Alerts when cumulative rainfall exceeds safe thresholds',
  evaluate: (ctx) => {
    const forecast = ctx.forecast;
    if (!forecast?.days || forecast.days.length < 3) return null;

    // 3-day cumulative
    const rain3d = forecast.days.slice(0, 3).reduce((sum, d) => sum + d.precipitationMm, 0);
    // 7-day cumulative
    const rain7d = forecast.days.slice(0, 7).reduce((sum, d) => sum + d.precipitationMm, 0);

    // Thresholds vary by crop water sensitivity
    const sensitivity = ctx.cropProfile?.waterSensitivity || 'moderate';
    const thresholds = {
      very_low: { day3: 80, day7: 150 },
      low: { day3: 60, day7: 120 },
      moderate: { day3: 50, day7: 100 },
      high: { day3: 40, day7: 80 },
      very_high: { day3: 30, day7: 60 },
    }[sensitivity] || { day3: 50, day7: 100 };

    if (rain3d > thresholds.day3 || rain7d > thresholds.day7) {
      const severity = rain7d > thresholds.day7 * 1.5 ? 'critical' :
        rain7d > thresholds.day7 ? 'high' : 'medium';

      return {
        triggered: true,
        severity,
        title: 'Heavy Cumulative Rainfall',
        description: `${Math.round(rain7d)}mm expected over 7 days (${Math.round(rain3d)}mm in 3 days).`,
        recommendation: severity === 'critical'
          ? 'Urgent: Clear drainage channels, move livestock to higher ground, prepare for potential flooding.'
          : 'Ensure field drainage is clear. Consider delaying chemical application.',
        confidence: 0.85,
        evidence: { rain3d: Math.round(rain3d), rain7d: Math.round(rain7d), sensitivity },
        category: 'rainfall',
      };
    }
    return null;
  },
};

// ─── Pest/Disease Risk Rule ──────────────────────────────────────────────────

const pestDiseaseRiskRule: AdvancedRule = {
  id: 'pest-disease-risk',
  name: 'Pest & Disease Risk',
  category: 'pest_disease',
  description: 'Calculates pest and disease risk based on temperature and humidity',
  evaluate: (ctx) => {
    const { weather } = ctx;
    const temp = weather.temperatureC;
    const humidity = weather.humidityPercent;

    // Fungal disease risk: high humidity + moderate-to-warm temperature
    let fungalRisk = 0;
    if (humidity > 85 && temp > 20 && temp < 32) {
      fungalRisk = Math.min(100, (humidity - 80) * 2 + (temp - 20) * 2);
    }

    // Insect pest risk: warm and dry conditions
    let insectRisk = 0;
    if (temp > 25 && humidity < 60) {
      insectRisk = Math.min(100, (temp - 25) * 3 + (60 - humidity) * 1.5);
    }

    // Bacterial wilt: warm and very humid
    let bacterialRisk = 0;
    if (temp > 28 && humidity > 80) {
      bacterialRisk = Math.min(100, (temp - 28) * 5 + (humidity - 80) * 2);
    }

    const maxRisk = Math.max(fungalRisk, insectRisk, bacterialRisk);
    if (maxRisk < 30) return null;

    let riskType: string;
    let description: string;
    let recommendation: string;

    if (fungalRisk >= insectRisk && fungalRisk >= bacterialRisk) {
      riskType = 'fungal';
      description = `Fungal disease risk: ${Math.round(fungalRisk)}%. Warm, humid conditions favour fungal pathogens.`;
      recommendation = 'Monitor for leaf spots, mildew, or rust. Improve air circulation. Consider preventive fungicide application.';
    } else if (insectRisk >= bacterialRisk) {
      riskType = 'insect';
      description = `Insect pest risk: ${Math.round(insectRisk)}%. Warm, dry conditions favour pest reproduction.`;
      recommendation = 'Scout fields for pest activity. Set up traps. Consider targeted pesticide application.';
    } else {
      riskType = 'bacterial';
      description = `Bacterial disease risk: ${Math.round(bacterialRisk)}%. Warm, very humid conditions favour bacterial wilt.`;
      recommendation = 'Remove infected plant material. Avoid overhead irrigation. Use disease-resistant varieties next season.';
    }

    return {
      triggered: true,
      severity: maxRisk > 70 ? 'high' : maxRisk > 50 ? 'medium' : 'low',
      title: `${riskType.charAt(0).toUpperCase() + riskType.slice(1)} Disease Risk`,
      description,
      recommendation,
      confidence: 0.7,
      evidence: { fungalRisk: Math.round(fungalRisk), insectRisk: Math.round(insectRisk), bacterialRisk: Math.round(bacterialRisk), temperature: temp, humidity },
      category: 'pest_disease',
    };
  },
};

// ─── Irrigation Scheduling Rule ──────────────────────────────────────────────

const irrigationSchedulingRule: AdvancedRule = {
  id: 'irrigation-scheduling',
  name: 'Irrigation Scheduling',
  category: 'irrigation',
  description: 'Recommends irrigation timing based on crop water deficit',
  evaluate: (ctx) => {
    const { weather, forecast, cropProfile, currentStage } = ctx;
    if (!cropProfile || !currentStage) return null;

    // Calculate crop water demand based on stage
    const waterDemand = currentStage.rainfallNeed.max; // mm/day
    const waterMin = currentStage.rainfallNeed.min;

    // Check forecast rainfall
    const forecastRain = forecast?.days?.slice(0, 3).reduce((sum, d) => sum + d.precipitationMm, 0) || 0;
    const avgDailyRain = forecastRain / 3;

    // Water deficit
    const deficit = waterDemand - avgDailyRain;

    if (deficit <= 2) return null; // Adequate rainfall expected

    // Calculate urgency based on critical water days
    const isCritical = currentStage.criticalWaterDays > 0;
    const urgency = isCritical ? 'high' : deficit > 5 ? 'medium' : 'low';

    return {
      triggered: true,
      severity: urgency,
      title: isCritical ? 'Critical Water Period — Irrigation Needed' : 'Irrigation Recommended',
      description: `Crop water demand: ${waterDemand}mm/day. Expected rainfall: ${Math.round(avgDailyRain * 10) / 10}mm/day. Deficit: ${Math.round(deficit * 10) / 10}mm/day.`,
      recommendation: isCritical
        ? `URGENT: This is a critical water period (${currentStage.displayName}). Irrigate immediately to prevent yield loss.`
        : `Apply ${Math.round(deficit * 3)}mm of irrigation over the next 3 days.`,
      confidence: 0.8,
      evidence: { waterDemand, avgDailyRain: Math.round(avgDailyRain * 10) / 10, deficit: Math.round(deficit * 10) / 10, isCritical, stage: currentStage.name },
      category: 'irrigation',
    };
  },
};

// ─── Harvest Timing Rule ─────────────────────────────────────────────────────

const harvestTimingRule: AdvancedRule = {
  id: 'harvest-timing',
  name: 'Harvest Timing',
  category: 'harvest',
  description: 'Assesses optimal harvest window based on maturity and weather',
  evaluate: (ctx) => {
    const { forecast, cropProfile, currentStage } = ctx;
    if (!cropProfile || !currentStage) return null;

    // Only relevant for maturity stage
    if (currentStage.name !== 'maturity') return null;

    // Check for rain during harvest window
    const rainIn7Days = forecast?.days?.slice(0, 7).reduce((sum, d) => sum + d.precipitationMm, 0) || 0;

    if (rainIn7Days > 20) {
      return {
        triggered: true,
        severity: 'high',
        title: 'Harvest Window — Rain Warning',
        description: `${Math.round(rainIn7Days)}mm of rain expected in the next 7 days. This may delay harvest or damage mature crops.`,
        recommendation: 'Harvest as soon as possible before rain arrives. If already harvested, ensure grain is dried and stored properly.',
        confidence: 0.85,
        evidence: { rainIn7Days: Math.round(rainIn7Days), stage: currentStage.name, crop: cropProfile.cropName },
        category: 'harvest',
      };
    }

    if (rainIn7Days < 5) {
      return {
        triggered: true,
        severity: 'low',
        title: 'Optimal Harvest Conditions',
        description: 'Dry conditions expected for the next 7 days — ideal for harvesting.',
        recommendation: 'This is a good window for harvest. Proceed with harvesting operations.',
        confidence: 0.9,
        evidence: { rainIn7Days: Math.round(rainIn7Days), stage: currentStage.name, crop: cropProfile.cropName },
        category: 'harvest',
      };
    }

    return null;
  },
};

// ─── Wind Spray Advisory Rule ────────────────────────────────────────────────

const windSprayAdvisoryRule: AdvancedRule = {
  id: 'wind-spray-advisory',
  name: 'Wind Spray Advisory',
  category: 'wind',
  description: 'Warns when wind conditions are unsuitable for spraying',
  evaluate: (ctx) => {
    const { weather } = ctx;
    const windSpeed = weather.windSpeedKmh;

    if (windSpeed < 15) return null;

    return {
      triggered: true,
      severity: windSpeed > 30 ? 'high' : 'medium',
      title: 'Unsuitable Wind for Spraying',
      description: `Wind speed: ${windSpeed}km/h. ${windSpeed > 30 ? 'Strong winds — spraying dangerous and ineffective.' : 'Moderate winds — spray drift likely.'}`,
      recommendation: windSpeed > 30
        ? 'Do not spray. Wait for wind to drop below 15km/h.'
        : 'Postpone spraying if possible. If essential, use low-drift nozzles and reduce boom height.',
      confidence: 0.95,
      evidence: { windSpeedKmh: windSpeed },
      category: 'wind',
    };
  },
};

// ─── Rule Registry ───────────────────────────────────────────────────────────

export const ADVANCED_RULES: AdvancedRule[] = [
  cumulativeRainfallRule,
  pestDiseaseRiskRule,
  irrigationSchedulingRule,
  harvestTimingRule,
  windSprayAdvisoryRule,
];

// ─── Composite Risk Scorer ───────────────────────────────────────────────────

export function evaluateAdvancedRules(ctx: RuleContext): CompositeRiskScore {
  const outcomes: RuleOutcome[] = [];

  for (const rule of ADVANCED_RULES) {
    const outcome = rule.evaluate(ctx);
    if (outcome?.triggered) {
      outcomes.push(outcome);
    }
  }

  // Calculate category scores
  const categoryScores: Record<string, number> = {};
  for (const outcome of outcomes) {
    const severityScore = { low: 25, medium: 50, high: 75, critical: 100 }[outcome.severity];
    categoryScores[outcome.category] = Math.max(categoryScores[outcome.category] || 0, severityScore);
  }

  // Overall score: weighted average of category scores
  const values = Object.values(categoryScores);
  const overallScore = values.length > 0
    ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
    : 0;

  // Overall severity
  let overallSeverity: CompositeRiskScore['overallSeverity'];
  if (overallScore >= 75) overallSeverity = 'critical';
  else if (overallScore >= 50) overallSeverity = 'high';
  else if (overallScore >= 25) overallSeverity = 'medium';
  else overallSeverity = 'low';

  // Generate summary
  const triggeredCount = outcomes.length;
  const criticalCount = outcomes.filter((o) => o.severity === 'critical').length;
  const highCount = outcomes.filter((o) => o.severity === 'high').length;

  let summary: string;
  if (triggeredCount === 0) {
    summary = 'No significant agricultural risks detected.';
  } else if (criticalCount > 0) {
    summary = `${criticalCount} critical and ${highCount} high-risk issues detected. Immediate action required.`;
  } else if (highCount > 0) {
    summary = `${highCount} high-risk issues detected. Action recommended within 24 hours.`;
  } else {
    summary = `${triggeredCount} low-to-medium risk issues detected. Monitor conditions.`;
  }

  return {
    overallScore,
    overallSeverity,
    categoryScores,
    triggeredRules: outcomes,
    summary,
  };
}
