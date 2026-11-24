import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  isDbAvailable,
  isDbConnectionError,
  markDbDown,
  markDbUp,
  getDbStatus,
  DbUnavailableError,
  RETRY_AFTER_SECONDS,
  _resetDbAvailabilityForTests,
} from './availability.js';

beforeEach(() => _resetDbAvailabilityForTests());
afterEach(() => vi.useRealTimers());

describe('isDbConnectionError', () => {
  it('recognises network and postgres connection failures', () => {
    expect(isDbConnectionError(Object.assign(new Error('x'), { code: 'ECONNREFUSED' }))).toBe(true);
    expect(isDbConnectionError(Object.assign(new Error('x'), { code: 'CONNECT_TIMEOUT' }))).toBe(true);
    expect(isDbConnectionError(Object.assign(new Error('x'), { code: '08006' }))).toBe(true);
    expect(isDbConnectionError(Object.assign(new Error('x'), { code: '57P01' }))).toBe(true);
    expect(isDbConnectionError(new DbUnavailableError())).toBe(true);
  });

  it('looks through wrapped errors', () => {
    const inner = Object.assign(new Error('refused'), { code: 'ECONNREFUSED' });
    expect(isDbConnectionError(new Error('Failed query', { cause: inner }))).toBe(true);
    expect(isDbConnectionError(new AggregateError([inner]))).toBe(true);
  });

  it('does not treat query errors as outages', () => {
    expect(isDbConnectionError(Object.assign(new Error('syntax'), { code: '42601' }))).toBe(false);
    expect(isDbConnectionError(Object.assign(new Error('bad uuid'), { code: '22P02' }))).toBe(false);
    expect(isDbConnectionError(new Error('plain'))).toBe(false);
    expect(isDbConnectionError(undefined)).toBe(false);
  });
});

describe('circuit breaker', () => {
  it('stays closed until a failure, then opens', () => {
    expect(isDbAvailable()).toBe(true);
    markDbDown(new Error('boom'));
    expect(isDbAvailable()).toBe(false);
    expect(getDbStatus()).toMatchObject({ available: false, lastError: 'boom' });
  });

  it('lets a retry through after the retry window — it does not stay down forever', () => {
    vi.useFakeTimers();
    markDbDown();
    vi.advanceTimersByTime(RETRY_AFTER_SECONDS * 1000 - 1);
    expect(isDbAvailable()).toBe(false);
    vi.advanceTimersByTime(1);
    expect(isDbAvailable()).toBe(true);
  });

  it('closes again on success', () => {
    markDbDown();
    markDbUp();
    expect(isDbAvailable()).toBe(true);
    expect(getDbStatus()).toMatchObject({ available: true, downSince: null, lastError: null });
  });
});
