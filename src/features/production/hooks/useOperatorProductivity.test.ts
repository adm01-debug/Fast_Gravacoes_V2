import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useOperatorProductivity } from './useOperatorProductivity';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import * as schedulingHook from '@/features/jobs';

// Mock useSchedulingData
vi.mock('@/features/jobs', () => ({
  useSchedulingData: vi.fn(),
}));

vi.mock('@/features/auth', () => ({
  useAuth: () => ({ user: { id: 'test-user' } }),
}));

// Mock Supabase (needed for the other useQuery calls in useOperatorProductivity)
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    })),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
};

describe('useOperatorProductivity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock for useSchedulingData
    (schedulingHook.useSchedulingData as unknown as Mock).mockReturnValue({
      jobs: [],
      machines: [],
      techniques: [],
      isLoading: false,
    });
  });

  it('should fetch and calculate productivity data', async () => {
    // Dates relative to "now" so the 7-day period filter in
    // useOperatorProductivity always includes this job.
    const endTime = new Date().toISOString();
    const startTime = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const mockJobs = [
      {
        id: 'j1',
        machine_id: 'm1',
        status: 'finished',
        produced_quantity: 100,
        lost_pieces: 5,
        actual_start_time: startTime,
        actual_end_time: endTime,
        estimated_duration: 60,
        quantity: 105,
        created_at: startTime
      }
    ];

    (schedulingHook.useSchedulingData as unknown as Mock).mockReturnValue({
      jobs: mockJobs,
      machines: [{ id: 'm1', name: 'Machine 1' }],
      techniques: [],
      isLoading: false,
    });

    // Mock other queries in useOperatorProductivity
    const { supabase } = await import('@/integrations/supabase/client');
    (supabase.from as unknown as Mock).mockImplementation((table: string) => {
      if (table === 'user_roles') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [{ user_id: '1', role: 'operator' }], error: null }),
        };
      }
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: [{ id: '1', full_name: 'John Doe', avatar_url: null }], error: null }),
        };
      }
      if (table === 'operator_machines') {
        return {
          select: vi.fn().mockResolvedValue({ data: [{ operator_id: '1', machine_id: 'm1', machines: { name: 'Machine 1' } }], error: null }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
    });

    const { result } = renderHook(() => useOperatorProductivity(7), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 3000 });

    expect(result.current.operators).toHaveLength(1);
    expect(result.current.operators[0].operatorName).toBe('John Doe');
    expect(result.current.operators[0].totalJobsCompleted).toBe(1);
    expect(result.current.operators[0].lossRate).toBeCloseTo(4.76, 1);
  });

  it('should handle errors gracefully', async () => {
    // Mock scheduling data loading
    (schedulingHook.useSchedulingData as unknown as Mock).mockReturnValue({
      jobs: [],
      machines: [],
      techniques: [],
      isLoading: false,
    });

    const { supabase } = await import('@/integrations/supabase/client');
    (supabase.from as unknown as Mock).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'Fetch error' } }),
      in: vi.fn().mockResolvedValue({ data: null, error: { message: 'Fetch error' } }),
    }));

    const { result } = renderHook(() => useOperatorProductivity(7), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.operators).toHaveLength(0);
  });
});



