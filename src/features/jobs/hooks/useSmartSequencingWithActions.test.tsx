import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const rpcMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => rpcMock(...args) },
}));

vi.mock('../index', () => ({
  useJobs: () => ({ data: [] }),
  useTechniques: () => ({ data: [] }),
}));

vi.mock('@/features/production', () => ({
  useMachines: () => ({ data: [] }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { useSmartSequencingWithActions, type SequencingSuggestion } from './useSmartSequencingWithActions';

function makeSuggestion(optimizedSequence: unknown[]): SequencingSuggestion {
  return {
    id: 'sug-1',
    machineId: 'machine-a',
    machineName: 'Laser 01',
    machineCode: 'LZ01',
    techniqueId: 'tech-1',
    techniqueName: 'Bordado',
    currentSequence: [],
    optimizedSequence: optimizedSequence as never,
    estimatedSavings: 20,
    colorGroups: [],
    bottleneckRisk: 'low',
    totalMinutes: 60,
    currentChanges: 2,
    optimizedChanges: 1,
    totalQuantity: 100,
    aiPriorityScore: 1,
    setupComplexity: 'low',
  };
}

function renderSequencing() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
  return renderHook(() => useSmartSequencingWithActions(), { wrapper });
}

describe('useSmartSequencingWithActions', () => {
  beforeEach(() => {
    rpcMock.mockReset();
  });

  it('aplica a sequencia via RPC transacional com os horarios calculados', async () => {
    rpcMock.mockResolvedValue({ data: 2, error: null });
    const { result } = renderSequencing();

    const applied = await result.current.applySequencing(
      makeSuggestion([
        { id: 'job-1', estimated_duration: 30 },
        { id: 'job-2', estimated_duration: 45 },
      ])
    );

    expect(rpcMock).toHaveBeenCalledWith('apply_job_sequence', {
      p_slots: [
        { job_id: 'job-1', start_time: '07:00', end_time: '07:30' },
        { job_id: 'job-2', start_time: '07:30', end_time: '08:15' },
      ],
    });
    expect(applied.appliedJobs).toBe(2);
  });

  it('usa o tamanho do lote quando o banco nao retorna a contagem', async () => {
    rpcMock.mockResolvedValue({ data: null, error: null });
    const { result } = renderSequencing();

    const applied = await result.current.applySequencing(makeSuggestion([{ id: 'job-1', estimated_duration: 30 }]));

    expect(applied.appliedJobs).toBe(1);
  });

  it('propaga o erro do RPC em vez de reportar sucesso', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'check_violation' } });
    const { result } = renderSequencing();

    await expect(
      result.current.applySequencing(makeSuggestion([{ id: 'job-1', estimated_duration: 30 }]))
    ).rejects.toBeTruthy();
  });
});
