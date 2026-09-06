import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db, farms } from '../database/index.js';
import { eq, and, desc } from 'drizzle-orm';
import { authenticateApiKey } from '../middleware/auth.js';
import { trackUsage } from '../middleware/usage.js';
import { createChildLogger } from '../logger.js';

const log = createChildLogger('routes/farms');

export default async function farmRoutes(app: FastifyInstance) {
  // ─── POST /v1/farms — Create Farm ─────────────────────────────────────
  app.post('/v1/farms', {
    preHandler: [authenticateApiKey, trackUsage],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const key = request.apiKey!;
      const body = request.body as any;

      if (!body?.name || !body?.latitude || !body?.longitude) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'name, latitude, and longitude are required.',
        });
      }

      const lat = parseFloat(body.latitude);
      const lng = parseFloat(body.longitude);

      if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lng) || lng < -180 || lng > 180) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Invalid coordinates. Latitude: -90 to 90, Longitude: -180 to 180.',
        });
      }

      try {
        const [farm] = await db
          .insert(farms)
          .values({
            orgId: key.orgId,
            name: body.name,
            latitude: lat,
            longitude: lng,
            crop: body.crop || null,
            areaHectares: body.areaHectares || null,
            plantingDate: body.plantingDate ? new Date(body.plantingDate) : null,
          })
          .returning();

        log.info({ farmId: farm.id, orgId: key.orgId }, 'Farm created');

        return reply.code(201).send({
          id: farm.id,
          name: farm.name,
          latitude: farm.latitude,
          longitude: farm.longitude,
          crop: farm.crop,
          areaHectares: farm.areaHectares,
          plantingDate: farm.plantingDate,
          status: farm.status,
          createdAt: farm.createdAt,
        });
      } catch (err) {
        log.error(err, 'Failed to create farm');
        return reply.code(500).send({
          error: 'Internal Error',
          message: 'Failed to create farm.',
        });
      }
    },
  });

  // ─── GET /v1/farms — List Farms ───────────────────────────────────────
  app.get('/v1/farms', {
    preHandler: [authenticateApiKey, trackUsage],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const key = request.apiKey!;
      const query = request.query as any;
      const limit = Math.min(parseInt(query.limit) || 50, 100);
      const offset = parseInt(query.offset) || 0;

      try {
        const results = await db
          .select()
          .from(farms)
          .where(eq(farms.orgId, key.orgId))
          .orderBy(desc(farms.createdAt))
          .limit(limit)
          .offset(offset);

        return {
          farms: results,
          pagination: { limit, offset, total: results.length },
        };
      } catch (err) {
        log.error(err, 'Failed to list farms');
        return reply.code(500).send({
          error: 'Internal Error',
          message: 'Failed to list farms.',
        });
      }
    },
  });

  // ─── GET /v1/farms/:farmId — Get Farm ─────────────────────────────────
  app.get('/v1/farms/:farmId', {
    preHandler: [authenticateApiKey, trackUsage],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const key = request.apiKey!;
      const { farmId } = request.params as { farmId: string };

      try {
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

        return farm;
      } catch (err) {
        log.error(err, 'Failed to get farm');
        return reply.code(500).send({
          error: 'Internal Error',
          message: 'Failed to retrieve farm.',
        });
      }
    },
  });

  // ─── PATCH /v1/farms/:farmId — Update Farm ────────────────────────────
  app.patch('/v1/farms/:farmId', {
    preHandler: [authenticateApiKey, trackUsage],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const key = request.apiKey!;
      const { farmId } = request.params as { farmId: string };
      const body = request.body as any;

      try {
        // Verify farm belongs to this org
        const [existing] = await db
          .select()
          .from(farms)
          .where(and(eq(farms.id, farmId), eq(farms.orgId, key.orgId)))
          .limit(1);

        if (!existing) {
          return reply.code(404).send({
            error: 'Not Found',
            message: `Farm ${farmId} not found.`,
          });
        }

        const updates: Record<string, any> = { updatedAt: new Date() };
        if (body.name !== undefined) updates.name = body.name;
        if (body.crop !== undefined) updates.crop = body.crop;
        if (body.areaHectares !== undefined) updates.areaHectares = body.areaHectares;
        if (body.plantingDate !== undefined) updates.plantingDate = new Date(body.plantingDate);
        if (body.status !== undefined) updates.status = body.status;

        const [updated] = await db
          .update(farms)
          .set(updates)
          .where(eq(farms.id, farmId))
          .returning();

        log.info({ farmId }, 'Farm updated');

        return updated;
      } catch (err) {
        log.error(err, 'Failed to update farm');
        return reply.code(500).send({
          error: 'Internal Error',
          message: 'Failed to update farm.',
        });
      }
    },
  });

  // ─── DELETE /v1/farms/:farmId — Delete Farm ───────────────────────────
  app.delete('/v1/farms/:farmId', {
    preHandler: [authenticateApiKey, trackUsage],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const key = request.apiKey!;
      const { farmId } = request.params as { farmId: string };

      try {
        const [deleted] = await db
          .delete(farms)
          .where(and(eq(farms.id, farmId), eq(farms.orgId, key.orgId)))
          .returning({ id: farms.id });

        if (!deleted) {
          return reply.code(404).send({
            error: 'Not Found',
            message: `Farm ${farmId} not found.`,
          });
        }

        log.info({ farmId }, 'Farm deleted');

        return { success: true, message: 'Farm deleted.' };
      } catch (err) {
        log.error(err, 'Failed to delete farm');
        return reply.code(500).send({
          error: 'Internal Error',
          message: 'Failed to delete farm.',
        });
      }
    },
  });
}
