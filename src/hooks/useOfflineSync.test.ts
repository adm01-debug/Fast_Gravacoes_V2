import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOfflineSync } from './useOfflineSync';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase properly
vi.mock('@/integrations/supabase/client', () => {
  const mockTable = {
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    // Make it a thenable that resolves to { data: [], error: null }
    then: vi.fn().mockImplementation(function(onFulfilled) {
      return Promise.resolve({ data: [], error: null }).then(onFulfilled);
    }),
  };

  return {
    supabase: {
      from: vi.fn(() => mockTable),
    },
  };
});

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    critical: vi.fn(),
  },
}));

const setOnline = (status: boolean) => {
  Object.defineProperty(window.navigator, 'onLine', {
    value: status,
    configurable: true,
  });
  window.dispatchEvent(new Event(status ? 'online' : 'offline'));
};

describe('useOfflineSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setOnline(true);
  });

  it('should queue actions when offline', async () => {
    setOnline(false);
    const { result } = renderHook(() => useOfflineSync());

    await act(async () => {
      result.current.updateJobOffline('job-1', { status: 'production' });
    });

    expect(result.current.pendingActionsCount).toBe(1);
  });

  it('should sync actions when coming back online', async () => {
    setOnline(false);
    const { result } = renderHook(() => useOfflineSync());

    await act(async () => {
      result.current.updateJobOffline('job-1', { status: 'production' });
    });

    type MockTable = { then: { mockImplementationOnce: (fn: (onFulfilled: (v: unknown) => unknown) => Promise<unknown>) => void } };
    const mockTable = supabase.from('jobs') as unknown as MockTable;
    mockTable.then.mockImplementationOnce((onFulfilled) => {
      return Promise.resolve({ data: [], error: null }).then(onFulfilled);
    });

    // Flip online in its own act() so the hook re-renders and result.current is
    // refreshed to the up-to-date (isOnline=true) closure before we sync.
    await act(async () => {
      setOnline(true);
    });
    await act(async () => {
      await result.current.syncPendingActions();
    });

    expect(result.current.pendingActionsCount).toBe(0);
  });

  it('should handle sync failures and retries', async () => {
    setOnline(false);
    const { result } = renderHook(() => useOfflineSync());

    await act(async () => {
      result.current.updateJobOffline('job-1', { status: 'production' });
    });

    type MockTable = { then: { mockImplementationOnce: (fn: (onFulfilled: (v: unknown) => unknown) => Promise<unknown>) => void } };
    const mockTable = supabase.from('jobs') as unknown as MockTable;
    mockTable.then.mockImplementationOnce((onFulfilled) => {
      return Promise.resolve({ data: null, error: new Error('Network error') }).then(onFulfilled);
    });

    // Flip online in its own act() so result.current points at the fresh
    // (isOnline=true) closure before invoking the sync.
    await act(async () => {
      setOnline(true);
    });
    await act(async () => {
      await result.current.syncPendingActions();
    });

    expect(result.current.pendingActionsCount).toBe(1);
    expect(result.current.pendingActions[0].retryCount).toBe(1);
  });

  it('detects a conflict instead of blindly overwriting a job that changed on the server while queued', async () => {
    type MockTable = {
      then: {
        mockImplementation: (fn: (onFulfilled: (v: unknown) => unknown) => Promise<unknown>) => void;
        mockImplementationOnce: (fn: (onFulfilled: (v: unknown) => unknown) => Promise<unknown>) => void;
      };
    };
    const mockTable = supabase.from('jobs') as unknown as MockTable;

    // cacheData() resolves jobs/machines/techniques in parallel — seed a job
    // with updated_at='t1' so updateJobOffline can capture it as baseUpdatedAt.
    mockTable.then.mockImplementation((onFulfilled: (v: unknown) => unknown) =>
      Promise.resolve({ data: [{ id: 'job-1', updated_at: 't1' }], error: null }).then(onFulfilled)
    );

    const { result } = renderHook(() => useOfflineSync());
    await act(async () => {
      await result.current.cacheData();
    });
    expect(result.current.cachedData?.jobs[0]).toMatchObject({ id: 'job-1', updated_at: 't1' });

    await act(async () => {
      setOnline(false);
    });
    await act(async () => {
      result.current.updateJobOffline('job-1', { status: 'production' });
    });
    expect(result.current.pendingActionsCount).toBe(1);

    // Server row's updated_at no longer matches 't1' — the conditional
    // .eq('updated_at', baseUpdatedAt) filters it out, so the update matches
    // zero rows. That must surface as a conflict, not a silent no-op success.
    mockTable.then.mockImplementationOnce((onFulfilled: (v: unknown) => unknown) =>
      Promise.resolve({ data: [], error: null }).then(onFulfilled)
    );

    await act(async () => {
      setOnline(true);
    });
    await act(async () => {
      await result.current.syncPendingActions();
    });

    expect(result.current.pendingActionsCount).toBe(0);
    expect(result.current.failedActionsCount).toBe(1);
    expect(result.current.failedActions[0].reason).toBe('conflict');
  });

  it('replays a queued QR scan via upsert keyed on the action id (idempotent retry)', async () => {
    type MockTable = {
      then: { mockImplementationOnce: (fn: (onFulfilled: (v: unknown) => unknown) => Promise<unknown>) => void };
      upsert: ReturnType<typeof vi.fn>;
    };
    const mockTable = supabase.from('qr_scan_history') as unknown as MockTable;

    setOnline(false);
    const { result } = renderHook(() => useOfflineSync());
    await act(async () => {
      result.current.recordQRScanOffline('job-1', 'operator-1', 'start');
    });
    expect(result.current.pendingActionsCount).toBe(1);
    const queuedId = result.current.pendingActions[0].id;

    mockTable.then.mockImplementationOnce((onFulfilled: (v: unknown) => unknown) =>
      Promise.resolve({ data: null, error: null }).then(onFulfilled)
    );

    await act(async () => {
      setOnline(true);
    });
    await act(async () => {
      await result.current.syncPendingActions();
    });

    expect(result.current.pendingActionsCount).toBe(0);
    expect(mockTable.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: queuedId, job_id: 'job-1' }),
      { onConflict: 'id' }
    );
  });
});
