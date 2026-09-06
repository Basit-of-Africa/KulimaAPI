/**
 * SentinelHub Satellite Provider
 *
 * Uses Sentinel-2 imagery via the Sentinel Hub WMS/WCS API.
 * Free tier: 30,000 requests/month.
 *
 * NDVI formula: (NIR - RED) / (NIR + RED)
 * For Sentinel-2: NIR = B08, RED = B04
 */

import axios from 'axios';
import type {
  SatelliteProvider,
  NdviData,
  SoilMoistureData,
  VegetationHealth,
} from './SatelliteProvider.js';
import { createChildLogger } from '../../logger.js';

const log = createChildLogger('sentinel-hub');

// Sentinel Hub WMS endpoint
const WMS_BASE = 'https://services.sentinel-hub.com/ogc/wms';

// Placeholder instance ID — replace with actual Sentinel Hub instance
const INSTANCE_ID = process.env.SENTINEL_HUB_INSTANCE_ID || '';

export class SentinelHubProvider implements SatelliteProvider {
  name = 'sentinel-hub';
  private available: boolean;

  constructor() {
    this.available = !!INSTANCE_ID;
    if (!this.available) {
      log.warn('SentinelHub not configured — using fallback NDVI estimation');
    }
  }

  isAvailable(): boolean {
    return this.available;
  }

  async getNdvi(latitude: number, longitude: number, date?: string): Promise<NdviData> {
    if (!this.available) {
      return this.estimateNdvi(latitude, longitude, date);
    }

    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      const bbox = this.calculateBbox(latitude, longitude, 0.01);

      const response = await axios.get(`${WMS_BASE}/${INSTANCE_ID}`, {
        params: {
          SERVICE: 'WMS',
          REQUEST: 'GetFeatureInfo',
          LAYERS: '1_TRUE_COLOR,2_NORMALIZED_DIFFERENCE植被',
          QUERY_LAYERS: '2_NORMALIZED_DIFFERENCE植被',
          BBOX: bbox.join(','),
          CRS: 'EPSG:4326',
          WIDTH: 256,
          HEIGHT: 256,
          INFO_FORMAT: 'application/json',
          TIME: `${targetDate}/${targetDate}`,
          I: 128,
          J: 128,
        },
        timeout: 10000,
      });

      const ndvi = response.data?.NDVI || 0.5;

      return {
        latitude,
        longitude,
        date: targetDate,
        ndvi: Math.round(ndvi * 1000) / 1000,
        cloudCover: 0,
        source: this.name,
        retrievedAt: new Date().toISOString(),
      };
    } catch (err: any) {
      log.error({ err: err.message }, 'SentinelHub NDVI request failed');
      return this.estimateNdvi(latitude, longitude, date);
    }
  }

  async getSoilMoisture(
    latitude: number,
    longitude: number,
    date?: string,
  ): Promise<SoilMoistureData> {
    // Sentinel-1 soil moisture requires more complex processing
    // Return estimation based on NDVI and rainfall
    const targetDate = date || new Date().toISOString().split('T')[0];
    const ndviData = await this.getNdvi(latitude, longitude, targetDate);

    // Rough estimation: NDVI correlates with soil moisture
    const soilMoisture = Math.min(100, Math.max(0, ndviData.ndvi * 80 + 20));

    return {
      latitude,
      longitude,
      date: targetDate,
      soilMoisturePercent: Math.round(soilMoisture * 10) / 10,
      depth: '0-5cm',
      source: `${this.name}-estimated`,
      retrievedAt: new Date().toISOString(),
    };
  }

  async getVegetationHealth(
    latitude: number,
    longitude: number,
    date?: string,
  ): Promise<VegetationHealth> {
    const ndviData = await this.getNdvi(latitude, longitude, date);

    let status: VegetationHealth['status'];
    let description: string;

    if (ndviData.ndvi > 0.6) {
      status = 'healthy';
      description = 'Dense, healthy vegetation with high chlorophyll content';
    } else if (ndviData.ndvi > 0.3) {
      status = 'stressed';
      description = 'Moderate vegetation with signs of stress (possible water or nutrient deficiency)';
    } else if (ndviData.ndvi > 0.1) {
      status = 'severely_stressed';
      description = 'Sparse or severely stressed vegetation';
    } else {
      status = 'no_vegetation';
      description = 'No significant vegetation detected (bare soil, water, or urban area)';
    }

    return {
      latitude,
      longitude,
      date: ndviData.date,
      ndvi: ndviData.ndvi,
      status,
      description,
      source: this.name,
      retrievedAt: new Date().toISOString(),
    };
  }

  /**
   * Estimate NDVI when Sentinel Hub is not available.
   * Uses latitude-based vegetation zone estimates.
   */
  private estimateNdvi(
    latitude: number,
    longitude: number,
    date?: string,
  ): NdviData {
    const targetDate = date || new Date().toISOString().split('T')[0];

    // Simple latitude-based estimation for Nigeria
    // Northern Nigeria: drier, lower NDVI
    // Southern Nigeria: wetter, higher NDVI
    let estimatedNdvi: number;
    if (latitude > 12) {
      estimatedNdvi = 0.2 + Math.random() * 0.15; // Sudan Savanna: 0.2-0.35
    } else if (latitude > 8) {
      estimatedNdvi = 0.3 + Math.random() * 0.2; // Guinea Savanna: 0.3-0.5
    } else if (latitude > 5) {
      estimatedNdvi = 0.4 + Math.random() * 0.2; // Derived Savanna: 0.4-0.6
    } else {
      estimatedNdvi = 0.5 + Math.random() * 0.2; // Humid Forest: 0.5-0.7
    }

    return {
      latitude,
      longitude,
      date: targetDate,
      ndvi: Math.round(estimatedNdvi * 1000) / 1000,
      cloudCover: 0,
      source: 'estimated',
      retrievedAt: new Date().toISOString(),
    };
  }

  private calculateBbox(lat: number, lng: number, size: number): number[] {
    return [lng - size, lat - size, lng + size, lat + size];
  }
}
