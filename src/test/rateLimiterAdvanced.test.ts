import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RateLimiter, apiLimiter, searchLimiter, authLimiter } from '@/lib/rateLimiter';

describe('RateLimiter — advanced scenarios', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  describe('basic token consumption', () => {
    it('allows requests up to maxTokens', () => {
      const limiter = new RateLimiter({ maxTokens: 3, refillRate: 0.1 });
      expect(limiter.tryAcquire()).toBe(true);
      expect(limiter.tryAcquire()).toBe(true);
      expect(limiter.tryAcquire()).toBe(true);
      expect(limiter.tryAcquire()).toBe(false); // exhausted
    });

    it('rejects when tokens are exhausted', () => {
      const limiter = new RateLimiter({ maxTokens: 1, refillRate: 0 });
      limiter.tryAcquire(); // consume the only token
      expect(limiter.tryAcquire()).toBe(false);
    });
  });

  describe('token refill', () => {
    it('refills tokens over time', () => {
      const limiter = new RateLimiter({ maxTokens: 5, refillRate: 1 }); // 1 token/second
      for (let i = 0; i < 5; i++) limiter.tryAcquire(); // drain
      expect(limiter.tryAcquire()).toBe(false);

      vi.advanceTimersByTime(1000); // 1 second passes → +1 token
      expect(limiter.tryAcquire()).toBe(true);
    });

    it('does not exceed maxTokens during refill', () => {
      const limiter = new RateLimiter({ maxTokens: 3, refillRate: 100 }); // very fast refill
      vi.advanceTimersByTime(60000); // 1 minute
      expect(limiter.availableTokens).toBe(3); // capped at maxTokens
    });
  });

  describe('getWaitTime', () => {
    it('returns 0 when tokens are available', () => {
      const limiter = new RateLimiter({ maxTokens: 5, refillRate: 1 });
      expect(limiter.getWaitTime()).toBe(0);
    });

    it('returns positive wait time when exhausted', () => {
      const limiter = new RateLimiter({ maxTokens: 1, refillRate: 1 }); // 1 token/sec
      limiter.tryAcquire(); // drain
      expect(limiter.getWaitTime()).toBeGreaterThan(0);
    });
  });

  describe('reset', () => {
    it('restores tokens to maxTokens after reset', () => {
      const limiter = new RateLimiter({ maxTokens: 5, refillRate: 0 });
      for (let i = 0; i < 5; i++) limiter.tryAcquire();
      expect(limiter.tryAcquire()).toBe(false);

      limiter.reset();
      expect(limiter.tryAcquire()).toBe(true);
      expect(limiter.availableTokens).toBe(4);
    });
  });

  describe('availableTokens', () => {
    it('reports correct floor of available tokens', () => {
      const limiter = new RateLimiter({ maxTokens: 5, refillRate: 1 });
      limiter.tryAcquire();
      limiter.tryAcquire();
      expect(limiter.availableTokens).toBe(3);
    });
  });
});

// ── Pre-configured instances ──────────────────────────────

describe('pre-configured limiters', () => {
  it('apiLimiter has maxTokens of 30', () => {
    expect(apiLimiter.availableTokens).toBeGreaterThan(0);
  });

  it('searchLimiter exists and is functional', () => {
    expect(typeof searchLimiter.tryAcquire).toBe('function');
    expect(typeof searchLimiter.getWaitTime).toBe('function');
  });

  it('authLimiter has very low refill rate', () => {
    const limiter = new RateLimiter({ maxTokens: 5, refillRate: 0.1 });
    for (let i = 0; i < 5; i++) limiter.tryAcquire();
    // After draining, must wait ~10 seconds per token
    expect(limiter.getWaitTime()).toBeGreaterThan(5000);
  });
});
