import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CircuitBreaker, CircuitOpenError } from '@/lib/circuitBreaker';

// ── Advanced circuit breaker scenarios ────────────────────

describe('CircuitBreaker — advanced scenarios', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('stays CLOSED on success', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 3 });
    await cb.execute(async () => 'ok');
    expect(cb.state).toBe('closed');
  });

  it('opens after failureThreshold consecutive failures', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 3 });
    for (let i = 0; i < 3; i++) {
      await cb.execute(async () => { throw new Error('fail'); }).catch(() => {});
    }
    expect(cb.state).toBe('open');
  });

  it('throws CircuitOpenError when circuit is OPEN', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 1 });
    await cb.execute(async () => { throw new Error('fail'); }).catch(() => {});

    await expect(cb.execute(async () => 'ok')).rejects.toThrow(CircuitOpenError);
  });

  it('transitions to HALF_OPEN after resetTimeout', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeout: 5000 });
    await cb.execute(async () => { throw new Error('fail'); }).catch(() => {});
    expect(cb.state).toBe('open');

    vi.advanceTimersByTime(5001);
    expect(cb.state).toBe('half_open');
  });

  it('closes after successThreshold successes in HALF_OPEN', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeout: 1000, successThreshold: 2 });
    await cb.execute(async () => { throw new Error('fail'); }).catch(() => {});

    vi.advanceTimersByTime(1001);
    await cb.execute(async () => 'ok');
    expect(cb.state).toBe('half_open'); // needs one more success

    await cb.execute(async () => 'ok');
    expect(cb.state).toBe('closed');
  });

  it('returns to OPEN on failure in HALF_OPEN', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeout: 1000 });
    await cb.execute(async () => { throw new Error('fail'); }).catch(() => {});

    vi.advanceTimersByTime(1001);
    expect(cb.state).toBe('half_open');

    await cb.execute(async () => { throw new Error('fail again'); }).catch(() => {});
    expect(cb.state).toBe('open');
  });

  it('resets failure count on successful execution in CLOSED state', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 3 });
    await cb.execute(async () => { throw new Error('fail'); }).catch(() => {});
    await cb.execute(async () => { throw new Error('fail'); }).catch(() => {});
    await cb.execute(async () => 'ok'); // success resets count
    expect(cb.failureCount).toBe(0);
  });

  it('notifies state change listeners', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 1 });
    const listener = vi.fn();
    cb.onStateChange(listener);

    await cb.execute(async () => { throw new Error('fail'); }).catch(() => {});
    expect(listener).toHaveBeenCalledWith('open');
  });

  it('unsubscribes state listeners', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 1 });
    const listener = vi.fn();
    const unsub = cb.onStateChange(listener);
    unsub();

    await cb.execute(async () => { throw new Error('fail'); }).catch(() => {});
    expect(listener).not.toHaveBeenCalled();
  });

  it('manual reset brings circuit back to CLOSED', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 1 });
    await cb.execute(async () => { throw new Error('fail'); }).catch(() => {});
    expect(cb.state).toBe('open');

    cb.reset();
    expect(cb.state).toBe('closed');
    expect(cb.failureCount).toBe(0);
  });

  it('handles listener errors gracefully', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 1 });
    cb.onStateChange(() => { throw new Error('listener error'); });

    // Should not throw even if listener errors
    await expect(
      cb.execute(async () => { throw new Error('fail'); })
    ).rejects.toThrow('fail');
  });

  it('CircuitOpenError exposes the cause', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 1 });
    const originalError = new Error('original');
    await cb.execute(async () => { throw originalError; }).catch(() => {});

    try {
      await cb.execute(async () => 'ok');
      expect.fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(CircuitOpenError);
      expect((e as CircuitOpenError).cause).toBe(originalError);
    }
  });
});
