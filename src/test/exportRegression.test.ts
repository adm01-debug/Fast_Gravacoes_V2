/**
 * Regressão automatizada dos fluxos de exportação.
 * Foco: correção do CSV gerado, escapamento, cabeçalhos, integração com DOM
 * e validação de tipos (sem uso de `any`).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  exportInventoryMovementsToCSV,
  type InventoryMovementExportRow,
} from '@/hooks/utils/inventoryExport';
import { exportOEETabledData } from '@/lib/oeeExport';

// ---------- Mocks ----------
const jsPdfSave = vi.fn();
const jsPdfAutoTable = vi.fn();
const jsPdfText = vi.fn();
const jsPdfSetFontSize = vi.fn();

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

// ---------- Interceptação de download ----------
interface CapturedDownload {
  blob: Blob;
  fileName: string;
  content: string;
}

let captured: CapturedDownload[] = [];
let originalCreate: typeof URL.createObjectURL;
let originalRevoke: typeof URL.revokeObjectURL;
let clickSpy: ReturnType<typeof vi.spyOn>;

beforeEach(async () => {
  captured = [];
  originalCreate = URL.createObjectURL;
  originalRevoke = URL.revokeObjectURL;

  URL.createObjectURL = vi.fn((blob: Blob) => {
    // Persist blob content synchronously via FileReader replacement (text())
    const holder: CapturedDownload = { blob, fileName: '', content: '' };
    captured.push(holder);
    return `blob:mock-${captured.length}`;
  });
  URL.revokeObjectURL = vi.fn();

  clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    const idx = captured.length - 1;
    if (idx >= 0) captured[idx].fileName = this.getAttribute('download') ?? '';
  });

  jsPdfSave.mockClear();
  jsPdfAutoTable.mockClear();
  jsPdfText.mockClear();
  jsPdfSetFontSize.mockClear();
});

afterEach(() => {
  URL.createObjectURL = originalCreate;
  URL.revokeObjectURL = originalRevoke;
  clickSpy.mockRestore();
});

async function readLastBlob(): Promise<string> {
  const last = captured.at(-1);
  if (!last) throw new Error('nenhum blob capturado');
  const text = await last.blob.text();
  last.content = text;
  return text;
}

// ================================================================
// INVENTORY — regressão de formato CSV
// ================================================================
describe('inventoryExport — regressão de formato', () => {
  const baseRow: InventoryMovementExportRow = {
    id: 'abc-123',
    created_at: '2026-01-15T10:30:00.000Z',
    type: 'IN',
    quantity: 42,
    from_location: 'Deposito A',
    to_location: 'Deposito B',
    reason: 'reposicao',
    inventory_items: { name: 'Tinta Azul' },
    profiles: { display_name: 'Joao Silva' },
  };

  it('gera cabeçalho canônico exato', async () => {
    exportInventoryMovementsToCSV([baseRow]);
    const csv = await readLastBlob();
    const header = csv.split('\n')[0];
    expect(header).toBe(
      'ID,Data/Hora,Item,Tipo,Quantidade,Usuário,Origem,Destino,Motivo',
    );
  });

  it('mapeia tipos IN/OUT/TRANSFER/ADJUST para labels em pt-BR', async () => {
    const rows: InventoryMovementExportRow[] = (['IN', 'OUT', 'TRANSFER', 'ADJUST'] as const).map(
      (t, i) => ({ ...baseRow, id: `id-${i}`, type: t }),
    );
    exportInventoryMovementsToCSV(rows);
    const csv = await readLastBlob();
    expect(csv).toContain(',Entrada,');
    expect(csv).toContain(',Saída,');
    expect(csv).toContain(',Transferência,');
    expect(csv).toContain(',Ajuste,');
  });

  it('faz fallback para full_name quando display_name está ausente', async () => {
    exportInventoryMovementsToCSV([
      { ...baseRow, profiles: { full_name: 'Maria', display_name: null } },
    ]);
    const csv = await readLastBlob();
    expect(csv).toContain('"Maria"');
  });

  it('usa N/A quando profile é null', async () => {
    exportInventoryMovementsToCSV([{ ...baseRow, profiles: null }]);
    const csv = await readLastBlob();
    expect(csv).toContain('"N/A"');
  });

  it('não gera "Invalid Date" quando created_at é null', async () => {
    exportInventoryMovementsToCSV([{ ...baseRow, created_at: null }]);
    const csv = await readLastBlob();
    expect(csv).not.toContain('Invalid Date');
  });

  it('nome do arquivo inclui data ISO', () => {
    exportInventoryMovementsToCSV([baseRow]);
    const today = new Date().toISOString().split('T')[0];
    expect(captured.at(-1)?.fileName).toBe(`historico_movimentacoes_${today}.csv`);
  });

  it('gera N linhas + 1 header para N movimentos', async () => {
    const rows = Array.from({ length: 25 }, (_, i) => ({ ...baseRow, id: `r-${i}` }));
    exportInventoryMovementsToCSV(rows);
    const csv = await readLastBlob();
    expect(csv.split('\n')).toHaveLength(26);
  });

  it('não invoca download com array vazio', () => {
    exportInventoryMovementsToCSV([]);
    expect(captured).toHaveLength(0);
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it('não invoca download com entrada null/undefined', () => {
    // @ts-expect-error validação runtime
    exportInventoryMovementsToCSV(null);
    // @ts-expect-error validação runtime
    exportInventoryMovementsToCSV(undefined);
    expect(clickSpy).not.toHaveBeenCalled();
  });
});

// ================================================================
// OEE — regressão CSV e PDF
// ================================================================
describe('oeeExport — regressão de formato', () => {
  const sample = {
    byMachine: [
      { machineName: 'M-01', availability: 95.234, performance: 87.65, quality: 99.9, oee: 82.3 },
      { machineName: 'M-02', availability: 70.0, performance: 60.0, quality: 100, oee: 42.0 },
    ],
  };

  it('CSV: header correto e formatação com 1 decimal', async () => {
    exportOEETabledData(sample, 'csv');
    const csv = await readLastBlob();
    const [header, l1, l2] = csv.split('\n');
    expect(header).toBe('Máquina,Disponibilidade (%),Performance (%),Qualidade (%),OEE (%)');
    // machineName is quoted (RFC-4180 + formula-injection sanitization) —
    // the numeric columns are never user-controlled and stay unquoted.
    expect(l1).toBe('"M-01",95.2,87.7,99.9,82.3');
    expect(l2).toBe('"M-02",70.0,60.0,100.0,42.0');
  });

  it('CSV: nome do arquivo com timestamp e extensão', () => {
    exportOEETabledData(sample, 'csv');
    expect(captured.at(-1)?.fileName).toMatch(/^OEE_Report_\d{4}-\d{2}-\d{2}_\d{4}\.csv$/);
  });

  it('PDF: invoca jsPDF.autoTable com head/body corretos', () => {
    exportOEETabledData(sample, 'pdf');
    expect(jsPdfAutoTable).toHaveBeenCalledTimes(1);
    const opts = jsPdfAutoTable.mock.calls[0][0] as {
      head: string[][];
      body: string[][];
      theme: string;
    };
    expect(opts.theme).toBe('grid');
    expect(opts.head[0]).toEqual([
      'Máquina',
      'Disponibilidade (%)',
      'Performance (%)',
      'Qualidade (%)',
      'OEE (%)',
    ]);
    expect(opts.body).toHaveLength(2);
    expect(opts.body[0][0]).toBe('M-01');
    expect(jsPdfSave).toHaveBeenCalledWith(expect.stringMatching(/^OEE_Report_.*\.pdf$/));
  });

  it('array vazio ainda produz arquivo com header', async () => {
    exportOEETabledData({ byMachine: [] }, 'csv');
    const csv = await readLastBlob();
    expect(csv).toBe('Máquina,Disponibilidade (%),Performance (%),Qualidade (%),OEE (%)');
  });

  it('valores extremos (NaN, Infinity) não lançam erro', () => {
    const extreme = {
      byMachine: [
        { machineName: 'X', availability: NaN, performance: Infinity, quality: -Infinity, oee: 0 },
      ],
    };
    expect(() => exportOEETabledData(extreme, 'csv')).not.toThrow();
    expect(() => exportOEETabledData(extreme, 'pdf')).not.toThrow();
  });
});

// ================================================================
// ERROS & VALIDAÇÃO DE TIPO EM RUNTIME
// ================================================================
describe('exportRegression — casos de erro e validação de tipo', () => {
  it('inventory: propaga erro quando URL.createObjectURL lança', () => {
    const original = URL.createObjectURL;
    URL.createObjectURL = vi.fn(() => {
      throw new Error('quota exceeded');
    });
    try {
      expect(() =>
        exportInventoryMovementsToCSV([
          {
            id: 'x',
            created_at: '2026-01-01T00:00:00Z',
            type: 'IN',
            quantity: 1,
          },
        ]),
      ).toThrow(/quota exceeded/);
    } finally {
      URL.createObjectURL = original;
    }
  });

  it('oee: propaga erro quando jsPDF.save falha (disco cheio, etc.)', () => {
    jsPdfSave.mockImplementationOnce(() => {
      throw new Error('disk full');
    });
    expect(() =>
      exportOEETabledData(
        { byMachine: [{ machineName: 'A', availability: 1, performance: 1, quality: 1, oee: 1 }] },
        'pdf',
      ),
    ).toThrow(/disk full/);
  });

  it('inventory: tolera row com todos os campos opcionais ausentes', async () => {
    exportInventoryMovementsToCSV([
      { id: 'min', created_at: null, type: 'IN', quantity: 0 },
    ]);
    const csv = await readLastBlob();
    // 1 header + 1 linha de dados
    expect(csv.split('\n')).toHaveLength(2);
    expect(csv).toContain('"N/A"');
  });

  it('inventory: tipo desconhecido cai no branch "Ajuste"', async () => {
    exportInventoryMovementsToCSV([
      {
        id: 'x',
        created_at: '2026-01-01T00:00:00Z',
        type: 'UNKNOWN_TYPE_XYZ',
        quantity: 1,
      },
    ]);
    const csv = await readLastBlob();
    expect(csv).toContain(',Ajuste,');
  });

  it('oee: valida invariante de contagem — body.length === input.length', () => {
    const input = {
      byMachine: Array.from({ length: 17 }, (_, i) => ({
        machineName: `M${i}`,
        availability: i,
        performance: i,
        quality: i,
        oee: i,
      })),
    };
    exportOEETabledData(input, 'pdf');
    const opts = jsPdfAutoTable.mock.calls.at(-1)?.[0] as { body: string[][] };
    expect(opts.body).toHaveLength(17);
  });

  it('oee: cada célula numérica é string com 1 casa decimal (contrato de formato)', () => {
    exportOEETabledData(
      {
        byMachine: [{ machineName: 'A', availability: 12, performance: 34.5678, quality: 0, oee: 100 }],
      },
      'pdf',
    );
    const opts = jsPdfAutoTable.mock.calls.at(-1)?.[0] as { body: string[][] };
    const row = opts.body[0];
    // machineName + 4 números formatados
    expect(row).toHaveLength(5);
    for (let i = 1; i < 5; i++) {
      expect(row[i]).toMatch(/^-?\d+\.\d$/);
    }
  });

  it('inventory: entrada não-array (objeto) é tratada sem download', () => {
    // @ts-expect-error validação runtime de tipo inválido
    expect(() => exportInventoryMovementsToCSV({})).toThrow();
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it('inventory: quantidade zero e negativa são preservadas literalmente', async () => {
    exportInventoryMovementsToCSV([
      { id: '1', created_at: '2026-01-01T00:00:00Z', type: 'IN', quantity: 0 },
      { id: '2', created_at: '2026-01-01T00:00:00Z', type: 'OUT', quantity: -5 },
    ]);
    const csv = await readLastBlob();
    const lines = csv.split('\n');
    expect(lines[1]).toContain(',0,');
    expect(lines[2]).toContain(',-5,');
  });
});

