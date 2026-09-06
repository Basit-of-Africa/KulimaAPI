import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { testDatabaseConnection } from '../database/connection.js';
import { getWeatherProvider, getGeoProvider, getSatelliteProvider, getSoilProvider } from '../providers/index.js';

/**
 * Platform routes — API status, changelog, bulk operations
 */
export default async function platformRoutes(app: FastifyInstance) {

  // ─── GET /v1/status — Service Status ──────────────────────────────────
  app.get('/v1/status', {
    handler: async (_request: FastifyRequest, reply: FastifyReply) => {
      const dbOk = await testDatabaseConnection();
      const weather = getWeatherProvider();
      const geo = getGeoProvider();
      const satellite = getSatelliteProvider();
      const soil = getSoilProvider();

      return {
        status: 'ok',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        services: {
          database: {
            status: dbOk ? 'operational' : 'degraded',
            message: dbOk ? 'Connected' : 'Unavailable — running without persistence',
          },
          weather: {
            name: weather.name,
            status: weather.isAvailable() ? 'operational' : 'degraded',
          },
          geo: {
            name: geo.name,
            status: geo.isAvailable() ? 'operational' : 'degraded',
          },
          satellite: {
            name: satellite.name,
            status: satellite.isAvailable() ? 'operational' : 'estimated',
          },
          soil: {
            name: soil.name,
            status: soil.isAvailable() ? 'operational' : 'estimated',
          },
        },
      };
    },
  });

  // ─── GET /v1/changelog — API Changelog ────────────────────────────────
  app.get('/v1/changelog', {
    handler: async (_request: FastifyRequest, reply: FastifyReply) => {
      return {
        currentVersion: '2.0.0',
        releases: [
          {
            version: '2.0.0',
            date: '2026-09-07',
            title: 'Phase 2 Sprint 2 — Advanced Intelligence & API Maturity',
            changes: [
              'Added crop growth stage tracking with GDD calculation',
              'Added crop comparison and planting window optimiser',
              'Added satellite NDVI and soil data integration',
              'Added advanced rules engine v2 (pest/disease, irrigation, harvest)',
              'Added trend analysis with 7/14/30-day windows',
              'Added farm dashboard and batch intelligence',
              'Added farm notes and groups',
              'Added service status endpoint',
              'Added SoilGrids integration for global soil data',
            ],
            breaking: false,
          },
          {
            version: '1.0.0',
            date: '2026-09-06',
            title: 'Phase 1 — MVP Release',
            changes: [
              'Core intelligence API with weather-based recommendations',
              'Open-Meteo weather provider integration',
              'Nigerian location resolution (36 states + FCT)',
              'API key authentication and rate limiting',
              'Redis caching with in-memory fallback',
              'Webhook delivery system',
              'Developer dashboard (React)',
              'Swagger/OpenAPI documentation',
            ],
            breaking: false,
          },
        ],
      };
    },
  });

  // ─── POST /v2/weather/batch — Batch Weather ──────────────────────────
  app.post('/v2/weather/batch', {
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as any;
      const locations: Array<{ lat: number; lng: number }> = body?.locations || [];

      if (locations.length === 0) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'locations array is required (max 20).',
        });
      }

      if (locations.length > 20) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Maximum 20 locations per batch request.',
        });
      }

      const weatherProvider = getWeatherProvider();

      try {
        const results = await Promise.all(
          locations.map(async (loc) => {
            try {
              const weather = await weatherProvider.getCurrentWeather(loc.lat, loc.lng);
              return {
                latitude: loc.lat,
                longitude: loc.lng,
                temperatureC: weather.temperatureC,
                humidityPercent: weather.humidityPercent,
                windSpeedKmh: weather.windSpeedKmh,
                precipitationMm: weather.precipitationMm,
                weatherCondition: weather.weatherCondition,
                source: weather.source,
              };
            } catch {
              return { latitude: loc.lat, longitude: loc.lng, error: 'Weather data unavailable' };
            }
          }),
        );

        return {
          count: results.length,
          results,
        };
      } catch (err) {
        return reply.code(500).send({
          error: 'Internal Error',
          message: 'Failed to fetch batch weather.',
        });
      }
    },
  });

  // ─── POST /v2/location/batch — Batch Location Resolution ─────────────
  app.post('/v2/location/batch', {
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as any;
      const queries: string[] = body?.queries || [];

      if (queries.length === 0) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'queries array is required (max 20).',
        });
      }

      if (queries.length > 20) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Maximum 20 queries per batch request.',
        });
      }

      const geoProvider = getGeoProvider();

      try {
        const results = await Promise.all(
          queries.map(async (q) => {
            try {
              const location = await geoProvider.resolveLocation(q);
              return { query: q, location };
            } catch {
              return { query: q, location: null, error: 'Resolution failed' };
            }
          }),
        );

        return {
          count: results.length,
          results,
        };
      } catch (err) {
        return reply.code(500).send({
          error: 'Internal Error',
          message: 'Failed to resolve locations.',
        });
      }
    },
  });

  // ─── GET /v2/farms/export — Export Farm Data ──────────────────────────
  app.get('/v2/farms/export', {
    preHandler: [],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      // Placeholder — needs auth in production
      return reply.code(501).send({
        error: 'Not Implemented',
        message: 'Farm export endpoint coming soon.',
      });
    },
  });
}
