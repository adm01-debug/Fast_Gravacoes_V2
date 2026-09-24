import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useKPIs } from './useKPIs';
import * as useSchedulingDataHook from '@/features/jobs';

vi.mock('@/features/jobs', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return { ...actual, useSchedulingData: vi.fn() };
});

// useKPIs pulls in useABCCosts (custeio real de perdas) — precisa de QueryClientProvider
// e de um supabase mock encadeável genérico (não importa qual método fecha a chain).
function createQueryBuilder(): Record<string, unknown> {
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    in: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    then: (resolve: (v: { data: unknown[]; error: null }) => void) => resolve({ data: [], error: null }),
  };
  return builder;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => createQueryBuilder()),
    // useTechniques (chamado por useABCCosts) também assina realtime.
    channel: vi.fn(() => {
      const ch = { on: vi.fn(() => ch), subscribe: vi.fn(() => ch) };
      return ch;
    }),
    removeChannel: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 0 } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useKPIs', () => {
  it('should return null when data is loading', () => {
    (useSchedulingDataHook.useSchedulingData as any).mockReturnValue({
      jobs: null,
      techniques: null,
      machines: null,
      isLoading: true,
    });

    const { result } = renderHook(() => useKPIs(), { wrapper: createWrapper() });
    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(true);
  });

  it('should calculate correct metrics when data is provided', () => {
    const now = new Date().toISOString();
    const mockJobs = [
      { 
        id: '1', 
        quantity: 100, 
        produced_quantity: 90, 
        lost_pieces: 10, 
        status: 'finished', 
        scheduled_date: now.split('T')[0], 
        created_at: now,
        estimated_duration: 60 
      },
      { 
        id: '2', 
        quantity: 50, 
        produced_quantity: 50, 
        lost_pieces: 0, 
        status: 'finished', 
        scheduled_date: now.split('T')[0], 
        created_at: now,
        estimated_duration: 30 
      },
      { 
        id: '3', 
        quantity: 200, 
        status: 'production', 
        scheduled_date: now.split('T')[0], 
        created_at: now,
        estimated_duration: 120 
      },
    ];
    const mockTechniques = [{ id: 'tech1', name: 'Laser', color: '#ff0000' }];
    const mockMachines = [{ id: 'm1', name: 'Machine 1', technique_id: 'tech1' }];

    (useSchedulingDataHook.useSchedulingData as any).mockReturnValue({
      jobs: mockJobs,
      techniques: mockTechniques,
      machines: mockMachines,
      isLoading: false,
    });

    const { result } = renderHook(() => useKPIs('all'), { wrapper: createWrapper() });
    
    expect(result.current.data).not.toBeNull();
    if (result.current.data) {
      expect(result.current.data.totalJobs).toBe(3);
      expect(result.current.data.completedJobs).toBe(2);
      
      // Verification of Calculation Logic:
      // prodPcs = (produced_quantity ?? 0): 90 + 50 + 0 = 140
      //   (Job 3 has no produced_quantity → contributes 0, not planned 200)
      // lostPcs = lost_pieces: 10 + 0 + 0 = 10
      // lossRate = lostPcs / (prodPcs + lostPcs) = 10 / 150 = 6.67%
      expect(result.current.data.lossRate).toBeCloseTo(6.67, 1);
    }
  });
});
