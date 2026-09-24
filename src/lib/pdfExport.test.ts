import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ExecutiveKPIs, DateRange } from '@/features/analytics/hooks/useExecutiveDashboard';

const { jsPdfSave, jsPdfAddPage, autoTableMock } = vi.hoisted(() => ({
  jsPdfSave: vi.fn(),
  jsPdfAddPage: vi.fn(),
  autoTableMock: vi.fn(),
}));

// jsPDF and jspdf-autotable are loaded via dynamic `import()` in pdfExport.ts,
// so the mocks below must satisfy the same module shape as the real packages
// (default export). `lastAutoTable.finalY` is mutated by the autoTable mock
// itself, mirroring the plugin's real behavior of attaching it to the doc.
class MockJsPDF {
  lastAutoTable = { finalY: 40 };
  internal = { pageSize: { getWidth: () => 297, getHeight: () => 210 } };
  save = jsPdfSave;
  addPage = jsPdfAddPage;
  setFillColor = vi.fn();
  rect = vi.fn();
  setTextColor = vi.fn();
  setFontSize = vi.fn();
  setFont = vi.fn();
  text = vi.fn();
  getTextWidth = vi.fn(() => 30);
  getNumberOfPages = vi.fn(() => 1);
  setPage = vi.fn();
}

vi.mock('jspdf', () => ({ default: MockJsPDF }));
vi.mock('jspdf-autotable', () => ({ default: autoTableMock }));

import {
  exportExecutiveDashboardPDF,
  exportProductionReport,
  exportLossesReport,
  exportDelaysReport,
  type LossJobRow,
  type DelayJobRow,
} from './pdfExport';

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
    productionTrend: [{ date: '2026-01-01', produced: 500, target: 550 }],
    efficiencyTrend: [{ date: '2026-01-01', efficiency: 90 }],
    techniqueDistribution: [{ technique: 'Sublimação', count: 30, color: '#000' }],
    topOperators: [{ name: 'João Silva', produced: 1200, efficiency: 95.5 }],
    machinePerformance: [{ machine: 'M-01', utilization: 80, oee: 75 }],
    ...overrides,
  };
}

function buildDateRange(overrides: Partial<DateRange> = {}): DateRange {
  return { start: new Date(2026, 0, 1), end: new Date(2026, 0, 31), label: 'Janeiro', ...overrides };
}

describe('pdfExport', () => {
  beforeEach(() => {
    jsPdfSave.mockClear();
    jsPdfAddPage.mockClear();
    autoTableMock.mockClear();
    autoTableMock.mockImplementation((doc: MockJsPDF) => {
      doc.lastAutoTable = { finalY: doc.lastAutoTable.finalY + 20 };
    });
  });

  describe('exportExecutiveDashboardPDF', () => {
    it('renders one autoTable section per KPI group present in the data', async () => {
      await exportExecutiveDashboardPDF({
        title: 'Dashboard Executivo',
        dateRange: buildDateRange(),
        kpis: buildKpis(),
      });

      // Produção, Máquinas, Qualidade, Manutenção, Top Operadores, Técnica, Performance
      expect(autoTableMock).toHaveBeenCalledTimes(7);
      const heads = autoTableMock.mock.calls.map((call) => (call[1] as { head: string[][] }).head[0]);
      expect(heads).toEqual([
        ['Indicador', 'Valor'],
        ['Indicador', 'Valor'],
        ['Indicador', 'Valor'],
        ['Indicador', 'Valor'],
        ['Posição', 'Operador', 'Peças Produzidas', 'Eficiência'],
        ['Técnica', 'Quantidade de Jobs'],
        ['Máquina', 'Utilização', 'OEE'],
      ]);
      expect(jsPdfSave).toHaveBeenCalledTimes(1);
      expect(jsPdfSave.mock.calls[0][0]).toMatch(/^relatorio-executivo-\d{4}-\d{2}-\d{2}-\d{4}\.pdf$/);
    });

    it('skips the Top Operadores/Técnica/Performance sections when those arrays are empty', async () => {
      await exportExecutiveDashboardPDF({
        title: 'Dashboard Executivo',
        dateRange: buildDateRange(),
        kpis: buildKpis({ topOperators: [], techniqueDistribution: [], machinePerformance: [] }),
      });

      // Only the 4 always-present KPI group tables remain.
      expect(autoTableMock).toHaveBeenCalledTimes(4);
    });

    it('handles a large number of operators/techniques/machines without throwing', async () => {
      const topOperators = Array.from({ length: 300 }, (_, i) => ({
        name: `Operador ${i}`,
        produced: i * 10,
        efficiency: 80 + (i % 20),
      }));
      const techniqueDistribution = Array.from({ length: 300 }, (_, i) => ({
        technique: `Técnica ${i}`,
        count: i,
        color: '#123456',
      }));
      const machinePerformance = Array.from({ length: 300 }, (_, i) => ({
        machine: `M-${i}`,
        utilization: 50 + (i % 50),
        oee: 40 + (i % 60),
      }));

      await expect(
        exportExecutiveDashboardPDF({
          title: 'Dashboard Executivo',
          dateRange: buildDateRange(),
          kpis: buildKpis({ topOperators, techniqueDistribution, machinePerformance }),
        }),
      ).resolves.toBeUndefined();

      const operatorsCall = autoTableMock.mock.calls.find(
        (call) => (call[1] as { head: string[][] }).head[0][0] === 'Posição',
      );
      expect((operatorsCall?.[1] as { body: unknown[] }).body).toHaveLength(300);
    });
  });

  describe('exportProductionReport', () => {
    const baseJob = {
      order_number: 'OS-1001',
      client: 'Cliente A',
      product: 'Caneca 300ml',
      status: 'production',
      quantity: 500,
      produced_quantity: 420,
      lost_pieces: 5,
      scheduled_date: '2026-02-10',
    };

    it('maps job fields into table rows in the documented column order', async () => {
      await exportProductionReport([baseJob], buildDateRange());

      expect(autoTableMock).toHaveBeenCalledTimes(1);
      const [, opts] = autoTableMock.mock.calls[0] as [unknown, { head: string[][]; body: string[][] }];
      expect(opts.head[0]).toEqual(['OS', 'Cliente', 'Produto', 'Qtd', 'Produzido', 'Perdas', 'Status', 'Data']);
      expect(opts.body[0]).toEqual(['OS-1001', 'Cliente A', 'Caneca 300ml', '500', '420', '5', 'production', '10/02/2026']);
      expect(jsPdfSave.mock.calls[0][0]).toMatch(/^relatorio-producao-.*\.pdf$/);
    });

    it('defaults missing produced_quantity/lost_pieces to 0 and missing scheduled_date to "-"', async () => {
      await exportProductionReport(
        [{ ...baseJob, produced_quantity: undefined, lost_pieces: undefined, scheduled_date: null }],
        buildDateRange(),
      );

      const [, opts] = autoTableMock.mock.calls[0] as [unknown, { body: string[][] }];
      expect(opts.body[0]).toEqual(['OS-1001', 'Cliente A', 'Caneca 300ml', '500', '0', '0', 'production', '-']);
    });

    it('renders an empty table (header only) for an empty job list', async () => {
      await exportProductionReport([], buildDateRange());
      const [, opts] = autoTableMock.mock.calls[0] as [unknown, { body: string[][] }];
      expect(opts.body).toEqual([]);
    });

    it('handles a large job list (500 rows) without throwing', async () => {
      const jobs = Array.from({ length: 500 }, (_, i) => ({ ...baseJob, order_number: `OS-${i}` }));
      await expect(exportProductionReport(jobs, buildDateRange())).resolves.toBeUndefined();
      const [, opts] = autoTableMock.mock.calls[0] as [unknown, { body: string[][] }];
      expect(opts.body).toHaveLength(500);
    });
  });

  describe('exportLossesReport', () => {
    const lossJob: LossJobRow = {
      id: 'abcdef12-3456',
      order_number: 'OS-2002',
      product_name: 'Squeeze 500ml',
      lost_pieces: 10,
      loss_reason: 'Risco na superfície',
    };

    it('estimates cost at R$15.50/piece and falls back to id prefix / defaults', async () => {
      await exportLossesReport(
        [lossJob, { id: 'no-metadata-999', lost_pieces: 3 }],
        { start: new Date(), end: new Date() },
        undefined,
        15.5,
      );

      const [, opts] = autoTableMock.mock.calls[0] as [unknown, { body: string[][] }];
      expect(opts.body[0]).toEqual(['OS-2002', 'Squeeze 500ml', '10', 'Risco na superfície', 'R$ 155.00']);
      expect(opts.body[1]).toEqual(['no-metad', 'Produto', '3', 'Não informado', 'R$ 46.50']);
      expect(jsPdfSave.mock.calls[0][0]).toMatch(/^relatorio-perdas-.*\.pdf$/);
    });

    it('renders header-only table for an empty loss list', async () => {
      await exportLossesReport([], { start: new Date(), end: new Date() });
      const [, opts] = autoTableMock.mock.calls[0] as [unknown, { body: string[][] }];
      expect(opts.body).toEqual([]);
    });

    it('handles a large loss list (400 rows) without throwing', async () => {
      const jobs: LossJobRow[] = Array.from({ length: 400 }, (_, i) => ({ ...lossJob, id: `id-${i}` }));
      await expect(exportLossesReport(jobs, { start: new Date(), end: new Date() })).resolves.toBeUndefined();
    });
  });

  describe('exportDelaysReport', () => {
    const delayJob: DelayJobRow = {
      id: 'job-3003',
      order_number: 'OS-3003',
      product_name: 'Chaveiro',
      delay_time: '2h30',
      responsible_name: 'Maria Souza',
      status: 'delayed',
    };

    it('maps status "delayed" to severidade "Crítico" and any other status to "Alerta"', async () => {
      await exportDelaysReport(
        [delayJob, { ...delayJob, id: 'job-3004', status: 'at_risk' }],
        { start: new Date(), end: new Date() },
      );

      const [, opts] = autoTableMock.mock.calls[0] as [unknown, { body: string[][] }];
      expect(opts.body[0][4]).toBe('Crítico');
      expect(opts.body[1][4]).toBe('Alerta');
      expect(jsPdfSave.mock.calls[0][0]).toMatch(/^relatorio-atrasos-.*\.pdf$/);
    });

    it('falls back to id prefix, "Atrasado" and "Não atribuído" for missing optional fields', async () => {
      await exportDelaysReport(
        [{ id: 'no-optional-fields-777' }],
        { start: new Date(), end: new Date() },
      );
      const [, opts] = autoTableMock.mock.calls[0] as [unknown, { body: string[][] }];
      expect(opts.body[0]).toEqual(['no-optio', 'Produto', 'Atrasado', 'Não atribuído', 'Alerta']);
    });

    it('handles a large delay list (400 rows) without throwing', async () => {
      const jobs = Array.from({ length: 400 }, (_, i) => ({ ...delayJob, id: `job-${i}` }));
      await expect(exportDelaysReport(jobs, { start: new Date(), end: new Date() })).resolves.toBeUndefined();
    });
  });
});
