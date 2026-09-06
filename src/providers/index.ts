import { OpenMeteoProvider } from './weather/OpenMeteoProvider.js';
import { NigeriaGeoProvider } from './geo/NigeriaGeoProvider.js';
import type { WeatherProvider } from './weather/WeatherProvider.js';
import type { GeoProvider } from './geo/GeoProvider.js';
import { createChildLogger } from '../logger.js';

const log = createChildLogger('providers');

// ─── Provider Registry ───────────────────────────────────────────────────────
// Centralised place to get provider instances. Swap implementations here.

let weatherProvider: WeatherProvider;
let geoProvider: GeoProvider;

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

// Re-export types
export type { WeatherProvider, CurrentWeather, WeatherForecast, HistoricalWeather } from './weather/WeatherProvider.js';
export type { GeoProvider as GeoProviderInterface, GeoLocation, GeoBoundary } from './geo/GeoProvider.js';
