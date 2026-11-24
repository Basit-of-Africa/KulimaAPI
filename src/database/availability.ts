/**
 * Database availability and in-memory fallback policy.
 *
 * - `isMemoryFallbackAllowed()` — whether code may keep working from in-memory
 *   stores when Postgres is down. Always false in production: there we return
 *   an honest 503 instead of logging people in on partial checks or keeping
 *   data that disappears on restart and isn't shared between servers.
 *
 * - A small circuit breaker: after a connection failure the database is
 *   treated as down for RETRY_AFTER_SECONDS, then the next request tries it
 *   again. Any successful query closes the circuit. (Previously a single
 *   failure switched a server into fallback mode until it was restarted.)
 */

import { env } from '../config/env.js';
import { createChildLogger } from '../logger.js';

const log = createChildLogger('db-availability');

export const RETRY_AFTER_SECONDS = 10;

let downSince: number | null = null;
let lastError: string | null = null;

export function isMemoryFallbackAllowed(): boolean {
  return env.allowMemoryFallback;
}

/** True if the database should be tried (healthy, or the retry window has passed). */
export function isDbAvailable(): boolean {
  return downSince === null || Date.now() - downSince >= RETRY_AFTER_SECONDS * 1000;
}

export function markDbDown(err?: unknown): void {
  const message = err instanceof Error ? err.message : err ? String(err) : 'unknown error';
  if (downSince === null) {
    log.warn(
      { err: message, memoryFallbackAllowed: isMemoryFallbackAllowed() },
      isMemoryFallbackAllowed()
        ? 'Database unavailable — using in-memory fallback (development only)'
        : 'Database unavailable — returning 503 until it recovers',
    );
  }
  downSince = Date.now();
  lastError = message;
}

export function markDbUp(): void {
  if (downSince !== null) {
    log.info({ downForMs: Date.now() - downSince }, 'Database recovered');
  }
  downSince = null;
  lastError = null;
}

export function getDbStatus() {
  return {
    available: downSince === null,
    downSince: downSince === null ? null : new Date(downSince).toISOString(),
    lastError,
    memoryFallbackAllowed: isMemoryFallbackAllowed(),
  };
}

/** Thrown when the database is down and in-memory fallback is not allowed. Maps to HTTP 503. */
export class DbUnavailableError extends Error {
  statusCode = 503;
  constructor(message = 'The database is temporarily unavailable. Please retry shortly.') {
    super(message);
    this.name = 'Service Unavailable';
  }
}

const CONNECTION_ERROR_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ENOTFOUND',
  'ETIMEDOUT',
  'EAI_AGAIN',
  'CONNECT_TIMEOUT',
  'CONNECTION_CLOSED',
  'CONNECTION_ENDED',
  'CONNECTION_DESTROYED',
]);

/**
 * Whether an error means "couldn't reach the database" (as opposed to a bad
 * query). Looks through wrapper errors (e.g. Drizzle's `cause`).
 */
export function isDbConnectionError(err: unknown): boolean {
  let current: any = err;
  for (let depth = 0; current && depth < 5; depth++) {
    if (current instanceof DbUnavailableError) return true;
    const code = typeof current.code === 'string' ? current.code : '';
    if (CONNECTION_ERROR_CODES.has(code)) return true;
    // SQLSTATE class 08 = connection exception; 57P01-03 = server shutting down / cannot connect now
    if (/^08/.test(code) || /^57P0[1-3]$/.test(code)) return true;
    if (Array.isArray(current.errors) && current.errors.some(isDbConnectionError)) return true; // AggregateError
    current = current.cause;
  }
  return false;
}

/** For tests only. */
export function _resetDbAvailabilityForTests(): void {
  downSince = null;
  lastError = null;
}
