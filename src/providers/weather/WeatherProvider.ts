// =============================================================================
// Weather Provider Interface
// =============================================================================

export interface CurrentWeather {
  temperatureC: number;
  apparentTemperatureC?: number;
  humidityPercent: number;
  windSpeedKmh: number;
  windDirection?: number;
  precipitationMm: number;
  rainfallMm?: number;
  precipitationProbability?: number;
  weatherCondition?: string;
  pressureHpa?: number;
  cloudCoverPercent?: number;
  solarRadiationWm2?: number;
  evapotranspirationMm?: number;
  soilMoisture?: number | null;
  soilTemperatureC?: number | null;
  source: string;
  retrievedAt: string;
  validFrom: string;
  validUntil: string;
}

export interface DailyForecast {
  date: string;
  temperatureMinC: number;
  temperatureMaxC: number;
  precipitationMm: number;
  precipitationProbability: number;
  humidityPercent?: number;
  windSpeedKmh?: number;
  windDirection?: number;
  weatherCondition?: string;
  evapotranspirationMm?: number;
  soilMoisture?: number | null;
  soilTemperatureC?: number | null;
}

export interface WeatherForecast {
  latitude: number;
  longitude: number;
  timezone: string;
  days: DailyForecast[];
  source: string;
  retrievedAt: string;
}

export interface HistoricalWeatherDay {
  date: string;
  temperatureMaxC?: number;
  temperatureMinC?: number;
  precipitationMm: number;
  humidityPercent?: number;
  windSpeedKmh?: number;
  evapotranspirationMm?: number;
  soilMoisture?: number | null;
  soilTemperatureC?: number | null;
}

export interface HistoricalWeather {
  latitude: number;
  longitude: number;
  startDate: string;
  endDate: string;
  days: HistoricalWeatherDay[];
  source: string;
  retrievedAt: string;
}

export interface WeatherProvider {
  name: string;
  isAvailable(): boolean;

  getCurrentWeather(latitude: number, longitude: number): Promise<CurrentWeather>;

  getForecast(latitude: number, longitude: number, days: number): Promise<WeatherForecast>;

  getHistoricalWeather(
    latitude: number,
    longitude: number,
    startDate: string,
    endDate: string
  ): Promise<HistoricalWeather>;
}
