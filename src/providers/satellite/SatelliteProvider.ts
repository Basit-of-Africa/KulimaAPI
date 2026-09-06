/**
 * Satellite Provider Interface
 *
 * Provides vegetation indices, soil moisture, and land cover data
 * from satellite imagery.
 */

export interface NdviData {
  latitude: number;
  longitude: number;
  date: string;
  ndvi: number; // -1 to 1
  cloudCover: number; // 0-100%
  source: string;
  retrievedAt: string;
}

export interface SoilMoistureData {
  latitude: number;
  longitude: number;
  date: string;
  soilMoisturePercent: number; // 0-100%
  depth: string; // e.g., "0-5cm", "5-25cm"
  source: string;
  retrievedAt: string;
}

export interface LandCoverData {
  latitude: number;
  longitude: number;
  classification: string; // e.g., "cropland", "forest", "grassland", "water", "urban"
  confidence: number; // 0-1
  source: string;
  retrievedAt: string;
}

export interface VegetationHealth {
  latitude: number;
  longitude: number;
  date: string;
  ndvi: number;
  status: 'healthy' | 'stressed' | 'severely_stressed' | 'no_vegetation';
  description: string;
  comparisonToAverage?: number; // deviation from historical average NDVI
  source: string;
  retrievedAt: string;
}

/**
 * Satellite Provider Interface
 *
 * All implementations must provide NDVI data at minimum.
 * Soil moisture and land cover are optional enhancements.
 */
export interface SatelliteProvider {
  name: string;
  isAvailable(): boolean;

  /**
   * Get NDVI (Normalized Difference Vegetation Index) for a location.
   */
  getNdvi(latitude: number, longitude: number, date?: string): Promise<NdviData>;

  /**
   * Get soil moisture from satellite data.
   */
  getSoilMoisture?(
    latitude: number,
    longitude: number,
    date?: string,
  ): Promise<SoilMoistureData>;

  /**
   * Get land cover classification.
   */
  getLandCover?(latitude: number, longitude: number): Promise<LandCoverData>;

  /**
   * Get vegetation health assessment.
   */
  getVegetationHealth(latitude: number, longitude: number, date?: string): Promise<VegetationHealth>;
}
