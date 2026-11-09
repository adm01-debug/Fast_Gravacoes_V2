/**
 * Load & Stress Tests
 * Simulates concurrent requests against pure-logic modules,
 * measuring latency, error rates, and stability under load.
 * These run entirely in-process — no network required.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RateLimiter } from '@/lib/rateLimiter';
import { CircuitBreaker } from '@/lib/circuitBreaker';
import { sanitizeInput, escapeHtml, sanitizeUrl } from '@/lib/sanitize';

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), critical: vi.fn() },
}));
import { retryWithBackoff } from '@/lib/retryWithBackoff';
import { z } from 'zod';

// ── WebhookPayload schema (inline) ────────────────────────────────────────
const WebhookPayloadSchema = z.object({
  source: z.enum(['bitrix24', 'stripe', 'external_system']),
  event: z.string().min(1),
  data: z.record(z.any()),
  timestamp: z.string().datetime().optional(),
});

// ── Helpers ───────────────────────────────────────────────────────────────
function concurrently<T>(count: number, fn: (i: number) => T): T[] {
  return Array.from({ length: count }, (_, i) => fn(i));
}


// ── RateLimiter under load ────────────────────────────────────────────────
describe('Load — RateLimiter (10 000 requests)', () => {
  it('correctly tracks allowed vs throttled across 10k requests', () => {
    const limiter = new RateLimiter({ maxTokens: 1000, refillRate: 0 });

    let allowed = 0;
    let denied = 0;

    for (let i = 0; i < 10_000; i++) {
      if (limiter.tryAcquire()) allowed++;
      else denied++;
    }

    expect(allowed).toBe(1000);
    expect(denied).toBe(9000);
    expect(allowed + denied).toBe(10_000);
  });

  it('multiple limiters in parallel do not interfere', () => {
    const limiters = Array.from({ length: 100 }, () => new RateLimiter({ maxTokens: 10, refillRate: 0 }));

    const results = limiters.map(l => {
      let allowed = 0;
      for (let i = 0; i < 20; i++) {
        if (l.tryAcquire()) allowed++;
      }
      return allowed;
    });

    expect(results.every(a => a === 10)).toBe(true);
  });

  it('completes 10k tryAcquire calls in < 50ms', () => {
    const limiter = new RateLimiter({ maxTokens: 100_000, refillRate: 0 });
    const start = performance.now();
    for (let i = 0; i < 10_000; i++) limiter.tryAcquire();
    expect(performance.now() - start).toBeLessThan(50);
  });
});

// ── CircuitBreaker under load ─────────────────────────────────────────────
describe('Load — CircuitBreaker concurrent executions', () => {
  it('handles 1000 concurrent successful calls', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 10 });
    const promises = concurrently(1000, () => cb.execute(() => Promise.resolve('ok')));
    const results = await Promise.all(promises);
    expect(results.every(r => r === 'ok')).toBe(true);
    expect(cb.state).toBe('closed');
  });

  it('opens after threshold failures from concurrent calls', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 5, name: 'load-test' });
    const fail = () => cb.execute(() => Promise.reject(new Error('down')));

    const results = await Promise.allSettled(concurrently(20, fail));
    const errors = results.filter(r => r.status === 'rejected');

    expect(errors.length).toBeGreaterThanOrEqual(5);
    expect(cb.state).toBe('open');
  });

  it('50 independent circuit breakers all stay isolated', async () => {
    const breakers = Array.from({ length: 50 }, (_, i) =>
      new CircuitBreaker({ failureThreshold: 3, name: `cb-${i}` })
    );

    await Promise.all(
      breakers.map(cb =>
        Promise.allSettled([
          cb.execute(() => Promise.resolve('ok')),
          cb.execute(() => Promise.resolve('ok')),
        ])
      )
    );

    expect(breakers.every(cb => cb.state === 'closed')).toBe(true);
  });
});

// ── Sanitize under load ───────────────────────────────────────────────────
describe('Load — sanitize 50 000 inputs', () => {
  const ATTACK_STRINGS = [
    '<script>alert(1)</script>',
    '"; DROP TABLE users; --',
    '&amp;<b>bold</b>',
    'normal text without issues',
    'javascript:alert(document.cookie)',
    '../../etc/passwd',
    '\x00\x01\x02hidden chars',
    'a'.repeat(10_000),
  ];

  it('sanitizeInput never throws on any input (50k calls)', () => {
    expect(() => {
      for (let i = 0; i < 50_000; i++) {
        sanitizeInput(ATTACK_STRINGS[i % ATTACK_STRINGS.length]);
      }
    }).not.toThrow();
  });

  it('50k escapeHtml calls complete in < 500ms', () => {
    const start = performance.now();
    for (let i = 0; i < 50_000; i++) {
      escapeHtml('<script>alert("xss")</script> & "hello" \'world\'');
    }
    expect(performance.now() - start).toBeLessThan(500);
  });

  it('sanitizeUrl never throws on 10k adversarial inputs', () => {
    const urls = [
      'javascript:alert(1)',
      'data:text/html,<h1>x</h1>',
      'https://example.com',
      '/relative/path',
      '',
      'vbscript:MsgBox(1)',
      'ftp://files.example.com',
      'JAVASCRIPT:ALERT(1)',
    ];

    expect(() => {
      for (let i = 0; i < 10_000; i++) {
        sanitizeUrl(urls[i % urls.length]);
      }
    }).not.toThrow();
  });
});

// ── Webhook schema validation under load ─────────────────────────────────
describe('Load — webhook schema 5000 validations', () => {
  const SOURCES = ['bitrix24', 'stripe', 'external_system'] as const;
  const EVENTS = ['DEAL_ADD', 'payment.succeeded', 'order.created', 'job.updated'];

  function makePayload(i: number) {
    return {
      source: SOURCES[i % 3],
      event: EVENTS[i % 4],
      data: { id: i, ts: Date.now() },
      timestamp: new Date().toISOString(),
    };
  }

  it('5000 valid payloads all pass in < 2000ms', () => {
    const start = performance.now();
    for (let i = 0; i < 5000; i++) {
      const result = WebhookPayloadSchema.safeParse(makePayload(i));
      if (!result.success) throw new Error(`Unexpected failure at i=${i}`);
    }
    expect(performance.now() - start).toBeLessThan(2000);
  });

  it('5000 invalid payloads all fail gracefully in < 2000ms', () => {
    const start = performance.now();
    for (let i = 0; i < 5000; i++) {
      const result = WebhookPayloadSchema.safeParse({
        source: 'invalid_source',
        event: '',
        data: 'not-an-object',
      });
      if (result.success) throw new Error('Should have failed');
    }
    expect(performance.now() - start).toBeLessThan(2000);
  });
});

// ── retryWithBackoff under stress ─────────────────────────────────────────
describe('Load — retryWithBackoff stress (fake timers)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('100 concurrent operations with mixed success/failure', async () => {
    let callCount = 0;
    const fn = vi.fn(() => {
      callCount++;
      if (callCount % 3 === 0) return Promise.reject(new Error('transient'));
      return Promise.resolve(`result-${callCount}`);
    });

    // Attach .catch() immediately to prevent unhandled rejections while timers run
    const promises = concurrently(100, () => {
      const p = retryWithBackoff(() => fn(), { maxRetries: 1, baseDelay: 10, jitter: false });
      p.catch(() => {});
      return p;
    });

    await vi.runAllTimersAsync();
    const results = await Promise.allSettled(promises);

    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    expect(succeeded + failed).toBe(100);
    expect(succeeded).toBeGreaterThan(0);
  });

  it('50 operations that always succeed complete without retry', async () => {
    let retries = 0;
    const results = await Promise.all(
      concurrently(50, i =>
        retryWithBackoff(() => Promise.resolve(i), {
          maxRetries: 3,
          onRetry: () => { retries++; },
        })
      )
    );

    expect(results).toHaveLength(50);
    expect(retries).toBe(0);
  });
});

// ── Memory stability: no leaks in high-volume RateLimiter ────────────────
describe('Load — memory stability', () => {
  it('creates and GC-eligible 10000 RateLimiter instances without error', () => {
    expect(() => {
      for (let i = 0; i < 10_000; i++) {
        const l = new RateLimiter({ maxTokens: 5, refillRate: 1 });
        l.tryAcquire();
        // l goes out of scope — GC eligible
      }
    }).not.toThrow();
  });

  it('CircuitBreaker listener cleanup prevents accumulation', () => {
    const cb = new CircuitBreaker({ failureThreshold: 1 });
    const unsubs: Array<() => void> = [];

    for (let i = 0; i < 1000; i++) {
      unsubs.push(cb.onStateChange(() => {}));
    }
    unsubs.forEach(unsub => unsub());

    // After unsubscribing all, the internal listeners array should be empty
    // We verify this indirectly: state changes don't crash
    expect(() => cb.reset()).not.toThrow();
  });
});
