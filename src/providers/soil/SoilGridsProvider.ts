/**
 * SoilGrids Provider
 *
 * Uses ISRIC SoilGrids 250m global soil data.
 * Free API: https://rest.isric.org/soilgrids/v2.0
 *
 * Provides soil type, texture, pH, organic carbon, and more
 * at 250m resolution globally.
 */

import axios from 'axios';
import type { SoilProvider, SoilProfile, SoilCapability } from './SoilProvider.js';
import { createChildLogger } from '../../logger.js';

const log = createChildLogger('soilgrids');

const BASE_URL = 'https://rest.isric.org/soilgrids/v2.0';

export class SoilGridsProvider implements SoilProvider {
  name = 'soilgrids';
  private available = true;

  isAvailable(): boolean {
    return this.available;
  }

  async getSoilProfile(latitude: number, longitude: number): Promise<SoilProfile> {
    try {
      const properties = [
        'texture.class',
        'texture.speedclass',
        'ph.hox',
        'soc',
        'nitrogen',
        'cec',
        'cfvo',
      ];

      const response = await axios.get(`${BASE_URL}/properties/query`, {
        params: {
          lat: latitude,
          lon: longitude,
          property: properties,
          depth: '0-5cm',
          value: 'mean',
        },
        timeout: 10000,
      });

      const layers = response.data?.properties?.layers || [];
      const getProp = (name: string) =>
        layers.find((l: any) => l.name === name)?.depths?.[0]?.values?.mean ?? null;

      const textureClass = getProp('texture.class') || 'loam';
      const ph = getProp('ph.hox') ? getProp('ph.hox') / 10 : 6.5; // SoilGrids returns pH*10
      const organicCarbon = getProp('soc') || 10; // g/kg
      const nitrogen = getProp('nitrogen') || 0.8; // g/kg
      const cec = getProp('cec') || 15; // cmol/kg

      // Determine texture description
      const textureMap: Record<string, string> = {
        'Cl': 'clay',
        'SiCl': 'silty clay',
        'SaCl': 'sandy clay',
        'ClLo': 'clay loam',
        'SiClLo': 'silty clay loam',
        'SaClLo': 'sandy clay loam',
        'Lo': 'loam',
        'SiLo': 'silty loam',
        'SaLo': 'sandy loam',
        'Si': 'silt',
        'Sa': 'sand',
      };

      const soilType = textureMap[textureClass as string] || 'loam';

      // Estimate drainage from texture
      let drainage: SoilProfile['drainage'];
      if (['sand', 'sandy loam'].includes(soilType)) {
        drainage = 'well_drained';
      } else if (['loam', 'silt loam', 'sandy clay loam'].includes(soilType)) {
        drainage = 'moderately_drained';
      } else if (['clay loam', 'silty clay loam'].includes(soilType)) {
        drainage = 'poorly_drained';
      } else {
        drainage = 'moderately_drained';
      }

      return {
        latitude,
        longitude,
        soilType,
        texture: textureClass as string,
        ph: Math.round(ph * 10) / 10,
        organicCarbon: Math.round(organicCarbon * 10) / 10,
        nitrogen: Math.round(nitrogen * 100) / 100,
        phosphorus: 15, // SoilGrids doesn't provide P directly
        potassium: 3, // Estimated
        cec: Math.round(cec * 10) / 10,
        drainage,
        source: this.name,
        retrievedAt: new Date().toISOString(),
      };
    } catch (err: any) {
      log.error({ err: err.message }, 'SoilGrids query failed');
      this.available = false;
      return this.estimateSoilProfile(latitude, longitude);
    }
  }

  async getSoilCapability(latitude: number, longitude: number): Promise<SoilCapability> {
    const profile = await this.getSoilProfile(latitude, longitude);

    let score = 70; // Base score
    const limitations: string[] = [];
    const recommendations: string[] = [];

    // pH assessment
    if (profile.ph < 5.5) {
      score -= 15;
      limitations.push('Soil pH is too acidic (below 5.5)');
      recommendations.push('Apply agricultural lime to raise pH');
    } else if (profile.ph > 8.0) {
      score -= 15;
      limitations.push('Soil pH is too alkaline (above 8.0)');
      recommendations.push('Apply gypsum or organic matter to lower pH');
    } else if (profile.ph >= 6.0 && profile.ph <= 7.5) {
      score += 10;
    }

    // Organic carbon
    if (profile.organicCarbon < 5) {
      score -= 10;
      limitations.push('Very low organic matter');
      recommendations.push('Apply compost or manure to improve organic matter');
    } else if (profile.organicCarbon > 20) {
      score += 5;
    }

    // Drainage
    if (profile.drainage === 'poorly_drained' || profile.drainage === 'very_poorly_drained') {
      score -= 10;
      limitations.push('Poor drainage');
      recommendations.push('Consider raised beds or drainage improvements');
    } else if (profile.drainage === 'well_drained') {
      score += 5;
    }

    // CEC
    if (profile.cec < 10) {
      score -= 5;
      limitations.push('Low nutrient retention capacity');
      recommendations.push('Apply organic matter to improve CEC');
    }

    score = Math.max(0, Math.min(100, score));

    // Determine suitability
    let suitability: SoilCapability['suitability'];
    if (score >= 85) suitability = 'highly_suitable';
    else if (score >= 70) suitability = 'suitable';
    else if (score >= 55) suitability = 'moderately_suitable';
    else if (score >= 40) suitability = 'marginally_suitable';
    else suitability = 'unsuitable';

    // Best crops based on soil type
    const bestCrops = this.getBestCropsForSoil(profile.soilType, profile.ph);

    return {
      latitude,
      longitude,
      suitability,
      score,
      bestCrops,
      limitations,
      recommendations,
      source: this.name,
      retrievedAt: new Date().toISOString(),
    };
  }

  private estimateSoilProfile(latitude: number, longitude: number): SoilProfile {
    // Simple latitude-based estimation for Nigeria
    let soilType: string;
    let ph: number;
    let organicCarbon: number;

    if (latitude > 12) {
      // Northern Nigeria - sandy soils
      soilType = 'sandy loam';
      ph = 6.5;
      organicCarbon = 5;
    } else if (latitude > 8) {
      // Middle belt - loamy soils
      soilType = 'loam';
      ph = 6.2;
      organicCarbon = 12;
    } else {
      // Southern Nigeria - clay-rich soils
      soilType = 'clay loam';
      ph = 5.8;
      organicCarbon = 18;
    }

    return {
      latitude,
      longitude,
      soilType,
      texture: soilType,
      ph,
      organicCarbon,
      nitrogen: organicCarbon * 0.08,
      phosphorus: 15,
      potassium: 3,
      cec: 15,
      drainage: 'moderately_drained',
      source: 'estimated',
      retrievedAt: new Date().toISOString(),
    };
  }

  private getBestCropsForSoil(soilType: string, ph: number): string[] {
    const cropMap: Record<string, string[]> = {
      sand: ['groundnut', 'cowpea', 'cassava', 'millet'],
      'sandy loam': ['groundnut', 'cowpea', 'cassava', 'maize', 'yam'],
      loam: ['maize', 'sorghum', 'cowpea', 'groundnut', 'yam', 'cassava'],
      'silt loam': ['maize', 'rice', 'sorghum', 'yam'],
      'clay loam': ['rice', 'yam', 'cassava', 'maize'],
      clay: ['rice', 'yam'],
      'silty clay': ['rice', 'yam'],
      'sandy clay': ['cassava', 'yam', 'maize'],
    };

    let crops = cropMap[soilType] || ['maize', 'cassava'];

    // Adjust for pH
    if (ph < 5.5) {
      // Acidic - prefer acid-tolerant crops
      crops = crops.filter((c) => ['cassava', 'cowpea', 'groundnut', 'millet'].includes(c));
    } else if (ph > 7.5) {
      // Alkaline - prefer碱-tolerant crops
      crops = crops.filter((c) => ['sorghum', 'millet', 'cotton'].includes(c));
    }

    return crops.slice(0, 5);
  }
}
