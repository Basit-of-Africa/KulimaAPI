/**
 * Controlled Environment Agriculture (CEA) Types
 *
 * Defines interfaces for greenhouse, hydroponic, vertical farm,
 * and shade house intelligence.
 */

// ─── Environment Profiles ──────────────────────────────────────────────────

export type EnvironmentType =
  | 'greenhouse'
  | 'shade_house'
  | 'hydroponic'
  | 'aeroponic'
  | 'vertical_farm'
  | 'screen_house';

export type CoverType = 'glass' | 'polycarbonate' | 'shade_net' | 'plastic_film' | 'mesh';
export type VentilationType = 'natural' | 'mechanical' | 'hybrid';
export type CoolingType = 'none' | 'pad_fan' | 'fog' | 'wet_wall' | 'evaporative';
export type HeatingType = 'none' | 'gas' | 'electric' | 'solar_thermal';
export type LightSource = 'LED' | 'HPS' | 'fluorescent' | 'none';
export type IrrigationType =
  | 'rain_fed'
  | 'drip'
  | 'sprinkler'
  | 'flood'
  | 'nft'
  | 'dwc'
  | 'aeroponic'
  | 'ebb_flow';
export type WaterSource = 'borehole' | 'municipal' | 'rainwater' | 'river' | 'well';

export interface EnvironmentInfrastructure {
  coverType: CoverType;
  coverOpacity?: number; // 0-1, for shade nets
  areaM2: number;
  heightM?: number;
  ventilationType: VentilationType;
  coolingType: CoolingType;
  heatingType: HeatingType;
  hasCO2Injection: boolean;
  hasDehumidifier: boolean;
  hasSupplementalLighting: boolean;
  lightSource?: LightSource;
  lightCapacityLux?: number;
  irrigationType: IrrigationType;
  hasRecirculation?: boolean;
  waterSource?: WaterSource;
  waterStorageLitres?: number;
  hasGenerator: boolean;
  generatorCapacityKVA?: number;
  hasSolarPanels: boolean;
  solarCapacityKW?: number;
  gridConnected: boolean;
}

export interface EnvironmentSensors {
  hasTemperature: boolean;
  hasHumidity: boolean;
  hasCO2: boolean;
  hasLightIntensity: boolean;
  hasSoilMoisture: boolean;
  hasSoilTemperature: boolean;
  hasEC: boolean;
  hasPH: boolean;
  hasWaterTemperature: boolean;
  hasWindSpeed: boolean;
}

export interface EnvironmentCrop {
  cropName: string;
  variety?: string;
  plantingDate: string;
  areaM2: number;
  density: number; // plants per m²
  growthStage: string;
  substrate?: string; // coco_coir, rockwool, clay_pebbles, perlite
  nutrientRecipe?: string;
}

export interface EnvironmentProfile {
  id: string;
  orgId: string;
  farmId?: string;
  name: string;
  type: EnvironmentType;
  latitude: number;
  longitude: number;
  altitude?: number;
  infrastructure: EnvironmentInfrastructure;
  sensors: EnvironmentSensors;
  crops: EnvironmentCrop[];
  status: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Environment Readings ───────────────────────────────────────────────────

export type ReadingSource = 'sensor' | 'manual' | 'estimated';

export interface EnvironmentReading {
  id: string;
  environmentId: string;
  timestamp: string;
  indoorTemperatureC?: number;
  indoorHumidityPercent?: number;
  indoorCO2Ppm?: number;
  indoorLightLux?: number;
  rootZoneTemperatureC?: number;
  soilMoisturePercent?: number;
  waterTemperatureC?: number;
  waterPH?: number;
  waterEC?: number;
  outdoorTemperatureC?: number;
  outdoorHumidityPercent?: number;
  outdoorWindSpeedKmh?: number;
  powerConsumptionKWh?: number;
  source: ReadingSource;
}

// ─── Control Actions ────────────────────────────────────────────────────────

export type ControlType =
  | 'ventilation'
  | 'cooling'
  | 'heating'
  | 'irrigation'
  | 'lighting'
  | 'co2'
  | 'fertigation';

export type TriggeredBy = 'manual' | 'automatic' | 'recommendation';

export interface ControlAction {
  id: string;
  environmentId: string;
  timestamp: string;
  controlType: ControlType;
  action: string;
  beforeState?: Record<string, any>;
  afterState?: Record<string, any>;
  triggeredBy: TriggeredBy;
  recommendationId?: string;
}

// ─── Nutrient Schedules (Hydroponics) ──────────────────────────────────────

export interface NutrientRecipe {
  name: string;
  ecTarget: number; // mS/cm
  phTarget: { min: number; max: number };
  macros: Record<string, number>; // N, P, K, Ca, Mg, S in ppm
  micros: Record<string, number>; // Fe, Mn, Zn, Cu, B, Mo in ppm
}

export interface IrrigationSchedule {
  frequency: string; // 'continuous', '3x_daily', 'daily'
  durationMinutes: number;
  drainPercentage?: number;
}

export interface NutrientSchedule {
  id: string;
  environmentId: string;
  cropName: string;
  growthStage: string;
  solution: NutrientRecipe;
  irrigationSchedule: IrrigationSchedule;
  validFrom: string;
  validUntil: string;
}

// ─── Control Setpoints ──────────────────────────────────────────────────────

export interface ControlSetpoints {
  temperature: { targetC: number; minC: number; maxC: number; nightMinC: number };
  humidity: { targetPercent: number; minPercent: number; maxPercent: number };
  co2: { targetPpm: number; minPpm: number; maxPpm: number };
  light: { targetLux: number; photoperiodHours: number };
  ventilation: { mode: VentilationType; speedPercent: number };
  cooling: { mode: CoolingType; active: boolean };
  heating: { mode: HeatingType; active: boolean };
  irrigation: { frequency: string; volumeLitresPerM2: number };
}

export interface Rationale {
  [key: string]: string;
}

// ─── CEA Intelligence Response ──────────────────────────────────────────────

export interface CEAControlRecommendation {
  controlType: ControlType;
  action: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
  expectedImpact: string;
  energyCostNGN?: number;
}

export interface CEAIntelligenceResponse {
  environment: {
    id: string;
    name: string;
    type: EnvironmentType;
    location: { latitude: number; longitude: number; altitude?: number };
  };
  outdoorConditions: {
    temperatureC: number;
    humidityPercent: number;
    windSpeedKmh: number;
    cloudCoverPercent: number;
    solarRadiationWm2: number;
  };
  indoorConditions: {
    temperatureC?: number;
    humidityPercent?: number;
    co2Ppm?: number;
    lightLux?: number;
    waterPH?: number;
    waterEC?: number;
  };
  controlRecommendations: CEAControlRecommendation[];
  energyBudget: EnergyBudget;
  yieldForecast?: YieldForecast;
  alerts: CEAAlert[];
  confidence: number;
  generatedAt: string;
}

export interface EnergyBudget {
  currentDailyKWh: number;
  projectedDailyKWh: number;
  costNGN: number;
  optimisationSavingsNGN: number;
  recommendations: string[];
}

export interface YieldForecast {
  crop: string;
  daysSincePlanting: number;
  growthStage: string;
  progressPercent: number;
  expectedYieldKgM2: number;
  confidence: number;
  trajectory: 'behind' | 'on_track' | 'ahead';
  daysToHarvest: number;
  riskFactors: string[];
}

export interface CEAAlert {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  recommendedAction: string;
}

// ─── CEA Rule Context ──────────────────────────────────────────────────────

export interface CEARuleContext {
  environment: EnvironmentProfile;
  latestReading?: EnvironmentReading;
  previousReadings: EnvironmentReading[];
  outdoorWeather?: {
    temperatureC: number;
    humidityPercent: number;
    windSpeedKmh: number;
    cloudCoverPercent: number;
    solarRadiationWm2: number;
  };
  energyRateNGNPerKWh: number;
}

export interface CEARuleOutcome {
  triggered: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  controlType: ControlType;
  title: string;
  description: string;
  recommendation: string;
  action: string;
  expectedImpact: string;
  confidence: number;
  evidence: Record<string, any>;
  energyCostNGN?: number;
}

// ─── Energy Rates (Nigerian context) ────────────────────────────────────────

export const ENERGY_RATES = {
  gridBandA: 240, // ₦/kWh — Band A
  gridBandB: 160, // ₦/kWh — Band B
  generator: 425, // ₦/kWh — diesel/gas
  solar: 75, // ₦/kWh — amortised
} as const;

// ─── Default Crop Optimal Ranges for CEA ────────────────────────────────────

export const CEA_CROP_OPTIMALS: Record<
  string,
  {
    temperature: { target: number; min: number; max: number; nightMin: number };
    humidity: { target: number; min: number; max: number };
    co2: { target: number; min: number; max: number };
    light: { targetLux: number; photoperiodHours: number };
    irrigationLitresPerM2: number;
  }
> = {
  tomato: {
    temperature: { target: 24, min: 15, max: 32, nightMin: 15 },
    humidity: { target: 65, min: 50, max: 80 },
    co2: { target: 800, min: 400, max: 1200 },
    light: { targetLux: 40000, photoperiodHours: 16 },
    irrigationLitresPerM2: 4.0,
  },
  pepper: {
    temperature: { target: 25, min: 18, max: 30, nightMin: 16 },
    humidity: { target: 60, min: 40, max: 75 },
    co2: { target: 800, min: 400, max: 1200 },
    light: { targetLux: 35000, photoperiodHours: 14 },
    irrigationLitresPerM2: 3.5,
  },
  cucumber: {
    temperature: { target: 24, min: 15, max: 30, nightMin: 15 },
    humidity: { target: 70, min: 60, max: 85 },
    co2: { target: 900, min: 400, max: 1500 },
    light: { targetLux: 45000, photoperiodHours: 16 },
    irrigationLitresPerM2: 5.0,
  },
  lettuce: {
    temperature: { target: 18, min: 7, max: 24, nightMin: 7 },
    humidity: { target: 60, min: 50, max: 70 },
    co2: { target: 800, min: 400, max: 1000 },
    light: { targetLux: 20000, photoperiodHours: 14 },
    irrigationLitresPerM2: 2.0,
  },
  strawberry: {
    temperature: { target: 20, min: 10, max: 26, nightMin: 8 },
    humidity: { target: 65, min: 50, max: 75 },
    co2: { target: 800, min: 400, max: 1000 },
    light: { targetLux: 30000, photoperiodHours: 16 },
    irrigationLitresPerM2: 2.5,
  },
  basil: {
    temperature: { target: 24, min: 18, max: 30, nightMin: 16 },
    humidity: { target: 60, min: 40, max: 70 },
    co2: { target: 800, min: 400, max: 1000 },
    light: { targetLux: 25000, photoperiodHours: 16 },
    irrigationLitresPerM2: 2.0,
  },
};
