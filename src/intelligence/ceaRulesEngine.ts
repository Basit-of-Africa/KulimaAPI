/**
 * CEA Rules Engine
 *
 * Evaluates controlled environment conditions and generates
 * actionable control recommendations for HVAC, irrigation,
 * lighting, CO2, and fertigation.
 */

import type {
  CEARuleContext,
  CEARuleOutcome,
  EnvironmentProfile,
  EnvironmentReading,
  ControlType,
  CEA_CROP_OPTIMALS as _CEA_CROP_OPTIMALS,
} from './ceaTypes.js';
import { CEA_CROP_OPTIMALS } from './ceaTypes.js';

// ─── CEA Rule Interface ─────────────────────────────────────────────────────

export interface CEAAggregatedRule {
  id: string;
  name: string;
  category: string;
  description: string;
  evaluate: (ctx: CEARuleContext) => CEARuleOutcome | null;
}

// ─── Helper: Get Crop Optimal Ranges ────────────────────────────────────────

function getCropOptimals(cropName: string) {
  return CEA_CROP_OPTIMALS[cropName.toLowerCase()] || CEA_CROP_OPTIMALS.tomato;
}

// ─── Helper: Average of readings ────────────────────────────────────────────

function avgReadings(
  readings: EnvironmentReading[],
  field: keyof EnvironmentReading,
): number | undefined {
  const values = readings
    .map((r) => r[field])
    .filter((v): v is number => typeof v === 'number' && !isNaN(v));
  if (values.length === 0) return undefined;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

// ─── Temperature Control Rules ──────────────────────────────────────────────

const ventilationRule: CEAAggregatedRule = {
  id: 'cea-ventilation',
  name: 'Ventilation Activation',
  category: 'ventilation',
  description: 'Activates mechanical ventilation when indoor temp exceeds target',
  evaluate: (ctx) => {
    const { environment, latestReading, outdoorWeather } = ctx;
    if (!latestReading) return null;
    if (environment.infrastructure.ventilationType === 'natural') return null;

    const cropName = environment.crops[0]?.cropName || 'tomato';
    const opt = getCropOptimals(cropName);
    const indoorTemp = latestReading.indoorTemperatureC;
    if (indoorTemp === undefined) return null;

    const hysteresis = 2;
    const outdoorTemp = outdoorWeather?.temperatureC || 30;

    if (indoorTemp <= opt.temperature.target + hysteresis) return null;

    // Calculate ventilation speed based on differential
    const differential = indoorTemp - opt.temperature.target;
    const speedPercent = Math.min(100, Math.round(50 + differential * 10));

    const priority = indoorTemp > opt.temperature.max ? 'critical' : differential > 5 ? 'high' : 'medium';

    return {
      triggered: true,
      severity: priority,
      controlType: 'ventilation',
      title: 'Mechanical Ventilation Activation',
      description: `Indoor temperature (${indoorTemp.toFixed(1)}°C) exceeds target (${opt.temperature.target}°C). Mechanical ventilation recommended.`,
      recommendation: `Activate ventilation at ${speedPercent}% speed. ${outdoorTemp > indoorTemp ? '⚠️ Outdoor air is warmer — consider supplementary cooling.' : 'Outdoor air is cooler — ventilation will be effective.'}`,
      action: `activate_mechanical_ventilation_${speedPercent}_percent`,
      expectedImpact: `Reduce indoor temperature by ${(differential * 0.6).toFixed(1)}°C within 15-20 minutes`,
      confidence: 0.85,
      evidence: { indoorTemp, targetTemp: opt.temperature.target, outdoorTemp, differential, speedPercent },
    };
  },
};

const coolingRule: CEAAggregatedRule = {
  id: 'cea-cooling',
  name: 'Cooling System Activation',
  category: 'cooling',
  description: 'Activates cooling when ventilation alone is insufficient',
  evaluate: (ctx) => {
    const { environment, latestReading, outdoorWeather } = ctx;
    if (!latestReading) return null;
    if (environment.infrastructure.coolingType === 'none') return null;

    const cropName = environment.crops[0]?.cropName || 'tomato';
    const opt = getCropOptimals(cropName);
    const indoorTemp = latestReading.indoorTemperatureC;
    if (indoorTemp === undefined) return null;

    if (indoorTemp <= opt.temperature.target + 5) return null;

    const outdoorHumidity = outdoorWeather?.humidityPercent || 60;
    let efficiencyNote = '';
    let efficiencyFactor = 1;

    if (environment.infrastructure.coolingType === 'pad_fan' && outdoorHumidity > 80) {
      efficiencyFactor = 0.7;
      efficiencyNote = ' Pad-and-fan cooling is 30% less effective at >80% humidity. Consider fog cooling.';
    }

    const coolingType = environment.infrastructure.coolingType;
    const estimatedCooling = Math.round((indoorTemp - opt.temperature.target) * efficiencyFactor);
    const energyCost = Math.round(1200 * efficiencyFactor); // rough daily cost estimate

    return {
      triggered: true,
      severity: indoorTemp > opt.temperature.max + 3 ? 'critical' : 'high',
      controlType: 'cooling',
      title: `${coolingType.replace('_', ' ').toUpperCase()} Cooling Activation`,
      description: `Indoor temperature (${indoorTemp.toFixed(1)}°C) significantly exceeds target. Active cooling required.${efficiencyNote}`,
      recommendation: `Activate ${coolingType.replace('_', ' ')} system. Expected to reduce temperature by ~${estimatedCooling}°C.`,
      action: `activate_${coolingType}`,
      expectedImpact: `Additional ${estimatedCooling}°C cooling beyond ventilation`,
      confidence: 0.8,
      evidence: { indoorTemp, targetTemp: opt.temperature.target, outdoorHumidity, coolingType, efficiencyFactor },
      energyCostNGN: energyCost,
    };
  },
};

const heatingRule: CEAAggregatedRule = {
  id: 'cea-heating',
  name: 'Heating Activation',
  category: 'heating',
  description: 'Recommends heating when indoor temp drops below crop minimum',
  evaluate: (ctx) => {
    const { environment, latestReading } = ctx;
    if (!latestReading) return null;
    if (environment.infrastructure.heatingType === 'none') return null;

    const cropName = environment.crops[0]?.cropName || 'tomato';
    const opt = getCropOptimals(cropName);
    const indoorTemp = latestReading.indoorTemperatureC;
    if (indoorTemp === undefined) return null;

    if (indoorTemp >= opt.temperature.nightMin) return null;

    const deficit = opt.temperature.nightMin - indoorTemp;
    const areaM2 = environment.infrastructure.areaM2;

    // Rough energy cost: 0.1 kWh/m²/hour deficit
    const energyCostPerHour = Math.round(areaM2 * 0.1 * ctx.energyRateNGNPerKWh);
    const hoursNeeded = Math.ceil(deficit / 2); // ~2°C recovery per hour

    return {
      triggered: true,
      severity: deficit > 5 ? 'critical' : deficit > 3 ? 'high' : 'medium',
      controlType: 'heating',
      title: 'Heating System Activation',
      description: `Indoor temperature (${indoorTemp.toFixed(1)}°C) is below minimum for ${cropName} (${opt.temperature.nightMin}°C).`,
      recommendation: `Activate ${environment.infrastructure.heatingType} heating. Estimated cost: ₦${energyCostPerHour * hoursNeeded} for ${hoursNeeded} hours.`,
      action: `activate_${environment.infrastructure.heatingType}_heating`,
      expectedImpact: `Increase temperature by ~${deficit.toFixed(1)}°C over ${hoursNeeded} hours`,
      confidence: 0.85,
      evidence: { indoorTemp, nightMin: opt.temperature.nightMin, deficit, energyCostPerHour, hoursNeeded },
      energyCostNGN: energyCostPerHour * hoursNeeded,
    };
  },
};

// ─── Lighting Rules ─────────────────────────────────────────────────────────

const supplementalLightingRule: CEAAggregatedRule = {
  id: 'cea-lighting',
  name: 'Supplemental Lighting',
  category: 'lighting',
  description: 'Recommends supplemental lighting when natural light is insufficient',
  evaluate: (ctx) => {
    const { environment, latestReading, outdoorWeather } = ctx;
    if (!latestReading) return null;
    if (!environment.infrastructure.hasSupplementalLighting) return null;

    const cropName = environment.crops[0]?.cropName || 'tomato';
    const opt = getCropOptimals(cropName);
    const lightLux = latestReading.indoorLightLux;
    if (lightLux === undefined) return null;

    if (lightLux >= opt.light.targetLux * 0.5) return null;

    const deficitLux = opt.light.targetLux - lightLux;
    const hoursNeeded = Math.min(8, Math.ceil((deficitLux / opt.light.targetLux) * 12));
    const lightKW = (environment.infrastructure.lightCapacityLux || 30000) / 10000 * 0.6;
    const energyCost = Math.round(hoursNeeded * lightKW * ctx.energyRateNGNPerKWh);

    return {
      triggered: true,
      severity: lightLux < opt.light.targetLux * 0.25 ? 'high' : 'medium',
      controlType: 'lighting',
      title: 'Supplemental Lighting Recommendation',
      description: `Current light intensity (${lightLux.toLocaleString()} lux) is below 50% of target (${opt.light.targetLux.toLocaleString()} lux) for ${cropName}.`,
      recommendation: `Activate supplemental ${environment.infrastructure.lightSource || 'LED'} lighting for ~${hoursNeeded} hours. Estimated cost: ₦${energyCost}.`,
      action: `activate_supplemental_lighting_${hoursNeeded}h`,
      expectedImpact: `Increase daily light integral by ${Math.round(deficitLux * hoursNeeded / 1000)} kLux·h`,
      confidence: 0.75,
      evidence: { currentLux: lightLux, targetLux: opt.light.targetLux, hoursNeeded, lightSource: environment.infrastructure.lightSource },
      energyCostNGN: energyCost,
    };
  },
};

// ─── CO2 Enrichment Rules ───────────────────────────────────────────────────

const co2EnrichmentRule: CEAAggregatedRule = {
  id: 'cea-co2',
  name: 'CO2 Enrichment',
  category: 'co2',
  description: 'Recommends CO2 injection when levels are below optimal',
  evaluate: (ctx) => {
    const { environment, latestReading } = ctx;
    if (!latestReading) return null;
    if (!environment.infrastructure.hasCO2Injection) return null;

    const cropName = environment.crops[0]?.cropName || 'tomato';
    const opt = getCropOptimals(cropName);
    const co2Ppm = latestReading.indoorCO2Ppm;
    if (co2Ppm === undefined) return null;

    if (co2Ppm >= opt.co2.target - 100) return null;

    const deficitPpm = opt.co2.target - co2Ppm;
    return {
      triggered: true,
      severity: co2Ppm < opt.co2.min ? 'high' : 'medium',
      controlType: 'co2',
      title: 'CO2 Enrichment Recommendation',
      description: `CO2 levels (${co2Ppm} ppm) are below optimal (${opt.co2.target} ppm) for ${cropName}.`,
      recommendation: `Inject CO2 to ${opt.co2.target}-${opt.co2.max} ppm during daylight hours when vents are closed. This can increase photosynthesis by ${Math.round(deficitPpm / 10)}%.`,
      action: `inject_co2_to_${opt.co2.target}_ppm`,
      expectedImpact: `${Math.round(deficitPpm / 10)}% increase in photosynthetic rate`,
      confidence: 0.7,
      evidence: { currentPpm: co2Ppm, targetPpm: opt.co2.target, deficitPpm },
      energyCostNGN: Math.round(deficitPpm * 0.5), // rough CO2 cost
    };
  },
};

// ─── Humidity Rules ─────────────────────────────────────────────────────────

const humidityControlRule: CEAAggregatedRule = {
  id: 'cea-humidity',
  name: 'Humidity Control',
  category: 'humidity',
  description: 'Recommends dehumidification or misting based on humidity levels',
  evaluate: (ctx) => {
    const { environment, latestReading } = ctx;
    if (!latestReading) return null;

    const cropName = environment.crops[0]?.cropName || 'tomato';
    const opt = getCropOptimals(cropName);
    const humidity = latestReading.indoorHumidityPercent;
    if (humidity === undefined) return null;

    // High humidity
    if (humidity > opt.humidity.max) {
      const excess = humidity - opt.humidity.max;
      const hasDehumidifier = environment.infrastructure.hasDehumidifier;

      return {
        triggered: true,
        severity: humidity > opt.humidity.max + 15 ? 'high' : 'medium',
        controlType: 'ventilation',
        title: 'High Humidity Alert',
        description: `Indoor humidity (${humidity.toFixed(0)}%) exceeds safe range (${opt.humidity.min}-${opt.humidity.max}%) for ${cropName}. Fungal disease risk elevated.`,
        recommendation: hasDehumidifier
          ? 'Activate dehumidifier and increase ventilation to reduce humidity.'
          : 'Increase ventilation. Consider installing dehumidifier for consistent control.',
        action: hasDehumidifier ? 'activate_dehumidifier' : 'increase_ventilation_for_dehumidification',
        expectedImpact: `Reduce humidity by ~${Math.min(excess, 15).toFixed(0)}% within 30 minutes`,
        confidence: 0.8,
        evidence: { humidity, targetMax: opt.humidity.max, excess, hasDehumidifier },
        energyCostNGN: hasDehumidifier ? Math.round(excess * 20) : 0,
      };
    }

    // Low humidity
    if (humidity < opt.humidity.min) {
      return {
        triggered: true,
        severity: humidity < opt.humidity.min - 15 ? 'high' : 'medium',
        controlType: 'irrigation',
        title: 'Low Humidity Alert',
        description: `Indoor humidity (${humidity.toFixed(0)}%) is below minimum (${opt.humidity.min}%) for ${cropName}.`,
        recommendation: 'Activate misting system or increase irrigation frequency to raise humidity.',
        action: 'activate_misting_system',
        expectedImpact: `Increase humidity by ~${Math.min(opt.humidity.min - humidity, 10).toFixed(0)}% within 20 minutes`,
        confidence: 0.75,
        evidence: { humidity, targetMin: opt.humidity.min },
        energyCostNGN: 200,
      };
    }

    return null;
  },
};

// ─── Hydroponic Rules ───────────────────────────────────────────────────────

const phManagementRule: CEAAggregatedRule = {
  id: 'cea-ph',
  name: 'pH Management',
  category: 'fertigation',
  description: 'Monitors pH levels and recommends corrective action',
  evaluate: (ctx) => {
    const { environment, latestReading } = ctx;
    if (!latestReading) return null;
    if (!latestReading.waterPH) return null;

    const ph = latestReading.waterPH;
    const isHydroponic = ['nft', 'dwc', 'aeroponic', 'ebb_flow'].includes(
      environment.infrastructure.irrigationType,
    );
    if (!isHydroponic) return null;

    const targetMin = 5.5;
    const targetMax = 6.5;

    if (ph >= targetMin && ph <= targetMax) return null;

    const isLow = ph < targetMin;
    const deviation = isLow ? targetMin - ph : ph - targetMax;

    return {
      triggered: true,
      severity: deviation > 1 ? 'high' : 'medium',
      controlType: 'fertigation',
      title: `pH ${isLow ? 'Too Low' : 'Too High'} Alert`,
      description: `Solution pH (${ph.toFixed(1)}) is ${isLow ? 'below' : 'above'} optimal range (${targetMin}-${targetMax}). Nutrient uptake will be impaired.`,
      recommendation: isLow
        ? 'Add pH Up (potassium hydroxide) solution in small increments. Re-test in 15 minutes.'
        : 'Add pH Down (phosphoric acid) solution in small increments. Re-test in 15 minutes.',
      action: isLow ? 'add_ph_up_solution' : 'add_ph_down_solution',
      expectedImpact: 'Restore pH to optimal range within 30 minutes',
      confidence: 0.9,
      evidence: { currentPH: ph, targetMin, targetMax, deviation },
    };
  },
};

const ecManagementRule: CEAAggregatedRule = {
  id: 'cea-ec',
  name: 'EC Management',
  category: 'fertigation',
  description: 'Monitors electrical conductivity for nutrient concentration',
  evaluate: (ctx) => {
    const { environment, latestReading } = ctx;
    if (!latestReading) return null;
    if (!latestReading.waterEC) return null;

    const ec = latestReading.waterEC;
    const isHydroponic = ['nft', 'dwc', 'aeroponic', 'ebb_flow'].includes(
      environment.infrastructure.irrigationType,
    );
    if (!isHydroponic) return null;

    // Default EC range for most crops in vegetative stage
    const ecMin = 1.2;
    const ecMax = 2.8;

    if (ec >= ecMin && ec <= ecMax) return null;

    const isHigh = ec > ecMax;

    return {
      triggered: true,
      severity: isHigh ? (ec > 4.0 ? 'critical' : 'high') : 'medium',
      controlType: 'fertigation',
      title: `EC ${isHigh ? 'Too High' : 'Too Low'}`,
      description: `EC (${ec.toFixed(1)} mS/cm) is ${isHigh ? 'above' : 'below'} optimal range (${ecMin}-${ecMax} mS/cm). ${isHigh ? 'Nutrient burn risk.' : 'Nutrient deficiency risk.'}`,
      recommendation: isHigh
        ? 'Dilute solution with fresh water. Check drain percentage — aim for 20-30%.'
        : 'Add nutrient concentrate to increase EC. Check each macro/micro individually.',
      action: isHigh ? 'dilute_nutrient_solution' : 'increase_nutrient_concentration',
      expectedImpact: `Restore EC to ${ecMin}-${ecMax} mS/cm range`,
      confidence: 0.9,
      evidence: { currentEC: ec, ecMin, ecMax },
    };
  },
};

const waterTemperatureRule: CEAAggregatedRule = {
  id: 'cea-water-temp',
  name: 'Water Temperature',
  category: 'fertigation',
  description: 'Monitors root zone water temperature',
  evaluate: (ctx) => {
    const { latestReading } = ctx;
    if (!latestReading) return null;
    if (latestReading.waterTemperatureC === undefined) return null;

    const waterTemp = latestReading.waterTemperatureC;
    const optimalMin = 18;
    const optimalMax = 26;

    if (waterTemp >= optimalMin && waterTemp <= optimalMax) return null;

    const isTooHot = waterTemp > optimalMax;

    return {
      triggered: true,
      severity: isTooHot
        ? waterTemp > 32 ? 'critical' : 'high'
        : waterTemp < 12 ? 'critical' : 'high',
      controlType: 'irrigation',
      title: `Water Temperature ${isTooHot ? 'Too High' : 'Too Low'}`,
      description: `Root zone temperature (${waterTemp.toFixed(1)}°C) is outside optimal range (${optimalMin}-${optimalMax}°C). ${isTooHot ? 'Risk of root pathogens and reduced dissolved oxygen.' : 'Nutrient uptake significantly reduced.'}`,
      recommendation: isTooHot
        ? 'Add ice packs to reservoir or use chiller. Increase aeration.'
        : 'Use water heater or place reservoir in warmer location.',
      action: isTooHot ? 'cool_water_reservoir' : 'warm_water_reservoir',
      expectedImpact: 'Restore water temperature to optimal range within 1-2 hours',
      confidence: 0.85,
      evidence: { waterTemp, optimalMin, optimalMax },
    };
  },
};

// ─── Energy Optimisation Rules ──────────────────────────────────────────────

const naturalVentilationRule: CEAAggregatedRule = {
  id: 'cea-natural-vent',
  name: 'Natural Ventilation Opportunity',
  category: 'energy',
  description: 'Recommends natural ventilation when outdoor conditions are favourable',
  evaluate: (ctx) => {
    const { environment, outdoorWeather, latestReading } = ctx;
    if (!outdoorWeather || !latestReading) return null;
    if (environment.infrastructure.ventilationType === 'natural') return null;

    const cropName = environment.crops[0]?.cropName || 'tomato';
    const opt = getCropOptimals(cropName);
    const outdoorTemp = outdoorWeather.temperatureC;
    const outdoorHumidity = outdoorWeather.humidityPercent;

    // Outdoor conditions are within crop's target range
    if (outdoorTemp < opt.temperature.target - 3 || outdoorTemp > opt.temperature.max) return null;
    if (outdoorHumidity > opt.humidity.max) return null;

    const indoorTemp = latestReading.indoorTemperatureC || outdoorTemp + 3;
    if (indoorTemp <= opt.temperature.target + 2) return null;

    const savingNGN = Math.round(ctx.energyRateNGNPerKWh * 5); // ~5 kWh saved per hour

    return {
      triggered: true,
      severity: 'low',
      controlType: 'ventilation',
      title: 'Natural Ventilation Opportunity',
      description: `Outdoor conditions (${outdoorTemp.toFixed(1)}°C, ${outdoorHumidity.toFixed(0)}% RH) are within the target range. Natural ventilation can replace mechanical systems.`,
      recommendation: `Switch to natural ventilation. Estimated saving: ₦${savingNGN}/hour vs mechanical cooling.`,
      action: 'switch_to_natural_ventilation',
      expectedImpact: `Save ₦${savingNGN}/hour while maintaining target temperature`,
      confidence: 0.8,
      evidence: { outdoorTemp, outdoorHumidity, indoorTemp, savingNGN },
      energyCostNGN: -savingNGN, // negative = savings
    };
  },
};

// ─── Irrigation Scheduling ──────────────────────────────────────────────────

const irrigationSchedulingRule: CEAAggregatedRule = {
  id: 'cea-irrigation-schedule',
  name: 'Irrigation Scheduling',
  category: 'irrigation',
  description: 'Recommends irrigation timing based on moisture and evapotranspiration',
  evaluate: (ctx) => {
    const { environment, latestReading, outdoorWeather } = ctx;
    if (!latestReading) return null;

    const cropName = environment.crops[0]?.cropName || 'tomato';
    const opt = getCropOptimals(cropName);

    // For soil-based systems, check soil moisture
    if (['drip', 'sprinkler', 'flood', 'rain_fed'].includes(environment.infrastructure.irrigationType)) {
      const moisture = latestReading.soilMoisturePercent;
      if (moisture === undefined) return null;

      if (moisture >= 60) return null; // Adequate moisture

      const deficit = 60 - moisture;
      const urgency = deficit > 30 ? 'critical' : deficit > 15 ? 'high' : 'medium';

      return {
        triggered: true,
        severity: urgency,
        controlType: 'irrigation',
        title: 'Irrigation Required',
        description: `Soil moisture (${moisture.toFixed(0)}%) is below optimal. ${cropName} requires consistent moisture during active growth.`,
        recommendation: `Schedule irrigation. Apply ${(opt.irrigationLitresPerM2 * deficit / 30).toFixed(1)} L/m² to restore adequate moisture.`,
        action: `schedule_irrigation_${Math.round(opt.irrigationLitresPerM2 * deficit / 30)}L_per_m2`,
        expectedImpact: `Increase soil moisture to 60%+`,
        confidence: 0.85,
        evidence: { currentMoisture: moisture, targetMoisture: 60, deficit },
      };
    }

    // For hydroponic systems, check EC (water consumption indicator)
    if (['nft', 'dwc', 'aeroponic', 'ebb_flow'].includes(environment.infrastructure.irrigationType)) {
      const ec = latestReading.waterEC;
      if (ec === undefined) return null;

      // Rising EC suggests water uptake without nutrient uptake — plants need more irrigation
      if (ec > 3.5) {
        return {
          triggered: true,
          severity: 'medium',
          controlType: 'irrigation',
          title: 'Increased Irrigation Recommended',
          description: `EC rising (${ec.toFixed(1)} mS/cm) — plants may be transpiring faster than nutrient uptake. Increase irrigation frequency.`,
          recommendation: 'Increase irrigation frequency or duration by 20%. Check drain percentage.',
          action: 'increase_irrigation_frequency_20_percent',
          expectedImpact: 'Stabilise EC and improve nutrient uptake',
          confidence: 0.7,
          evidence: { currentEC: ec },
        };
      }
    }

    return null;
  },
};

// ─── All CEA Rules ──────────────────────────────────────────────────────────

export const CEA_RULES: CEAAggregatedRule[] = [
  ventilationRule,
  coolingRule,
  heatingRule,
  supplementalLightingRule,
  co2EnrichmentRule,
  humidityControlRule,
  phManagementRule,
  ecManagementRule,
  waterTemperatureRule,
  naturalVentilationRule,
  irrigationSchedulingRule,
];

// ─── Rule Evaluation Engine ─────────────────────────────────────────────────

export interface CEARiskScore {
  overallScore: number; // 0-100 (higher = more risk)
  overallSeverity: 'low' | 'medium' | 'high' | 'critical';
  triggeredRules: CEARuleOutcome[];
  totalEnergyCostNGN: number;
  summary: string;
}

const SEVERITY_WEIGHTS: Record<string, number> = {
  low: 10,
  medium: 30,
  high: 60,
  critical: 90,
};

/**
 * Evaluate all CEA rules against the given context and return
 * a composite risk score with triggered recommendations.
 */
export function evaluateCEARules(ctx: CEARuleContext): CEARiskScore {
  const triggeredRules: CEARuleOutcome[] = [];
  let totalEnergyCostNGN = 0;

  for (const rule of CEA_RULES) {
    try {
      const outcome = rule.evaluate(ctx);
      if (outcome && outcome.triggered) {
        triggeredRules.push(outcome);
        if (outcome.energyCostNGN) {
          totalEnergyCostNGN += outcome.energyCostNGN;
        }
      }
    } catch (err) {
      // Don't let a single rule failure crash the engine
    }
  }

  // Calculate composite risk score
  let overallScore = 0;
  if (triggeredRules.length > 0) {
    const maxSeverity = triggeredRules.reduce((max, r) => {
      return SEVERITY_WEIGHTS[r.severity] > SEVERITY_WEIGHTS[max] ? r.severity : max;
    }, 'low');
    overallScore = SEVERITY_WEIGHTS[maxSeverity];
  }

  const overallSeverity =
    overallScore >= 90 ? 'critical' : overallScore >= 60 ? 'high' : overallScore >= 30 ? 'medium' : 'low';

  // Build summary
  const summaryParts: string[] = [];
  if (triggeredRules.length === 0) {
    summaryParts.push('All conditions within optimal range. No immediate actions required.');
  } else {
    const critical = triggeredRules.filter((r) => r.severity === 'critical');
    const high = triggeredRules.filter((r) => r.severity === 'high');
    const medium = triggeredRules.filter((r) => r.severity === 'medium');
    if (critical.length) summaryParts.push(`${critical.length} critical alert(s)`);
    if (high.length) summaryParts.push(`${high.length} high-priority action(s)`);
    if (medium.length) summaryParts.push(`${medium.length} advisory notice(s)`);
    if (totalEnergyCostNGN > 0) summaryParts.push(`Estimated energy cost: ₦${totalEnergyCostNGN.toLocaleString()}/day`);
  }

  return {
    overallScore,
    overallSeverity,
    triggeredRules,
    totalEnergyCostNGN,
    summary: summaryParts.join('. ') + '.',
  };
}

// ─── Control Setpoints Generator ────────────────────────────────────────────

import type { ControlSetpoints, Rationale } from './ceaTypes.js';

/**
 * Generate recommended control setpoints based on environment and current conditions.
 */
export function generateControlSetpoints(
  environment: EnvironmentProfile,
  latestReading?: EnvironmentReading,
): { setpoints: ControlSetpoints; rationale: Rationale } {
  const cropName = environment.crops[0]?.cropName || 'tomato';
  const opt = getCropOptimals(cropName);

  const rationale: Rationale = {};

  // Temperature
  const indoorTemp = latestReading?.indoorTemperatureC;
  const outdoorTemp = latestReading?.outdoorTemperatureC || 30;
  const ventilationMode = environment.infrastructure.ventilationType;
  const coolingMode = environment.infrastructure.coolingType;

  let ventilationSpeed = 0;
  let coolingActive = false;
  let heatingActive = false;

  if (indoorTemp !== undefined) {
    if (indoorTemp > opt.temperature.target + 2) {
      ventilationSpeed = Math.min(100, Math.round((indoorTemp - opt.temperature.target) * 12));
      rationale.temperature = `Indoor temp (${indoorTemp.toFixed(1)}°C) above target. Ventilation at ${ventilationSpeed}%.`;
      if (indoorTemp > opt.temperature.target + 5) {
        coolingActive = true;
        rationale.cooling = `Indoor temp significantly above target. Active cooling recommended.`;
      }
    } else if (indoorTemp < opt.temperature.nightMin) {
      heatingActive = true;
      rationale.heating = `Indoor temp (${indoorTemp.toFixed(1)}°C) below minimum (${opt.temperature.nightMin}°C). Heating needed.`;
    } else {
      rationale.temperature = `Temperature within acceptable range.`;
    }
  } else {
    rationale.temperature = `Using crop defaults for ${cropName}.`;
  }

  // Humidity
  const humidity = latestReading?.indoorHumidityPercent || opt.humidity.target;
  rationale.humidity = humidity > opt.humidity.max
    ? `Humidity (${humidity.toFixed(0)}%) above optimal. Consider dehumidification.`
    : humidity < opt.humidity.min
      ? `Humidity (${humidity.toFixed(0)}%) below optimal. Consider misting.`
      : 'Humidity within acceptable range.';

  // CO2
  const co2 = latestReading?.indoorCO2Ppm || 400;
  rationale.co2 = co2 < opt.co2.target - 100
    ? `CO2 (${co2} ppm) below target. Enrichment recommended when vents closed.`
    : 'CO2 levels adequate.';

  // Light
  const light = latestReading?.indoorLightLux || 30000;
  rationale.light = light < opt.light.targetLux * 0.5
    ? `Light intensity below 50% of target. Supplemental lighting recommended.`
    : 'Light intensity adequate.';

  return {
    setpoints: {
      temperature: { targetC: opt.temperature.target, minC: opt.temperature.min, maxC: opt.temperature.max, nightMinC: opt.temperature.nightMin },
      humidity: { targetPercent: opt.humidity.target, minPercent: opt.humidity.min, maxPercent: opt.humidity.max },
      co2: { targetPpm: opt.co2.target, minPpm: opt.co2.min, maxPpm: opt.co2.max },
      light: { targetLux: opt.light.targetLux, photoperiodHours: opt.light.photoperiodHours },
      ventilation: { mode: ventilationMode, speedPercent: ventilationSpeed },
      cooling: { mode: coolingMode, active: coolingActive },
      heating: { mode: environment.infrastructure.heatingType, active: heatingActive },
      irrigation: { frequency: '2x_daily', volumeLitresPerM2: opt.irrigationLitresPerM2 },
    },
    rationale,
  };
}

// ─── Energy Budget Calculator ───────────────────────────────────────────────

import type { EnergyBudget } from './ceaTypes.js';

function ctx_energyRate(_env: EnvironmentProfile): number {
  return 240; // Default Band A ₦/kWh
}

/**
 * Estimate daily energy budget based on equipment and conditions.
 */
export function calculateEnergyBudget(
  environment: EnvironmentProfile,
  outdoorWeather?: { temperatureC: number; cloudCoverPercent: number },
): EnergyBudget {
  const infra = environment.infrastructure;
  const rate = ctx_energyRate(environment);

  // Base consumption estimates (kWh/day)
  let ventilationKWh = 0;
  let coolingKWh = 0;
  let heatingKWh = 0;
  let lightingKWh = 0;
  const irrigationKWh = 0.5;

  // Ventilation: ~0.5 kW for mechanical, runs 6-12 hours
  if (infra.ventilationType === 'mechanical' || infra.ventilationType === 'hybrid') {
    const outdoorTemp = outdoorWeather?.temperatureC || 30;
    const hours = outdoorTemp > 28 ? 12 : outdoorTemp > 25 ? 8 : 4;
    ventilationKWh = Math.round(0.5 * hours * 10) / 10;
  }

  // Cooling: ~2-5 kW depending on type
  if (infra.coolingType !== 'none') {
    const outdoorTemp = outdoorWeather?.temperatureC || 30;
    const hours = outdoorTemp > 30 ? 8 : outdoorTemp > 28 ? 4 : 0;
    const coolingKW = infra.coolingType === 'fog' ? 1.5 : infra.coolingType === 'pad_fan' ? 3 : 2;
    coolingKWh = Math.round(coolingKW * hours * 10) / 10;
  }

  // Heating: ~1-3 kW
  if (infra.heatingType !== 'none') {
    const outdoorTemp = outdoorWeather?.temperatureC || 25;
    const hours = outdoorTemp < 18 ? 8 : outdoorTemp < 22 ? 3 : 0;
    const heatingKW = infra.heatingType === 'gas' ? 1 : 2.5;
    heatingKWh = Math.round(heatingKW * hours * 10) / 10;
  }

  // Supplemental lighting: ~0.6 kW per 10000 lux capacity
  if (infra.hasSupplementalLighting && infra.lightCapacityLux) {
    const cloudCover = outdoorWeather?.cloudCoverPercent || 50;
    const hours = cloudCover > 70 ? 8 : cloudCover > 40 ? 4 : 0;
    const lightKW = (infra.lightCapacityLux / 10000) * 0.6;
    lightingKWh = Math.round(lightKW * hours * 10) / 10;
  }

  const totalKWh = ventilationKWh + coolingKWh + heatingKWh + lightingKWh + irrigationKWh;
  const costNGN = Math.round(totalKWh * rate);

  // Optimisation savings
  const naturalVentSavings = infra.ventilationType !== 'natural' && outdoorWeather && outdoorWeather.temperatureC < 28
    ? ventilationKWh * rate * 0.5
    : 0;
  const lightingSavings = lightingKWh > 0 ? lightingKWh * 0.2 * rate : 0;
  const savingsNGN = Math.round(naturalVentSavings + lightingSavings);

  const recommendations: string[] = [];
  if (infra.ventilationType !== 'natural' && outdoorWeather && outdoorWeather.temperatureC < 28) {
    recommendations.push('Switch to natural ventilation during cooler hours to save energy.');
  }
  if (lightingKWh > 0 && outdoorWeather && outdoorWeather.cloudCoverPercent < 50) {
    recommendations.push('Reduce supplemental lighting during periods of adequate natural light.');
  }
  if (coolingKWh > 0) {
    recommendations.push('Pre-cool facility before peak tariff hours (2pm-6pm) if possible.');
  }

  return {
    currentDailyKWh: Math.round(totalKWh * 10) / 10,
    projectedDailyKWh: Math.round(totalKWh * 1.1 * 10) / 10,
    costNGN,
    optimisationSavingsNGN: savingsNGN,
    recommendations,
  };
}

// ─── Yield Prediction ───────────────────────────────────────────────────────

import type { YieldForecast } from './ceaTypes.js';

/**
 * Predict yield based on current trajectory.
 */
export function predictYield(
  environment: EnvironmentProfile,
  latestReading?: EnvironmentReading,
): YieldForecast | undefined {
  const crop = environment.crops[0];
  if (!crop) return undefined;

  const plantingDate = new Date(crop.plantingDate);
  const now = new Date();
  const daysSincePlanting = Math.floor((now.getTime() - plantingDate.getTime()) / (1000 * 60 * 60 * 24));

  // Base yield per m² varies by crop
  const baseYieldMap: Record<string, number> = {
    tomato: 10,
    pepper: 6,
    cucumber: 12,
    lettuce: 3,
    strawberry: 4,
    basil: 2,
  };
  const baseYield = baseYieldMap[crop.cropName.toLowerCase()] || 5;

  // Growth days to harvest
  const growthDaysMap: Record<string, number> = {
    tomato: 75,
    pepper: 80,
    cucumber: 60,
    lettuce: 45,
    strawberry: 90,
    basil: 30,
  };
  const totalGrowthDays = growthDaysMap[crop.cropName.toLowerCase()] || 70;

  // Calculate yield factor based on conditions
  let yieldFactor = 0.85; // Default good conditions
  if (latestReading) {
    const opt = getCropOptimals(crop.cropName);
    // Temperature factor
    if (latestReading.indoorTemperatureC !== undefined) {
      const tempDiff = Math.abs(latestReading.indoorTemperatureC - opt.temperature.target);
      yieldFactor *= Math.max(0.5, 1 - tempDiff * 0.03);
    }
    // Humidity factor
    if (latestReading.indoorHumidityPercent !== undefined) {
      const humidDiff = Math.abs(latestReading.indoorHumidityPercent - opt.humidity.target);
      yieldFactor *= Math.max(0.6, 1 - humidDiff * 0.01);
    }
    // CO2 factor
    if (latestReading.indoorCO2Ppm !== undefined && latestReading.indoorCO2Ppm > opt.co2.target) {
      yieldFactor *= 1.1; // Bonus for high CO2
    }
  }

  const expectedYield = baseYield * yieldFactor;
  const progressPercent = Math.min(100, Math.round((daysSincePlanting / totalGrowthDays) * 100));
  const daysToHarvest = Math.max(0, totalGrowthDays - daysSincePlanting);

  let trajectory: 'behind' | 'on_track' | 'ahead' = 'on_track';
  if (yieldFactor < 0.7) trajectory = 'behind';
  else if (yieldFactor > 0.95) trajectory = 'ahead';

  const riskFactors: string[] = [];
  if (latestReading) {
    if (latestReading.indoorHumidityPercent && latestReading.indoorHumidityPercent > 80) {
      riskFactors.push('high_humidity');
    }
    if (latestReading.indoorTemperatureC && latestReading.indoorTemperatureC > 32) {
      riskFactors.push('heat_stress');
    }
  }

  return {
    crop: crop.cropName,
    daysSincePlanting,
    growthStage: crop.growthStage,
    progressPercent,
    expectedYieldKgM2: Math.round(expectedYield * 10) / 10,
    confidence: Math.round(Math.min(90, 50 + daysSincePlanting * 0.6)),
    trajectory,
    daysToHarvest,
    riskFactors,
  };
}
