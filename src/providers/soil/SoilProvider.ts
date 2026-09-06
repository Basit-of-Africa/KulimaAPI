/**
 * Soil Provider Interface
 *
 * Provides soil characteristics for agricultural decision-making.
 */

export interface SoilProfile {
  latitude: number;
  longitude: number;
  /** Soil type (e.g., "sandy loam", "clay", "loam") */
  soilType: string;
  /** Soil texture class */
  texture: string;
  /** pH level (0-14) */
  ph: number;
  /** Organic carbon content (g/kg) */
  organicCarbon: number;
  /** Nitrogen content (g/kg) */
  nitrogen: number;
  /** Phosphorus content (mg/kg) */
  phosphorus: number;
  /** Potassium content (cmol/kg) */
  potassium: number;
  /** Cation exchange capacity (cmol/kg) */
  cec: number;
  /** Drainage class */
  drainage: 'well_drained' | 'moderately_drained' | 'poorly_drained' | 'very_poorly_drained';
  /** Depth to water table (cm) */
  waterTableDepth?: number;
  source: string;
  retrievedAt: string;
}

export interface SoilCapability {
  latitude: number;
  longitude: number;
  /** Overall suitability rating */
  suitability: 'highly_suitable' | 'suitable' | 'moderately_suitable' | 'marginally_suitable' | 'unsuitable';
  /** Score 0-100 */
  score: number;
  /** Crops most suited to this soil */
  bestCrops: string[];
  /** Limiting factors */
  limitations: string[];
  /** Recommendations */
  recommendations: string[];
  source: string;
  retrievedAt: string;
}

/**
 * Soil Provider Interface
 */
export interface SoilProvider {
  name: string;
  isAvailable(): boolean;

  /**
   * Get detailed soil profile for a location.
   */
  getSoilProfile(latitude: number, longitude: number): Promise<SoilProfile>;

  /**
   * Get agricultural soil capability assessment.
   */
  getSoilCapability(latitude: number, longitude: number): Promise<SoilCapability>;
}
