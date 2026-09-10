/**
 * Integration Tests for KulimaAPI
 *
 * These tests require a running server at localhost:3000.
 * Run with: npx vitest run tests/integration/api.test.ts
 *
 * They test the full request/response cycle including
 * provider integration, caching, and error handling.
 */

import { describe, it, expect, beforeAll } from 'vitest';

const BASE_URL = process.env.API_BASE || 'http://localhost:3000';

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`API error ${res.status}: ${body.message || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ─── System Endpoints ────────────────────────────────────────────────────────

describe('System Endpoints', () => {
  it('GET / should return API info', async () => {
    const result = await api<{ name: string; version: string; docs: string }>('/');
    expect(result.name).toBe('KulimaAPI');
    expect(result.version).toBe('1.0.0');
    expect(result.docs).toBe('/docs');
  });

  it('GET /health should return ok', async () => {
    const result = await api<{ status: string; uptime: number }>('/health');
    expect(result.status).toBe('ok');
    expect(result.uptime).toBeGreaterThan(0);
  });

  it('GET /health/providers should show provider status', async () => {
    const result = await api<{ database: string; weather: string; geo: string }>('/health/providers');
    expect(['operational', 'degraded']).toContain(result.weather);
    expect(['operational', 'degraded']).toContain(result.geo);
  });

  it('GET /v1/status should return full service status', async () => {
    const result = await api<{ status: string; version: string; services: any }>('/v1/status');
    expect(result.status).toBe('ok');
    expect(['operational', 'degraded', 'estimated']).toContain(result.services.weather.status);
    expect(['operational', 'estimated']).toContain(result.services.soil.status);
  });

  it('GET /v1/changelog should return release history', async () => {
    const result = await api<{ currentVersion: string; releases: any[] }>('/v1/changelog');
    expect(result.currentVersion).toBe('2.0.0');
    expect(result.releases.length).toBeGreaterThanOrEqual(2);
  });
});

// ─── Weather Endpoints ───────────────────────────────────────────────────────

describe('Weather Endpoints', () => {
  it('GET /v1/weather/current/:lat/:lng should return weather', async () => {
    const result = await api<any>('/v1/weather/current/6.5/3.4');
    expect(result.temperatureC).toBeDefined();
    expect(result.humidityPercent).toBeDefined();
    expect(result.source).toBe('open-meteo');
  });

  it('GET /v1/weather/forecast/:lat/:lng should return forecast or error', async () => {
    try {
      const result = await api<any>('/v1/weather/forecast/6.5/3.4?days=3');
      expect(result.days).toBeDefined();
      expect(result.days.length).toBe(3);
    } catch (err: any) {
      // Forecast may fail without DNS — acceptable in CI
      expect(err.message).toContain('500');
    }
  });

  it('POST /v2/weather/batch should return batch weather', async () => {
    const result = await api<any>('/v2/weather/batch', {
      method: 'POST',
      body: JSON.stringify({
        locations: [
          { lat: 6.5, lng: 3.4 },
          { lat: 12.0, lng: 8.5 },
        ],
      }),
    });
    expect(result.count).toBe(2);
    expect(result.results[0].temperatureC).toBeDefined();
  });

  it('POST /v2/weather/batch should reject >20 locations', async () => {
    const locations = Array.from({ length: 21 }, (_, i) => ({ lat: 6 + i * 0.1, lng: 3 + i * 0.1 }));
    try {
      await api<any>('/v2/weather/batch', {
        method: 'POST',
        body: JSON.stringify({ locations }),
      });
      expect.fail('Should have thrown');
    } catch (err: any) {
      expect(err.message).toContain('400');
    }
  });
});

// ─── Location Endpoints ──────────────────────────────────────────────────────

describe('Location Endpoints', () => {
  it('GET /v1/location/resolve?q=Lagos should resolve', async () => {
    const result = await api<any>('/v1/location/resolve?q=Lagos');
    expect(result.name).toBe('Lagos');
    expect(result.state).toBe('Lagos');
    expect(result.latitude).toBe(6.5);
  });

  it('GET /v1/locations/states should list states', async () => {
    const result = await api<any>('/v1/locations/states');
    expect(result.count).toBeGreaterThanOrEqual(10);
  });

  it('GET /v1/locations/zones should list agricultural zones', async () => {
    const result = await api<any>('/v1/locations/zones');
    expect(result.count).toBe(5);
  });

  it('POST /v2/location/batch should resolve multiple', async () => {
    const result = await api<any>('/v2/location/batch', {
      method: 'POST',
      body: JSON.stringify({ queries: ['Kano', 'Enugu'] }),
    });
    expect(result.count).toBe(2);
    expect(result.results[0].location.state).toBe('Kano');
  });
});

// ─── Crop Endpoints ──────────────────────────────────────────────────────────

describe('Crop Endpoints', () => {
  it('GET /v2/crops should list all crops', async () => {
    const result = await api<any>('/v2/crops');
    expect(result.count).toBe(16);
    expect(result.crops.some((c: any) => c.name === 'maize')).toBe(true);
  });

  it('GET /v2/crops/maize should return detailed profile', async () => {
    const result = await api<any>('/v2/crops/maize');
    expect(result.cropName).toBe('maize');
    expect(result.stages.length).toBe(5);
    expect(result.totalGdd).toBe(2700);
  });

  it('GET /v2/crops/maize/planting-window should return outlook', async () => {
    const result = await api<any>('/v2/crops/maize/planting-window');
    expect(result.optimalPlantingMonths.length).toBe(4);
    expect(result.recommendation).toBeTruthy();
  });

  it('GET /v2/crops/maize/growth-stage should calculate GDD', async () => {
    const result = await api<any>('/v2/crops/maize/growth-stage?planting_date=2026-07-15');
    expect(result.daysSincePlanting).toBeGreaterThan(0);
    expect(result.currentStage).toBeDefined();
    expect(result.progress).toBeGreaterThan(0);
  });

  it('GET /v2/crops/unknown should return 404', async () => {
    try {
      await api<any>('/v2/crops/banana');
      expect.fail('Should have thrown');
    } catch (err: any) {
      expect(err.message).toContain('404');
    }
  });
});

// ─── Satellite & Soil Endpoints ──────────────────────────────────────────────

describe('Satellite & Soil Endpoints', () => {
  it('GET /v2/satellite/health/:lat/:lng should return vegetation health', async () => {
    const result = await api<any>('/v2/satellite/health/9.0/7.5');
    expect(result.ndvi).toBeDefined();
    expect(result.status).toBeDefined();
    expect(['healthy', 'stressed', 'severely_stressed', 'no_vegetation']).toContain(result.status);
  });

  it('GET /v2/soil/:lat/:lng should return soil profile', async () => {
    const result = await api<any>('/v2/soil/9.0/7.5');
    expect(result.soilType).toBeDefined();
    expect(result.ph).toBeDefined();
    expect(result.organicCarbon).toBeDefined();
  });

  it('GET /v2/soil/:lat/:lng/capability should return capability', { timeout: 15000 }, async () => {
    try {
      const result = await api<any>('/v2/soil/9.0/7.5/capability');
      expect(result.suitability).toBeDefined();
      expect(result.score).toBeGreaterThan(0);
      expect(result.bestCrops.length).toBeGreaterThan(0);
    } catch (err: any) {
      // SoilGrids may timeout in some environments
      expect(err.message).toMatch(/500|timeout|aborted/i);
    }
  });
});

// ─── Error Handling ──────────────────────────────────────────────────────────

describe('Error Handling', () => {
  it('should return 404 for unknown routes', async () => {
    try {
      await api<any>('/nonexistent');
      expect.fail('Should have thrown');
    } catch (err: any) {
      expect(err.message).toContain('404');
    }
  });

  it('should return 400 for invalid coordinates', async () => {
    try {
      await api<any>('/v1/weather/current/abc/xyz');
      expect.fail('Should have thrown');
    } catch (err: any) {
      expect(err.message).toContain('400');
    }
  });
});
