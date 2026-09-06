import type { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { createChildLogger } from '../logger.js';

const log = createChildLogger('errors');

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
    error: error.name || 'Error',
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
