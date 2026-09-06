import { OpenMeteoProvider } from './weather/OpenMeteoProvider.js';
import { NigeriaGeoProvider } from './geo/NigeriaGeoProvider.js';
import { SentinelHubProvider } from './satellite/SentinelHubProvider.js';
import { SoilGridsProvider } from './soil/SoilGridsProvider.js';
import type { WeatherProvider } from './weather/WeatherProvider.js';
import type { GeoProvider } from './geo/GeoProvider.js';
import type { SatelliteProvider } from './satellite/SatelliteProvider.js';
import type { SoilProvider } from './soil/SoilProvider.js';
import { createChildLogger } from '../logger.js';

const log = createChildLogger('providers');

// ─── Provider Registry ───────────────────────────────────────────────────────
// Centralised place to get provider instances. Swap implementations here.

let weatherProvider: WeatherProvider;
let geoProvider: GeoProvider;
let satelliteProvider: SatelliteProvider;
let soilProvider: SoilProvider;

export function getWeatherProvider(): WeatherProvider {
  if (!weatherProvider) {
    weatherProvider = new OpenMeteoProvider();
    log.info({ provider: weatherProvider.name }, 'Weather provider initialised');
  }
  return weatherProvider;
}

export function getGeoProvider(): GeoProvider {
  if (!geoProvider) {
    geoProvider = new NigeriaGeoProvider();
    log.info({ provider: geoProvider.name }, 'Geo provider initialised');
  }
  return geoProvider;
}

export function getSatelliteProvider(): SatelliteProvider {
  if (!satelliteProvider) {
    satelliteProvider = new SentinelHubProvider();
    log.info({ provider: satelliteProvider.name, available: satelliteProvider.isAvailable() }, 'Satellite provider initialised');
  }
  return satelliteProvider;
}

export function getSoilProvider(): SoilProvider {
  if (!soilProvider) {
    soilProvider = new SoilGridsProvider();
    log.info({ provider: soilProvider.name, available: soilProvider.isAvailable() }, 'Soil provider initialised');
  }
  return soilProvider;
}

// Re-export types
export type { WeatherProvider, CurrentWeather, WeatherForecast, HistoricalWeather } from './weather/WeatherProvider.js';
export type { GeoProvider as GeoProviderInterface, GeoLocation, GeoBoundary } from './geo/GeoProvider.js';
export type { SatelliteProvider, NdviData, SoilMoistureData, VegetationHealth } from './satellite/SatelliteProvider.js';
export type { SoilProvider, SoilProfile, SoilCapability } from './soil/SoilProvider.js';
