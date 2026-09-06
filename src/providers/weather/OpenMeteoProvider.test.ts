import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenMeteoProvider } from './OpenMeteoProvider.js';
import axios from 'axios';

vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('OpenMeteoProvider', () => {
  let provider: OpenMeteoProvider;

  beforeEach(() => {
    provider = new OpenMeteoProvider();
    vi.clearAllMocks();
  });

  describe('getCurrentWeather', () => {
    it('should return mapped current weather data', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          current: {
            time: '2026-09-06T12:00',
            temperature_2m: 30,
            relative_humidity_2m: 75,
            apparent_temperature: 33,
            precipitation: 0,
            rain: 0,
            weather_code: 1,
            cloud_cover: 20,
            pressure_msl: 1013,
            wind_speed_10m: 12,
            wind_direction_10m: 180,
            soil_moisture_0_to_7cm: 0.35,
            soil_temperature_6cm: 27,
          },
        },
      });

      const result = await provider.getCurrentWeather(6.5, 3.4);

      expect(result.temperatureC).toBe(30);
      expect(result.humidityPercent).toBe(75);
      expect(result.windSpeedKmh).toBe(12);
      expect(result.weatherCondition).toBe('mainly_clear');
      expect(result.source).toBe('open-meteo');
      expect(result.soilMoisture).toBe(0.35);
      expect(result.soilTemperatureC).toBe(27);
    });

    it('should throw and mark unavailable on API error', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

      await expect(provider.getCurrentWeather(6.5, 3.4)).rejects.toThrow('Open-Meteo');
      expect(provider.isAvailable()).toBe(false);
    });
  });

  describe('getForecast', () => {
    it('should return mapped daily forecast', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          daily: {
            time: ['2026-09-06', '2026-09-07'],
            temperature_2m_max: [32, 31],
            temperature_2m_min: [23, 22],
            precipitation_sum: [0, 5],
            precipitation_probability_max: [10, 60],
            weather_code: [1, 61],
            wind_speed_10m_max: [15, 20],
            evapotranspiration: [4.5, 3.2],
          },
        },
      });

      const result = await provider.getForecast(6.5, 3.4, 2);

      expect(result.days).toHaveLength(2);
      expect(result.days[0].temperatureMaxC).toBe(32);
      expect(result.days[0].precipitationMm).toBe(0);
      expect(result.days[1].weatherCondition).toBe('slight_rain');
      expect(result.source).toBe('open-meteo');
    });
  });

  describe('mapWeatherCode', () => {
    it('should map known codes', () => {
      // Access private method via (provider as any)
      expect((provider as any).mapWeatherCode(0)).toBe('clear');
      expect((provider as any).mapWeatherCode(61)).toBe('slight_rain');
      expect((provider as any).mapWeatherCode(95)).toBe('thunderstorm');
    });

    it('should return undefined for undefined input', () => {
      expect((provider as any).mapWeatherCode(undefined)).toBeUndefined();
    });
  });
});
