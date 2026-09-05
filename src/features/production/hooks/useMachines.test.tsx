import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const getActiveMock = vi.fn();

vi.mock('../index', () => ({
  machinesService: { getActive: (...args: unknown[]) => getActiveMock(...args) },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    channel: () => ({
      on: function () { return this; },
      subscribe: function () { return this; },
    }),
    removeChannel: vi.fn(),
  },
}));

import { useMachines } from './useMachines';

function makeWrapper(client: QueryClient) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
}

describe('useMachines', () => {
  beforeEach(() => {
    getActiveMock.mockReset();
    getActiveMock.mockResolvedValue([{ id: 'm1', name: 'Laser-01', is_active: true }]);
  });

  it('fetches active machines and caches the result', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = makeWrapper(client);

    const { result } = renderHook(() => useMachines(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(getActiveMock).toHaveBeenCalledTimes(1);
  });

  it('shares cache across multiple consumers (no duplicate queries)', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = makeWrapper(client);

    const a = renderHook(() => useMachines(), { wrapper });
    const b = renderHook(() => useMachines(), { wrapper });
    const c = renderHook(() => useMachines(), { wrapper });

    await waitFor(() => {
      expect(a.result.current.isSuccess).toBe(true);
      expect(b.result.current.isSuccess).toBe(true);
      expect(c.result.current.isSuccess).toBe(true);
    });

    expect(getActiveMock).toHaveBeenCalledTimes(1);
  });
});
