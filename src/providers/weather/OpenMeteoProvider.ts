import axios from 'axios';
import { env } from '../../config/env.js';
import type {
  WeatherProvider,
  CurrentWeather,
  WeatherForecast,
  HistoricalWeather,
} from './WeatherProvider.js';

interface OpenMeteoCurrentResponse {
  current: {
    time: string;
    temperature_2m?: number;
    relative_humidity_2m?: number;
    apparent_temperature?: number;
    precipitation?: number;
    rain?: number;
    weather_code?: number;
    cloud_cover?: number;
    pressure_msl?: number;
    surface_pressure?: number;
    wind_speed_10m?: number;
    wind_direction_10m?: number;
    soil_moisture_0_to_7cm?: number;
    soil_temperature_6cm?: number;
  };
  current_units?: Record<string, string>;
}

interface OpenMeteoDailyResponse {
  daily: {
    time: string[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_sum?: number[];
    precipitation_probability_max?: number[];
    weather_code?: number[];
    wind_speed_10m_max?: number[];
    evapotranspiration?: number[];
  };
  daily_units?: Record<string, string>;
}

export class OpenMeteoProvider implements WeatherProvider {
  name = 'open-meteo';
  private baseUrl: string;
  private available: boolean;

  constructor() {
    this.baseUrl = env.providers.openMeteo.baseUrl;
    this.available = true;
  }

  isAvailable(): boolean {
    return this.available;
  }

  async getCurrentWeather(latitude: number, longitude: number): Promise<CurrentWeather> {
    try {
      const response = await axios.get<OpenMeteoCurrentResponse>(`${this.baseUrl}/v1/forecast`, {
        params: {
          latitude,
          longitude,
          current: [
            'temperature_2m',
            'relative_humidity_2m',
            'apparent_temperature',
            'precipitation',
            'rain',
            'weather_code',
            'cloud_cover',
            'pressure_msl',
            'wind_speed_10m',
            'wind_direction_10m',
            'soil_moisture_0_to_7cm',
            'soil_temperature_6cm',
          ].join(','),
          timezone: 'Africa/Lagos',
        },
        timeout: 10000,
      });

      const current = response.data.current;

      const now = new Date();
      const validUntil = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes

      return {
        temperatureC: current.temperature_2m ?? 0,
        apparentTemperatureC: current.apparent_temperature,
        humidityPercent: current.relative_humidity_2m ?? 0,
        windSpeedKmh: current.wind_speed_10m ?? 0,
        windDirection: current.wind_direction_10m,
        precipitationMm: current.precipitation ?? 0,
        rainfallMm: current.rain,
        weatherCondition: this.mapWeatherCode(current.weather_code),
        pressureHpa: current.pressure_msl,
        cloudCoverPercent: current.cloud_cover,
        soilMoisture: current.soil_moisture_0_to_7cm ?? null,
        soilTemperatureC: current.soil_temperature_6cm ?? null,
        source: this.name,
        retrievedAt: now.toISOString(),
        validFrom: now.toISOString(),
        validUntil: validUntil.toISOString(),
      };
    } catch (error) {
      this.available = false;
      throw new Error(`Open-Meteo current weather request failed: ${error}`);
    }
  }

  async getForecast(latitude: number, longitude: number, days: number): Promise<WeatherForecast> {
    try {
      const response = await axios.get<OpenMeteoDailyResponse>(`${this.baseUrl}/v1/forecast`, {
        params: {
          latitude,
          longitude,
          daily: [
            'temperature_2m_max',
            'temperature_2m_min',
            'precipitation_sum',
            'precipitation_probability_max',
            'weather_code',
            'wind_speed_10m_max',
            'evapotranspiration',
          ].join(','),
          timezone: 'Africa/Lagos',
          forecast_days: days,
        },
        timeout: 10000,
      });

      const daily = response.data.daily;
      const forecastDays = daily.time.map((date, index) => ({
        date,
        temperatureMinC: daily.temperature_2m_min?.[index] ?? 0,
        temperatureMaxC: daily.temperature_2m_max?.[index] ?? 0,
        precipitationMm: daily.precipitation_sum?.[index] ?? 0,
        precipitationProbability: (daily.precipitation_probability_max?.[index] ?? 0) / 100,
        windSpeedKmh: daily.wind_speed_10m_max?.[index],
        weatherCondition: this.mapWeatherCode(daily.weather_code?.[index]),
        evapotranspirationMm: daily.evapotranspiration?.[index],
      }));

      const now = new Date();
      const validUntil = new Date(now.getTime() + 60 * 60 * 1000); // 60 minutes

      return {
        latitude,
        longitude,
        timezone: 'Africa/Lagos',
        days: forecastDays,
        source: this.name,
        retrievedAt: now.toISOString(),
      };
    } catch (error) {
      this.available = false;
      throw new Error(`Open-Meteo forecast request failed: ${error}`);
    }
  }

  async getHistoricalWeather(
    latitude: number,
    longitude: number,
    startDate: string,
    endDate: string
  ): Promise<HistoricalWeather> {
    try {
      const response = await axios.get<OpenMeteoDailyResponse>(
        `${this.baseUrl}/v1/archive`,
        {
          params: {
            latitude,
            longitude,
            start_date: startDate,
            end_date: endDate,
            daily: [
              'temperature_2m_max',
              'temperature_2m_min',
              'precipitation_sum',
              'weather_code',
              'wind_speed_10m_max',
              'evapotranspiration',
            ].join(','),
            timezone: 'Africa/Lagos',
          },
          timeout: 15000,
        }
      );

      const daily = response.data.daily;
      const days = daily.time.map((date, index) => ({
        date,
        temperatureMaxC: daily.temperature_2m_max?.[index],
        temperatureMinC: daily.temperature_2m_min?.[index],
        precipitationMm: daily.precipitation_sum?.[index] ?? 0,
        windSpeedKmh: daily.wind_speed_10m_max?.[index],
        evapotranspirationMm: daily.evapotranspiration?.[index],
      }));

      const now = new Date();
      const validUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

      return {
        latitude,
        longitude,
        startDate,
        endDate,
        days,
        source: this.name,
        retrievedAt: now.toISOString(),
      };
    } catch (error) {
      this.available = false;
      throw new Error(`Open-Meteo historical weather request failed: ${error}`);
    }
  }

  private mapWeatherCode(code?: number): string | undefined {
    if (code === undefined) return undefined;

    const weatherCodes: Record<number, string> = {
      0: 'clear',
      1: 'mainly_clear',
      2: 'partly_cloudy',
      3: 'overcast',
      45: 'fog',
      48: 'depositing_rime_fog',
      51: 'light_drizzle',
      53: 'moderate_drizzle',
      55: 'dense_drizzle',
      61: 'slight_rain',
      63: 'moderate_rain',
      65: 'heavy_rain',
      71: 'slight_snow',
      73: 'moderate_snow',
      75: 'heavy_snow',
      77: 'snow_grains',
      80: 'slight_rain_showers',
      81: 'moderate_rain_showers',
      82: 'violent_rain_showers',
      85: 'slight_snow_showers',
      86: 'heavy_snow_showers',
      95: 'thunderstorm',
      96: 'thunderstorm_with_slight_hail',
      99: 'thunderstorm_with_heavy_hail',
    };

    return weatherCodes[code] || 'unknown';
  }
}
