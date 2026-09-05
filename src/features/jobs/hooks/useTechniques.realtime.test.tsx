import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import type { RealtimeMock } from '@/test/realtimeMock';
import { assertNonNull } from '@/test/assertNonNull';

const holder = vi.hoisted(() => ({
  getAllMock: vi.fn(),
  realtime: null as RealtimeMock | null,
}));

vi.mock('@/features/jobs', () => ({
  techniquesService: { getAll: (...args: unknown[]) => holder.getAllMock(...args) },
}));

vi.mock('@/integrations/supabase/client', async () => {
  const { createRealtimeMock } = await import('@/test/realtimeMock');
  holder.realtime = createRealtimeMock();
  return { supabase: holder.realtime.supabase };
});

import { useTechniques } from './useTechniques';

function makeWrapper(client: QueryClient) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
}

describe('useTechniques — Realtime invalidation', () => {
  beforeEach(() => {
    holder.getAllMock.mockReset();
    holder.getAllMock.mockResolvedValue([{ id: '1', name: 'Bordado' }]);
    assertNonNull(holder.realtime, 'realtime').removeChannel.mockClear();
    // Discard handlers captured by a previous test in this file — the mock
    // never simulates real unsubscription, so stale handlers would otherwise
    // double-fire alongside this test's own handler (see RealtimeMock.reset).
    assertNonNull(holder.realtime, 'realtime').reset();
  });

  it('chama removeChannel no unmount e ignora eventos posteriores', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = makeWrapper(client);

    const { unmount } = renderHook(() => useTechniques(), { wrapper });
    await waitFor(() => expect(holder.getAllMock).toHaveBeenCalledTimes(1));
    expect(assertNonNull(holder.realtime, 'realtime').removeChannel).not.toHaveBeenCalled();

    unmount();

    expect(assertNonNull(holder.realtime, 'realtime').removeChannel).toHaveBeenCalledTimes(1);

    const callsBefore = holder.getAllMock.mock.calls.length;
    act(() => assertNonNull(holder.realtime, 'realtime').emit({ eventType: 'INSERT' }));
    await new Promise(r => setTimeout(r, 50));
    expect(holder.getAllMock.mock.calls.length).toBe(callsBefore);
  });

  it('refetches when a Realtime postgres_changes event arrives', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = makeWrapper(client);

    const { result } = renderHook(() => useTechniques(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(holder.getAllMock).toHaveBeenCalledTimes(1);

    expect(assertNonNull(holder.realtime, 'realtime').hasHandler).toBe(true);
    act(() => assertNonNull(holder.realtime, 'realtime').emit({ eventType: 'INSERT' }));

    await waitFor(() => expect(holder.getAllMock).toHaveBeenCalledTimes(2));
  });
});
