import type { FastifyRequest, FastifyReply } from 'fastify';
import { db, apiUsage } from '../database/index.js';
import { and, gte } from 'drizzle-orm';
import { createChildLogger } from '../logger.js';

const log = createChildLogger('usage');

/**
 * Usage metering middleware — logs every request to the api_usage table.
 * Also enforces monthly quota when DB is available.
 */
export async function trackUsage(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const startTime = Date.now();

  // Enforce monthly quota (check before processing)
  if (request.apiKey) {
    const quota = request.apiKey.monthlyQuota;
    if (quota && quota > 0) {
      try {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const [result] = await db
          .select({ count: sql<number>`count(*)` })
          .from(apiUsage)
          .where(
            and(
              eq(apiUsage.apiKeyId, request.apiKey.id),
              gte(apiUsage.timestamp, monthStart),
            )
          );

        const usageCount = (result as any)?.count ?? 0;
        if (usageCount >= quota) {
          return reply.code(429).send({
            error: 'Quota Exceeded',
            message: `Monthly API quota of ${quota} requests has been reached. Contact support to increase your limit.`,
            quota,
            used: usageCount,
            resetsAt: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString(),
          });
        }
      } catch {
        // DB unavailable — skip quota enforcement (graceful degradation)
      }
    }
  }

  // Log usage after response is sent (non-blocking)
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
