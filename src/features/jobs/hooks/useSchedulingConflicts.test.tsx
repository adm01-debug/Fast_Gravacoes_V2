import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const useJobsMock = vi.fn();
const useMachinesMock = vi.fn();

vi.mock('../index', () => ({
  useJobs: (...args: unknown[]) => useJobsMock(...args),
}));

vi.mock('@/features/production', () => ({
  useMachines: (...args: unknown[]) => useMachinesMock(...args),
}));

import { useSchedulingConflicts } from './useSchedulingConflicts';

const MACHINE_A = { id: 'machine-a', name: 'Laser 01', code: 'L01' };
const MACHINE_B = { id: 'machine-b', name: 'Gravadora 02', code: 'G02' };

function job(overrides: Record<string, unknown> = {}) {
  return {
    id: 'job-1',
    order_number: 'PED-1',
    client: 'Cliente X',
    product: 'Caneca',
    status: 'scheduled',
    scheduled_date: '2026-09-24',
    start_time: '09:00',
    end_time: '10:00',
    machine_id: MACHINE_A.id,
    ...overrides,
  };
}

function setup(jobs: unknown[] | undefined, machines: unknown[] | undefined = [MACHINE_A, MACHINE_B]) {
  useJobsMock.mockReturnValue({ data: jobs });
  useMachinesMock.mockReturnValue({ data: machines });
  return renderHook(() => useSchedulingConflicts());
}

describe('useSchedulingConflicts', () => {
  beforeEach(() => {
    useJobsMock.mockReset();
    useMachinesMock.mockReset();
  });

  it('retorna lista vazia enquanto jobs ou machines ainda não carregaram', () => {
    const { result } = setup(undefined, [MACHINE_A]);
    expect(result.current.conflicts).toEqual([]);
    expect(result.current.hasConflicts).toBe(false);

    const { result: result2 } = setup([job()], undefined);
    expect(result2.current.conflicts).toEqual([]);
  });

  it('não aponta conflito quando só há um job na máquina/data', () => {
    const { result } = setup([job({ id: 'job-1' })]);
    expect(result.current.conflicts).toEqual([]);
    expect(result.current.hasConflicts).toBe(false);
  });

  it('detecta sobreposição de horário entre dois jobs na mesma máquina e data', () => {
    const jobs = [
      job({ id: 'job-1', start_time: '09:00', end_time: '11:00' }),
      job({ id: 'job-2', start_time: '10:00', end_time: '12:00' }),
    ];
    const { result } = setup(jobs);

    expect(result.current.hasConflicts).toBe(true);
    expect(result.current.conflicts).toHaveLength(1);
    expect(result.current.conflicts[0].machineId).toBe(MACHINE_A.id);
    expect(result.current.conflicts[0].jobs.map(j => j.id)).toEqual(['job-1', 'job-2']);
  });

  it('marca severidade "error" quando um dos jobs conflitantes está em produção', () => {
    const jobs = [
      job({ id: 'job-1', status: 'production', start_time: '09:00', end_time: '11:00' }),
      job({ id: 'job-2', status: 'scheduled', start_time: '10:00', end_time: '12:00' }),
    ];
    const { result } = setup(jobs);

    expect(result.current.conflicts[0].severity).toBe('error');
    expect(result.current.errorCount).toBe(1);
    expect(result.current.warningCount).toBe(0);
  });

  it('marca severidade "warning" quando nenhum job conflitante está em produção', () => {
    const jobs = [
      job({ id: 'job-1', status: 'scheduled', start_time: '09:00', end_time: '11:00' }),
      job({ id: 'job-2', status: 'ready', start_time: '10:00', end_time: '12:00' }),
    ];
    const { result } = setup(jobs);

    expect(result.current.conflicts[0].severity).toBe('warning');
    expect(result.current.warningCount).toBe(1);
    expect(result.current.errorCount).toBe(0);
  });

  it('não conflita jobs em máquinas diferentes mesmo com horários sobrepostos', () => {
    const jobs = [
      job({ id: 'job-1', machine_id: MACHINE_A.id, start_time: '09:00', end_time: '11:00' }),
      job({ id: 'job-2', machine_id: MACHINE_B.id, start_time: '09:00', end_time: '11:00' }),
    ];
    const { result } = setup(jobs);
    expect(result.current.conflicts).toEqual([]);
  });

  it('não conflita jobs na mesma máquina em datas diferentes', () => {
    const jobs = [
      job({ id: 'job-1', scheduled_date: '2026-09-24', start_time: '09:00', end_time: '11:00' }),
      job({ id: 'job-2', scheduled_date: '2026-09-25', start_time: '09:00', end_time: '11:00' }),
    ];
    const { result } = setup(jobs);
    expect(result.current.conflicts).toEqual([]);
  });

  it('troca de turno: jobs consecutivos (fim de um = início do outro) não são conflito', () => {
    const jobs = [
      job({ id: 'job-1', start_time: '07:00', end_time: '15:00' }),
      job({ id: 'job-2', start_time: '15:00', end_time: '23:00' }),
    ];
    const { result } = setup(jobs);
    expect(result.current.conflicts).toEqual([]);
  });

  it('cancelamento: job cancelado sobreposto não gera conflito', () => {
    const jobs = [
      job({ id: 'job-1', status: 'cancelled', start_time: '09:00', end_time: '11:00' }),
      job({ id: 'job-2', status: 'scheduled', start_time: '10:00', end_time: '12:00' }),
    ];
    const { result } = setup(jobs);
    expect(result.current.conflicts).toEqual([]);
  });

  it('ignora job finalizado ("finished") sobreposto a um job agendado', () => {
    const jobs = [
      job({ id: 'job-1', status: 'finished', start_time: '09:00', end_time: '11:00' }),
      job({ id: 'job-2', status: 'scheduled', start_time: '10:00', end_time: '12:00' }),
    ];
    const { result } = setup(jobs);
    expect(result.current.conflicts).toEqual([]);
  });

  it('ignora jobs sem machine_id, scheduled_date, start_time ou end_time', () => {
    const jobs = [
      job({ id: 'job-1', machine_id: null }),
      job({ id: 'job-2', scheduled_date: null }),
      job({ id: 'job-3', start_time: null }),
      job({ id: 'job-4', end_time: null }),
    ];
    const { result } = setup(jobs);
    expect(result.current.conflicts).toEqual([]);
  });

  it('ignora grupo cujo machine_id não corresponde a nenhuma máquina conhecida', () => {
    const jobs = [
      job({ id: 'job-1', machine_id: 'machine-desconhecida', start_time: '09:00', end_time: '11:00' }),
      job({ id: 'job-2', machine_id: 'machine-desconhecida', start_time: '10:00', end_time: '12:00' }),
    ];
    const { result } = setup(jobs);
    expect(result.current.conflicts).toEqual([]);
  });

  it('disputa pelo mesmo recurso: três jobs na mesma máquina/data sem duplicar entradas', () => {
    const jobs = [
      job({ id: 'job-1', start_time: '09:00', end_time: '11:00' }),
      job({ id: 'job-2', start_time: '10:00', end_time: '12:00' }),
      job({ id: 'job-3', start_time: '10:30', end_time: '13:00' }),
    ];
    const { result } = setup(jobs);

    expect(result.current.conflicts).toHaveLength(1);
    const ids = result.current.conflicts[0].jobs.map(j => j.id);
    expect(ids).toEqual(['job-1', 'job-2', 'job-3']);
    expect(new Set(ids).size).toBe(3);
  });

  it('ordena conflitos: severidade "error" antes de "warning", depois por data', () => {
    const jobs = [
      // Máquina A, 25/09 — warning
      job({ id: 'a1', machine_id: MACHINE_A.id, scheduled_date: '2026-09-25', status: 'scheduled', start_time: '09:00', end_time: '11:00' }),
      job({ id: 'a2', machine_id: MACHINE_A.id, scheduled_date: '2026-09-25', status: 'ready', start_time: '10:00', end_time: '12:00' }),
      // Máquina B, 24/09 — error (produção)
      job({ id: 'b1', machine_id: MACHINE_B.id, scheduled_date: '2026-09-24', status: 'production', start_time: '09:00', end_time: '11:00' }),
      job({ id: 'b2', machine_id: MACHINE_B.id, scheduled_date: '2026-09-24', status: 'scheduled', start_time: '10:00', end_time: '12:00' }),
    ];
    const { result } = setup(jobs);

    expect(result.current.conflicts).toHaveLength(2);
    expect(result.current.conflicts[0].severity).toBe('error');
    expect(result.current.conflicts[1].severity).toBe('warning');
  });
});
