import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useOEE } from '@/features/production';
import * as useSchedulingDataHook from '@/features/jobs';
import * as useBusinessConfigHook from '@/features/admin';

vi.mock('@/features/jobs', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return { ...actual, useSchedulingData: vi.fn() };
});

vi.mock('@/features/admin', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return { ...actual, useBusinessConfig: vi.fn() };
});

describe('useOEE', () => {
  it('should calculate OEE components correctly', () => {
    const now = new Date();
    const start = new Date(now);
    start.setHours(8, 0, 0, 0);
    const end = new Date(now);
    end.setHours(9, 0, 0, 0);
    const mockJobs = [
      { 
        id: '1', 
        machine_id: 'm1', 
        status: 'finished', 
        actual_start_time: start.toISOString(), 
        actual_end_time: end.toISOString(), // 60 mins
        estimated_duration: 50, 
        quantity: 100, 
        produced_quantity: 95, 
        lost_pieces: 5 
      }
    ];
    const mockMachines = [{ id: 'm1', name: 'M1', code: 'M1', technique_id: 't1' }];
    const mockTechniques = [{ id: 't1', name: 'T1', color: '#000' }];

    (useSchedulingDataHook.useSchedulingData as any).mockReturnValue({
      jobs: mockJobs,
      machines: mockMachines,
      techniques: mockTechniques,
      isLoading: false,
    });

    (useBusinessConfigHook.useBusinessConfig as any).mockReturnValue({
      getConfig: vi.fn().mockReturnValue({ start: '07:00', end: '18:00' }), // 11 hours = 660 mins
      isLoading: false,
    });

    const { result } = renderHook(() => useOEE(1));
    
    expect(result.current.data).not.toBeNull();
    if (result.current.data) {
      const m1 = result.current.data.byMachine.find(m => m.machineId === 'm1');
      expect(m1).toBeDefined();
      if (m1) {
        // Availability = Actual (60) / Planned (660) = 9.09%
        expect(m1.availability).toBeCloseTo(9.1, 1);
        // Performance = Ideal (50) / Actual (60) = 83.33%
        expect(m1.performance).toBeCloseTo(83.3, 1);
        // Quality = (95-5) / 95 = 94.7%
        expect(m1.quality).toBeCloseTo(94.7, 1);
      }
    }
  });
});
