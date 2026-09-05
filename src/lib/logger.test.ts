import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the Supabase client so we can observe (and control) error_logs inserts.
const insertMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: insertMock,
    })),
  },
}));

import { logger } from './logger';

describe('logger persistence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    insertMock.mockReset();
    insertMock.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('batches multiple events into a single insert after the debounce window', async () => {
    logger.error('boom 1');
    logger.warn('slow 1');
    logger.error('boom 2');

    // Nothing flushed synchronously (writes are deferred off the hot path).
    expect(insertMock).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(2100);

    expect(insertMock).toHaveBeenCalledTimes(1);
    const rows = insertMock.mock.calls[0][0];
    expect(Array.isArray(rows)).toBe(true);
    expect(rows).toHaveLength(3);
  });

  it('does not recurse when the error_logs insert itself fails', async () => {
    // Simulate the telemetry write failing — this must NOT generate more logs.
    insertMock.mockResolvedValueOnce({ error: { message: 'insert failed' } });
    const consoleErr = vi.spyOn(console, 'error').mockImplementation(() => {});

    logger.error('trigger');
    await vi.advanceTimersByTimeAsync(2100);

    // One flush attempt; the failure is reported via console only (no re-insert).
    expect(insertMock).toHaveBeenCalledTimes(1);
    consoleErr.mockRestore();
  });

  it('redacts email addresses from the persisted message and error data', async () => {
    logger.error('Falha ao processar usuario@empresa.com.br', new Error('duplicate key value violates unique constraint "profiles_email_key" — Key (email)=(vitima@empresa.com) already exists.'));
    await vi.advanceTimersByTimeAsync(2100);

    const row = insertMock.mock.calls[0][0][0];
    expect(row.message).not.toContain('usuario@empresa.com.br');
    expect(row.message).toContain('[REDACTED_EMAIL]');
    expect(JSON.stringify(row.metadata)).not.toContain('vitima@empresa.com');
  });

  it('redacts JWT-shaped tokens', async () => {
    const fakeJwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
    logger.error(`Auth failed for token ${fakeJwt}`);
    await vi.advanceTimersByTimeAsync(2100);

    const row = insertMock.mock.calls[0][0][0];
    expect(row.message).not.toContain(fakeJwt);
    expect(row.message).toContain('[REDACTED_TOKEN]');
  });

  it('strips the query string from the persisted url', async () => {
    const originalLocation = window.location.href;
    Object.defineProperty(window, 'location', {
      value: new URL('https://app.fastgravacoes.com.br/reset?token=abc123&email=user@empresa.com'),
      writable: true,
    });

    logger.error('boom');
    await vi.advanceTimersByTimeAsync(2100);

    const row = insertMock.mock.calls[0][0][0];
    expect(row.url).toBe('https://app.fastgravacoes.com.br/reset');
    expect(row.url).not.toContain('token=');

    Object.defineProperty(window, 'location', { value: new URL(originalLocation), writable: true });
  });
});
