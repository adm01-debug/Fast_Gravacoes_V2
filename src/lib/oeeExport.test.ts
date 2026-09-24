import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// exportOEETabledData imports `jsPDF` and side-effect `jspdf-autotable`
// statically and calls `doc.autoTable(...)` directly (not the module-level
// `autoTable(doc, opts)` helper used elsewhere in this codebase).
const { jsPdfSave, jsPdfAutoTable, jsPdfText, jsPdfSetFontSize } = vi.hoisted(() => ({
  jsPdfSave: vi.fn(),
  jsPdfAutoTable: vi.fn(),
  jsPdfText: vi.fn(),
  jsPdfSetFontSize: vi.fn(),
}));

vi.mock('jspdf', () => {
  class MockJsPDF {
    save = jsPdfSave;
    text = jsPdfText;
    setFontSize = jsPdfSetFontSize;
    autoTable = jsPdfAutoTable;
  }
  return { jsPDF: MockJsPDF, default: MockJsPDF };
});
vi.mock('jspdf-autotable', () => ({ default: vi.fn() }));

import { exportOEETabledData } from './oeeExport';

interface OEEMachineRow {
  machineName: string;
  availability: number;
  performance: number;
  quality: number;
  oee: number;
}

function buildData(rows: OEEMachineRow[] = []) {
  return { byMachine: rows.length ? rows : [{ machineName: 'M-01', availability: 91.2, performance: 88.5, quality: 99.1, oee: 79.9 }] };
}

describe('oeeExport', () => {
  let clickSpy: ReturnType<typeof vi.spyOn>;
  let downloadAttr = '';
  let capturedBlob: Blob | undefined;
  let createObjectURLSpy: ReturnType<typeof vi.fn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    jsPdfSave.mockClear();
    jsPdfAutoTable.mockClear();
    jsPdfText.mockClear();
    jsPdfSetFontSize.mockClear();

    downloadAttr = '';
    capturedBlob = undefined;
    createObjectURLSpy = vi.fn((blob: Blob) => {
      capturedBlob = blob;
      return 'blob:mock-url';
    });
    revokeObjectURLSpy = vi.fn();
    URL.createObjectURL = createObjectURLSpy as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL = revokeObjectURLSpy as unknown as typeof URL.revokeObjectURL;

    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      downloadAttr = this.getAttribute('download') ?? '';
    });
  });

  afterEach(() => clickSpy.mockRestore());

  async function readCsv(): Promise<string> {
    if (!capturedBlob) throw new Error('no CSV blob captured');
    return capturedBlob.text();
  }

  describe('pdf', () => {
    it('renders the header row via doc.autoTable with a grid theme', () => {
      exportOEETabledData(buildData(), 'pdf');

      expect(jsPdfAutoTable).toHaveBeenCalledTimes(1);
      const opts = jsPdfAutoTable.mock.calls[0][0] as { head: string[][]; theme: string };
      expect(opts.theme).toBe('grid');
      expect(opts.head[0]).toEqual(['Máquina', 'Disponibilidade (%)', 'Performance (%)', 'Qualidade (%)', 'OEE (%)']);
    });

    it('writes an unsanitized (raw) machineName into the PDF body, unlike the CSV path', () => {
      exportOEETabledData(buildData([{ machineName: '=cmd|calc', availability: 1, performance: 1, quality: 1, oee: 1 }]), 'pdf');
      const opts = jsPdfAutoTable.mock.calls[0][0] as { body: string[][] };
      expect(opts.body[0][0]).toBe('=cmd|calc');
    });

    it('renders a header-only table (empty body) when byMachine is empty', () => {
      exportOEETabledData({ byMachine: [] }, 'pdf');
      const opts = jsPdfAutoTable.mock.calls[0][0] as { body: string[][] };
      expect(opts.body).toEqual([]);
    });

    it('saves with the OEE_Report_<timestamp>.pdf filename pattern and never touches URL.createObjectURL', () => {
      exportOEETabledData(buildData(), 'pdf');
      expect(jsPdfSave).toHaveBeenCalledWith(expect.stringMatching(/^OEE_Report_\d{4}-\d{2}-\d{2}_\d{4}\.pdf$/));
      expect(createObjectURLSpy).not.toHaveBeenCalled();
    });

    it('handles a large machine list (600 rows) without throwing', () => {
      const rows = Array.from({ length: 600 }, (_, i) => ({
        machineName: `M-${i}`,
        availability: i % 100,
        performance: i % 100,
        quality: i % 100,
        oee: i % 100,
      }));
      expect(() => exportOEETabledData(buildData(rows), 'pdf')).not.toThrow();
      const opts = jsPdfAutoTable.mock.calls[0][0] as { body: string[][] };
      expect(opts.body).toHaveLength(600);
    });
  });

  describe('csv', () => {
    it('prefixes a tab-leading machineName with a single quote (formula-injection guard)', async () => {
      exportOEETabledData(buildData([{ machineName: '\tPerigoso', availability: 1, performance: 1, quality: 1, oee: 1 }]), 'csv');
      const csv = await readCsv();
      expect(csv.split('\n')[1]).toBe('"\'\tPerigoso",1.0,1.0,1.0,1.0');
    });

    it('doubles embedded double-quotes in machineName (RFC 4180 quoting)', async () => {
      exportOEETabledData(buildData([{ machineName: 'M "Laser" 01', availability: 1, performance: 1, quality: 1, oee: 1 }]), 'csv');
      const csv = await readCsv();
      expect(csv.split('\n')[1]).toContain('"M ""Laser"" 01"');
    });

    it('produces a CSV blob and download attribute with the .csv extension', async () => {
      exportOEETabledData(buildData(), 'csv');
      expect(capturedBlob?.type).toBe('text/csv;charset=utf-8;');
      expect(downloadAttr).toMatch(/^OEE_Report_\d{4}-\d{2}-\d{2}_\d{4}\.csv$/);
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
      expect(jsPdfSave).not.toHaveBeenCalled();
    });

    it('emits only the header line when byMachine is empty', async () => {
      exportOEETabledData({ byMachine: [] }, 'csv');
      const csv = await readCsv();
      expect(csv.split('\n')).toHaveLength(1);
    });

    it('handles a large machine list (600 rows) without throwing, one CSV line per machine', async () => {
      const rows = Array.from({ length: 600 }, (_, i) => ({
        machineName: `Máquina ${i}`,
        availability: i % 100,
        performance: i % 100,
        quality: i % 100,
        oee: i % 100,
      }));
      exportOEETabledData(buildData(rows), 'csv');
      const csv = await readCsv();
      expect(csv.split('\n')).toHaveLength(601); // header + 600 rows
    });
  });
});
