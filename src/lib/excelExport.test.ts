import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ExecutiveKPIs, DateRange } from '@/features/analytics/hooks/useExecutiveDashboard';
import type { SheetSpec } from '@/lib/excel';

const { downloadWorkbookMock } = vi.hoisted(() => ({ downloadWorkbookMock: vi.fn() }));
vi.mock('@/lib/excel', () => ({ downloadWorkbook: downloadWorkbookMock }));

import { exportExecutiveDashboardExcel, type ExportData } from './excelExport';

function buildKpis(overrides: Partial<ExecutiveKPIs> = {}): ExecutiveKPIs {
  return {
    totalJobsCompleted: 120,
    totalJobsInProgress: 8,
    totalPiecesProduced: 45230,
    totalPiecesLost: 312,
    productionEfficiency: 92.4,
    averageCycleTime: 18,
    totalMachines: 52,
    activeMachines: 47,
    machineUtilization: 81.2,
    maintenanceCompleted: 14,
    maintenancePending: 3,
    averageDowntime: 22,
    qualityRate: 99.3,
    defectRate: 0.7,
    trends: { production: 5.1, efficiency: -1.2, quality: 0.4, utilization: 2.3 },
    productionTrend: [
      { date: '2026-01-01', produced: 500, target: 550 },
      { date: '2026-01-02', produced: 480, target: 550 },
    ],
    efficiencyTrend: [{ date: '2026-01-01', efficiency: 90 }],
    techniqueDistribution: [{ technique: 'Sublimação', count: 30, color: '#000' }],
    topOperators: [{ name: 'João Silva', produced: 1200, efficiency: 95.5 }],
    machinePerformance: [{ machine: 'M-01', utilization: 80, oee: 75 }],
    ...overrides,
  };
}

function buildDateRange(): DateRange {
  return { start: new Date(2026, 0, 1), end: new Date(2026, 0, 31), label: 'Janeiro' };
}

function buildData(overrides: Partial<ExportData> = {}): ExportData {
  return { title: 'Dashboard Executivo', dateRange: buildDateRange(), kpis: buildKpis(), ...overrides };
}

function lastSheets(): SheetSpec[] {
  return downloadWorkbookMock.mock.calls.at(-1)?.[0] as SheetSpec[];
}

describe('excelExport', () => {
  beforeEach(() => downloadWorkbookMock.mockReset());

  it('builds the 3 documented sheets in order: Resumo, Tendência de Produção, Performance Máquinas', async () => {
    await exportExecutiveDashboardExcel(buildData());

    expect(downloadWorkbookMock).toHaveBeenCalledTimes(1);
    const sheets = lastSheets();
    expect(sheets.map((s) => s.name)).toEqual(['Resumo', 'Tendência de Produção', 'Performance Máquinas']);
  });

  it('Resumo sheet contains the KPI rows with formatted percentages', async () => {
    await exportExecutiveDashboardExcel(buildData());
    const [summary] = lastSheets();

    expect(summary.rows[0]).toEqual(['Dashboard', 'Dashboard Executivo']);
    expect(summary.rows[1]).toEqual(['Período', '01/01/2026 - 31/01/2026']);
    expect(summary.rows[3]).toEqual(['KPI', 'Valor', 'Tendência (%)']);
    expect(summary.rows[4]).toEqual(['Produção Total', 45230, '5.10']);
    expect(summary.rows[5]).toEqual(['Eficiência Global', '92.4%', '-1.20']);
  });

  it('Tendência de Produção sheet header + one row per productionTrend entry', async () => {
    await exportExecutiveDashboardExcel(buildData());
    const sheets = lastSheets();
    const trendSheet = sheets.find((s) => s.name === 'Tendência de Produção')!;

    expect(trendSheet.rows[0]).toEqual(['Data', 'Produzido', 'Meta']);
    expect(trendSheet.rows).toHaveLength(3); // header + 2 entries
    expect(trendSheet.rows[1]).toEqual(['2026-01-01', 500, 550]);
  });

  it('Performance Máquinas sheet header + one row per machinePerformance entry', async () => {
    await exportExecutiveDashboardExcel(buildData());
    const sheets = lastSheets();
    const machineSheet = sheets.find((s) => s.name === 'Performance Máquinas')!;

    expect(machineSheet.rows[0]).toEqual(['Máquina', 'Utilização (%)', 'OEE (%)']);
    expect(machineSheet.rows[1]).toEqual(['M-01', 80, 75]);
  });

  it('sanitizes the title (spaces -> underscore) and appends a timestamp to the filename', async () => {
    await exportExecutiveDashboardExcel(buildData({ title: 'Relatório Mensal Completo' }));
    const fileName = downloadWorkbookMock.mock.calls[0][1] as string;
    expect(fileName).toMatch(/^Relatório_Mensal_Completo_\d{4}-\d{2}-\d{2}_\d{4}\.xlsx$/);
  });

  it('empty productionTrend/machinePerformance arrays produce header-only sheets', async () => {
    await exportExecutiveDashboardExcel(buildData({ kpis: buildKpis({ productionTrend: [], machinePerformance: [] }) }));
    const sheets = lastSheets();
    expect(sheets.find((s) => s.name === 'Tendência de Produção')!.rows).toHaveLength(1);
    expect(sheets.find((s) => s.name === 'Performance Máquinas')!.rows).toHaveLength(1);
  });

  it('propagates a rejection from downloadWorkbook (e.g. browser download blocked)', async () => {
    downloadWorkbookMock.mockRejectedValueOnce(new Error('download blocked'));
    await expect(exportExecutiveDashboardExcel(buildData())).rejects.toThrow('download blocked');
  });

  it('handles a large productionTrend/machinePerformance dataset (500 rows each) without throwing', async () => {
    const productionTrend = Array.from({ length: 500 }, (_, i) => ({
      date: `2026-01-${String((i % 28) + 1).padStart(2, '0')}`,
      produced: i,
      target: i + 10,
    }));
    const machinePerformance = Array.from({ length: 500 }, (_, i) => ({
      machine: `M-${i}`,
      utilization: i % 100,
      oee: i % 100,
    }));

    await expect(
      exportExecutiveDashboardExcel(buildData({ kpis: buildKpis({ productionTrend, machinePerformance }) })),
    ).resolves.toBeUndefined();

    const sheets = lastSheets();
    expect(sheets.find((s) => s.name === 'Tendência de Produção')!.rows).toHaveLength(501);
    expect(sheets.find((s) => s.name === 'Performance Máquinas')!.rows).toHaveLength(501);
  });
});
