import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { retryWithBackoff, isNetworkRetryable } from '@/lib/retryWithBackoff';

vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('retryWithBackoff — advanced scenarios', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });

  it('returns immediately on first success', async () => {
    const fn = vi.fn().mockResolvedValue('result');
    const resultPromise = retryWithBackoff(fn, { maxRetries: 3 });
    // Drain any pending timers
    await vi.runAllTimersAsync();
    const result = await resultPromise;
    expect(result).toBe('result');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries up to maxRetries times then throws', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'));
    const resultPromise = retryWithBackoff(fn, {
      maxRetries: 2,
      baseDelay: 100,
      jitter: false,
    });
    // Suppress the unhandled-rejection window that opens between timer advancement
    // and the rejects assertion below.
    resultPromise.catch(() => {});
    await vi.runAllTimersAsync();
    await expect(resultPromise).rejects.toThrow('fail');
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('stops retrying when isRetryable returns false', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('auth error'));
    const resultPromise = retryWithBackoff(fn, {
      maxRetries: 3,
      isRetryable: () => false,
    });
    resultPromise.catch(() => {});
    await vi.runAllTimersAsync();
    await expect(resultPromise).rejects.toThrow('auth error');
    expect(fn).toHaveBeenCalledTimes(1); // no retries
  });

  it('calls onRetry callback with attempt number and delay', async () => {
    const onRetry = vi.fn();
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok');

    const resultPromise = retryWithBackoff(fn, {
      maxRetries: 3,
      baseDelay: 100,
      jitter: false,
      onRetry,
    });
    await vi.runAllTimersAsync();
    await resultPromise;

    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(onRetry.mock.calls[0][0]).toBe(1); // attempt 1
    expect(onRetry.mock.calls[1][0]).toBe(2); // attempt 2
  });

  it('succeeds on third attempt after two failures', async () => {
    let attempts = 0;
    const fn = vi.fn().mockImplementation(async () => {
      attempts++;
      if (attempts < 3) throw new Error('transient');
      return 'success';
    });

    const resultPromise = retryWithBackoff(fn, {
      maxRetries: 3,
      baseDelay: 100,
      jitter: false,
    });
    await vi.runAllTimersAsync();
    const result = await resultPromise;
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws the last error after all retries exhausted', async () => {
    const errors = [new Error('e1'), new Error('e2'), new Error('e3'), new Error('e4')];
    let i = 0;
    const fn = vi.fn().mockImplementation(async () => { throw errors[i++]; });

    const resultPromise = retryWithBackoff(fn, { maxRetries: 3, baseDelay: 10, jitter: false });
    // Use runAllTimersAsync to advance all timers without an unhandled rejection race
    const settled = await Promise.allSettled([resultPromise, vi.runAllTimersAsync()]);
    expect(settled[0].status).toBe('rejected');
    if (settled[0].status === 'rejected') {
      expect(settled[0].reason.message).toBe('e4');
    }
  });
});

// ── isNetworkRetryable ─────────────────────────────────────

describe('isNetworkRetryable', () => {
  it('returns true for network-related errors', () => {
    expect(isNetworkRetryable(new Error('network error'))).toBe(true);
    expect(isNetworkRetryable(new Error('timeout exceeded'))).toBe(true);
    expect(isNetworkRetryable(new Error('fetch failed'))).toBe(true);
    expect(isNetworkRetryable(new Error('econnrefused'))).toBe(true);
    expect(isNetworkRetryable(new Error('429 rate limit'))).toBe(true);
    expect(isNetworkRetryable(new Error('500 internal'))).toBe(true);
    expect(isNetworkRetryable(new Error('502 bad gateway'))).toBe(true);
    expect(isNetworkRetryable(new Error('503 unavailable'))).toBe(true);
    expect(isNetworkRetryable(new Error('504 timeout'))).toBe(true);
  });

  it('returns false for non-Error values', () => {
    expect(isNetworkRetryable('string error')).toBe(false);
    expect(isNetworkRetryable(null)).toBe(false);
    expect(isNetworkRetryable(undefined)).toBe(false);
    expect(isNetworkRetryable(42)).toBe(false);
  });

  it('returns false for auth/validation errors', () => {
    expect(isNetworkRetryable(new Error('401 unauthorized'))).toBe(false);
    expect(isNetworkRetryable(new Error('not found 404'))).toBe(false);
    expect(isNetworkRetryable(new Error('validation failed'))).toBe(false);
  });
});
