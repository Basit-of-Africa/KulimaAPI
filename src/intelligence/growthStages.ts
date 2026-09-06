/**
 * Crop Growth Stage Definitions
 *
 * Each crop has an ordered sequence of growth stages with:
 * - Duration (days or GDD range)
 * - Temperature thresholds
 * - Rainfall requirements
 * - Risk factors
 * - Recommendations
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GrowthStage {
  name: string;
  displayName: string;
  order: number;
  /** Minimum days since planting */
  minDays: number;
  /** Maximum days since planting */
  maxDays: number;
  /** Growing Degree Day range (base temp 10°C) */
  gddRange: { min: number; max: number };
  /** Temperature range (°C) for this stage */
  temperatureRange: { min: number; max: number; optimal: number };
  /** Daily rainfall needs (mm/day) */
  rainfallNeed: { min: number; max: number };
  /** Duration of critical water period in days */
  criticalWaterDays: number;
  /** Risk factors specific to this stage */
  risks: StageRisk[];
  /** Recommended actions */
  recommendations: string[];
  /** Whether this is a critical period for the crop */
  isCritical: boolean;
}

export interface StageRisk {
  type: 'drought' | 'flood' | 'heat' | 'cold' | 'wind' | 'pest' | 'disease';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  triggerConditions: string;
}

export interface CropGrowthProfile {
  cropName: string;
  displayName: string;
  /** Base temperature for GDD calculation */
  baseTemperature: number;
  /** Total GDD to reach maturity */
  totalGdd: number;
  /** Total days to maturity (approximate) */
  totalDays: number;
  /** Growing stages in order */
  stages: GrowthStage[];
  /** Optimal planting months (1-12) */
  optimalPlantingMonths: number[];
  /** Minimum rainfall season length (days) */
  minRainfallSeason: number;
}

// ─── Growth Stage Definitions ────────────────────────────────────────────────

export const MAIZE_GROWTH: CropGrowthProfile = {
  cropName: 'maize',
  displayName: 'Maize (Corn)',
  baseTemperature: 10,
  totalGdd: 2700,
  totalDays: 120,
  optimalPlantingMonths: [4, 5, 6, 7],
  minRainfallSeason: 90,
  stages: [
    {
      name: 'emergence',
      displayName: 'Emergence',
      order: 1,
      minDays: 0,
      maxDays: 10,
      gddRange: { min: 0, max: 120 },
      temperatureRange: { min: 10, max: 35, optimal: 25 },
      rainfallNeed: { min: 0, max: 5 },
      criticalWaterDays: 0,
      risks: [
        { type: 'drought', severity: 'high', description: 'Poor germination', triggerConditions: 'No rain for 5+ days after planting' },
        { type: 'cold', severity: 'medium', description: 'Delayed emergence', triggerConditions: 'Soil temp below 10°C' },
      ],
      recommendations: ['Ensure adequate soil moisture at planting', 'Plant at 5cm depth in moist soil'],
      isCritical: false,
    },
    {
      name: 'vegetative',
      displayName: 'Vegetative Growth',
      order: 2,
      minDays: 10,
      maxDays: 45,
      gddRange: { min: 120, max: 800 },
      temperatureRange: { min: 15, max: 35, optimal: 27 },
      rainfallNeed: { min: 3, max: 8 },
      criticalWaterDays: 0,
      risks: [
        { type: 'drought', severity: 'medium', description: 'Stunted growth', triggerConditions: 'Rainfall deficit > 30mm over 2 weeks' },
        { type: 'pest', severity: 'medium', description: 'Fall armyworm damage', triggerConditions: 'Warm humid conditions' },
      ],
      recommendations: ['Apply nitrogen fertiliser at 4-6 weeks', 'Monitor for fall armyworm'],
      isCritical: false,
    },
    {
      name: 'tasseling',
      displayName: 'Tasseling & Silking',
      order: 3,
      minDays: 45,
      maxDays: 65,
      gddRange: { min: 800, max: 1400 },
      temperatureRange: { min: 15, max: 35, optimal: 25 },
      rainfallNeed: { min: 5, max: 10 },
      criticalWaterDays: 21,
      risks: [
        { type: 'drought', severity: 'critical', description: 'Poor pollination, kernel abortion', triggerConditions: 'No rain for 7+ days during tasseling' },
        { type: 'heat', severity: 'high', description: 'Pollen desiccation', triggerConditions: 'Temp > 35°C for 3+ consecutive days' },
        { type: 'wind', severity: 'medium', description: 'Lodging risk', triggerConditions: 'Wind > 40km/h' },
      ],
      recommendations: ['Ensure continuous water supply', 'Critical period — drought now causes maximum yield loss', 'Avoid heavy nitrogen application'],
      isCritical: true,
    },
    {
      name: 'grain_fill',
      displayName: 'Grain Fill',
      order: 4,
      minDays: 65,
      maxDays: 100,
      gddRange: { min: 1400, max: 2300 },
      temperatureRange: { min: 15, max: 33, optimal: 22 },
      rainfallNeed: { min: 3, max: 7 },
      criticalWaterDays: 0,
      risks: [
        { type: 'drought', severity: 'high', description: 'Shrunken kernels', triggerConditions: 'Rainfall deficit > 20mm over 2 weeks' },
        { type: 'disease', severity: 'medium', description: 'Ear rots', triggerConditions: 'High humidity (>85%) for 5+ days' },
      ],
      recommendations: ['Maintain soil moisture', 'Monitor for ear rots and aflatoxin'],
      isCritical: false,
    },
    {
      name: 'maturity',
      displayName: 'Maturity & Harvest',
      order: 5,
      minDays: 100,
      maxDays: 120,
      gddRange: { min: 2300, max: 2700 },
      temperatureRange: { min: 10, max: 35, optimal: 20 },
      rainfallNeed: { min: 0, max: 2 },
      criticalWaterDays: 0,
      risks: [
        { type: 'flood', severity: 'high', description: 'Grain quality loss', triggerConditions: 'Heavy rain during harvest' },
        { type: 'pest', severity: 'medium', description: 'Stored grain pests', triggerConditions: 'Delay in harvesting after maturity' },
      ],
      recommendations: ['Harvest when kernels are hard', 'Dry to 13% moisture before storage'],
      isCritical: false,
    },
  ],
};

export const RICE_GROWTH: CropGrowthProfile = {
  cropName: 'rice',
  displayName: 'Rice',
  baseTemperature: 10,
  totalGdd: 2200,
  totalDays: 130,
  optimalPlantingMonths: [5, 6, 7],
  minRainfallSeason: 100,
  stages: [
    {
      name: 'germination',
      displayName: 'Germination & Stand Establishment',
      order: 1,
      minDays: 0,
      maxDays: 10,
      gddRange: { min: 0, max: 100 },
      temperatureRange: { min: 15, max: 35, optimal: 30 },
      rainfallNeed: { min: 5, max: 10 },
      criticalWaterDays: 10,
      risks: [
        { type: 'flood', severity: 'high', description: 'Seed washout', triggerConditions: 'Heavy rain immediately after sowing' },
        { type: 'drought', severity: 'critical', description: 'Complete germination failure', triggerConditions: 'Paddy dries out completely' },
      ],
      recommendations: ['Maintain 2-5cm standing water', 'Use pre-germinated seed'],
      isCritical: true,
    },
    {
      name: 'vegetative',
      displayName: 'Vegetative (Tillering)',
      order: 2,
      minDays: 10,
      maxDays: 50,
      gddRange: { min: 100, max: 700 },
      temperatureRange: { min: 20, max: 33, optimal: 28 },
      rainfallNeed: { min: 5, max: 10 },
      criticalWaterDays: 0,
      risks: [
        { type: 'drought', severity: 'high', description: 'Reduced tillering', triggerConditions: 'Water level drops below soil surface for 3+ days' },
        { type: 'pest', severity: 'medium', description: 'Stem borer damage', triggerConditions: 'Warm humid conditions' },
      ],
      recommendations: ['Maintain 5cm standing water', 'Apply nitrogen at tillering'],
      isCritical: false,
    },
    {
      name: 'reproductive',
      displayName: 'Reproductive (Panicle Initiation)',
      order: 3,
      minDays: 50,
      maxDays: 80,
      gddRange: { min: 700, max: 1300 },
      temperatureRange: { min: 20, max: 32, optimal: 26 },
      rainfallNeed: { min: 5, max: 10 },
      criticalWaterDays: 30,
      risks: [
        { type: 'drought', severity: 'critical', description: 'Panicle sterility', triggerConditions: 'Water stress during panicle initiation' },
        { type: 'heat', severity: 'high', description: 'Spikelet sterility', triggerConditions: 'Max temp > 35°C during flowering' },
      ],
      recommendations: ['Most critical period — maintain 10cm water depth', 'Apply second nitrogen dose'],
      isCritical: true,
    },
    {
      name: 'ripening',
      displayName: 'Ripening & Harvest',
      order: 4,
      minDays: 80,
      maxDays: 130,
      gddRange: { min: 1300, max: 2200 },
      temperatureRange: { min: 15, max: 32, optimal: 25 },
      rainfallNeed: { min: 0, max: 3 },
      criticalWaterDays: 0,
      risks: [
        { type: 'flood', severity: 'high', description: 'Grain quality loss', triggerConditions: 'Flooding during ripening' },
        { type: 'disease', severity: 'medium', description: 'Bacterial leaf blight', triggerConditions: 'Warm humid conditions with standing water' },
      ],
      recommendations: ['Drain field 2 weeks before harvest', 'Harvest when 80% of panicles turn golden'],
      isCritical: false,
    },
  ],
};

export const CASSAVA_GROWTH: CropGrowthProfile = {
  cropName: 'cassava',
  displayName: 'Cassava',
  baseTemperature: 15,
  totalGdd: 5000,
  totalDays: 360,
  optimalPlantingMonths: [3, 4, 5, 6],
  minRainfallSeason: 120,
  stages: [
    {
      name: 'establishment',
      displayName: 'Stem Cutting Establishment',
      order: 1,
      minDays: 0,
      maxDays: 30,
      gddRange: { min: 0, max: 300 },
      temperatureRange: { min: 21, max: 35, optimal: 28 },
      rainfallNeed: { min: 3, max: 8 },
      criticalWaterDays: 14,
      risks: [
        { type: 'drought', severity: 'critical', description: 'Stem cutting death', triggerConditions: 'No rain for 14+ days after planting' },
        { type: 'flood', severity: 'high', description: 'Rotting of stem cuttings', triggerConditions: 'Waterlogged soil for 5+ days' },
      ],
      recommendations: ['Plant during early rains', 'Ensure moist (not waterlogged) soil'],
      isCritical: true,
    },
    {
      name: 'canopy_development',
      displayName: 'Canopy Development',
      order: 2,
      minDays: 30,
      maxDays: 120,
      gddRange: { min: 300, max: 1500 },
      temperatureRange: { min: 20, max: 35, optimal: 28 },
      rainfallNeed: { min: 3, max: 8 },
      criticalWaterDays: 0,
      risks: [
        { type: 'drought', severity: 'medium', description: 'Reduced canopy growth', triggerConditions: 'Extended dry period > 21 days' },
        { type: 'pest', severity: 'medium', description: 'Cassava green mite', triggerConditions: 'Dry conditions' },
      ],
      recommendations: ['Weed management', 'Apply phosphorus fertiliser'],
      isCritical: false,
    },
    {
      name: 'bulking',
      displayName: 'Root Bulking',
      order: 3,
      minDays: 120,
      maxDays: 270,
      gddRange: { min: 1500, max: 3500 },
      temperatureRange: { min: 18, max: 35, optimal: 25 },
      rainfallNeed: { min: 2, max: 6 },
      criticalWaterDays: 0,
      risks: [
        { type: 'drought', severity: 'high', description: 'Reduced root yield', triggerConditions: 'Rainfall deficit > 50mm over 30 days' },
        { type: 'disease', severity: 'high', description: 'Cassava mosaic disease', triggerConditions: 'Whitefly infestation' },
      ],
      recommendations: ['Monitor for cassava mosaic disease', 'Supplemental irrigation if available'],
      isCritical: false,
    },
    {
      name: 'maturity',
      displayName: 'Maturity & Harvest',
      order: 4,
      minDays: 270,
      maxDays: 360,
      gddRange: { min: 3500, max: 5000 },
      temperatureRange: { min: 15, max: 35, optimal: 22 },
      rainfallNeed: { min: 0, max: 3 },
      criticalWaterDays: 0,
      risks: [
        { type: 'drought', severity: 'low', description: 'Easier harvesting', triggerConditions: 'Dry conditions aid harvest' },
      ],
      recommendations: ['Harvest when leaves begin yellowing', 'Can leave in ground and harvest as needed'],
      isCritical: false,
    },
  ],
};

export const SORGHUM_GROWTH: CropGrowthProfile = {
  cropName: 'sorghum',
  displayName: 'Sorghum',
  baseTemperature: 8,
  totalGdd: 2300,
  totalDays: 120,
  optimalPlantingMonths: [6, 7],
  minRainfallSeason: 60,
  stages: [
    {
      name: 'emergence',
      displayName: 'Emergence',
      order: 1,
      minDays: 0,
      maxDays: 10,
      gddRange: { min: 0, max: 100 },
      temperatureRange: { min: 8, max: 38, optimal: 30 },
      rainfallNeed: { min: 0, max: 5 },
      criticalWaterDays: 0,
      risks: [
        { type: 'drought', severity: 'high', description: 'Poor emergence', triggerConditions: 'Dry seedbed' },
      ],
      recommendations: ['Plant in moist soil', 'Cover seeds lightly'],
      isCritical: false,
    },
    {
      name: 'vegetative',
      displayName: 'Vegetative Growth',
      order: 2,
      minDays: 10,
      maxDays: 45,
      gddRange: { min: 100, max: 600 },
      temperatureRange: { min: 15, max: 38, optimal: 30 },
      rainfallNeed: { min: 2, max: 6 },
      criticalWaterDays: 0,
      risks: [
        { type: 'drought', severity: 'medium', description: 'Stunted growth', triggerConditions: 'Extended dry period' },
      ],
      recommendations: ['Weed control critical in first 6 weeks'],
      isCritical: false,
    },
    {
      name: 'flowering',
      displayName: 'Flowering & Grain Fill',
      order: 3,
      minDays: 45,
      maxDays: 80,
      gddRange: { min: 600, max: 1400 },
      temperatureRange: { min: 15, max: 38, optimal: 28 },
      rainfallNeed: { min: 3, max: 8 },
      criticalWaterDays: 21,
      risks: [
        { type: 'drought', severity: 'critical', description: 'Panicle blasting', triggerConditions: 'No rain during flowering' },
        { type: 'pest', severity: 'high', description: 'Bird damage to grain', triggerConditions: 'Grain filling stage' },
      ],
      recommendations: ['Critical water period — ensure moisture', 'Bird scaring may be needed'],
      isCritical: true,
    },
    {
      name: 'maturity',
      displayName: 'Maturity & Harvest',
      order: 4,
      minDays: 80,
      maxDays: 120,
      gddRange: { min: 1400, max: 2300 },
      temperatureRange: { min: 10, max: 38, optimal: 25 },
      rainfallNeed: { min: 0, max: 2 },
      criticalWaterDays: 0,
      risks: [
        { type: 'flood', severity: 'medium', description: 'Grain sprouting', triggerConditions: 'Rain at harvest' },
      ],
      recommendations: ['Harvest when grain is hard', 'Dry to 12% moisture'],
      isCritical: false,
    },
  ],
};

export const COWPEA_GROWTH: CropGrowthProfile = {
  cropName: 'cowpea',
  displayName: 'Cowpea',
  baseTemperature: 10,
  totalGdd: 1600,
  totalDays: 70,
  optimalPlantingMonths: [6, 7, 8],
  minRainfallSeason: 50,
  stages: [
    {
      name: 'emergence',
      displayName: 'Emergence',
      order: 1,
      minDays: 0,
      maxDays: 7,
      gddRange: { min: 0, max: 70 },
      temperatureRange: { min: 10, max: 35, optimal: 27 },
      rainfallNeed: { min: 0, max: 5 },
      criticalWaterDays: 0,
      risks: [
        { type: 'drought', severity: 'high', description: 'Poor stand', triggerConditions: 'Dry seedbed' },
      ],
      recommendations: ['Plant at 2-3cm depth in moist soil'],
      isCritical: false,
    },
    {
      name: 'vegetative',
      displayName: 'Vegetative & Flowering',
      order: 2,
      minDays: 7,
      maxDays: 35,
      gddRange: { min: 70, max: 600 },
      temperatureRange: { min: 15, max: 35, optimal: 27 },
      rainfallNeed: { min: 2, max: 6 },
      criticalWaterDays: 0,
      risks: [
        { type: 'pest', severity: 'high', description: 'Flower thrips', triggerConditions: 'Dry hot conditions' },
      ],
      recommendations: ['Monitor for flower thrips', 'Weed control'],
      isCritical: false,
    },
    {
      name: 'pod_fill',
      displayName: 'Pod Fill & Maturity',
      order: 3,
      minDays: 35,
      maxDays: 70,
      gddRange: { min: 600, max: 1600 },
      temperatureRange: { min: 15, max: 35, optimal: 25 },
      rainfallNeed: { min: 2, max: 5 },
      criticalWaterDays: 14,
      risks: [
        { type: 'drought', severity: 'critical', description: 'Pod abortion', triggerConditions: 'No rain during pod fill' },
        { type: 'disease', severity: 'medium', description: 'Anthracnose', triggerConditions: 'Warm humid conditions' },
      ],
      recommendations: ['Critical water period', 'Harvest when pods turn brown'],
      isCritical: true,
    },
  ],
};

export const GROUNDNUT_GROWTH: CropGrowthProfile = {
  cropName: 'groundnut',
  displayName: 'Groundnut (Peanut)',
  baseTemperature: 10,
  totalGdd: 2000,
  totalDays: 100,
  optimalPlantingMonths: [6, 7],
  minRainfallSeason: 60,
  stages: [
    {
      name: 'emergence',
      displayName: 'Emergence',
      order: 1,
      minDays: 0,
      maxDays: 10,
      gddRange: { min: 0, max: 100 },
      temperatureRange: { min: 10, max: 35, optimal: 27 },
      rainfallNeed: { min: 0, max: 5 },
      criticalWaterDays: 0,
      risks: [
        { type: 'drought', severity: 'high', description: 'Poor emergence', triggerConditions: 'Dry seedbed' },
      ],
      recommendations: ['Plant in moist sandy-loam soil', 'Inoculate seeds with rhizobium'],
      isCritical: false,
    },
    {
      name: 'vegetative',
      displayName: 'Vegetative Growth',
      order: 2,
      minDays: 10,
      maxDays: 35,
      gddRange: { min: 100, max: 500 },
      temperatureRange: { min: 15, max: 35, optimal: 27 },
      rainfallNeed: { min: 2, max: 6 },
      criticalWaterDays: 0,
      risks: [
        { type: 'pest', severity: 'medium', description: 'Aphid damage', triggerConditions: 'Cool dry conditions' },
      ],
      recommendations: ['Weed control critical', 'Monitor for aphids'],
      isCritical: false,
    },
    {
      name: 'pegging',
      displayName: 'Pegging & Pod Development',
      order: 3,
      minDays: 35,
      maxDays: 70,
      gddRange: { min: 500, max: 1200 },
      temperatureRange: { min: 18, max: 33, optimal: 25 },
      rainfallNeed: { min: 3, max: 8 },
      criticalWaterDays: 21,
      risks: [
        { type: 'drought', severity: 'critical', description: 'Peg desiccation', triggerConditions: 'Dry soil during pegging' },
        { type: 'disease', severity: 'medium', description: 'Early leaf spot', triggerConditions: 'Humid conditions' },
      ],
      recommendations: ['Critical water period — maintain soil moisture', 'Do not hoe after pegging begins'],
      isCritical: true,
    },
    {
      name: 'maturity',
      displayName: 'Maturity & Harvest',
      order: 4,
      minDays: 70,
      maxDays: 100,
      gddRange: { min: 1200, max: 2000 },
      temperatureRange: { min: 15, max: 35, optimal: 22 },
      rainfallNeed: { min: 0, max: 2 },
      criticalWaterDays: 0,
      risks: [
        { type: 'flood', severity: 'high', description: 'Pre-harvest sprouting', triggerConditions: 'Rain during maturity' },
      ],
      recommendations: ['Harvest when leaves yellow', 'Dry pods to < 9% moisture'],
      isCritical: false,
    },
  ],
};

export const YAM_GROWTH: CropGrowthProfile = {
  cropName: 'yam',
  displayName: 'Yam',
  baseTemperature: 15,
  totalGdd: 4500,
  totalDays: 270,
  optimalPlantingMonths: [3, 4, 5],
  minRainfallSeason: 120,
  stages: [
    {
      name: 'sprouting',
      displayName: 'Sprouting & Establishment',
      order: 1,
      minDays: 0,
      maxDays: 30,
      gddRange: { min: 0, max: 400 },
      temperatureRange: { min: 22, max: 35, optimal: 28 },
      rainfallNeed: { min: 3, max: 8 },
      criticalWaterDays: 14,
      risks: [
        { type: 'drought', severity: 'critical', description: 'Sprouting failure', triggerConditions: 'No rain for 14+ days' },
      ],
      recommendations: ['Plant setts in moist mounds', 'Ensure good soil contact'],
      isCritical: true,
    },
    {
      name: 'canopy',
      displayName: 'Canopy Development',
      order: 2,
      minDays: 30,
      maxDays: 90,
      gddRange: { min: 400, max: 1500 },
      temperatureRange: { min: 20, max: 35, optimal: 28 },
      rainfallNeed: { min: 3, max: 8 },
      criticalWaterDays: 0,
      risks: [
        { type: 'disease', severity: 'high', description: 'Yam mosaic virus', triggerConditions: 'Aphid vectors present' },
      ],
      recommendations: ['Stake vines at 60cm', 'Weed regularly'],
      isCritical: false,
    },
    {
      name: 'bulking',
      displayName: 'Tuber Bulking',
      order: 3,
      minDays: 90,
      maxDays: 210,
      gddRange: { min: 1500, max: 3500 },
      temperatureRange: { min: 18, max: 32, optimal: 25 },
      rainfallNeed: { min: 3, max: 8 },
      criticalWaterDays: 0,
      risks: [
        { type: 'drought', severity: 'high', description: 'Reduced tuber size', triggerConditions: 'Rainfall deficit > 40mm over 2 weeks' },
      ],
      recommendations: ['Mound up soil around base', 'Apply potash fertiliser'],
      isCritical: false,
    },
    {
      name: 'maturity',
      displayName: 'Maturity & Harvest',
      order: 4,
      minDays: 210,
      maxDays: 270,
      gddRange: { min: 3500, max: 4500 },
      temperatureRange: { min: 15, max: 32, optimal: 22 },
      rainfallNeed: { min: 0, max: 3 },
      criticalWaterDays: 0,
      risks: [
        { type: 'disease', severity: 'medium', description: 'Tuber rot in storage', triggerConditions: 'Harvesting wet tubers' },
      ],
      recommendations: ['Harvest after vine dies back', 'Cure tubers for 2-3 days before storage'],
      isCritical: false,
    },
  ],
};

// ─── Registry ────────────────────────────────────────────────────────────────

export const CROP_GROWTH_PROFILES: Record<string, CropGrowthProfile> = {
  maize: MAIZE_GROWTH,
  rice: RICE_GROWTH,
  cassava: CASSAVA_GROWTH,
  sorghum: SORGHUM_GROWTH,
  cowpea: COWPEA_GROWTH,
  groundnut: GROUNDNUT_GROWTH,
  yam: YAM_GROWTH,
};

export function getCropGrowthProfile(cropName: string): CropGrowthProfile | null {
  return CROP_GROWTH_PROFILES[cropName.toLowerCase()] || null;
}

export function getAllCropGrowthProfiles(): CropGrowthProfile[] {
  return Object.values(CROP_GROWTH_PROFILES);
}
