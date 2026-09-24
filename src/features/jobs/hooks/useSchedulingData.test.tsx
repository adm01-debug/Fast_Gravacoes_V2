import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const getAllJobsMock = vi.fn();
const getAllMachinesMock = vi.fn();
const useAuthMock = vi.fn();

function makeThenable(result: { data: unknown; error: unknown }) {
  const thenable: {
    then: Promise<typeof result>['then'];
    order: () => typeof thenable;
  } = {
    then: (onFulfilled, onRejected) => Promise.resolve(result).then(onFulfilled, onRejected),
    order: () => thenable,
  };
  return thenable;
}

const supabaseTableData = vi.hoisted(() => ({
  profiles: { data: [] as unknown[], error: null as unknown },
  techniques: { data: [] as unknown[], error: null as unknown },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: 'profiles' | 'techniques') => ({
      select: () => makeThenable(supabaseTableData[table]),
    }),
  },
}));

vi.mock('../services/jobsService', () => ({
  jobsService: { getAll: (...args: unknown[]) => getAllJobsMock(...args) },
}));

vi.mock('../../production/services/machinesService', () => ({
  machinesService: { getAll: (...args: unknown[]) => getAllMachinesMock(...args) },
}));

vi.mock('@/features/auth', () => ({
  useAuth: () => useAuthMock(),
}));

import { useSchedulingData } from './useSchedulingData';

function makeWrapper(client: QueryClient) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
}

function renderScheduling() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = makeWrapper(client);
  return renderHook(() => useSchedulingData(), { wrapper });
}

const MACHINE_A = { id: 'machine-a', name: 'Laser 01', technique_id: 'tech-1' };

describe('useSchedulingData', () => {
  beforeEach(() => {
    getAllJobsMock.mockReset();
    getAllMachinesMock.mockReset();
    useAuthMock.mockReset();

    useAuthMock.mockReturnValue({ user: { id: 'user-1' } });
    getAllJobsMock.mockResolvedValue([]);
    getAllMachinesMock.mockResolvedValue([MACHINE_A]);
    supabaseTableData.profiles = { data: [{ id: 'op-1', full_name: 'Operador X', avatar_url: null }], error: null };
    supabaseTableData.techniques = { data: [{ id: 'tech-1', name: 'Bordado' }], error: null };
  });

  it('mantém as consultas desabilitadas quando não há usuário autenticado', async () => {
    useAuthMock.mockReturnValue({ user: null });
    const { result } = renderScheduling();

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.jobs).toEqual([]);
    expect(result.current.machines).toEqual([]);
    expect(getAllJobsMock).not.toHaveBeenCalled();
    expect(getAllMachinesMock).not.toHaveBeenCalled();
  });

  it('carrega jobs, técnicas, máquinas e perfis quando autenticado', async () => {
    getAllJobsMock.mockResolvedValue([{ id: 'job-1', status: 'scheduled', quantity: 10 }]);
    const { result } = renderScheduling();

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.jobs).toHaveLength(1);
    expect(result.current.machines).toEqual([MACHINE_A]);
    expect(result.current.techniques).toEqual([{ id: 'tech-1', name: 'Bordado' }]);
    expect(result.current.profiles).toHaveLength(1);
  });

  it('propaga erro do jobsService através de error', async () => {
    getAllJobsMock.mockRejectedValue(new Error('falha de rede'));
    const { result } = renderScheduling();

    // A query de jobs usa RETRY_CONFIG (3 tentativas com backoff exponencial
    // fixo no próprio hook), o que ultrapassa o timeout padrão do waitFor.
    await waitFor(() => expect(result.current.error).toBeTruthy(), { timeout: 15000 });
  }, 20000);

  it('getMachineById/getOperatorById retornam undefined para id nulo ou desconhecido', async () => {
    const { result } = renderScheduling();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.getMachineById(null)).toBeUndefined();
    expect(result.current.getMachineById('id-desconhecido')).toBeUndefined();
    expect(result.current.getMachineById(MACHINE_A.id)).toEqual(MACHINE_A);

    expect(result.current.getOperatorById(null)).toBeUndefined();
  });

  it('getJobsByMachine/getJobsByStatus/getJobsByTechnique filtram corretamente', async () => {
    getAllJobsMock.mockResolvedValue([
      { id: 'job-1', machine_id: 'machine-a', status: 'scheduled', technique_id: 'tech-1', quantity: 1 },
      { id: 'job-2', machine_id: 'machine-b', status: 'production', technique_id: 'tech-2', quantity: 1 },
    ]);
    const { result } = renderScheduling();
    await waitFor(() => expect(result.current.jobs).toHaveLength(2));

    expect(result.current.getJobsByMachine('machine-a').map(j => j.id)).toEqual(['job-1']);
    expect(result.current.getJobsByStatus('production').map(j => j.id)).toEqual(['job-2']);
    expect(result.current.getJobsByTechnique('tech-1').map(j => j.id)).toEqual(['job-1']);
    expect(result.current.getJobsByMachine('machine-inexistente')).toEqual([]);
  });

  it('stats: agrega contagens por status e soma peças, incluindo os contadores "hoje"', async () => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = '2000-01-01';

    getAllJobsMock.mockResolvedValue([
      { id: 'j1', status: 'finished', scheduled_date: today, quantity: 10, lost_pieces: 1 },
      { id: 'j2', status: 'production', scheduled_date: today, quantity: 5, lost_pieces: 0 },
      { id: 'j3', status: 'delayed', scheduled_date: yesterday, quantity: 3, lost_pieces: 2 },
      { id: 'j4', status: 'queue', scheduled_date: yesterday, quantity: 2, lost_pieces: 0 },
      { id: 'j5', status: 'ready', scheduled_date: yesterday, quantity: 1, lost_pieces: 0 },
      { id: 'j6', status: 'scheduled', scheduled_date: yesterday, quantity: 1, lost_pieces: 0 },
      { id: 'j7', status: 'paused', scheduled_date: yesterday, quantity: 1, lost_pieces: 0 },
      { id: 'j8', status: 'rework', scheduled_date: yesterday, quantity: 1, lost_pieces: 0 },
      { id: 'j9', status: 'buffer', scheduled_date: yesterday, quantity: 1, lost_pieces: 0 },
    ]);
    const { result } = renderScheduling();
    await waitFor(() => expect(result.current.jobs).toHaveLength(9));

    const { stats } = result.current;
    expect(stats.total).toBe(9);
    expect(stats.completed).toBe(1);
    expect(stats.inProgress).toBe(1);
    expect(stats.delayed).toBe(1);
    expect(stats.queue).toBe(1);
    expect(stats.ready).toBe(1);
    expect(stats.scheduled).toBe(1);
    expect(stats.paused).toBe(1);
    expect(stats.rework).toBe(1);
    expect(stats.buffer).toBe(1);
    expect(stats.totalPieces).toBe(25);
    expect(stats.completedPieces).toBe(10);
    expect(stats.lostPieces).toBe(3);
    // Apenas j1 e j2 estão agendados para "hoje"; o resto é de outro dia (limite do dia).
    expect(stats.todayScheduled).toBe(2);
    expect(stats.todayCompleted).toBe(1);
    expect(stats.todayInProgress).toBe(1);
    expect(stats.todayDelayed).toBe(0);
  });

  it('capacityTrend classifica risco por carga: high (>480), medium (>300), low (<=300)', async () => {
    const today = new Date();
    const d = (offset: number) => {
      const dt = new Date(today);
      dt.setDate(today.getDate() - offset);
      return dt.toISOString().split('T')[0];
    };

    getAllJobsMock.mockResolvedValue([
      { id: 'high-1', scheduled_date: d(0), estimated_duration: 500 },
      { id: 'medium-1', scheduled_date: d(1), estimated_duration: 350 },
      { id: 'low-1', scheduled_date: d(2), estimated_duration: 100 },
      // Sem jobs em d(3): dia deve aparecer com load 0 e risco "low".
    ]);
    const { result } = renderScheduling();
    await waitFor(() => expect(result.current.jobs).toHaveLength(3));

    const byDate = new Map(result.current.capacityTrend.map(t => [t.date, t]));
    expect(byDate.get(d(0))?.risk).toBe('high');
    expect(byDate.get(d(0))?.load).toBe(500);
    expect(byDate.get(d(1))?.risk).toBe('medium');
    expect(byDate.get(d(2))?.risk).toBe('low');
    expect(byDate.get(d(3))?.risk).toBe('low');
    expect(byDate.get(d(3))?.jobCount).toBe(0);
    expect(result.current.capacityTrend).toHaveLength(7);
  });

  it('oeeTrend: dia sem jobs finalizados fica com oee 0; job finalizado sem horários reais fica com oee 100', async () => {
    const today = new Date().toISOString().split('T')[0];

    getAllJobsMock.mockResolvedValue([
      {
        id: 'finished-no-actuals',
        status: 'finished',
        actual_end_time: `${today}T18:00:00.000Z`,
        actual_start_time: null,
        estimated_duration: 60,
      },
    ]);
    const { result } = renderScheduling();
    await waitFor(() => expect(result.current.jobs).toHaveLength(1));

    const trend = result.current.oeeTrend;
    expect(trend).toHaveLength(14);
    const todayEntry = trend.find(t => t.date === today);
    expect(todayEntry?.oee).toBe(100);

    const noJobsEntry = trend.find(t => t.date !== today);
    expect(noJobsEntry?.oee).toBe(0);
  });

  it('refetchAll dispara refetch de jobs, técnicas e máquinas', async () => {
    const { result } = renderScheduling();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const jobsCallsBefore = getAllJobsMock.mock.calls.length;
    const machinesCallsBefore = getAllMachinesMock.mock.calls.length;

    result.current.refetchAll();

    await waitFor(() => {
      expect(getAllJobsMock.mock.calls.length).toBeGreaterThan(jobsCallsBefore);
      expect(getAllMachinesMock.mock.calls.length).toBeGreaterThan(machinesCallsBefore);
    });
  });
});
