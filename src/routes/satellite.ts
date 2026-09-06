import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getSatelliteProvider, getSoilProvider } from '../providers/index.js';
import { optionalAuth } from '../middleware/auth.js';
import { trackUsage } from '../middleware/usage.js';
import { cache, CacheService } from '../cache/CacheService.js';
import { createChildLogger } from '../logger.js';

const log = createChildLogger('routes/satellite');

export default async function satelliteRoutes(app: FastifyInstance) {
  const satelliteProvider = getSatelliteProvider();
  const soilProvider = getSoilProvider();

  // ─── GET /v2/satellite/ndvi/:lat/:lng — NDVI ──────────────────────────
  app.get('/v2/satellite/ndvi/:lat/:lng', {
    preHandler: [optionalAuth, trackUsage],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { lat, lng } = request.params as { lat: string; lng: string };
      const { date } = request.query as any;
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);

      if (isNaN(latitude) || isNaN(longitude)) {
        return reply.code(400).send({ error: 'Bad Request', message: 'Invalid coordinates.' });
      }

      const cacheKey = `satellite:ndvi:${latitude.toFixed(2)}:${longitude.toFixed(2)}:${date || 'latest'}`;
      const cached = await cache.get<any>(cacheKey);
      if (cached) return reply.header('X-Cache', 'HIT').send(cached);

      try {
        const ndvi = await satelliteProvider.getNdvi(latitude, longitude, date);
        await cache.set(cacheKey, ndvi, 86400); // 24h cache
        return reply.header('X-Cache', 'MISS').send(ndvi);
      } catch (err) {
        log.error(err, 'NDVI request failed');
        return reply.code(500).send({ error: 'Internal Error', message: 'Failed to get NDVI data.' });
      }
    },
  });

  // ─── GET /v2/satellite/health/:lat/:lng — Vegetation Health ────────────
  app.get('/v2/satellite/health/:lat/:lng', {
    preHandler: [optionalAuth, trackUsage],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { lat, lng } = request.params as { lat: string; lng: string };
      const { date } = request.query as any;
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);

      if (isNaN(latitude) || isNaN(longitude)) {
        return reply.code(400).send({ error: 'Bad Request', message: 'Invalid coordinates.' });
      }

      try {
        const health = await satelliteProvider.getVegetationHealth(latitude, longitude, date);
        return health;
      } catch (err) {
        log.error(err, 'Vegetation health request failed');
        return reply.code(500).send({ error: 'Internal Error', message: 'Failed to get vegetation health.' });
      }
    },
  });

  // ─── GET /v2/satellite/soil-moisture/:lat/:lng — Soil Moisture ────────
  app.get('/v2/satellite/soil-moisture/:lat/:lng', {
    preHandler: [optionalAuth, trackUsage],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { lat, lng } = request.params as { lat: string; lng: string };
      const { date } = request.query as any;
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);

      if (isNaN(latitude) || isNaN(longitude)) {
        return reply.code(400).send({ error: 'Bad Request', message: 'Invalid coordinates.' });
      }

      if (!satelliteProvider.getSoilMoisture) {
        return reply.code(501).send({
          error: 'Not Implemented',
          message: 'Soil moisture data is not available from this provider.',
        });
      }

      try {
        const moisture = await satelliteProvider.getSoilMoisture(latitude, longitude, date);
        return moisture;
      } catch (err) {
        log.error(err, 'Soil moisture request failed');
        return reply.code(500).send({ error: 'Internal Error', message: 'Failed to get soil moisture.' });
      }
    },
  });

  // ─── GET /v2/soil/:lat/:lng — Soil Profile ────────────────────────────
  app.get('/v2/soil/:lat/:lng', {
    preHandler: [optionalAuth, trackUsage],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { lat, lng } = request.params as { lat: string; lng: string };
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);

      if (isNaN(latitude) || isNaN(longitude)) {
        return reply.code(400).send({ error: 'Bad Request', message: 'Invalid coordinates.' });
      }

      const cacheKey = `soil:profile:${latitude.toFixed(2)}:${longitude.toFixed(2)}`;
      const cached = await cache.get<any>(cacheKey);
      if (cached) return reply.header('X-Cache', 'HIT').send(cached);

      try {
        const profile = await soilProvider.getSoilProfile(latitude, longitude);
        await cache.set(cacheKey, profile, 2592000); // 30 day cache
        return reply.header('X-Cache', 'MISS').send(profile);
      } catch (err) {
        log.error(err, 'Soil profile request failed');
        return reply.code(500).send({ error: 'Internal Error', message: 'Failed to get soil profile.' });
      }
    },
  });

  // ─── GET /v2/soil/:lat/:lng/capability — Soil Capability ──────────────
  app.get('/v2/soil/:lat/:lng/capability', {
    preHandler: [optionalAuth, trackUsage],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { lat, lng } = request.params as { lat: string; lng: string };
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);

      if (isNaN(latitude) || isNaN(longitude)) {
        return reply.code(400).send({ error: 'Bad Request', message: 'Invalid coordinates.' });
      }

      try {
        const capability = await soilProvider.getSoilCapability(latitude, longitude);
        return capability;
      } catch (err) {
        log.error(err, 'Soil capability request failed');
        return reply.code(500).send({ error: 'Internal Error', message: 'Failed to get soil capability.' });
      }
    },
  });
}
