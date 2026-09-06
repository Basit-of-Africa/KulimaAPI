import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getWeatherProvider, getGeoProvider } from '../providers/index.js';
import { cache } from '../cache/CacheService.js';
import { env } from '../config/env.js';
import { optionalAuth } from '../middleware/auth.js';
import { trackUsage } from '../middleware/usage.js';
import { createChildLogger } from '../logger.js';

const log = createChildLogger('routes/weather');

export default async function weatherRoutes(app: FastifyInstance) {
  const weatherProvider = getWeatherProvider();
  const geoProvider = getGeoProvider();

  // ─── GET /v1/weather/current/:lat/:lng — Current Weather ──────────────
  app.get('/v1/weather/current/:lat/:lng', {
    preHandler: [optionalAuth, trackUsage],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { lat, lng } = request.params as { lat: string; lng: string };
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);

      if (isNaN(latitude) || isNaN(longitude)) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Invalid coordinates.',
        });
      }

      const cacheKey = CacheService.weatherKey(latitude, longitude, 'current');

      // Check cache
      const cached = await cache.get<any>(cacheKey);
      if (cached) {
        return reply.header('X-Cache', 'HIT').send({
          ...cached,
          cache: { source: 'cache', retrievedAt: cached.retrievedAt, dataAgeMinutes: 0 },
        });
      }

      try {
        const weather = await weatherProvider.getCurrentWeather(latitude, longitude);

        // Cache for 15 minutes
        await cache.set(cacheKey, weather, env.cache.ttlCurrentWeather);

        return reply.header('X-Cache', 'MISS').send({
          ...weather,
          cache: { source: 'live', retrievedAt: weather.retrievedAt },
        });
      } catch (err) {
        log.error(err, 'Current weather request failed');
        return reply.code(500).send({
          error: 'Internal Error',
          message: 'Failed to retrieve current weather.',
        });
      }
    },
  });

  // ─── GET /v1/weather/forecast/:lat/:lng — Forecast (moved from intel) ─
  app.get('/v1/weather/forecast/:lat/:lng', {
    preHandler: [optionalAuth, trackUsage],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { lat, lng } = request.params as { lat: string; lng: string };
      const { days } = request.query as any;
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);

      if (isNaN(latitude) || isNaN(longitude)) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Invalid coordinates.',
        });
      }

      const forecastDays = Math.min(parseInt(days) || 7, 16);
      const cacheKey = CacheService.weatherKey(latitude, longitude, `forecast_${forecastDays}`);

      const cached = await cache.get<any>(cacheKey);
      if (cached) {
        return reply.header('X-Cache', 'HIT').send({
          ...cached,
          cache: { source: 'cache', dataAgeMinutes: 0 },
        });
      }

      try {
        const forecast = await weatherProvider.getForecast(latitude, longitude, forecastDays);
        await cache.set(cacheKey, forecast, env.cache.ttlForecast);

        return reply.header('X-Cache', 'MISS').send({
          ...forecast,
          cache: { source: 'live', retrievedAt: forecast.retrievedAt },
        });
      } catch (err) {
        log.error(err, 'Forecast request failed');
        return reply.code(500).send({
          error: 'Internal Error',
          message: 'Failed to retrieve forecast.',
        });
      }
    },
  });

  // ─── GET /v1/weather/historical/:lat/:lng — Historical Weather ────────
  app.get('/v1/weather/historical/:lat/:lng', {
    preHandler: [optionalAuth, trackUsage],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { lat, lng } = request.params as { lat: string; lng: string };
      const { start_date, end_date } = request.query as any;
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);

      if (isNaN(latitude) || isNaN(longitude)) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Invalid coordinates.',
        });
      }

      if (!start_date || !end_date) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'start_date and end_date query parameters are required (YYYY-MM-DD).',
        });
      }

      // Limit range to 90 days
      const start = new Date(start_date);
      const end = new Date(end_date);
      const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays > 90 || diffDays < 0) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Date range must be between 1 and 90 days.',
        });
      }

      const cacheKey = `weather:historical:${latitude.toFixed(2)}:${longitude.toFixed(2)}:${start_date}:${end_date}`;

      const cached = await cache.get<any>(cacheKey);
      if (cached) {
        return reply.header('X-Cache', 'HIT').send({
          ...cached,
          cache: { source: 'cache', dataAgeMinutes: 0 },
        });
      }

      try {
        const historical = await weatherProvider.getHistoricalWeather(
          latitude, longitude, start_date, end_date
        );
        await cache.set(cacheKey, historical, env.cache.ttlHistorical);

        return reply.header('X-Cache', 'MISS').send({
          ...historical,
          cache: { source: 'live', retrievedAt: historical.retrievedAt },
        });
      } catch (err) {
        log.error(err, 'Historical weather request failed');
        return reply.code(500).send({
          error: 'Internal Error',
          message: 'Failed to retrieve historical weather.',
        });
      }
    },
  });

  // ─── GET /v1/location/resolve — Location Resolution ───────────────────
  app.get('/v1/location/resolve', {
    preHandler: [optionalAuth, trackUsage],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { q } = request.query as { q: string };

      if (!q || q.trim().length === 0) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Query parameter "q" is required.',
        });
      }

      const cacheKey = CacheService.locationKey(q);

      const cached = await cache.get<any>(cacheKey);
      if (cached) {
        return reply.header('X-Cache', 'HIT').send(cached);
      }

      try {
        const location = await geoProvider.resolveLocation(q);
        if (!location) {
          return reply.code(404).send({
            error: 'Not Found',
            message: `No location found for "${q}".`,
          });
        }

        await cache.set(cacheKey, location, env.cache.ttlLocation);
        return reply.header('X-Cache', 'MISS').send(location);
      } catch (err) {
        log.error(err, 'Location resolution failed');
        return reply.code(500).send({
          error: 'Internal Error',
          message: 'Failed to resolve location.',
        });
      }
    },
  });
}
