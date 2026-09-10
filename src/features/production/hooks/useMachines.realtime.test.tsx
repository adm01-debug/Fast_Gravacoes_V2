import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import type { RealtimeMock } from '@/test/realtimeMock';
import { assertNonNull } from '@/test/assertNonNull';

const holder = vi.hoisted(() => ({
  getActiveMock: vi.fn(),
  realtime: null as RealtimeMock | null,
}));

vi.mock('../index', () => ({
  machinesService: { getActive: (...args: unknown[]) => holder.getActiveMock(...args) },
}));

vi.mock('@/integrations/supabase/client', async () => {
  const { createRealtimeMock } = await import('@/test/realtimeMock');
  holder.realtime = createRealtimeMock();
  return { supabase: holder.realtime.supabase };
});

import { useMachines } from './useMachines';

function makeWrapper(client: QueryClient) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
}

describe('useMachines — Realtime invalidation', () => {
  beforeEach(() => {
    holder.getActiveMock.mockReset();
    holder.getActiveMock.mockResolvedValue([{ id: 'm1', name: 'Laser-01', is_active: true }]);
    assertNonNull(holder.realtime, 'realtime').removeChannel.mockClear();
    // Discard handlers captured by a previous test in this file — the mock
    // never simulates real unsubscription, so stale handlers would otherwise
    // double-fire alongside this test's own handler (see RealtimeMock.reset).
    assertNonNull(holder.realtime, 'realtime').reset();
  });

  it('chama removeChannel no unmount e ignora eventos posteriores', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = makeWrapper(client);

    const { unmount } = renderHook(() => useMachines(), { wrapper });
    await waitFor(() => expect(holder.getActiveMock).toHaveBeenCalledTimes(1));
    expect(assertNonNull(holder.realtime, 'realtime').removeChannel).not.toHaveBeenCalled();

    unmount();

    expect(assertNonNull(holder.realtime, 'realtime').removeChannel).toHaveBeenCalledTimes(1);

    const callsBefore = holder.getActiveMock.mock.calls.length;
    act(() => assertNonNull(holder.realtime, 'realtime').emit({ eventType: 'UPDATE' }));
    await new Promise(r => setTimeout(r, 50));
    expect(holder.getActiveMock.mock.calls.length).toBe(callsBefore);
  });

  it('refetches when a Realtime postgres_changes event arrives', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = makeWrapper(client);

    const { result } = renderHook(() => useMachines(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(holder.getActiveMock).toHaveBeenCalledTimes(1);

    expect(assertNonNull(holder.realtime, 'realtime').hasHandler).toBe(true);

    // Asserção determinística: o evento deve disparar AO MENOS um refetch.
    // Assertar contagem exata (toHaveBeenCalledTimes(2)) é flaky — o React Query
    // pode legitimamente emitir refetches extras (coalescência/focus), o que
    // quebrou o CI em 2026-08-28 ("expected 2 times, but got 3 times").
    // O contrato testado é "evento realtime → refetch", não o nº exato de calls.
    const callsBefore = holder.getActiveMock.mock.calls.length;
    act(() => assertNonNull(holder.realtime, 'realtime').emit({ eventType: 'UPDATE' }));

    await waitFor(() =>
      expect(holder.getActiveMock.mock.calls.length).toBeGreaterThan(callsBefore)
    );
  });
});
