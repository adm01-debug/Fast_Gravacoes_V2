import { describe, it, expect } from 'vitest';
import {
  calculateRetryDelay,
  shouldRetry,
  calculateRange,
  createPaginatedResult,
  STALE_TIMES,
  RETRY_CONFIG,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  createQueryClient,
} from '@/lib/queryConfig';

// ── calculateRetryDelay ────────────────────────────────────

describe('calculateRetryDelay', () => {
  it('returns a positive number for each attempt index', () => {
    for (let i = 0; i < 5; i++) {
      const delay = calculateRetryDelay(i);
      expect(delay).toBeGreaterThanOrEqual(0);
    }
  });

  it('respects the max delay cap', () => {
    // Very large attempt index should still stay under max + jitter
    const delay = calculateRetryDelay(100);
    // Allow for 25% jitter over the configured max
    expect(delay).toBeLessThanOrEqual(RETRY_CONFIG.maxDelay * 1.5);
  });

  it('generally increases with attempt index (exponential growth)', () => {
    // Run multiple samples and check that the average increases
    const samples = 20;
    const avgDelay = (idx: number) =>
      Array.from({ length: samples }, () => calculateRetryDelay(idx)).reduce((a, b) => a + b, 0) / samples;

    expect(avgDelay(3)).toBeGreaterThan(avgDelay(0));
  });
});

// ── shouldRetry ────────────────────────────────────────────

describe('shouldRetry', () => {
  it('returns true for network errors', () => {
    expect(shouldRetry(new Error('network failure'))).toBe(true);
    expect(shouldRetry(new Error('Failed to fetch'))).toBe(true);
  });

  it('returns true for timeout errors', () => {
    expect(shouldRetry(new Error('timeout exceeded'))).toBe(true);
    expect(shouldRetry(new Error('408 request timeout'))).toBe(true);
  });

  it('returns true for rate limit errors', () => {
    expect(shouldRetry(new Error('429 rate limit'))).toBe(true);
    expect(shouldRetry(new Error('too many requests'))).toBe(true);
  });

  it('returns true for 5xx server errors', () => {
    expect(shouldRetry(new Error('500 internal server'))).toBe(true);
    expect(shouldRetry(new Error('503 service unavailable'))).toBe(true);
    expect(shouldRetry(new Error('502 bad gateway'))).toBe(true);
    expect(shouldRetry(new Error('504 gateway timeout'))).toBe(true);
  });

  it('returns false for 401/403 auth errors', () => {
    expect(shouldRetry(new Error('401 unauthorized'))).toBe(false);
    expect(shouldRetry(new Error('403 forbidden'))).toBe(false);
    expect(shouldRetry(new Error('unauthorized access'))).toBe(false);
  });

  it('returns false for 404 not found', () => {
    expect(shouldRetry(new Error('404 not found'))).toBe(false);
  });

  it('returns false for validation errors', () => {
    expect(shouldRetry(new Error('400 bad request validation'))).toBe(false);
    expect(shouldRetry(new Error('422 validation error'))).toBe(false);
  });

  it('returns true for non-Error types (default)', () => {
    expect(shouldRetry('some string')).toBe(true);
    expect(shouldRetry(null)).toBe(true);
    expect(shouldRetry(undefined)).toBe(true);
  });
});

// ── calculateRange ─────────────────────────────────────────

describe('calculateRange', () => {
  it('returns correct range for page 1', () => {
    const { from, to } = calculateRange(1, 10);
    expect(from).toBe(0);
    expect(to).toBe(9);
  });

  it('returns correct range for page 2', () => {
    const { from, to } = calculateRange(2, 10);
    expect(from).toBe(10);
    expect(to).toBe(19);
  });

  it('clamps pageSize to MAX_PAGE_SIZE', () => {
    const { from, to } = calculateRange(1, MAX_PAGE_SIZE + 1000);
    expect(to - from + 1).toBe(MAX_PAGE_SIZE);
  });

  it('clamps pageSize minimum to 1', () => {
    const { from, to } = calculateRange(1, 0);
    expect(to - from + 1).toBe(1);
  });

  it('clamps page minimum to 1', () => {
    const { from } = calculateRange(-5, 10);
    expect(from).toBe(0);
  });

  it('calculates range correctly for page 3 with size 25', () => {
    const { from, to } = calculateRange(3, 25);
    expect(from).toBe(50);
    expect(to).toBe(74);
  });
});

// ── createPaginatedResult ──────────────────────────────────

describe('createPaginatedResult', () => {
  const makeData = (n: number) => Array.from({ length: n }, (_, i) => ({ id: i }));

  it('constructs correct metadata for first page', () => {
    const result = createPaginatedResult(makeData(10), 100, 1, 10);
    expect(result.totalCount).toBe(100);
    expect(result.totalPages).toBe(10);
    expect(result.hasNextPage).toBe(true);
    expect(result.hasPreviousPage).toBe(false);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(10);
    expect(result.data).toHaveLength(10);
  });

  it('constructs correct metadata for last page', () => {
    const result = createPaginatedResult(makeData(5), 25, 5, 5);
    expect(result.hasNextPage).toBe(false);
    expect(result.hasPreviousPage).toBe(true);
    expect(result.totalPages).toBe(5);
  });

  it('handles a single page result', () => {
    const result = createPaginatedResult(makeData(3), 3, 1, 10);
    expect(result.totalPages).toBe(1);
    expect(result.hasNextPage).toBe(false);
    expect(result.hasPreviousPage).toBe(false);
  });

  it('handles empty result set', () => {
    const result = createPaginatedResult([], 0, 1, 10);
    expect(result.totalPages).toBe(0);
    expect(result.hasNextPage).toBe(false);
    expect(result.data).toHaveLength(0);
  });

  it('correctly computes partial last page', () => {
    const result = createPaginatedResult(makeData(3), 23, 3, 10);
    expect(result.totalPages).toBe(3);
    expect(result.hasNextPage).toBe(false);
  });
});

// ── constants ──────────────────────────────────────────────

describe('configuration constants', () => {
  it('STALE_TIMES values are positive numbers', () => {
    expect(STALE_TIMES.STATIC).toBeGreaterThan(0);
    expect(STALE_TIMES.DYNAMIC).toBeGreaterThan(0);
    expect(STALE_TIMES.REALTIME).toBeGreaterThan(0);
    expect(STALE_TIMES.USER).toBeGreaterThan(0);
  });

  it('STATIC > USER > DYNAMIC > REALTIME (staleness ordering)', () => {
    expect(STALE_TIMES.STATIC).toBeGreaterThan(STALE_TIMES.USER);
    expect(STALE_TIMES.USER).toBeGreaterThan(STALE_TIMES.DYNAMIC);
    expect(STALE_TIMES.DYNAMIC).toBeGreaterThan(STALE_TIMES.REALTIME);
  });

  it('DEFAULT_PAGE_SIZE <= MAX_PAGE_SIZE', () => {
    expect(DEFAULT_PAGE_SIZE).toBeLessThanOrEqual(MAX_PAGE_SIZE);
  });

  it('RETRY_CONFIG has sane values', () => {
    expect(RETRY_CONFIG.maxRetries).toBeGreaterThan(0);
    expect(RETRY_CONFIG.baseDelay).toBeGreaterThan(0);
    expect(RETRY_CONFIG.maxDelay).toBeGreaterThan(RETRY_CONFIG.baseDelay);
  });
});

// ── createQueryClient ──────────────────────────────────────

describe('createQueryClient', () => {
  it('returns a QueryClient instance', () => {
    const client = createQueryClient();
    expect(client).toBeDefined();
    expect(typeof client.getQueryCache).toBe('function');
    expect(typeof client.getMutationCache).toBe('function');
  });

  it('creates independent instances', () => {
    const c1 = createQueryClient();
    const c2 = createQueryClient();
    expect(c1).not.toBe(c2);
  });
});
