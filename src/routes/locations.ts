import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getGeoProvider } from '../providers/index.js';
import { optionalAuth } from '../middleware/auth.js';
import { trackUsage } from '../middleware/usage.js';
import { cache, CacheService } from '../cache/CacheService.js';
import {
  NIGERIAN_LGAS,
  getAgriculturalZones,
  getLgasByZone,
  getLgasByState,
} from '../database/seedLocations.js';
import { createChildLogger } from '../logger.js';

const log = createChildLogger('routes/locations');

export default async function locationRoutes(app: FastifyInstance) {
  const geoProvider = getGeoProvider();

  // ─── GET /v1/locations/states — List Nigerian States ──────────────────
  app.get('/v1/locations/states', {
    preHandler: [optionalAuth, trackUsage],
    handler: async (_request: FastifyRequest, reply: FastifyReply) => {
      const states = [...new Set(NIGERIAN_LGAS.map((l) => l.state))].sort();
      return {
        count: states.length,
        states: states.map((s) => ({
          name: s,
          lgaCount: NIGERIAN_LGAS.filter((l) => l.state === s).length,
        })),
      };
    },
  });

  // ─── GET /v1/locations/states/:state/lgas — List LGAs in State ───────
  app.get('/v1/locations/states/:state/lgas', {
    preHandler: [optionalAuth, trackUsage],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { state } = request.params as { state: string };
      const lgas = getLgasByState(state);

      if (lgas.length === 0) {
        return reply.code(404).send({
          error: 'Not Found',
          message: `No LGAs found for state "${state}".`,
        });
      }

      return {
        state,
        count: lgas.length,
        lgas: lgas.map((l) => ({
          name: l.name,
          latitude: l.lat,
          longitude: l.lng,
          agriculturalZone: l.agriculturalZone,
        })),
      };
    },
  });

  // ─── GET /v1/locations/zones — List Agricultural Zones ────────────────
  app.get('/v1/locations/zones', {
    preHandler: [optionalAuth, trackUsage],
    handler: async (_request: FastifyRequest, reply: FastifyReply) => {
      const zones = getAgriculturalZones();
      return {
        count: zones.length,
        zones: zones.map((z) => ({
          name: z,
          lgaCount: getLgasByZone(z).length,
          description: getZoneDescription(z),
        })),
      };
    },
  });

  // ─── GET /v1/locations/zones/:zone/lgas — LGAs in Agricultural Zone ──
  app.get('/v1/locations/zones/:zone/lgas', {
    preHandler: [optionalAuth, trackUsage],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { zone } = request.params as { zone: string };
      const lgas = getLgasByZone(zone);

      if (lgas.length === 0) {
        return reply.code(404).send({
          error: 'Not Found',
          message: `No LGAs found for agricultural zone "${zone}".`,
        });
      }

      // Group by state
      const byState: Record<string, typeof lgas> = {};
      for (const lga of lgas) {
        if (!byState[lga.state]) byState[lga.state] = [];
        byState[lga.state].push(lga);
      }

      return {
        zone,
        count: lgas.length,
        states: Object.entries(byState).map(([state, stateLgas]) => ({
          state,
          lgas: stateLgas.map((l) => ({
            name: l.name,
            latitude: l.lat,
            longitude: l.lng,
          })),
        })),
      };
    },
  });

  // ─── GET /v1/locations/search?q=... — Full Location Search ───────────
  app.get('/v1/locations/search', {
    preHandler: [optionalAuth, trackUsage],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { q } = request.query as { q: string };

      if (!q || q.trim().length < 2) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Query parameter "q" must be at least 2 characters.',
        });
      }

      const normalised = q.toLowerCase().trim();
      const cacheKey = CacheService.locationKey(`search:${normalised}`);

      const cached = await cache.get<any>(cacheKey);
      if (cached) {
        return reply.header('X-Cache', 'HIT').send(cached);
      }

      // Search LGAs
      const lgaMatches = NIGERIAN_LGAS.filter(
        (l) =>
          l.name.toLowerCase().includes(normalised) ||
          l.state.toLowerCase().includes(normalised)
      ).slice(0, 20);

      // Also try the geo provider
      const geoResult = await geoProvider.resolveLocation(q);

      const results = {
        query: q,
        lgas: lgaMatches.map((l) => ({
          name: l.name,
          state: l.state,
          latitude: l.lat,
          longitude: l.lng,
          agriculturalZone: l.agriculturalZone,
          type: 'lga' as const,
        })),
        geoProvider: geoResult
          ? {
              name: geoResult.name,
              state: geoResult.state,
              latitude: geoResult.latitude,
              longitude: geoResult.longitude,
              type: geoResult.locationType,
            }
          : null,
        total: lgaMatches.length + (geoResult ? 1 : 0),
      };

      await cache.set(cacheKey, results, 3600); // Cache for 1 hour

      return reply.header('X-Cache', 'MISS').send(results);
    },
  });
}

function getZoneDescription(zone: string): string {
  const descriptions: Record<string, string> = {
    'Sudan Savanna':
      'Northernmost zone. Semi-arid with 500-800mm rainfall. Main crops: millet, sorghum, cowpea, groundnut, cotton.',
    'Northern Guinea Savanna':
      'Transitional zone with 800-1200mm rainfall. Crops: maize, sorghum, millet, cowpea, soybean, groundnut.',
    'Southern Guinea Savanna':
      'Well-watered savanna with 1200-1500mm rainfall. Crops: yam, maize, rice, cassava, soybean, sesame.',
    'Derived Savanna':
      'Forest-savanna transition with 1500-2000mm rainfall. Crops: cassava, yam, maize, cocoa, oil palm.',
    'Humid Forest':
      'Coastal and rainforest zone with 2000-4000mm rainfall. Crops: oil palm, cocoa, rubber, cassava, rice.',
  };
  return descriptions[zone] || 'Agricultural zone in Nigeria.';
}
