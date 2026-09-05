import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const getAllMock = vi.fn();

vi.mock('@/features/jobs', () => ({
  techniquesService: { getAll: (...args: unknown[]) => getAllMock(...args) },
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

import { useTechniques } from './useTechniques';

function makeWrapper(client: QueryClient) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
}

describe('useTechniques', () => {
  beforeEach(() => {
    getAllMock.mockReset();
    getAllMock.mockResolvedValue([{ id: '1', name: 'Bordado' }]);
  });

  it('fetches techniques once and caches them', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = makeWrapper(client);

    const { result } = renderHook(() => useTechniques(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(getAllMock).toHaveBeenCalledTimes(1);
  });

  it('reuses the cache across multiple consumers (no duplicate queries)', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = makeWrapper(client);

    const a = renderHook(() => useTechniques(), { wrapper });
    const b = renderHook(() => useTechniques(), { wrapper });
    const c = renderHook(() => useTechniques(), { wrapper });

    await waitFor(() => {
      expect(a.result.current.isSuccess).toBe(true);
      expect(b.result.current.isSuccess).toBe(true);
      expect(c.result.current.isSuccess).toBe(true);
    });

    // All consumers share one query — service called only once.
    expect(getAllMock).toHaveBeenCalledTimes(1);
  });
});
