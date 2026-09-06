import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getWeatherProvider, getGeoProvider } from '../providers/index.js';
import { db, agriculturalRules, cropProfiles, farms } from '../database/index.js';
import { eq, and } from 'drizzle-orm';
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

  // ─── GET /v1/farms/:farmId/intelligence — Farm Intelligence ───────────
  app.get('/v1/farms/:farmId/intelligence', {
    preHandler: [authenticateApiKey, trackUsage],
    schema: {
      description: 'Get agricultural intelligence for a registered farm',
      tags: ['Intelligence', 'Farms'],
    },
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const key = request.apiKey!;
      const { farmId } = request.params as { farmId: string };

      try {
        // Get the farm
        const [farm] = await db
          .select()
          .from(farms)
          .where(and(eq(farms.id, farmId), eq(farms.orgId, key.orgId)))
          .limit(1);

        if (!farm) {
          return reply.code(404).send({
            error: 'Not Found',
            message: `Farm ${farmId} not found.`,
          });
        }

        // Get weather for the farm's coordinates
        const currentWeather = await weatherProvider.getCurrentWeather(
          farm.latitude, farm.longitude
        );
        const forecast = await weatherProvider.getForecast(
          farm.latitude, farm.longitude, 7
        );
        const location = await geoProvider.reverseGeocode(
          farm.latitude, farm.longitude
        );

        // Get crop profile if farm has a crop
        let cropProfile = null;
        if (farm.crop) {
          const [profile] = await db
            .select()
            .from(cropProfiles)
            .where(eq(cropProfiles.name, farm.crop))
            .limit(1);
          cropProfile = profile || null;
        }

        // Get and evaluate rules
        const rules = await db
          .select()
          .from(agriculturalRules)
          .where(eq(agriculturalRules.enabled, true));

        const ruleResults = evaluateRules(
          rules as any, currentWeather, forecast, cropProfile as any
        );

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
            crop: farm.crop || undefined,
          }));

        const dataCompleteness = assessDataCompleteness(currentWeather);
        const variableCount = assessVariableCount(currentWeather);
        const overallConfidence = calculateConfidence({
          dataCompleteness,
          providerReliability: 0.9,
          forecastHorizon: 0.85,
          variableCount,
          cropProfileMatch: cropProfile ? 0.8 : 0.5,
        });

        return {
          farm: {
            id: farm.id,
            name: farm.name,
            crop: farm.crop,
            areaHectares: farm.areaHectares,
            plantingDate: farm.plantingDate,
          },
          location: {
            latitude: farm.latitude,
            longitude: farm.longitude,
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
          crop: farm.crop || undefined,
          generatedAt: new Date().toISOString(),
        };
      } catch (err) {
        log.error(err, 'Farm intelligence request failed');
        return reply.code(500).send({
          error: 'Internal Error',
          message: 'Failed to generate farm intelligence.',
        });
      }
    },
  });

  // ─── GET /v1/farm/:lat/:lng/season — Season Assessment ───────────────
  app.get('/v1/farm/:lat/:lng/season', {
    preHandler: [optionalAuth, trackUsage],
    schema: {
      description: 'Get current season assessment for a location',
      tags: ['Intelligence'],
    },
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { lat, lng } = request.params as { lat: string; lng: string };
      const { crop } = request.query as any;
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);

      if (isNaN(latitude) || isNaN(longitude)) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Invalid coordinates.',
        });
      }

      try {
        const location = await geoProvider.reverseGeocode(latitude, longitude);
        const weather = await weatherProvider.getCurrentWeather(latitude, longitude);
        const forecast = await weatherProvider.getForecast(latitude, longitude, 14);

        // Determine Nigerian agricultural season based on date and location
        const now = new Date();
        const month = now.getMonth() + 1; // 1-indexed

        // Nigerian growing seasons vary by zone
        let season = 'unknown';
        let seasonDescription = '';
        let plantingAdvice = '';

        if (month >= 3 && month <= 5) {
          season = 'early_rainy';
          seasonDescription = 'Early rainy season — onset of rains in southern Nigeria.';
          plantingAdvice = 'Prepare fields. Early crops (cassava, yam) can be planted in the south.';
        } else if (month >= 6 && month <= 7) {
          season = 'peak_rainy';
          seasonDescription = 'Peak rainy season — consistent rainfall across most regions.';
          plantingAdvice = 'Main planting window for maize, rice, sorghum, millet, and legumes.';
        } else if (month >= 8 && month <= 9) {
          season = 'late_rainy';
          seasonDescription = 'Late rainy season — rains beginning to retreat from the north.';
          plantingAdvice = 'Late planting only for short-duration crops. Focus on crop maintenance.';
        } else if (month >= 10 && month <= 11) {
          season = 'early_dry';
          seasonDescription = 'Early dry season — harvest period for most rain-fed crops.';
          plantingAdvice = 'Harvest time. Dry-season irrigation farming can begin.';
        } else if (month >= 12 || month <= 2) {
          season = 'dry';
          seasonDescription = 'Dry season — little to no rainfall across most regions.';
          plantingAdvice = 'Dry-season farming with irrigation (tomatoes, peppers, onions, wheat).';
        }

        // Get crop-specific planting window if crop is specified
        let cropWindow = null;
        if (crop) {
          const [profile] = await db
            .select()
            .from(cropProfiles)
            .where(eq(cropProfiles.name, crop))
            .limit(1);

          if (profile) {
            cropWindow = {
              crop: profile.name,
              displayName: profile.displayName,
              minRainfallMm: profile.rainfallMinMm,
              maxRainfallMm: profile.rainfallMaxMm,
              tempRange: { min: profile.minTemperatureC, max: profile.maxTemperatureC },
              waterSensitivity: profile.waterSensitivity,
            };
          }
        }

        return {
          location: {
            latitude,
            longitude,
            state: location?.state,
          },
          season: {
            current: season,
            description: seasonDescription,
            month,
            plantingAdvice,
          },
          currentConditions: {
            temperatureC: weather.temperatureC,
            humidityPercent: weather.humidityPercent,
            precipitationMm: weather.precipitationMm,
          },
          forecast: {
            days: forecast.days.length,
            summary: forecast.days.slice(0, 7).map((d) => ({
              date: d.date,
              maxTempC: d.temperatureMaxC,
              minTempC: d.temperatureMinC,
              precipitationMm: d.precipitationMm,
            })),
          },
          cropProfile: cropWindow,
          generatedAt: new Date().toISOString(),
        };
      } catch (err) {
        log.error(err, 'Season assessment failed');
        return reply.code(500).send({
          error: 'Internal Error',
          message: 'Failed to generate season assessment.',
        });
      }
    },
  });

  // ─── GET /v1/farm/:lat/:lng/alerts — Active Alerts ───────────────────
  app.get('/v1/farm/:lat/:lng/alerts', {
    preHandler: [optionalAuth, trackUsage],
    schema: {
      description: 'Get active and upcoming agricultural alerts for a location',
      tags: ['Intelligence'],
    },
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { lat, lng } = request.params as { lat: string; lng: string };
      const { crop } = request.query as any;
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);

      if (isNaN(latitude) || isNaN(longitude)) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Invalid coordinates.',
        });
      }

      try {
        const currentWeather = await weatherProvider.getCurrentWeather(latitude, longitude);
        const forecast = await weatherProvider.getForecast(latitude, longitude, 7);

        let cropProfile = null;
        if (crop) {
          const [profile] = await db
            .select()
            .from(cropProfiles)
            .where(eq(cropProfiles.name, crop))
            .limit(1);
          cropProfile = profile || null;
        }

        const rules = await db
          .select()
          .from(agriculturalRules)
          .where(eq(agriculturalRules.enabled, true));

        const ruleResults = evaluateRules(
          rules as any, currentWeather, forecast, cropProfile as any
        );

        const alerts = ruleResults
          .filter((r) => r.triggered)
          .map((r) => {
            const rule = rules.find((rule) => rule.id === r.ruleId);
            return {
              id: r.ruleId,
              type: r.category,
              severity: r.severity,
              title: r.ruleName,
              message: r.reason,
              recommendedAction: rule?.recommendation || null,
              confidence: r.confidence,
              startsAt: new Date().toISOString(),
              endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            };
          });

        return {
          location: { latitude, longitude },
          alerts,
          total: alerts.length,
          generatedAt: new Date().toISOString(),
        };
      } catch (err) {
        log.error(err, 'Alerts request failed');
        return reply.code(500).send({
          error: 'Internal Error',
          message: 'Failed to retrieve alerts.',
        });
      }
    },
  });
}
