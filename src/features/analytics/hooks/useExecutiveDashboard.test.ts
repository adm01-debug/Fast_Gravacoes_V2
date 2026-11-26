import { describe, expect, it } from 'vitest';
import { escolherRetratoDoPeriodo, type MetricaSaudeMaquina } from './useExecutiveDashboard';

const metrica = (over: Partial<MetricaSaudeMaquina>): MetricaSaudeMaquina => ({
  id: `m-${over.period_start}-${over.period_end}`,
  machine_id: 'maquina-1',
  period_start: '2026-10-01',
  period_end: '2026-10-30',
  total_jobs: 0,
  total_produced: 0,
  total_losses: 0,
  total_production_hours: 0,
  maintenance_count: 0,
  corrective_maintenance_count: 0,
  avg_time_between_failures: null,
  avg_repair_time: null,
  oee_score: 0,
  calculated_at: '2026-11-01T00:00:00Z',
  ...over,
});

describe('escolherRetratoDoPeriodo', () => {
  it('escolhe o retrato do período pedido, não o mais recente', () => {
    const retratos = [
      metrica({ period_start: '2026-08-01', period_end: '2026-08-30', oee_score: 40, calculated_at: '2026-09-01T00:00:00Z' }),
      metrica({ period_start: '2026-08-20', period_end: '2026-09-18', oee_score: 55, calculated_at: '2026-09-19T00:00:00Z' }),
      metrica({ period_start: '2026-10-28', period_end: '2026-11-26', oee_score: 80, calculated_at: '2026-11-26T00:00:00Z' }),
    ];

    const escolhido = escolherRetratoDoPeriodo(retratos, '2026-09-30T23:59:59.000Z');

    expect(escolhido.get('maquina-1')?.oee_score).toBe(55);
  });

  it('prefere a janela que contém o fim do período mesmo com fim mais distante', () => {
    const retratos = [
      metrica({ period_start: '2026-10-28', period_end: '2026-11-20', oee_score: 70 }),
      metrica({ period_start: '2026-10-01', period_end: '2026-11-30', oee_score: 90 }),
    ];

    const escolhido = escolherRetratoDoPeriodo(retratos, '2026-11-26T00:00:00.000Z');

    expect(escolhido.get('maquina-1')?.oee_score).toBe(90);
  });

  it('desempata pela apuração mais recente', () => {
    const retratos = [
      metrica({ oee_score: 10, calculated_at: '2026-11-25T00:00:00Z' }),
      metrica({ oee_score: 20, calculated_at: '2026-11-26T00:00:00Z' }),
    ];

    const escolhido = escolherRetratoDoPeriodo(retratos, '2026-10-31T00:00:00.000Z');

    expect(escolhido.get('maquina-1')?.oee_score).toBe(20);
  });

  it('mantém uma entrada por máquina', () => {
    const retratos = [
      metrica({ machine_id: 'a', oee_score: 10 }),
      metrica({ machine_id: 'b', oee_score: 20 }),
      metrica({ machine_id: 'a', oee_score: 30, calculated_at: '2026-11-27T00:00:00Z' }),
    ];

    const escolhido = escolherRetratoDoPeriodo(retratos, '2026-10-31T00:00:00.000Z');

    expect(escolhido.size).toBe(2);
    expect(escolhido.get('a')?.oee_score).toBe(30);
    expect(escolhido.get('b')?.oee_score).toBe(20);
  });
});