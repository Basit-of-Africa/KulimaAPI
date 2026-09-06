import type { FastifyInstance } from 'fastify';
import { getWeatherProvider, getGeoProvider } from '../providers/index.js';
import { db, agriculturalRules, cropProfiles } from '../database/index.js';
import { eq } from 'drizzle-orm';
import { authenticateApiKey, optionalAuth } from '../middleware/auth.js';
import { trackUsage } from '../middleware/usage.js';
import { evaluateRules } from '../intelligence/rulesEngine.js';
import {
  calculateConfidence,
  assessDataCompleteness,
  assessVariableCount,
} from '../intelligence/confidence.js';
import type { IntelligenceResponse, Risk, Recommendation } from '../intelligence/types.js';
import { createChildLogger } from '../logger.js';

const log = createChildLogger('routes/intelligence');

export default async function intelligenceRoutes(app: FastifyInstance) {
  const weatherProvider = getWeatherProvider();
  const geoProvider = getGeoProvider();

  // ─── GET /v1/farm/:lat/:lng/intelligence — Core Intelligence ──────────
  app.get('/v1/farm/:lat/:lng/intelligence', {
    preHandler: [optionalAuth, trackUsage],
    schema: {
      description: 'Get agricultural intelligence for a location',
      tags: ['Intelligence'],
      params: {
        type: 'object',
        required: ['lat', 'lng'],
        properties: {
          lat: { type: 'number', minimum: -90, maximum: 90 },
          lng: { type: 'number', minimum: -180, maximum: 180 },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          crop: { type: 'string' },
          forecast_days: { type: 'integer', minimum: 1, maximum: 16, default: 7 },
        },
      },
    },
    handler: async (request, reply) => {
      const { lat, lng } = request.params as { lat: string; lng: string };
      const { crop, forecast_days } = request.query as any;
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);

      if (isNaN(latitude) || isNaN(longitude)) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Invalid coordinates. Latitude and longitude must be numbers.',
        });
      }

      try {
        // 1. Get current weather
        const currentWeather = await weatherProvider.getCurrentWeather(latitude, longitude);

        // 2. Get forecast
        const forecast = await weatherProvider.getForecast(latitude, longitude, forecast_days || 7);

        // 3. Resolve location
        const location = await geoProvider.reverseGeocode(latitude, longitude);

        // 4. Get crop profile if specified
        let cropProfile = null;
        if (crop) {
          const [profile] = await db
            .select()
            .from(cropProfiles)
            .where(eq(cropProfiles.name, crop))
            .limit(1);
          cropProfile = profile || null;
        }

        // 5. Get active rules
        const rules = await db
          .select()
          .from(agriculturalRules)
          .where(eq(agriculturalRules.enabled, true));

        // 6. Evaluate rules
        const ruleResults = evaluateRules(rules as any, currentWeather, forecast, cropProfile as any);

        // 7. Build risks from triggered rules
        const risks: Risk[] = ruleResults
          .filter((r) => r.triggered)
          .map((r) => ({
            category: r.category,
            severity: r.severity as Risk['severity'],
            title: r.ruleName,
            description: r.reason,
            evidence: r.evidence,
            confidence: r.confidence,
            triggeredBy: [r.ruleName],
          }));

        // 8. Build recommendations from triggered rules
        const recommendations: Recommendation[] = ruleResults
          .filter((r) => r.triggered)
          .map((r) => ({
            id: r.ruleId,
            category: r.category,
            title: r.ruleName,
            description: rules.find((rule) => rule.id === r.ruleId)?.recommendation || r.reason,
            severity: r.severity === 'extreme' ? 'critical' : r.severity as Recommendation['severity'],
            reason: r.reason,
            evidence: r.evidence,
            confidence: r.confidence,
            validFrom: new Date().toISOString(),
            validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            crop: crop || undefined,
          }));

        // 9. Calculate overall confidence
        const dataCompleteness = assessDataCompleteness(currentWeather);
        const variableCount = assessVariableCount(currentWeather);
        const overallConfidence = calculateConfidence({
          dataCompleteness,
          providerReliability: 0.9,
          forecastHorizon: 0.85,
          variableCount,
          cropProfileMatch: cropProfile ? 0.8 : 0.5,
        });

        // 10. Assemble response
        const response: IntelligenceResponse = {
          location: {
            latitude,
            longitude,
            resolvedName: location?.name,
            state: location?.state,
            lga: location?.lga,
          },
          weather: {
            current: currentWeather as any,
            source: currentWeather.source,
            retrievedAt: currentWeather.retrievedAt,
          },
          risks,
          recommendations,
          confidence: overallConfidence,
          crop: crop || undefined,
          generatedAt: new Date().toISOString(),
        };

        return response;
      } catch (err) {
        log.error(err, 'Intelligence request failed');
        return reply.code(500).send({
          error: 'Internal Error',
          message: 'Failed to generate intelligence. Please try again.',
        });
      }
    },
  });

  // ─── GET /v1/weather/forecast/:lat/:lng — Weather Forecast ────────────
  app.get('/v1/weather/forecast/:lat/:lng', {
    preHandler: [optionalAuth, trackUsage],
    schema: {
      description: 'Get weather forecast for a location',
      tags: ['Weather'],
      params: {
        type: 'object',
        required: ['lat', 'lng'],
        properties: {
          lat: { type: 'number' },
          lng: { type: 'number' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          days: { type: 'integer', minimum: 1, maximum: 16, default: 7 },
        },
      },
    },
    handler: async (request, reply) => {
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

      try {
        const forecast = await weatherProvider.getForecast(latitude, longitude, days || 7);
        return forecast;
      } catch (err) {
        log.error(err, 'Forecast request failed');
        return reply.code(500).send({
          error: 'Internal Error',
          message: 'Failed to retrieve forecast.',
        });
      }
    },
  });

  // ─── GET /v1/location/resolve — Location Resolution ───────────────────
  app.get('/v1/location/resolve', {
    preHandler: [optionalAuth, trackUsage],
    schema: {
      description: 'Resolve a location name to coordinates',
      tags: ['Location'],
      querystring: {
        type: 'object',
        required: ['q'],
        properties: {
          q: { type: 'string', description: 'Location query (e.g. "Lagos, Nigeria")' },
        },
      },
    },
    handler: async (request, reply) => {
      const { q } = request.query as { q: string };

      if (!q || q.trim().length === 0) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Query parameter "q" is required.',
        });
      }

      try {
        const location = await geoProvider.resolveLocation(q);
        if (!location) {
          return reply.code(404).send({
            error: 'Not Found',
            message: `No location found for "${q}".`,
          });
        }
        return location;
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
