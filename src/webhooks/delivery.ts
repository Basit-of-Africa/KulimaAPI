import axios from 'axios';
import crypto from 'crypto';
import { db, webhooks, webhookDeliveries } from '../database/index.js';
import { eq, and, lte } from 'drizzle-orm';
import { createChildLogger } from '../logger.js';

const log = createChildLogger('webhook-delivery');

// ─── Webhook Delivery Service ────────────────────────────────────────────────

export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: Record<string, any>;
}

/**
 * Deliver a webhook payload to a single endpoint.
 * Returns success status and response details.
 */
async function deliverToEndpoint(
  url: string,
  secret: string,
  payload: WebhookPayload
): Promise<{ success: boolean; statusCode?: number; response?: string }> {
  try {
    const body = JSON.stringify(payload);
    const signature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    const res = await axios.post(url, body, {
      headers: {
        'Content-Type': 'application/json',
        'X-Kulima-Signature': `sha256=${signature}`,
        'X-Kulima-Event': payload.event,
        'X-Kulima-Timestamp': payload.timestamp,
      },
      timeout: 10000,
    });

    return {
      success: res.status >= 200 && res.status < 300,
      statusCode: res.status,
      response: JSON.stringify(res.data).slice(0, 1000),
    };
  } catch (err: any) {
    const statusCode = err.response?.status;
    const response = err.message?.slice(0, 1000);
    return { success: false, statusCode, response };
  }
}

/**
 * Queue a webhook event for delivery.
 * Creates a webhook_deliveries record for each matching webhook.
 */
export async function queueWebhook(event: string, data: Record<string, any>): Promise<void> {
  try {
    // Find all active webhooks that subscribe to this event
    const activeWebhooks = await db
      .select()
      .from(webhooks)
      .where(and(eq(webhooks.active, true)));

    for (const wh of activeWebhooks) {
      const subscribedEvents = wh.events as string[];
      if (!subscribedEvents.includes(event) && !subscribedEvents.includes('*')) {
        continue;
      }

      // Create delivery record
      const [delivery] = await db
        .insert(webhookDeliveries)
        .values({
          webhookId: wh.id,
          event,
          payload: { event, timestamp: new Date().toISOString(), data } as any,
          success: false,
          attempts: 0,
        })
        .returning({ id: webhookDeliveries.id });

      log.info({ deliveryId: delivery.id, event, webhookId: wh.id }, 'Webhook queued');
    }
  } catch (err) {
    log.error(err, 'Failed to queue webhook');
  }
}

/**
 * Process pending webhook deliveries.
 * Should be called on a schedule (e.g., every 30 seconds).
 */
export async function processWebhookDeliveries(): Promise<void> {
  try {
    // Get pending deliveries (not yet successful, not past retry limit)
    const pending = await db
      .select()
      .from(webhookDeliveries)
      .where(
        and(
          eq(webhookDeliveries.success, false),
          lte(webhookDeliveries.attempts, 3)
        )
      )
      .limit(10);

    for (const delivery of pending) {
      // Get the webhook details
      const [wh] = await db
        .select()
        .from(webhooks)
        .where(eq(webhooks.id, delivery.webhookId))
        .limit(1);

      if (!wh || !wh.active) {
        // Webhook deleted or deactivated — mark as failed
        await db
          .update(webhookDeliveries)
          .set({ success: false, response: 'Webhook not found or deactivated' })
          .where(eq(webhookDeliveries.id, delivery.id));
        continue;
      }

      const payload = delivery.payload as unknown as WebhookPayload;
      const result = await deliverToEndpoint(wh.url, wh.secret, payload);

      await db
        .update(webhookDeliveries)
        .set({
          success: result.success,
          statusCode: result.statusCode,
          response: result.response,
          attempts: delivery.attempts + 1,
        })
        .where(eq(webhookDeliveries.id, delivery.id));

      if (result.success) {
        log.info({ deliveryId: delivery.id }, 'Webhook delivered');
      } else {
        log.warn(
          { deliveryId: delivery.id, statusCode: result.statusCode },
          'Webhook delivery failed'
        );
      }
    }
  } catch (err) {
    log.error(err, 'Failed to process webhook deliveries');
  }
}

/**
 * Start the webhook delivery processor (runs every 30 seconds).
 */
export function startWebhookProcessor(): NodeJS.Timeout {
  log.info('Webhook processor started (30s interval)');
  return setInterval(processWebhookDeliveries, 30_000);
}

/**
 * Stop the webhook processor.
 */
export function stopWebhookProcessor(interval: NodeJS.Timeout): void {
  clearInterval(interval);
  log.info('Webhook processor stopped');
}
