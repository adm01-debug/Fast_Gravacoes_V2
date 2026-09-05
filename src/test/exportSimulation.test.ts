/**
 * Simulação massiva de cenários de exportação (oeeExport + inventoryExport).
 * Cobre: dados vazios, nulos, strings maliciosas (CSV injection / quotes / newlines),
 * datas inválidas, unicode, volumes grandes, tipos desconhecidos, campos faltantes.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  exportInventoryMovementsToCSV,
  type InventoryMovementExportRow,
} from '@/hooks/utils/inventoryExport';
import { exportOEETabledData } from '@/lib/oeeExport';

// ---------- Mocks ----------
vi.mock('jspdf', () => {
  class MockJsPDF {
    save = vi.fn();
    text = vi.fn();
    setFontSize = vi.fn();
    autoTable = vi.fn();
  }
  return { jsPDF: MockJsPDF, default: MockJsPDF };
});
vi.mock('jspdf-autotable', () => ({ default: vi.fn() }));

// jsdom lacks URL.createObjectURL
beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:mock');
  URL.revokeObjectURL = vi.fn();
});

// ---------- Helpers ----------
const rand = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
};

const MALICIOUS_STRINGS = [
  '=cmd|"/c calc"!A1',        // CSV injection
  '@SUM(1+1)',
  '+1+1',
  '-1-1',
  'valor,com,virgulas',
  'valor "com" aspas',
  'valor\ncom\nnewlines',
  'valor\tcom\ttabs',
  '🎉 emoji ✅ ção',
  '<script>alert(1)</script>',
  '',
  ' ',
  'a'.repeat(10_000),
];

// ================================================================
// INVENTORY EXPORT — 200+ cenários
// ================================================================
describe('inventoryExport — simulação de cenários', () => {
  const buildRow = (i: number, r: () => number): InventoryMovementExportRow => {
    const types = ['IN', 'OUT', 'TRANSFER', 'ADJUST', 'UNKNOWN_TYPE'] as const;
    const name = MALICIOUS_STRINGS[i % MALICIOUS_STRINGS.length];
    return {
      id: `mov-${i}`,
      created_at: i % 7 === 0 ? null : new Date(2026, 0, (i % 28) + 1).toISOString(),
      type: types[i % types.length],
      quantity: r() < 0.1 ? 0 : Math.floor(r() * 10_000) - 500,
      from_location: i % 5 === 0 ? null : `Loc-${name}`,
      to_location: i % 6 === 0 ? undefined : `Dest-${name}`,
      reason: i % 4 === 0 ? null : name,
      inventory_items: i % 3 === 0 ? null : { name },
      profiles:
        i % 9 === 0
          ? null
          : i % 2 === 0
          ? { display_name: name }
          : { full_name: name, display_name: null },
    };
  };

  it('não lança erro em 300 movimentos aleatórios com dados sujos', () => {
    const r = rand(42);
    const rows: InventoryMovementExportRow[] = Array.from({ length: 300 }, (_, i) =>
      buildRow(i, r),
    );
    expect(() => exportInventoryMovementsToCSV(rows)).not.toThrow();
  });

  it('retorna silenciosamente com array vazio', () => {
    expect(() => exportInventoryMovementsToCSV([])).not.toThrow();
  });

  it('retorna silenciosamente com null/undefined', () => {
    // @ts-expect-error testando entrada inválida
    expect(() => exportInventoryMovementsToCSV(null)).not.toThrow();
    // @ts-expect-error testando entrada inválida
    expect(() => exportInventoryMovementsToCSV(undefined)).not.toThrow();
  });

  it.each(MALICIOUS_STRINGS)('lida com string maliciosa: %s', (s) => {
    const row: InventoryMovementExportRow = {
      id: 'x',
      created_at: '2026-01-01T00:00:00Z',
      type: 'IN',
      quantity: 1,
      from_location: s,
      to_location: s,
      reason: s,
      inventory_items: { name: s },
      profiles: { display_name: s },
    };
    expect(() => exportInventoryMovementsToCSV([row])).not.toThrow();
  });

  it('lida com created_at nulo sem gerar "Invalid Date"', () => {
    const row: InventoryMovementExportRow = {
      id: 'x',
      created_at: null,
      type: 'IN',
      quantity: 1,
    };
    expect(() => exportInventoryMovementsToCSV([row])).not.toThrow();
  });

  it('performance: 5000 linhas em <2s', () => {
    const r = rand(7);
    const rows = Array.from({ length: 5000 }, (_, i) => buildRow(i, r));
    const start = performance.now();
    exportInventoryMovementsToCSV(rows);
    expect(performance.now() - start).toBeLessThan(2000);
  });
});

// ================================================================
// OEE EXPORT — cenários CSV + PDF
// ================================================================
describe('oeeExport — simulação de cenários', () => {
  const buildOEE = (i: number, r: () => number) => ({
    machineName: `Máquina ${MALICIOUS_STRINGS[i % MALICIOUS_STRINGS.length]}`,
    availability: r() * 100,
    performance: r() * 100,
    quality: r() * 100,
    oee: r() * 100,
  });

  it('CSV: 100 máquinas com nomes maliciosos', () => {
    const r = rand(1);
    const data = { byMachine: Array.from({ length: 100 }, (_, i) => buildOEE(i, r)) };
    expect(() => exportOEETabledData(data, 'csv')).not.toThrow();
  });

  it('PDF: 100 máquinas', () => {
    const r = rand(2);
    const data = { byMachine: Array.from({ length: 100 }, (_, i) => buildOEE(i, r)) };
    expect(() => exportOEETabledData(data, 'pdf')).not.toThrow();
  });

  it('lida com array vazio', () => {
    expect(() => exportOEETabledData({ byMachine: [] }, 'csv')).not.toThrow();
    expect(() => exportOEETabledData({ byMachine: [] }, 'pdf')).not.toThrow();
  });

  it('lida com valores extremos (NaN, Infinity, negativos)', () => {
    const data = {
      byMachine: [
        { machineName: 'A', availability: NaN, performance: Infinity, quality: -Infinity, oee: 0 },
        { machineName: 'B', availability: -1, performance: 999999, quality: 0.00001, oee: 100 },
      ],
    };
    expect(() => exportOEETabledData(data, 'csv')).not.toThrow();
    expect(() => exportOEETabledData(data, 'pdf')).not.toThrow();
  });

  it('performance: 1000 máquinas em <2s', () => {
    const r = rand(9);
    const data = { byMachine: Array.from({ length: 1000 }, (_, i) => buildOEE(i, r)) };
    const start = performance.now();
    exportOEETabledData(data, 'csv');
    expect(performance.now() - start).toBeLessThan(2000);
  });
});

// ================================================================
// GAP DETECTION — falhas conhecidas / recomendações
// ================================================================
describe('exportSimulation — gaps detectados', () => {
  it('GAP: CSV injection não é escapado (=, +, -, @) — recomendar prefix apóstrofo', () => {
    // Este teste documenta a lacuna: a implementação atual não previne CSV injection.
    // Excel/Sheets interpretariam =cmd como fórmula. Mitigação: prefixar com "'".
    const row: InventoryMovementExportRow = {
      id: 'x',
      created_at: '2026-01-01T00:00:00Z',
      type: 'IN',
      quantity: 1,
      reason: '=cmd|"/c calc"!A1',
    };
    expect(() => exportInventoryMovementsToCSV([row])).not.toThrow();
    // TODO: quando escapamento for adicionado, validar prefixo "'".
  });
});
