const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `API error: ${res.status}`);
  }

  return res.json();
}

// Health
export const getHealth = () => api<{ status: string; uptime: number; timestamp: string }>('/health');
export const getProviderHealth = () => api<{ database: string; weather: string; geo: string; satellite: string; soil: string; timestamp: string }>('/health/providers');
export const getStatus = () => api<any>('/v1/status');
export const getChangelog = () => api<any>('/v1/changelog');

// Weather
export const getCurrentWeather = (lat: number, lng: number) => api<any>(`/v1/weather/current/${lat}/${lng}`);
export const getForecast = (lat: number, lng: number, days = 7) => api<any>(`/v1/weather/forecast/${lat}/${lng}?days=${days}`);
export const getBatchWeather = (locations: Array<{ lat: number; lng: number }>) =>
  api<any>('/v2/weather/batch', { method: 'POST', body: JSON.stringify({ locations }) });

// Location
export const resolveLocation = (q: string) => api<any>(`/v1/location/resolve?q=${encodeURIComponent(q)}`);
export const getStates = () => api<any>('/v1/locations/states');
export const getStateLgas = (state: string) => api<any>(`/v1/locations/states/${encodeURIComponent(state)}/lgas`);
export const getZones = () => api<any>('/v1/locations/zones');
export const searchLocations = (q: string) => api<any>(`/v1/locations/search?q=${encodeURIComponent(q)}`);
export const batchResolveLocations = (queries: string[]) =>
  api<any>('/v2/location/batch', { method: 'POST', body: JSON.stringify({ queries }) });

// Crops
export const getCrops = () => api<any>('/v2/crops');
export const getCrop = (name: string) => api<any>(`/v2/crops/${name}`);
export const getCropPlantingWindow = (name: string) => api<any>(`/v2/crops/${name}/planting-window`);
export const getCropGrowthStage = (name: string, lat: number, lng: number, plantingDate: string) =>
  api<any>(`/v2/crops/${name}/growth-stage?lat=${lat}&lng=${lng}&planting_date=${plantingDate}`);
export const compareCrops = (lat: number, lng: number) => api<any>(`/v2/crops/compare?lat=${lat}&lng=${lng}`);

// Satellite & Soil
export const getNdvi = (lat: number, lng: number) => api<any>(`/v2/satellite/ndvi/${lat}/${lng}`);
export const getVegetationHealth = (lat: number, lng: number) => api<any>(`/v2/satellite/health/${lat}/${lng}`);
export const getSoilProfile = (lat: number, lng: number) => api<any>(`/v2/soil/${lat}/${lng}`);
export const getSoilCapability = (lat: number, lng: number) => api<any>(`/v2/soil/${lat}/${lng}/capability`);

// Intelligence
export const getIntelligence = (lat: number, lng: number, crop?: string) => {
  const params = crop ? `?crop=${crop}` : '';
  return api<any>(`/v1/farm/${lat}/${lng}/intelligence${params}`);
};
export const getSeason = (lat: number, lng: number) => api<any>(`/v1/farm/${lat}/${lng}/season`);
export const getAlerts = (lat: number, lng: number) => api<any>(`/v1/farm/${lat}/${lng}/alerts`);

// Farms
export const getFarms = () => api<any>('/v1/farms');
export const createFarm = (data: any) => api<any>('/v1/farms', { method: 'POST', body: JSON.stringify(data) });
export const getFarmDashboard = () => api<any>('/v2/farms/dashboard');
