import type { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { createChildLogger } from '../logger.js';
import { isDbConnectionError, markDbDown, RETRY_AFTER_SECONDS } from '../database/availability.js';

const log = createChildLogger('errors');

const STATUS_NAMES: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  413: 'Payload Too Large',
  415: 'Unsupported Media Type',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  503: 'Service Unavailable',
};

/**
 * Standard error response structure.
 */
export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
  requestId?: string;
  details?: any;
}

/**
 * Global error handler for Fastify.
 * Catches all unhandled errors and returns a consistent JSON response.
 */
export async function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Database unreachable → honest 503 with Retry-After, not a generic 500.
  if (isDbConnectionError(error)) {
    markDbDown(error);
    log.warn({ requestId: request.id, url: request.url, method: request.method }, 'Request failed: database unavailable');
    reply
      .code(503)
      .header('Retry-After', String(RETRY_AFTER_SECONDS))
      .send({
        error: 'Service Unavailable',
        message: 'The database is temporarily unavailable. Please retry shortly.',
        statusCode: 503,
        timestamp: new Date().toISOString(),
        requestId: request.id,
      } satisfies ErrorResponse);
    return;
  }

  const statusCode = error.statusCode || 500;

  // Log server errors
  if (statusCode >= 500) {
    log.error(
      {
        err: error,
        requestId: request.id,
        url: request.url,
        method: request.method,
      },
      'Unhandled server error'
    );
  }

  const response: ErrorResponse = {
    // Generic error names ("Error", "FastifyError") say nothing; use the HTTP status name instead.
    error: error.name && !['Error', 'FastifyError'].includes(error.name) ? error.name : (STATUS_NAMES[statusCode] ?? 'Error'),
    message: error.message || 'An unexpected error occurred.',
    statusCode,
    timestamp: new Date().toISOString(),
    requestId: request.id,
  };

  // Include validation details for 400 errors
  if (statusCode === 400 && (error as any).validation) {
    response.details = (error as any).validation;
  }

  reply.code(statusCode).send(response);
}

/**
 * 404 handler for unknown routes.
 */
export async function notFoundHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const response: ErrorResponse = {
    error: 'Not Found',
    message: `Route ${request.method} ${request.url} does not exist.`,
    statusCode: 404,
    timestamp: new Date().toISOString(),
    requestId: request.id,
  };

  reply.code(404).send(response);
}
