import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db, webhooks } from '../database/index.js';
import { eq, and } from 'drizzle-orm';
import { authenticateApiKey } from '../middleware/auth.js';
import { trackUsage } from '../middleware/usage.js';
import { queueWebhook } from '../webhooks/delivery.js';
import crypto from 'crypto';
import { createChildLogger } from '../logger.js';

const log = createChildLogger('routes/webhooks');

export default async function webhookRoutes(app: FastifyInstance) {
  // ─── POST /v1/webhooks — Create Webhook ───────────────────────────────
  app.post('/v1/webhooks', {
    preHandler: [authenticateApiKey, trackUsage],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const key = request.apiKey!;
      const body = request.body as any;

      if (!body?.url || !body?.events) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'url and events are required.',
        });
      }

      const secret = crypto.randomBytes(32).toString('hex');

      try {
        const [webhook] = await db
          .insert(webhooks)
          .values({
            orgId: key.orgId,
            url: body.url,
            events: body.events,
            secret,
          })
          .returning();

        log.info({ webhookId: webhook.id, orgId: key.orgId }, 'Webhook created');

        return reply.code(201).send({
          id: webhook.id,
          url: webhook.url,
          events: webhook.events,
          secret, // shown once
          active: webhook.active,
          createdAt: webhook.createdAt,
          _warning: 'Save the webhook secret. It will not be shown again.',
        });
      } catch (err) {
        log.error(err, 'Failed to create webhook');
        return reply.code(500).send({
          error: 'Internal Error',
          message: 'Failed to create webhook.',
        });
      }
    },
  });

  // ─── GET /v1/webhooks — List Webhooks ─────────────────────────────────
  app.get('/v1/webhooks', {
    preHandler: [authenticateApiKey, trackUsage],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const key = request.apiKey!;

      try {
        const results = await db
          .select()
          .from(webhooks)
          .where(eq(webhooks.orgId, key.orgId));

        return { webhooks: results };
      } catch (err) {
        log.error(err, 'Failed to list webhooks');
        return reply.code(500).send({
          error: 'Internal Error',
          message: 'Failed to list webhooks.',
        });
      }
    },
  });

  // ─── DELETE /v1/webhooks/:webhookId — Delete Webhook ──────────────────
  app.delete('/v1/webhooks/:webhookId', {
    preHandler: [authenticateApiKey, trackUsage],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const key = request.apiKey!;
      const { webhookId } = request.params as { webhookId: string };

      try {
        const [deleted] = await db
          .delete(webhooks)
          .where(and(eq(webhooks.id, webhookId), eq(webhooks.orgId, key.orgId)))
          .returning({ id: webhooks.id });

        if (!deleted) {
          return reply.code(404).send({
            error: 'Not Found',
            message: `Webhook ${webhookId} not found.`,
          });
        }

        return { success: true, message: 'Webhook deleted.' };
      } catch (err) {
        log.error(err, 'Failed to delete webhook');
        return reply.code(500).send({
          error: 'Internal Error',
          message: 'Failed to delete webhook.',
        });
      }
    },
  });
}
