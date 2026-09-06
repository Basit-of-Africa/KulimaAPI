import type { FastifyRequest, FastifyReply } from 'fastify';
import { db, apiUsage } from '../database/index.js';
import { createChildLogger } from '../logger.js';

const log = createChildLogger('usage');

/**
 * Usage metering middleware — logs every request to the api_usage table.
 * Runs after the response is sent so it doesn't block the user.
 */
export async function trackUsage(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const startTime = Date.now();

  // We use the 'onResponse' hook instead, but as a preHandler this
  // captures the start time. The actual logging happens in onResponse.
  reply.raw.on('finish', async () => {
    const responseTimeMs = Date.now() - startTime;

    if (!request.apiKey) return; // Skip unauthenticated requests

    try {
      await db.insert(apiUsage).values({
        apiKeyId: request.apiKey.id,
        endpoint: request.url,
        method: request.method,
        statusCode: reply.statusCode,
        responseTimeMs,
        timestamp: new Date(),
      });
    } catch (err) {
      // Don't let metering failures affect the user
      log.error(err, 'Failed to track API usage');
    }
  });
}
