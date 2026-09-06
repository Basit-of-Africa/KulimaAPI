const BASE_URL = '';

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

export async function getHealth() {
  return api<{ status: string; timestamp: string; uptime: number }>('/health');
}

export async function getProviderHealth() {
  return api<{ database: string; weather: string; geo: string; timestamp: string }>(
    '/health/providers'
  );
}

export async function getIntelligence(lat: number, lng: number, crop?: string) {
  const params = new URLSearchParams();
  if (crop) params.set('crop', crop);
  const qs = params.toString() ? `?${params}` : '';
  return api<any>(`/v1/farm/${lat}/${lng}/intelligence${qs}`);
}

export async function getCurrentWeather(lat: number, lng: number) {
  return api<any>(`/v1/weather/current/${lat}/${lng}`);
}

export async function getForecast(lat: number, lng: number, days = 7) {
  return api<any>(`/v1/weather/forecast/${lat}/${lng}?days=${days}`);
}

export async function resolveLocation(q: string) {
  return api<any>(`/v1/location/resolve?q=${encodeURIComponent(q)}`);
}

export interface ApiKey {
  id: string;
  key?: string;
  keyPrefix: string;
  name: string;
  rateLimit: number;
  monthlyQuota: number;
  createdAt: string;
}

export async function createApiKey(orgId: string, name: string) {
  return api<ApiKey>('/v1/auth/keys', {
    method: 'POST',
    body: JSON.stringify({ orgId, name }),
  });
}
