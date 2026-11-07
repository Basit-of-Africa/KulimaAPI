import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { env } from '../config/env.js';
import { optionalAuth } from '../middleware/auth.js';
import { trackUsage } from '../middleware/usage.js';
import { createChildLogger } from '../logger.js';
import {
  DISCLAIMER,
  SUPPORTED_LANGUAGES,
  generateAdvice,
  type AdvisorLanguage,
} from '../advisor/advisor.js';
import { completeWithAnthropic } from '../advisor/anthropic.js';
import type { IntelligenceResponse } from '../intelligence/types.js';

const log = createChildLogger('routes/advisor');

export default async function advisorRoutes(app: FastifyInstance) {
  // ─── POST /v2/advisor/explain — AI Advisor (prototype) ─────────────────
  app.post('/v2/advisor/explain', {
    preHandler: [optionalAuth, trackUsage],
    config: {
      // LLM-backed endpoint — stricter than the global rate limit
      rateLimit: { max: 10, timeWindow: '1 minute' },
    },
    schema: {
      description:
        'Explain the intelligence output as short, farmer-friendly advice in the chosen language (AI prototype)',
      tags: ['Advisor'],
      body: {
        type: 'object',
        required: ['lat', 'lng', 'language'],
        properties: {
          lat: { type: 'number', minimum: -90, maximum: 90 },
          lng: { type: 'number', minimum: -180, maximum: 180 },
          crop: { type: 'string', maxLength: 100 },
          language: { type: 'string', enum: [...SUPPORTED_LANGUAGES] },
          question: { type: 'string', maxLength: 500 },
        },
      },
    },
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { lat, lng, crop, language, question } = request.body as {
        lat: number;
        lng: number;
        crop?: string;
        language: AdvisorLanguage;
        question?: string;
      };

      // 1. Fetch the existing intelligence output
      const intelligenceUrl = `/v1/farm/${lat}/${lng}/intelligence${
        crop ? `?crop=${encodeURIComponent(crop)}` : ''
      }`;
      const intelRes = await app.inject({ method: 'GET', url: intelligenceUrl });
      if (intelRes.statusCode !== 200) {
        log.warn(
          { status: intelRes.statusCode, lat, lng },
          'Advisor could not fetch intelligence output'
        );
        return reply.code(502).send({
          error: 'Bad Gateway',
          message: 'Could not fetch intelligence data for this location. Try again shortly.',
        });
      }
      const intelligence = intelRes.json() as IntelligenceResponse;

      // 2. Turn it into advice — LLM when a key is configured, template otherwise
      try {
        const { language: adviceLanguage, advice } = await generateAdvice(
          { lat, lng, crop, language, question },
          intelligence,
          {
            apiKey: env.anthropic.apiKey,
            model: env.anthropic.model,
            complete: (system, user) =>
              completeWithAnthropic(env.anthropic.apiKey, env.anthropic.model, system, user),
          }
        );

        const dataUsed =
          `KulimaAPI intelligence for ${lat}, ${lng}${crop ? ` (${crop})` : ''}: ` +
          `weather, ${intelligence.risks.length} risk(s), ` +
          `${intelligence.recommendations.length} recommendation(s), ` +
          `confidence ${intelligence.confidence}/100`;

        return {
          language: adviceLanguage,
          advice,
          confidence: intelligence.confidence,
          dataUsed,
          disclaimer: DISCLAIMER,
        };
      } catch (err) {
        log.error({ err }, 'AI advisor failed to generate advice');
        return reply.code(502).send({
          error: 'Bad Gateway',
          message: 'The AI advisor failed to generate advice. Please try again shortly.',
        });
      }
    },
  });
}
