/**
 * CEA Environment Routes
 *
 * Endpoints for managing controlled environment agriculture facilities:
 * - CRUD for environments (greenhouse, hydroponic, vertical farm, etc.)
 * - Sensor data ingestion (single + batch)
 * - CEA intelligence with control recommendations
 * - Control setpoints, energy budget, yield forecast
 * - Nutrient management (hydroponics)
 * - Control action logging
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticateApiKey, optionalAuth } from '../middleware/auth.js';
import { trackUsage } from '../middleware/usage.js';
import { db, environments, environmentCrops, environmentReadings, controlActions, nutrientSchedules } from '../database/index.js';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { getWeatherProvider } from '../providers/index.js';
import { evaluateCEARules, generateControlSetpoints, calculateEnergyBudget, predictYield } from '../intelligence/ceaRulesEngine.js';
import type { CEARuleContext, EnvironmentProfile, EnvironmentReading as CEAReading } from '../intelligence/ceaTypes.js';
import { ENERGY_RATES } from '../intelligence/ceaTypes.js';
import { createChildLogger } from '../logger.js';

const log = createChildLogger('routes/environments');

// ─── In-memory store (MVP fallback when DB is unavailable) ──────────────────

const memStore = new Map<string, any>();
let dbAvailable = true;

async function tryDb<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  if (!dbAvailable) return fallback;
  try {
    return await fn();
  } catch (err) {
    log.warn({ err }, 'DB unavailable, using in-memory fallback');
    dbAvailable = false;
    return fallback;
  }
}

// ─── Routes ────────────────────────────────────────────────────────────────

export default async function environmentRoutes(app: FastifyInstance) {
  const weatherProvider = getWeatherProvider();

  // ══════════════════════════════════════════════════════════════════════════
  // ENVIRONMENT CRUD
  // ══════════════════════════════════════════════════════════════════════════

  // ─── POST /v2/environments — Register a CEA environment ──────────────
  app.post('/v2/environments', {
    preHandler: [authenticateApiKey, trackUsage],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as any;
      const key = request.apiKey!;

      const {
        name, type, latitude, longitude, altitude,
        infrastructure, sensors, farmId, crops,
      } = body;

      if (!name || !type || latitude === undefined || longitude === undefined) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Required fields: name, type, latitude, longitude.',
        });
      }

      const validTypes = ['greenhouse', 'shade_house', 'hydroponic', 'aeroponic', 'vertical_farm', 'screen_house'];
      if (!validTypes.includes(type)) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: `Invalid environment type. Must be one of: ${validTypes.join(', ')}`,
        });
      }

      // Default infrastructure/sensors if not provided
      const defaultInfra = {
        coverType: 'plastic_film', coverOpacity: 0.5, areaM2: 100, heightM: 3,
        ventilationType: 'natural', coolingType: 'none', heatingType: 'none',
        hasCO2Injection: false, hasDehumidifier: false,
        hasSupplementalLighting: false, lightSource: 'none',
        irrigationType: 'drip', hasRecirculation: false,
        hasGenerator: false, hasSolarPanels: false, gridConnected: true,
      };

      const defaultSensors = {
        hasTemperature: true, hasHumidity: true, hasCO2: false,
        hasLightIntensity: false, hasSoilMoisture: false, hasSoilTemperature: false,
        hasEC: false, hasPH: false, hasWaterTemperature: false, hasWindSpeed: false,
      };

      const envId = crypto.randomUUID();
      const now = new Date().toISOString();
      const envRecord = {
        id: envId,
        orgId: key.orgId,
        farmId: farmId || null,
        name,
        type,
        latitude,
        longitude,
        altitude: altitude || null,
        infrastructure: { ...defaultInfra, ...infrastructure },
        sensors: { ...defaultSensors, ...sensors },
        status: 'active',
        createdAt: now,
        updatedAt: now,
      };

      // Store crops
      const cropRecords = (crops || []).map((c: any) => ({
        id: crypto.randomUUID(),
        environmentId: envId,
        cropName: c.cropName,
        variety: c.variety || null,
        plantingDate: c.plantingDate || now,
        areaM2: c.areaM2 || 10,
        density: c.density || 4,
        growthStage: c.growthStage || 'vegetative',
        substrate: c.substrate || null,
        nutrientRecipe: c.nutrientRecipe || null,
        createdAt: now,
      }));

      await tryDb(
        () => db.insert(environments).values(envRecord).returning(),
        [envRecord],
      );

      if (cropRecords.length > 0) {
        await tryDb(
          () => db.insert(environmentCrops).values(cropRecords).returning(),
          cropRecords,
        );
      }

      // Also store in memory for quick access
      memStore.set(envId, { ...envRecord, crops: cropRecords });

      log.info({ envId, name, type }, 'CEA environment created');

      return reply.code(201).send({
        id: envId,
        name,
        type,
        location: { latitude, longitude, altitude },
        infrastructure: envRecord.infrastructure,
        sensors: envRecord.sensors,
        crops: cropRecords.map((c: any) => ({
          cropName: c.cropName,
          variety: c.variety,
          areaM2: c.areaM2,
          density: c.density,
          growthStage: c.growthStage,
        })),
        status: 'active',
        createdAt: now,
      });
    },
  });

  // ─── GET /v2/environments — List all environments ─────────────────────
  app.get('/v2/environments', {
    preHandler: [authenticateApiKey, trackUsage],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const key = request.apiKey!;

      let rows = await tryDb(
        () => db.select().from(environments).where(eq(environments.orgId, key.orgId)),
        [],
      );

      // Merge with memory store for environments created in this session
      if (rows.length === 0) {
        rows = Array.from(memStore.values()).filter((e: any) => e.orgId === key.orgId);
      }

      return {
        count: rows.length,
        environments: rows.map((r: any) => ({
          id: r.id,
          name: r.name,
          type: r.type,
          location: { latitude: r.latitude, longitude: r.longitude, altitude: r.altitude },
          areaM2: (r.infrastructure as any)?.areaM2,
          status: r.status,
          createdAt: r.createdAt,
        })),
      };
    },
  });

  // ─── GET /v2/environments/:id — Get environment details ──────────────
  app.get('/v2/environments/:id', {
    preHandler: [authenticateApiKey, trackUsage],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      let env = memStore.get(id);
      if (!env) {
        const rows = await tryDb(
          () => db.select().from(environments).where(eq(environments.id, id)),
          [],
        );
        env = rows[0];
      }

      if (!env) {
        return reply.code(404).send({ error: 'Not Found', message: `Environment "${id}" not found.` });
      }

      // Fetch crops
      const crops = await tryDb(
        () => db.select().from(environmentCrops).where(eq(environmentCrops.environmentId, id)),
        memStore.get(id)?.crops || [],
      );

      return {
        ...env,
        crops,
      };
    },
  });

  // ─── PATCH /v2/environments/:id — Update environment ─────────────────
  app.patch('/v2/environments/:id', {
    preHandler: [authenticateApiKey, trackUsage],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const body = request.body as any;

      let env = memStore.get(id);
      if (!env) {
        const rows = await tryDb(
          () => db.select().from(environments).where(eq(environments.id, id)),
          [],
        );
        env = rows[0];
      }

      if (!env) {
        return reply.code(404).send({ error: 'Not Found', message: `Environment "${id}" not found.` });
      }

      const updates: Record<string, any> = {};
      if (body.name) updates.name = body.name;
      if (body.infrastructure) updates.infrastructure = { ...env.infrastructure, ...body.infrastructure };
      if (body.sensors) updates.sensors = { ...env.sensors, ...body.sensors };
      if (body.status) updates.status = body.status;
      if (body.farmId !== undefined) updates.farmId = body.farmId;
      updates.updatedAt = new Date().toISOString();

      await tryDb(
        () => db.update(environments).set(updates).where(eq(environments.id, id)),
        null,
      );

      memStore.set(id, { ...env, ...updates });

      return { id, ...updates };
    },
  });

  // ─── DELETE /v2/environments/:id — Delete environment ────────────────
  app.delete('/v2/environments/:id', {
    preHandler: [authenticateApiKey, trackUsage],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      await tryDb(
        () => db.delete(environments).where(eq(environments.id, id)),
        null,
      );

      memStore.delete(id);

      return { deleted: true, id };
    },
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SENSOR DATA INGESTION
  // ══════════════════════════════════════════════════════════════════════════

  // ─── POST /v2/environments/:id/readings — Submit sensor readings ────
  app.post('/v2/environments/:id/readings', {
    preHandler: [authenticateApiKey, trackUsage],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const body = request.body as any;

      const env = memStore.get(id);
      if (!env) {
        return reply.code(404).send({ error: 'Not Found', message: `Environment "${id}" not found.` });
      }

      // Support both single and batch
      const readings = Array.isArray(body.readings) ? body.readings : [body];

      const inserted = await tryDb(
        async () => {
          const values = readings.map((r: any) => ({
            id: crypto.randomUUID(),
            environmentId: id,
            timestamp: r.timestamp || new Date().toISOString(),
            indoorTemperatureC: r.indoorTemperatureC,
            indoorHumidityPercent: r.indoorHumidityPercent,
            indoorCO2Ppm: r.indoorCO2Ppm,
            indoorLightLux: r.indoorLightLux,
            rootZoneTemperatureC: r.rootZoneTemperatureC,
            soilMoisturePercent: r.soilMoisturePercent,
            waterTemperatureC: r.waterTemperatureC,
            waterPH: r.waterPH,
            waterEC: r.waterEC,
            outdoorTemperatureC: r.outdoorTemperatureC,
            outdoorHumidityPercent: r.outdoorHumidityPercent,
            outdoorWindSpeedKmh: r.outdoorWindSpeedKmh,
            powerConsumptionKWh: r.powerConsumptionKWh,
            source: r.source || 'manual',
          }));
          return db.insert(environmentReadings).values(values).returning();
        },
        readings.map((r: any) => ({
          id: crypto.randomUUID(),
          environmentId: id,
          ...r,
          source: r.source || 'manual',
        })),
      );

      return reply.code(201).send({
        accepted: inserted.length,
        readings: inserted,
      });
    },
  });

  // ─── GET /v2/environments/:id/readings — Get historical readings ─────
  app.get('/v2/environments/:id/readings', {
    preHandler: [authenticateApiKey, trackUsage],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const query = request.query as any;
      const { from, to, limit = 100 } = query;

      const conditions = [eq(environmentReadings.environmentId, id)];
      if (from) conditions.push(gte(environmentReadings.timestamp, new Date(from)));
      if (to) conditions.push(lte(environmentReadings.timestamp, new Date(to)));

      const rows = await tryDb(
        () => db
          .select()
          .from(environmentReadings)
          .where(conditions.length > 1 ? and(...conditions) : conditions[0])
          .orderBy(desc(environmentReadings.timestamp))
          .limit(Math.min(parseInt(limit, 10) || 100, 1000)),
        [],
      );

      return {
        environmentId: id,
        count: rows.length,
        readings: rows,
      };
    },
  });

  // ─── POST /v2/environments/:id/readings/batch — Batch sensor data ────
  app.post('/v2/environments/:id/readings/batch', {
    preHandler: [authenticateApiKey, trackUsage],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      // Reuse the single readings endpoint logic
      const { id } = request.params as { id: string };
      const body = request.body as { readings: any[] };

      if (!body.readings || !Array.isArray(body.readings)) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Request body must contain a "readings" array.',
        });
      }

      const env = memStore.get(id);
      if (!env) {
        return reply.code(404).send({ error: 'Not Found', message: `Environment "${id}" not found.` });
      }

      const inserted = await tryDb(
        async () => {
          const values = body.readings.map((r: any) => ({
            id: crypto.randomUUID(),
            environmentId: id,
            timestamp: r.timestamp || new Date().toISOString(),
            indoorTemperatureC: r.indoorTemperatureC,
            indoorHumidityPercent: r.indoorHumidityPercent,
            indoorCO2Ppm: r.indoorCO2Ppm,
            indoorLightLux: r.indoorLightLux,
            rootZoneTemperatureC: r.rootZoneTemperatureC,
            soilMoisturePercent: r.soilMoisturePercent,
            waterTemperatureC: r.waterTemperatureC,
            waterPH: r.waterPH,
            waterEC: r.waterEC,
            outdoorTemperatureC: r.outdoorTemperatureC,
            outdoorHumidityPercent: r.outdoorHumidityPercent,
            outdoorWindSpeedKmh: r.outdoorWindSpeedKmh,
            powerConsumptionKWh: r.powerConsumptionKWh,
            source: r.source || 'sensor',
          }));
          return db.insert(environmentReadings).values(values).returning();
        },
        body.readings.map((r: any) => ({
          id: crypto.randomUUID(),
          environmentId: id,
          ...r,
          source: r.source || 'sensor',
        })),
      );

      return reply.code(201).send({
        accepted: inserted.length,
      });
    },
  });

  // ══════════════════════════════════════════════════════════════════════════
  // CEA INTELLIGENCE
  // ══════════════════════════════════════════════════════════════════════════

  // ─── POST /v2/environments/:id/intelligence — Full CEA intelligence ──
  app.post('/v2/environments/:id/intelligence', {
    preHandler: [authenticateApiKey, trackUsage],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      const env = memStore.get(id);
      if (!env) {
        return reply.code(404).send({ error: 'Not Found', message: `Environment "${id}" not found.` });
      }

      // Fetch latest reading
      const latestReadings = await tryDb(
        () => db
          .select()
          .from(environmentReadings)
          .where(eq(environmentReadings.environmentId, id))
          .orderBy(desc(environmentReadings.timestamp))
          .limit(1),
        [],
      );

      const latestReading = latestReadings[0] || undefined;

      // Fetch recent readings for trend
      const previousReadings = await tryDb(
        () => db
          .select()
          .from(environmentReadings)
          .where(eq(environmentReadings.environmentId, id))
          .orderBy(desc(environmentReadings.timestamp))
          .limit(50),
        [],
      );

      // Get outdoor weather
      let outdoorWeather: any;
      try {
        const weather = await weatherProvider.getCurrentWeather(env.latitude, env.longitude);
        outdoorWeather = {
          temperatureC: weather.temperatureC,
          humidityPercent: weather.humidityPercent,
          windSpeedKmh: weather.windSpeedKmh || 0,
          cloudCoverPercent: weather.cloudCoverPercent || 50,
          solarRadiationWm2: 650, // estimate
        };
      } catch {
        outdoorWeather = {
          temperatureC: 30,
          humidityPercent: 65,
          windSpeedKmh: 10,
          cloudCoverPercent: 50,
          solarRadiationWm2: 650,
        };
      }

      // Build CEA rule context
      const ruleCtx: CEARuleContext = {
        environment: env as EnvironmentProfile,
        latestReading: latestReading as CEAReading | undefined,
        previousReadings: previousReadings as CEAReading[],
        outdoorWeather,
        energyRateNGNPerKWh: ENERGY_RATES.gridBandA,
      };

      // Evaluate rules
      const riskScore = evaluateCEARules(ruleCtx);

      // Generate setpoints
      const { setpoints, rationale } = generateControlSetpoints(env, latestReading as CEAReading | undefined);

      // Energy budget
      const energyBudget = calculateEnergyBudget(env, outdoorWeather);

      // Yield forecast
      const yieldForecast = predictYield(env, latestReading as CEAReading | undefined);

      // Build alerts from triggered rules
      const alerts = riskScore.triggeredRules
        .filter((r) => r.severity === 'high' || r.severity === 'critical')
        .map((r) => ({
          type: r.controlType,
          severity: r.severity,
          message: r.description,
          recommendedAction: r.recommendation,
        }));

      // Build intelligence response
      const response: any = {
        environment: {
          id: env.id,
          name: env.name,
          type: env.type,
          location: { latitude: env.latitude, longitude: env.longitude, altitude: env.altitude },
        },
        outdoorConditions: outdoorWeather,
        indoorConditions: {
          temperatureC: latestReading?.indoorTemperatureC,
          humidityPercent: latestReading?.indoorHumidityPercent,
          co2Ppm: latestReading?.indoorCO2Ppm,
          lightLux: latestReading?.indoorLightLux,
          waterPH: latestReading?.waterPH,
          waterEC: latestReading?.waterEC,
        },
        controlRecommendations: riskScore.triggeredRules.map((r) => ({
          controlType: r.controlType,
          action: r.action,
          priority: r.severity,
          reason: r.recommendation,
          expectedImpact: r.expectedImpact,
          energyCostNGN: r.energyCostNGN,
        })),
        controlSetpoints: { setpoints, rationale },
        energyBudget,
        yieldForecast,
        alerts,
        riskScore: {
          overall: riskScore.overallScore,
          severity: riskScore.overallSeverity,
          totalEnergyCostNGN: riskScore.totalEnergyCostNGN,
          summary: riskScore.summary,
        },
        confidence: latestReading ? 85 : 50,
        generatedAt: new Date().toISOString(),
      };

      return response;
    },
  });

  // ─── GET /v2/environments/:id/control-setpoints — Recommended settings ─
  app.get('/v2/environments/:id/control-setpoints', {
    preHandler: [authenticateApiKey, trackUsage],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      const env = memStore.get(id);
      if (!env) {
        return reply.code(404).send({ error: 'Not Found', message: `Environment "${id}" not found.` });
      }

      const latestReadings = await tryDb(
        () => db
          .select()
          .from(environmentReadings)
          .where(eq(environmentReadings.environmentId, id))
          .orderBy(desc(environmentReadings.timestamp))
          .limit(1),
        [],
      );

      const latestReading = latestReadings[0] || undefined;
      const { setpoints, rationale } = generateControlSetpoints(env, latestReading as CEAReading | undefined);

      const cropName = env.crops?.[0]?.cropName || 'tomato';
      const growthStage = env.crops?.[0]?.growthStage || 'vegetative';

      return {
        environmentId: id,
        crop: cropName,
        growthStage,
        timestamp: new Date().toISOString(),
        setpoints,
        rationale,
      };
    },
  });

  // ─── GET /v2/environments/:id/energy-budget — Energy cost forecast ───
  app.get('/v2/environments/:id/energy-budget', {
    preHandler: [authenticateApiKey, trackUsage],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      const env = memStore.get(id);
      if (!env) {
        return reply.code(404).send({ error: 'Not Found', message: `Environment "${id}" not found.` });
      }

      let outdoorWeather;
      try {
        const weather = await weatherProvider.getCurrentWeather(env.latitude, env.longitude);
        outdoorWeather = {
          temperatureC: weather.temperatureC,
          cloudCoverPercent: (weather as any).cloudCoverPercent || 50,
        };
      } catch {
        outdoorWeather = { temperatureC: 30, cloudCoverPercent: 50 };
      }

      const budget = calculateEnergyBudget(env, outdoorWeather);

      return {
        environmentId: id,
        period: 'today',
        ...budget,
        electricityRateNGNPerKWh: ENERGY_RATES.gridBandA,
        generatedAt: new Date().toISOString(),
      };
    },
  });

  // ─── GET /v2/environments/:id/yield-forecast — Expected yield ────────
  app.get('/v2/environments/:id/yield-forecast', {
    preHandler: [authenticateApiKey, trackUsage],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      const env = memStore.get(id);
      if (!env) {
        return reply.code(404).send({ error: 'Not Found', message: `Environment "${id}" not found.` });
      }

      const latestReadings = await tryDb(
        () => db
          .select()
          .from(environmentReadings)
          .where(eq(environmentReadings.environmentId, id))
          .orderBy(desc(environmentReadings.timestamp))
          .limit(1),
        [],
      );

      const forecast = predictYield(env, latestReadings[0] as CEAReading | undefined);

      if (!forecast) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'No crops registered for this environment. Add a crop first.',
        });
      }

      return { environmentId: id, ...forecast };
    },
  });

  // ─── POST /v2/environments/batch-intelligence — Multiple facilities ──
  app.post('/v2/environments/batch-intelligence', {
    preHandler: [authenticateApiKey, trackUsage],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as { environmentIds: string[] };

      if (!body.environmentIds || !Array.isArray(body.environmentIds)) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Request body must contain an "environmentIds" array.',
        });
      }

      const results = await Promise.allSettled(
        body.environmentIds.map(async (envId) => {
          const env = memStore.get(envId);
          if (!env) return { environmentId: envId, error: 'Not found' };

          const latestReadings = await tryDb(
            () => db
              .select()
              .from(environmentReadings)
              .where(eq(environmentReadings.environmentId, envId))
              .orderBy(desc(environmentReadings.timestamp))
              .limit(1),
            [],
          );

          const ruleCtx: CEARuleContext = {
            environment: env as EnvironmentProfile,
            latestReading: latestReadings[0] as CEAReading | undefined,
            previousReadings: [],
            energyRateNGNPerKWh: ENERGY_RATES.gridBandA,
          };

          const riskScore = evaluateCEARules(ruleCtx);
          return {
            environmentId: envId,
            name: env.name,
            type: env.type,
            riskScore: riskScore.overallScore,
            severity: riskScore.overallSeverity,
            triggeredRules: riskScore.triggeredRules.length,
            summary: riskScore.summary,
          };
        }),
      );

      return {
        count: results.length,
        results: results.map((r) => (r.status === 'fulfilled' ? r.value : { error: r.reason?.message })),
      };
    },
  });

  // ══════════════════════════════════════════════════════════════════════════
  // CONTROL LOG
  // ══════════════════════════════════════════════════════════════════════════

  // ─── POST /v2/environments/:id/control-log — Record a control action ─
  app.post('/v2/environments/:id/control-log', {
    preHandler: [authenticateApiKey, trackUsage],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const body = request.body as any;

      if (!body.controlType || !body.action) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Required fields: controlType, action.',
        });
      }

      const logEntry = {
        id: crypto.randomUUID(),
        environmentId: id,
        timestamp: body.timestamp || new Date().toISOString(),
        controlType: body.controlType,
        action: body.action,
        beforeState: body.beforeState || null,
        afterState: body.afterState || null,
        triggeredBy: body.triggeredBy || 'manual',
        recommendationId: body.recommendationId || null,
      };

      await tryDb(
        () => db.insert(controlActions).values(logEntry).returning(),
        logEntry,
      );

      return reply.code(201).send(logEntry);
    },
  });

  // ─── GET /v2/environments/:id/control-log — Historical control actions ─
  app.get('/v2/environments/:id/control-log', {
    preHandler: [authenticateApiKey, trackUsage],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const query = request.query as any;
      const { limit = 50 } = query;

      const rows = await tryDb(
        () => db
          .select()
          .from(controlActions)
          .where(eq(controlActions.environmentId, id))
          .orderBy(desc(controlActions.timestamp))
          .limit(Math.min(parseInt(limit, 10) || 50, 500)),
        [],
      );

      return { environmentId: id, count: rows.length, actions: rows };
    },
  });

  // ══════════════════════════════════════════════════════════════════════════
  // NUTRIENT MANAGEMENT
  // ══════════════════════════════════════════════════════════════════════════

  // ─── GET /v2/environments/:id/nutrients — Current nutrient schedule ──
  app.get('/v2/environments/:id/nutrients', {
    preHandler: [authenticateApiKey, trackUsage],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      const rows = await tryDb(
        () => db
          .select()
          .from(nutrientSchedules)
          .where(eq(nutrientSchedules.environmentId, id))
          .orderBy(desc(nutrientSchedules.createdAt))
          .limit(1),
        [],
      );

      if (rows.length === 0) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'No nutrient schedule found for this environment.',
        });
      }

      return { environmentId: id, schedule: rows[0] };
    },
  });

  // ─── POST /v2/environments/:id/nutrients — Update nutrient recipe ────
  app.post('/v2/environments/:id/nutrients', {
    preHandler: [authenticateApiKey, trackUsage],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const body = request.body as any;

      if (!body.cropName || !body.solution) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Required fields: cropName, solution.',
        });
      }

      const schedule = {
        id: crypto.randomUUID(),
        environmentId: id,
        cropName: body.cropName,
        growthStage: body.growthStage || 'vegetative',
        solution: body.solution,
        irrigationSchedule: body.irrigationSchedule || { frequency: '3x_daily', durationMinutes: 15 },
        validFrom: body.validFrom || new Date().toISOString(),
        validUntil: body.validUntil || null,
      };

      await tryDb(
        () => db.insert(nutrientSchedules).values(schedule).returning(),
        schedule,
      );

      return reply.code(201).send(schedule);
    },
  });

  // ─── GET /v2/environments/:id/analytics — Performance analytics ─────
  app.get('/v2/environments/:id/analytics', {
    preHandler: [authenticateApiKey, trackUsage],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      const env = memStore.get(id);
      if (!env) {
        return reply.code(404).send({ error: 'Not Found', message: `Environment "${id}" not found.` });
      }

      // Get all readings for analytics
      const readings = await tryDb(
        () => db
          .select()
          .from(environmentReadings)
          .where(eq(environmentReadings.environmentId, id))
          .orderBy(desc(environmentReadings.timestamp))
          .limit(500),
        [],
      );

      // Get control actions
      const actions = await tryDb(
        () => db
          .select()
          .from(controlActions)
          .where(eq(controlActions.environmentId, id))
          .orderBy(desc(controlActions.timestamp))
          .limit(200),
        [],
      );

      // Calculate averages
      const avgTemp = readings.length > 0
        ? readings.filter((r: any) => r.indoorTemperatureC != null).reduce((sum: number, r: any) => sum + r.indoorTemperatureC, 0) /
          readings.filter((r: any) => r.indoorTemperatureC != null).length || 0
        : 0;

      const avgHumidity = readings.length > 0
        ? readings.filter((r: any) => r.indoorHumidityPercent != null).reduce((sum: number, r: any) => sum + r.indoorHumidityPercent, 0) /
          readings.filter((r: any) => r.indoorHumidityPercent != null).length || 0
        : 0;

      const totalEnergy = readings.reduce((sum: number, r: any) => sum + (r.powerConsumptionKWh || 0), 0);

      return {
        environmentId: id,
        name: env.name,
        type: env.type,
        period: {
          from: readings.length > 0 ? readings[readings.length - 1].timestamp : null,
          to: readings.length > 0 ? readings[0].timestamp : null,
        },
        averages: {
          indoorTemperatureC: Math.round(avgTemp * 10) / 10,
          indoorHumidityPercent: Math.round(avgHumidity * 10) / 10,
        },
        totalReadings: readings.length,
        totalControlActions: actions.length,
        totalEnergyKWh: Math.round(totalEnergy * 10) / 10,
        controlActionsByType: actions.reduce((acc: Record<string, number>, a: any) => {
          acc[a.controlType] = (acc[a.controlType] || 0) + 1;
          return acc;
        }, {}),
      };
    },
  });

  // ─── GET /v2/environments/comparison — Compare multiple facilities ────
  app.get('/v2/environments/comparison', {
    preHandler: [authenticateApiKey, trackUsage],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const key = request.apiKey!;
      const query = request.query as any;
      const ids = query.ids ? query.ids.split(',') : [];

      if (ids.length < 2) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Provide at least 2 environment IDs via ?ids=env1,env2',
        });
      }

      const comparisons = await Promise.all(
        ids.map(async (envId: string) => {
          const env = memStore.get(envId);
          if (!env) return { environmentId: envId, error: 'Not found' };

          const latestReadings = await tryDb(
            () => db
              .select()
              .from(environmentReadings)
              .where(eq(environmentReadings.environmentId, envId))
              .orderBy(desc(environmentReadings.timestamp))
              .limit(1),
            [],
          );

          const latest = latestReadings[0];
          return {
            environmentId: envId,
            name: env.name,
            type: env.type,
            areaM2: (env.infrastructure as any)?.areaM2,
            indoorTemperatureC: latest?.indoorTemperatureC,
            indoorHumidityPercent: latest?.indoorHumidityPercent,
            indoorCO2Ppm: latest?.indoorCO2Ppm,
            waterPH: latest?.waterPH,
            waterEC: latest?.waterEC,
          };
        }),
      );

      return { count: comparisons.length, comparisons };
    },
  });
}
