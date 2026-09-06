import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db, farms } from '../database/index.js';
import { eq, and, desc, count, sql } from 'drizzle-orm';
import { authenticateApiKey } from '../middleware/auth.js';
import { trackUsage } from '../middleware/usage.js';
import { getWeatherProvider, getGeoProvider } from '../providers/index.js';
import { getCropGrowthProfile } from '../intelligence/growthStages.js';
import { evaluateAdvancedRules } from '../intelligence/rulesEngineV2.js';
import type { RuleContext } from '../intelligence/rulesEngineV2.js';
import { createChildLogger } from '../logger.js';

const log = createChildLogger('routes/farmsV2');

export default async function farmsV2Routes(app: FastifyInstance) {
  const weatherProvider = getWeatherProvider();
  const geoProvider = getGeoProvider();

  // ─── GET /v2/farms/dashboard — Aggregated Dashboard ───────────────────
  app.get('/v2/farms/dashboard', {
    preHandler: [authenticateApiKey, trackUsage],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const key = request.apiKey!;

      try {
        // Get farm count
        const [farmCount] = await db
          .select({ count: count() })
          .from(farms)
          .where(eq(farms.orgId, key.orgId));

        // Get active farms
        const activeFarms = await db
          .select()
          .from(farms)
          .where(and(eq(farms.orgId, key.orgId), eq(farms.status, 'active')))
          .orderBy(desc(farms.createdAt))
          .limit(10);

        // Get crop distribution
        const cropDistribution = await db
          .select({
            crop: farms.crop,
            count: count(),
          })
          .from(farms)
          .where(eq(farms.orgId, key.orgId))
          .groupBy(farms.crop);

        // Total area
        const [areaResult] = await db
          .select({
            totalArea: sql<number>`COALESCE(SUM(${farms.areaHectares}), 0)`,
          })
          .from(farms)
          .where(eq(farms.orgId, key.orgId));

        return {
          summary: {
            totalFarms: farmCount.count,
            activeFarms: activeFarms.length,
            totalAreaHectares: Number(areaResult.totalArea) || 0,
            cropTypes: cropDistribution.length,
          },
          cropDistribution: cropDistribution.map((c) => ({
            crop: c.crop || 'unspecified',
            count: c.count,
          })),
          recentFarms: activeFarms.map((f) => ({
            id: f.id,
            name: f.name,
            latitude: f.latitude,
            longitude: f.longitude,
            crop: f.crop,
            areaHectares: f.areaHectares,
            status: f.status,
            createdAt: f.createdAt,
          })),
        };
      } catch (err) {
        log.error(err, 'Farm dashboard failed');
        return reply.code(500).send({
          error: 'Internal Error',
          message: 'Failed to load farm dashboard.',
        });
      }
    },
  });

  // ─── POST /v2/farms/batch-intelligence — Batch Intelligence ──────────
  app.post('/v2/farms/batch-intelligence', {
    preHandler: [authenticateApiKey, trackUsage],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const key = request.apiKey!;
      const body = request.body as any;
      const farmIds: string[] = body?.farmIds || [];

      if (farmIds.length === 0) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'farmIds array is required (max 10).',
        });
      }

      if (farmIds.length > 10) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Maximum 10 farms per batch request.',
        });
      }

      try {
        const farmResults = await Promise.all(
          farmIds.map(async (farmId) => {
            const [farm] = await db
              .select()
              .from(farms)
              .where(and(eq(farms.id, farmId), eq(farms.orgId, key.orgId)))
              .limit(1);

            if (!farm) return { farmId, error: 'Farm not found' };

            try {
              const weather = await weatherProvider.getCurrentWeather(farm.latitude, farm.longitude);
              const forecast = await weatherProvider.getForecast(farm.latitude, farm.longitude, 7);

              const cropProfile = farm.crop ? getCropGrowthProfile(farm.crop) : undefined;

              const ctx: RuleContext = {
                weather,
                forecast,
                cropProfile: cropProfile || undefined,
              };

              const riskScore = evaluateAdvancedRules(ctx);

              return {
                farmId: farm.id,
                farmName: farm.name,
                crop: farm.crop,
                latitude: farm.latitude,
                longitude: farm.longitude,
                temperatureC: weather.temperatureC,
                humidityPercent: weather.humidityPercent,
                precipitationMm: weather.precipitationMm,
                riskScore: riskScore.overallScore,
                riskSeverity: riskScore.overallSeverity,
                triggeredRules: riskScore.triggeredRules.length,
                summary: riskScore.summary,
              };
            } catch {
              return { farmId: farm.id, farmName: farm.name, error: 'Weather data unavailable' };
            }
          }),
        );

        return {
          count: farmResults.length,
          results: farmResults,
        };
      } catch (err) {
        log.error(err, 'Batch intelligence failed');
        return reply.code(500).send({
          error: 'Internal Error',
          message: 'Failed to generate batch intelligence.',
        });
      }
    },
  });

  // ─── POST /v2/farms/compare — Farm Comparison ────────────────────────
  app.post('/v2/farms/compare', {
    preHandler: [authenticateApiKey, trackUsage],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const key = request.apiKey!;
      const body = request.body as any;
      const farmIds: string[] = body?.farmIds || [];

      if (farmIds.length < 2 || farmIds.length > 5) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Provide 2-5 farmIds for comparison.',
        });
      }

      try {
        const comparisons = await Promise.all(
          farmIds.map(async (farmId) => {
            const [farm] = await db
              .select()
              .from(farms)
              .where(and(eq(farms.id, farmId), eq(farms.orgId, key.orgId)))
              .limit(1);

            if (!farm) return null;

            try {
              const weather = await weatherProvider.getCurrentWeather(farm.latitude, farm.longitude);
              return {
                farmId: farm.id,
                farmName: farm.name,
                crop: farm.crop,
                latitude: farm.latitude,
                longitude: farm.longitude,
                areaHectares: farm.areaHectares,
                temperatureC: weather.temperatureC,
                humidityPercent: weather.humidityPercent,
                windSpeedKmh: weather.windSpeedKmh,
                precipitationMm: weather.precipitationMm,
              };
            } catch {
              return { farmId: farm.id, farmName: farm.name, error: 'Weather unavailable' };
            }
          }),
        );

        return {
          count: comparisons.filter(Boolean).length,
          comparisons: comparisons.filter(Boolean),
        };
      } catch (err) {
        log.error(err, 'Farm comparison failed');
        return reply.code(500).send({
          error: 'Internal Error',
          message: 'Failed to compare farms.',
        });
      }
    },
  });

  // ─── POST /v2/farms/:farmId/notes — Add Farm Note ────────────────────
  app.post('/v2/farms/:farmId/notes', {
    preHandler: [authenticateApiKey, trackUsage],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const key = request.apiKey!;
      const { farmId } = request.params as { farmId: string };
      const body = request.body as any;

      if (!body?.note) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'note field is required.',
        });
      }

      // Verify farm belongs to this org
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

      // Store note (using intelligence_results table as temporary storage until dedicated table exists)
      try {
        await db.insert(intelligenceResults).values({
          requestId: `note:${farmId}:${Date.now()}`,
          latitude: farm.latitude,
          longitude: farm.longitude,
          data: {
            type: 'farm_note',
            farmId,
            note: body.note,
            category: body.category || 'observation',
            images: body.images || [],
          },
          confidence: 1,
        });

        log.info({ farmId, category: body.category }, 'Farm note added');

        return reply.code(201).send({
          success: true,
          message: 'Note added.',
          farmId,
          note: body.note,
          category: body.category || 'observation',
          createdAt: new Date().toISOString(),
        });
      } catch (err) {
        log.error(err, 'Failed to add farm note');
        return reply.code(500).send({
          error: 'Internal Error',
          message: 'Failed to add note.',
        });
      }
    },
  });

  // ─── POST /v2/farms/groups — Create Farm Group ───────────────────────
  app.post('/v2/farms/groups', {
    preHandler: [authenticateApiKey, trackUsage],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const key = request.apiKey!;
      const body = request.body as any;

      if (!body?.name) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Group name is required.',
        });
      }

      // Store group as an organisation-level entity
      // For now, use intelligence_results as temporary storage
      try {
        const groupId = `group:${Date.now()}`;
        await db.insert(intelligenceResults).values({
          requestId: groupId,
          latitude: 0,
          longitude: 0,
          data: {
            type: 'farm_group',
            orgId: key.orgId,
            name: body.name,
            description: body.description || '',
            farmIds: body.farmIds || [],
          },
          confidence: 1,
        });

        return reply.code(201).send({
          id: groupId,
          name: body.name,
          description: body.description || '',
          farmIds: body.farmIds || [],
          createdAt: new Date().toISOString(),
        });
      } catch (err) {
        log.error(err, 'Failed to create farm group');
        return reply.code(500).send({
          error: 'Internal Error',
          message: 'Failed to create group.',
        });
      }
    },
  });
}
