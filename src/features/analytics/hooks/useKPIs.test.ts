import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKPIs } from './useKPIs';
import * as useSchedulingDataHook from '@/features/jobs';

vi.mock('@/features/jobs', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return { ...actual, useSchedulingData: vi.fn() };
});

describe('useKPIs', () => {
  it('should return null when data is loading', () => {
    (useSchedulingDataHook.useSchedulingData as any).mockReturnValue({
      jobs: null,
      techniques: null,
      machines: null,
      isLoading: true,
    });

    const { result } = renderHook(() => useKPIs());
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

    const { result } = renderHook(() => useKPIs('all'));
    
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
