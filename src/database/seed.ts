import { db, cropProfiles, agriculturalRules, locations } from './index.js';
import { createChildLogger } from '../logger.js';

const log = createChildLogger('seed');

// =============================================================================
// Crop Profiles — 12 MVP Crops
// =============================================================================

const CROP_DATA = [
  {
    name: 'cassava',
    displayName: 'Cassava',
    minTemperatureC: 21,
    maxTemperatureC: 35,
    preferredTemperatureC: 27,
    rainfallMinMm: 1000,
    rainfallMaxMm: 3000,
    waterSensitivity: 'moderate',
    windSensitivity: 'low',
    humidityMinPercent: 60,
    humidityMaxPercent: 85,
    germinationConditions: { minSoilTempC: 18, optimalMoisturePercent: 60 },
    growthStageRequirements: {
      germination: { days: 14, tempRange: [21, 35] },
      establishment: { days: 60, rainfallMin: 50 },
      bulking: { days: 120, rainfallMin: 80 },
      maturity: { days: 90, rainfallMax: 30 },
    },
  },
  {
    name: 'maize',
    displayName: 'Maize (Corn)',
    minTemperatureC: 18,
    maxTemperatureC: 33,
    preferredTemperatureC: 25,
    rainfallMinMm: 600,
    rainfallMaxMm: 1200,
    waterSensitivity: 'high',
    windSensitivity: 'moderate',
    humidityMinPercent: 50,
    humidityMaxPercent: 80,
    germinationConditions: { minSoilTempC: 10, optimalMoisturePercent: 55 },
    growthStageRequirements: {
      germination: { days: 10, tempRange: [18, 33] },
      vegetative: { days: 40, rainfallMin: 40 },
      flowering: { days: 20, rainfallMin: 50, critical: true },
      grain_fill: { days: 30, rainfallMin: 30 },
    },
  },
  {
    name: 'rice',
    displayName: 'Rice',
    minTemperatureC: 20,
    maxTemperatureC: 35,
    preferredTemperatureC: 28,
    rainfallMinMm: 1200,
    rainfallMaxMm: 2000,
    waterSensitivity: 'very_high',
    windSensitivity: 'moderate',
    humidityMinPercent: 65,
    humidityMaxPercent: 90,
    germinationConditions: { minSoilTempC: 15, optimalMoisturePercent: 80 },
    growthStageRequirements: {
      germination: { days: 7, tempRange: [20, 35] },
      vegetative: { days: 45, rainfallMin: 80 },
      reproductive: { days: 30, rainfallMin: 100, critical: true },
      ripening: { days: 30, rainfallMax: 20 },
    },
  },
  {
    name: 'sorghum',
    displayName: 'Sorghum',
    minTemperatureC: 20,
    maxTemperatureC: 38,
    preferredTemperatureC: 28,
    rainfallMinMm: 400,
    rainfallMaxMm: 800,
    waterSensitivity: 'low',
    windSensitivity: 'low',
    humidityMinPercent: 40,
    humidityMaxPercent: 75,
    germinationConditions: { minSoilTempC: 12, optimalMoisturePercent: 50 },
    growthStageRequirements: {
      germination: { days: 10, tempRange: [20, 38] },
      vegetative: { days: 40, rainfallMin: 25 },
      flowering: { days: 15, rainfallMin: 30 },
      grain_fill: { days: 25, rainfallMin: 15 },
    },
  },
  {
    name: 'millet',
    displayName: 'Pearl Millet',
    minTemperatureC: 20,
    maxTemperatureC: 40,
    preferredTemperatureC: 30,
    rainfallMinMm: 250,
    rainfallMaxMm: 600,
    waterSensitivity: 'very_low',
    windSensitivity: 'low',
    humidityMinPercent: 30,
    humidityMaxPercent: 70,
    germinationConditions: { minSoilTempC: 12, optimalMoisturePercent: 40 },
    growthStageRequirements: {
      germination: { days: 8, tempRange: [20, 40] },
      vegetative: { days: 35, rainfallMin: 15 },
      flowering: { days: 12, rainfallMin: 20 },
      grain_fill: { days: 20, rainfallMin: 10 },
    },
  },
  {
    name: 'cowpea',
    displayName: 'Cowpea (Black-eyed Pea)',
    minTemperatureC: 18,
    maxTemperatureC: 35,
    preferredTemperatureC: 26,
    rainfallMinMm: 400,
    rainfallMaxMm: 800,
    waterSensitivity: 'moderate',
    windSensitivity: 'low',
    humidityMinPercent: 40,
    humidityMaxPercent: 75,
    germinationConditions: { minSoilTempC: 15, optimalMoisturePercent: 50 },
    growthStageRequirements: {
      germination: { days: 7, tempRange: [18, 35] },
      vegetative: { days: 25, rainfallMin: 25 },
      flowering: { days: 15, rainfallMin: 30, critical: true },
      pod_fill: { days: 20, rainfallMin: 15 },
    },
  },
  {
    name: 'groundnut',
    displayName: 'Groundnut (Peanut)',
    minTemperatureC: 20,
    maxTemperatureC: 35,
    preferredTemperatureC: 27,
    rainfallMinMm: 500,
    rainfallMaxMm: 1000,
    waterSensitivity: 'moderate',
    windSensitivity: 'low',
    humidityMinPercent: 40,
    humidityMaxPercent: 70,
    germinationConditions: { minSoilTempC: 18, optimalMoisturePercent: 55 },
    growthStageRequirements: {
      germination: { days: 10, tempRange: [20, 35] },
      vegetative: { days: 30, rainfallMin: 30 },
      pegging: { days: 20, rainfallMin: 25, critical: true },
      pod_development: { days: 30, rainfallMin: 20 },
    },
  },
  {
    name: 'yam',
    displayName: 'Yam',
    minTemperatureC: 22,
    maxTemperatureC: 35,
    preferredTemperatureC: 28,
    rainfallMinMm: 1000,
    rainfallMaxMm: 2500,
    waterSensitivity: 'high',
    windSensitivity: 'moderate',
    humidityMinPercent: 60,
    humidityMaxPercent: 85,
    germinationConditions: { minSoilTempC: 20, optimalMoisturePercent: 65 },
    growthStageRequirements: {
      germination: { days: 21, tempRange: [22, 35] },
      vegetative: { days: 90, rainfallMin: 60 },
      bulking: { days: 90, rainfallMin: 80 },
      maturity: { days: 60, rainfallMax: 25 },
    },
  },
  {
    name: 'soybean',
    displayName: 'Soybean',
    minTemperatureC: 18,
    maxTemperatureC: 33,
    preferredTemperatureC: 26,
    rainfallMinMm: 600,
    rainfallMaxMm: 1200,
    waterSensitivity: 'high',
    windSensitivity: 'low',
    humidityMinPercent: 50,
    humidityMaxPercent: 80,
    germinationConditions: { minSoilTempC: 15, optimalMoisturePercent: 55 },
    growthStageRequirements: {
      germination: { days: 7, tempRange: [18, 33] },
      vegetative: { days: 35, rainfallMin: 35 },
      flowering: { days: 20, rainfallMin: 45, critical: true },
      pod_fill: { days: 30, rainfallMin: 30 },
    },
  },
  {
    name: 'cotton',
    displayName: 'Cotton',
    minTemperatureC: 20,
    maxTemperatureC: 37,
    preferredTemperatureC: 30,
    rainfallMinMm: 600,
    rainfallMaxMm: 1200,
    waterSensitivity: 'moderate',
    windSensitivity: 'low',
    humidityMinPercent: 40,
    humidityMaxPercent: 75,
    germinationConditions: { minSoilTempC: 15, optimalMoisturePercent: 50 },
    growthStageRequirements: {
      germination: { days: 10, tempRange: [20, 37] },
      vegetative: { days: 45, rainfallMin: 30 },
      flowering: { days: 30, rainfallMin: 40, critical: true },
      boll_development: { days: 45, rainfallMax: 20 },
    },
  },
  {
    name: 'cocoa',
    displayName: 'Cocoa',
    minTemperatureC: 18,
    maxTemperatureC: 32,
    preferredTemperatureC: 25,
    rainfallMinMm: 1200,
    rainfallMaxMm: 2500,
    waterSensitivity: 'high',
    windSensitivity: 'low',
    humidityMinPercent: 70,
    humidityMaxPercent: 90,
    germinationConditions: { minSoilTempC: 18, optimalMoisturePercent: 70 },
    growthStageRequirements: {
      germination: { days: 30, tempRange: [18, 32] },
      establishment: { days: 365, rainfallMin: 100 },
      bearing: { days: 730, rainfallMin: 120 },
    },
  },
  {
    name: 'oil_palm',
    displayName: 'Oil Palm',
    minTemperatureC: 20,
    maxTemperatureC: 35,
    preferredTemperatureC: 28,
    rainfallMinMm: 1500,
    rainfallMaxMm: 4000,
    waterSensitivity: 'high',
    windSensitivity: 'low',
    humidityMinPercent: 70,
    humidityMaxPercent: 95,
    germinationConditions: { minSoilTempC: 20, optimalMoisturePercent: 75 },
    growthStageRequirements: {
      germination: { days: 30, tempRange: [20, 35] },
      establishment: { days: 365, rainfallMin: 150 },
      bearing: { days: 1095, rainfallMin: 120 },
    },
  },
  {
    name: 'soybean',
    displayName: 'Soybean',
    minTemperatureC: 18,
    maxTemperatureC: 33,
    preferredTemperatureC: 26,
    rainfallMinMm: 600,
    rainfallMaxMm: 1200,
    waterSensitivity: 'high',
    windSensitivity: 'low',
    humidityMinPercent: 50,
    humidityMaxPercent: 80,
    germinationConditions: { minSoilTempC: 15, optimalMoisturePercent: 55 },
    growthStageRequirements: {
      germination: { days: 7, tempRange: [18, 33] },
      vegetative: { days: 35, rainfallMin: 35 },
      flowering: { days: 20, rainfallMin: 45, critical: true },
      pod_fill: { days: 30, rainfallMin: 30 },
    },
  },
  {
    name: 'tomato',
    displayName: 'Tomato',
    minTemperatureC: 18,
    maxTemperatureC: 30,
    preferredTemperatureC: 25,
    rainfallMinMm: 400,
    rainfallMaxMm: 800,
    waterSensitivity: 'high',
    windSensitivity: 'low',
    humidityMinPercent: 40,
    humidityMaxPercent: 80,
    germinationConditions: { minSoilTempC: 18, optimalMoisturePercent: 60 },
    growthStageRequirements: {
      nursery: { days: 30, tempRange: [18, 30] },
      vegetative: { days: 20, rainfallMin: 30 },
      flowering: { days: 15, rainfallMin: 30, critical: true },
      fruiting: { days: 25, rainfallMin: 20 },
    },
  },
  {
    name: 'pepper',
    displayName: 'Pepper (Chili)',
    minTemperatureC: 20,
    maxTemperatureC: 35,
    preferredTemperatureC: 27,
    rainfallMinMm: 500,
    rainfallMaxMm: 1000,
    waterSensitivity: 'moderate',
    windSensitivity: 'low',
    humidityMinPercent: 40,
    humidityMaxPercent: 80,
    germinationConditions: { minSoilTempC: 20, optimalMoisturePercent: 55 },
    growthStageRequirements: {
      nursery: { days: 35, tempRange: [20, 30] },
      vegetative: { days: 20, rainfallMin: 30 },
      flowering: { days: 35, rainfallMin: 30, critical: true },
      maturity: { days: 30, rainfallMax: 2 },
    },
  },
  {
    name: 'onion',
    displayName: 'Onion',
    minTemperatureC: 15,
    maxTemperatureC: 30,
    preferredTemperatureC: 24,
    rainfallMinMm: 300,
    rainfallMaxMm: 600,
    waterSensitivity: 'moderate',
    windSensitivity: 'low',
    humidityMinPercent: 40,
    humidityMaxPercent: 75,
    germinationConditions: { minSoilTempC: 15, optimalMoisturePercent: 50 },
    growthStageRequirements: {
      nursery: { days: 30, tempRange: [15, 30] },
      vegetative: { days: 25, rainfallMin: 20 },
      bulbing: { days: 30, rainfallMin: 20 },
      maturity: { days: 25, rainfallMax: 1 },
    },
  },
  {
    name: 'millet',
    displayName: 'Pearl Millet',
    minTemperatureC: 20,
    maxTemperatureC: 40,
    preferredTemperatureC: 30,
    rainfallMinMm: 250,
    rainfallMaxMm: 600,
    waterSensitivity: 'very_low',
    windSensitivity: 'low',
    humidityMinPercent: 30,
    humidityMaxPercent: 70,
    germinationConditions: { minSoilTempC: 12, optimalMoisturePercent: 40 },
    growthStageRequirements: {
      germination: { days: 8, tempRange: [20, 40] },
      vegetative: { days: 23, rainfallMin: 15 },
      flowering: { days: 15, rainfallMin: 20 },
      grain_fill: { days: 25, rainfallMin: 10 },
      maturity: { days: 19, rainfallMax: 2 },
    },
  },
  {
    name: 'cocoa',
    displayName: 'Cocoa',
    minTemperatureC: 18,
    maxTemperatureC: 32,
    preferredTemperatureC: 27,
    rainfallMinMm: 1200,
    rainfallMaxMm: 2500,
    waterSensitivity: 'high',
    windSensitivity: 'low',
    humidityMinPercent: 70,
    humidityMaxPercent: 90,
    germinationConditions: { minSoilTempC: 18, optimalMoisturePercent: 70 },
    growthStageRequirements: {
      nursery: { days: 120, tempRange: [18, 32] },
      juvenile: { days: 975, rainfallMin: 120 },
      bearing: { days: 365, rainfallMin: 120 },
    },
  },
  {
    name: 'rubber',
    displayName: 'Rubber',
    minTemperatureC: 18,
    maxTemperatureC: 35,
    preferredTemperatureC: 28,
    rainfallMinMm: 1200,
    rainfallMaxMm: 3000,
    waterSensitivity: 'high',
    windSensitivity: 'low',
    humidityMinPercent: 70,
    humidityMaxPercent: 90,
    germinationConditions: { minSoilTempC: 20, optimalMoisturePercent: 70 },
    growthStageRequirements: {
      nursery: { days: 90, tempRange: [20, 35] },
      immature: { days: 1735, rainfallMin: 120 },
      tapping: { days: 365, rainfallMin: 120 },
    },
  },
  {
    name: 'cashew',
    displayName: 'Cashew',
    minTemperatureC: 20,
    maxTemperatureC: 35,
    preferredTemperatureC: 28,
    rainfallMinMm: 800,
    rainfallMaxMm: 2000,
    waterSensitivity: 'moderate',
    windSensitivity: 'low',
    humidityMinPercent: 50,
    humidityMaxPercent: 80,
    germinationConditions: { minSoilTempC: 20, optimalMoisturePercent: 50 },
    growthStageRequirements: {
      nursery: { days: 120, tempRange: [20, 35] },
      juvenile: { days: 1340, rainfallMin: 80 },
      bearing: { days: 1095, rainfallMin: 80 },
    },
  },
] as const;

// =============================================================================
// Agricultural Rules
// =============================================================================

const RULE_DATA = [
  {
    name: 'Heavy Rainfall Alert',
    description: 'Detects heavy rainfall events that may cause waterlogging, crop damage, or soil erosion.',
    category: 'rainfall',
    crops: null, // applies to all
    regions: null,
    conditions: {
      type: 'heavy_rainfall',
      thresholdMm: 50, // daily rainfall threshold
      consecutiveDays: 2,
      severity_thresholds: {
        moderate: 50,
        severe: 80,
        extreme: 120,
      },
    },
    recommendation: 'Heavy rainfall expected. Ensure field drainage is clear. Avoid chemical application. Protect harvested crops from moisture.',
    severity: 'high',
    enabled: true,
  },
  {
    name: 'Dry Spell Detection',
    description: 'Identifies extended periods without significant rainfall that may stress crops.',
    category: 'rainfall',
    crops: null,
    regions: null,
    conditions: {
      type: 'dry_spell',
      minDaysNoRain: 7,
      maxDailyRainMm: 2.5,
      severity_thresholds: {
        moderate: 7,
        severe: 14,
        extreme: 21,
      },
    },
    recommendation: 'Dry spell detected. Consider supplementary irrigation if available. Mulch around plants to conserve soil moisture.',
    severity: 'medium',
    enabled: true,
  },
  {
    name: 'High Temperature Stress',
    description: 'Alerts when temperatures exceed crop-specific heat thresholds.',
    category: 'temperature',
    crops: null,
    regions: null,
    conditions: {
      type: 'high_temperature',
      excessDegreesC: 5, // above crop max
      durationDays: 3,
      severity_thresholds: {
        moderate: 5,
        severe: 8,
        extreme: 12,
      },
    },
    recommendation: 'High temperatures may cause heat stress. Ensure adequate irrigation. Provide shade for seedlings where possible.',
    severity: 'high',
    enabled: true,
  },
  {
    name: 'Strong Wind Advisory',
    description: 'Detects strong wind conditions that may damage crops or affect spraying operations.',
    category: 'wind',
    crops: null,
    regions: null,
    conditions: {
      type: 'strong_wind',
      thresholdKmh: 40,
      gustThresholdKmh: 60,
      severity_thresholds: {
        moderate: 40,
        severe: 60,
        extreme: 80,
      },
    },
    recommendation: 'Strong winds expected. Avoid spraying pesticides. Secure young plants and stakes. Postpone harvest if wind is extreme.',
    severity: 'medium',
    enabled: true,
  },
  {
    name: 'Excessive Humidity Risk',
    description: 'Flags high humidity conditions that increase risk of fungal diseases.',
    category: 'humidity',
    crops: null,
    regions: null,
    conditions: {
      type: 'excessive_humidity',
      thresholdPercent: 85,
      durationDays: 3,
      severity_thresholds: {
        moderate: 85,
        severe: 90,
        extreme: 95,
      },
    },
    recommendation: 'High humidity increases fungal disease risk. Monitor crops for signs of blight, mildew, or rust. Improve air circulation where possible.',
    severity: 'medium',
    enabled: true,
  },
  {
    name: 'Flood Risk Assessment',
    description: 'Estimates flood risk based on cumulative rainfall intensity.',
    category: 'flood',
    crops: null,
    regions: null,
    conditions: {
      type: 'flood_risk',
      cumulativeRainfallMm3Days: 100,
      intensityMmPerHour: 20,
      severity_thresholds: {
        moderate: 100,
        severe: 150,
        extreme: 200,
      },
    },
    recommendation: 'Elevated flood risk. Move livestock and equipment to higher ground. Avoid low-lying fields. Prepare for potential crop loss in flood-prone areas.',
    severity: 'high',
    enabled: true,
  },
  {
    name: 'Planting Window Assessment',
    description: 'Evaluates whether current conditions are suitable for planting specific crops.',
    category: 'planting',
    crops: null,
    regions: null,
    conditions: {
      type: 'planting_window',
      requiresConsecutiveRainDays: 3,
      minRainfallMm: 20,
      soilMoistureMinPercent: 40,
    },
    recommendation: 'Current conditions may be suitable for planting. Verify soil moisture at 10cm depth before sowing.',
    severity: 'low',
    enabled: true,
  },
  {
    name: 'Frost Risk',
    description: 'Detects conditions where frost may occur (rare in Nigeria but possible in northern regions).',
    category: 'temperature',
    crops: null,
    regions: ['NG-NI', 'NG-SO', 'NG-KE', 'NG-ZA', 'NG-BO', 'NG-YO'],
    conditions: {
      type: 'frost_risk',
      minTempThresholdC: 5,
      clearSkyRequired: true,
      windSpeedMaxKmh: 10,
    },
    recommendation: 'Frost risk in the coming nights. Cover sensitive crops. Avoid irrigation in the evening.',
    severity: 'high',
    enabled: true,
  },
  {
    name: 'Cassava Waterlogging Risk',
    description: 'Specific rule for cassava sensitivity to waterlogged conditions.',
    category: 'rainfall',
    crops: ['cassava'],
    regions: null,
    conditions: {
      type: 'waterlogging',
      cumulativeRainfallMm3Days: 80,
      drainageNote: 'Cassava roots rot in standing water for >48 hours',
    },
    recommendation: 'Waterlogging risk for cassava. Clear drainage channels immediately. Mound planting recommended in low-lying areas.',
    severity: 'high',
    enabled: true,
  },
  {
    name: 'Maize Flowering Heat Stress',
    description: 'Detects heat stress during the critical maize flowering period.',
    category: 'temperature',
    crops: ['maize'],
    regions: null,
    conditions: {
      type: 'heat_stress_flowering',
      maxTempThresholdC: 35,
      minTempThresholdC: 13,
      criticalPeriod: 'flowering',
    },
    recommendation: 'Heat stress during maize flowering may reduce grain set. Ensure adequate moisture. Consider early-maturing varieties for next season.',
    severity: 'high',
    enabled: true,
  },
  {
    name: 'Rice Water Stress',
    description: 'Monitors water availability for rice paddies during critical growth stages.',
    category: 'rainfall',
    crops: ['rice'],
    regions: null,
    conditions: {
      type: 'water_stress',
      dailyEvapotranspirationMm: 5,
      rainfallDeficitMm: 10,
      criticalStages: ['vegetative', 'reproductive'],
    },
    recommendation: 'Rice paddy water levels may be dropping. Maintain standing water depth of 5-10cm during vegetative and reproductive stages.',
    severity: 'medium',
    enabled: true,
  },
  {
    name: 'Northern Guinea Savanna Season Onset',
    description: 'Detects the onset of the rainy season in the Northern Guinea Savanna zone.',
    category: 'planting',
    crops: ['maize', 'sorghum', 'millet', 'cowpea', 'groundnut', 'soybean', 'cotton'],
    regions: ['NG-KA', 'NG-TO', 'NG-BA', 'NG-AD', 'NG-GE', 'NG-JI', 'NG-KW', 'NG-BO', 'NG-YO', 'NG-ZA', 'NG-SO'],
    conditions: {
      type: 'season_onset',
      consecutiveRainDays: 3,
      totalRainfallMm: 20,
      dateRange: { startMonth: 5, startDay: 15, endMonth: 7, endDay: 15 },
    },
    recommendation: 'Rainy season onset detected. Prepare fields and begin planting within the next 2 weeks for optimal yields.',
    severity: 'low',
    enabled: true,
  },
] as const;

// =============================================================================
// Nigerian Locations — All 36 States + FCT
// =============================================================================

const NIGERIAN_LOCATIONS = [
  { name: 'Abia', nameLower: 'abia', state: 'Abia', latitude: 5.1, longitude: 7.5, locationType: 'state' },
  { name: 'Adamawa', nameLower: 'adamawa', state: 'Adamawa', latitude: 9.3, longitude: 12.4, locationType: 'state' },
  { name: 'Akwa Ibom', nameLower: 'akwa ibom', state: 'Akwa Ibom', latitude: 5.0, longitude: 7.9, locationType: 'state' },
  { name: 'Anambra', nameLower: 'anambra', state: 'Anambra', latitude: 6.2, longitude: 6.9, locationType: 'state' },
  { name: 'Bauchi', nameLower: 'bauchi', state: 'Bauchi', latitude: 10.3, longitude: 9.8, locationType: 'state' },
  { name: 'Bayelsa', nameLower: 'bayelsa', state: 'Bayelsa', latitude: 6.3, longitude: 4.7, locationType: 'state' },
  { name: 'Benue', nameLower: 'benue', state: 'Benue', latitude: 7.7, longitude: 8.5, locationType: 'state' },
  { name: 'Borno', nameLower: 'borno', state: 'Borno', latitude: 11.8, longitude: 13.2, locationType: 'state' },
  { name: 'Cross River', nameLower: 'cross river', state: 'Cross River', latitude: 5.9, longitude: 8.3, locationType: 'state' },
  { name: 'Delta', nameLower: 'delta', state: 'Delta', latitude: 5.5, longitude: 5.7, locationType: 'state' },
  { name: 'Ebonyi', nameLower: 'ebonyi', state: 'Ebonyi', latitude: 6.3, longitude: 8.0, locationType: 'state' },
  { name: 'Edo', nameLower: 'edo', state: 'Edo', latitude: 6.3, longitude: 5.6, locationType: 'state' },
  { name: 'Ekiti', nameLower: 'ekiti', state: 'Ekiti', latitude: 7.6, longitude: 5.2, locationType: 'state' },
  { name: 'Enugu', nameLower: 'enugu', state: 'Enugu', latitude: 6.4, longitude: 7.5, locationType: 'state' },
  { name: 'FCT Abuja', nameLower: 'fct abuja', state: 'FCT', latitude: 9.1, longitude: 7.5, locationType: 'state' },
  { name: 'Gombe', nameLower: 'gombe', state: 'Gombe', latitude: 10.3, longitude: 11.2, locationType: 'state' },
  { name: 'Imo', nameLower: 'imo', state: 'Imo', latitude: 5.5, longitude: 7.0, locationType: 'state' },
  { name: 'Jigawa', nameLower: 'jigawa', state: 'Jigawa', latitude: 12.2, longitude: 9.3, locationType: 'state' },
  { name: 'Kaduna', nameLower: 'kaduna', state: 'Kaduna', latitude: 10.5, longitude: 7.4, locationType: 'state' },
  { name: 'Kano', nameLower: 'kano', state: 'Kano', latitude: 12.0, longitude: 8.5, locationType: 'state' },
  { name: 'Katsina', nameLower: 'katsina', state: 'Katsina', latitude: 12.9, longitude: 7.6, locationType: 'state' },
  { name: 'Kebbi', nameLower: 'kebbi', state: 'Kebbi', latitude: 12.4, longitude: 4.2, locationType: 'state' },
  { name: 'Kogi', nameLower: 'kogi', state: 'Kogi', latitude: 7.8, longitude: 6.7, locationType: 'state' },
  { name: 'Kwara', nameLower: 'kwara', state: 'Kwara', latitude: 8.5, longitude: 4.6, locationType: 'state' },
  { name: 'Lagos', nameLower: 'lagos', state: 'Lagos', latitude: 6.5, longitude: 3.4, locationType: 'state' },
  { name: 'Nasarawa', nameLower: 'nasarawa', state: 'Nasarawa', latitude: 8.3, longitude: 8.5, locationType: 'state' },
  { name: 'Niger', nameLower: 'niger', state: 'Niger', latitude: 9.6, longitude: 6.6, locationType: 'state' },
  { name: 'Ogun', nameLower: 'ogun', state: 'Ogun', latitude: 7.2, longitude: 3.3, locationType: 'state' },
  { name: 'Ondo', nameLower: 'ondo', state: 'Ondo', latitude: 7.3, longitude: 5.2, locationType: 'state' },
  { name: 'Osun', nameLower: 'osun', state: 'Osun', latitude: 7.6, longitude: 4.6, locationType: 'state' },
  { name: 'Oyo', nameLower: 'oyo', state: 'Oyo', latitude: 8.0, longitude: 4.0, locationType: 'state' },
  { name: 'Plateau', nameLower: 'plateau', state: 'Plateau', latitude: 9.9, longitude: 8.9, locationType: 'state' },
  { name: 'Rivers', nameLower: 'rivers', state: 'Rivers', latitude: 4.8, longitude: 7.0, locationType: 'state' },
  { name: 'Sokoto', nameLower: 'sokoto', state: 'Sokoto', latitude: 13.1, longitude: 5.2, locationType: 'state' },
  { name: 'Taraba', nameLower: 'taraba', state: 'Taraba', latitude: 7.9, longitude: 10.8, locationType: 'state' },
  { name: 'Yobe', nameLower: 'yobe', state: 'Yobe', latitude: 12.3, longitude: 11.0, locationType: 'state' },
  { name: 'Zamfara', nameLower: 'zamfara', state: 'Zamfara', latitude: 12.2, longitude: 6.7, locationType: 'state' },
];

// =============================================================================
// Seed Runner
// =============================================================================

async function seed() {
  log.info('🌱 Starting database seed...');

  // 1. Seed crop profiles
  log.info('  → Seeding crop profiles...');
  for (const crop of CROP_DATA) {
    await db
      .insert(cropProfiles)
      .values(crop)
      .onConflictDoNothing({ target: cropProfiles.name });
  }
  log.info(`  ✅ ${CROP_DATA.length} crop profiles seeded`);

  // 2. Seed agricultural rules
  log.info('  → Seeding agricultural rules...');
  for (const rule of RULE_DATA) {
    await db
      .insert(agriculturalRules)
      .values(rule)
      .onConflictDoNothing({ target: agriculturalRules.name });
  }
  log.info(`  ✅ ${RULE_DATA.length} agricultural rules seeded`);

  // 3. Seed Nigerian locations
  log.info('  → Seeding Nigerian locations...');
  for (const loc of NIGERIAN_LOCATIONS) {
    await db
      .insert(locations)
      .values(loc)
      .onConflictDoNothing({ target: locations.nameLower });
  }
  log.info(`  ✅ ${NIGERIAN_LOCATIONS.length} Nigerian locations seeded`);

  log.info('🎉 Seed completed successfully!');
}

seed()
  .catch((err) => {
    log.error(err, 'Seed failed');
    process.exit(1);
  })
  .finally(async () => {
    process.exit(0);
  });
