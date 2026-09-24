import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { SPCParameter, SPCMeasurement } from '@/features/analytics/hooks/useSPC';

// spcExport.ts imports `jsPDF` and `autoTable` statically (not via dynamic
// `import()`). Static imports are resolved before this file's own top-level
// statements run, so a plain outer `class` referenced from the `vi.mock`
// factory below would hit a TDZ error — everything the factories need must
// come out of `vi.hoisted` instead.
const { jsPdfSave, autoTableMock, MockJsPDF } = vi.hoisted(() => {
  const jsPdfSave = vi.fn();
  const autoTableMock = vi.fn();
  class MockJsPDF {
    lastAutoTable?: { finalY: number };
    internal = { getNumberOfPages: () => 2 };
    save = jsPdfSave;
    addPage = vi.fn();
    setPage = vi.fn();
    setFontSize = vi.fn();
    setTextColor = vi.fn();
    text = vi.fn();
    line = vi.fn();
  }
  return { jsPdfSave, autoTableMock, MockJsPDF };
});

vi.mock('jspdf', () => ({ default: MockJsPDF, jsPDF: MockJsPDF }));
vi.mock('jspdf-autotable', () => ({ default: autoTableMock }));

import { exportSPCReport } from './spcExport';

function buildParameter(overrides: Partial<SPCParameter> = {}): SPCParameter {
  return {
    id: 'param-1',
    name: 'Diâmetro Furo',
    product_name: 'Caneca 300ml',
    technique_id: 'tech-1',
    machine_id: 'machine-1',
    measurement_type: 'diameter',
    unit: 'mm',
    target_value: 10,
    upper_spec_limit: 10.5,
    lower_spec_limit: 9.5,
    upper_control_limit: 10.4,
    lower_control_limit: 9.6,
    sample_size: 5,
    frequency_minutes: 30,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function buildMeasurement(overrides: Partial<SPCMeasurement> = {}): SPCMeasurement {
  return {
    id: 'm-1',
    parameter_id: 'param-1',
    job_id: 'job-1',
    lot_id: null,
    sample_number: 1,
    values: [10.1, 10.2, 9.9],
    mean_value: 10.07,
    range_value: 0.3,
    std_deviation: 0.12,
    is_in_control: true,
    out_of_control_type: null,
    operator_id: 'op-1',
    operator_name: 'Maria',
    notes: null,
    measured_at: '2026-02-01T10:00:00Z',
    created_at: '2026-02-01T10:00:00Z',
    ...overrides,
  };
}

const capability = { cp: 1.33, cpk: 1.1, mean: 10.02, stdDev: 0.15, performance: 'Adequado' };

describe('spcExport', () => {
  beforeEach(() => {
    jsPdfSave.mockClear();
    autoTableMock.mockClear();
    autoTableMock.mockImplementation((doc: InstanceType<typeof MockJsPDF>) => {
      doc.lastAutoTable = { finalY: (doc.lastAutoTable?.finalY ?? 46) + 40 };
    });
  });

  it('renders parameter details, capability indices and measurement history when capability is provided', async () => {
    await exportSPCReport(buildParameter(), [buildMeasurement()], capability);

    expect(autoTableMock).toHaveBeenCalledTimes(3);
    const [detailsCall, capabilityCall, measurementsCall] = autoTableMock.mock.calls;

    expect((detailsCall[1] as { head: string[][] }).head[0]).toEqual(['Propriedade', 'Valor']);
    expect((detailsCall[1] as { body: string[][] }).body[0]).toEqual(['Nome', 'Diâmetro Furo']);

    expect((capabilityCall[1] as { head: string[][] }).head[0]).toEqual(['Índice', 'Valor', 'Avaliação']);
    expect((capabilityCall[1] as { body: string[][] }).body[0]).toEqual(['Cp', '1.330', 'Potencial do processo']);
    expect((capabilityCall[1] as { body: string[][] }).body[1]).toEqual(['Cpk', '1.100', 'Adequado']);

    expect((measurementsCall[1] as { head: string[][] }).head[0]).toEqual([
      'Amostra', 'Data', 'Valores', 'Média', 'Amplitude', 'Status',
    ]);
    expect((measurementsCall[1] as { body: unknown[][] }).body[0]).toEqual([
      1, '01/02 10:00', '10.1, 10.2, 9.9', '10.070', '0.300', 'EM CONTROLE',
    ]);

    expect(jsPdfSave).toHaveBeenCalledTimes(1);
    expect(jsPdfSave.mock.calls[0][0]).toMatch(/^Relatorio_SPC_Diâmetro_Furo_\d{8}\.pdf$/);
  });

  it('skips the capability section entirely when capability is null', async () => {
    await exportSPCReport(buildParameter(), [buildMeasurement()], null);

    // Only "detalhes do parâmetro" + "histórico de medições".
    expect(autoTableMock).toHaveBeenCalledTimes(2);
    const heads = autoTableMock.mock.calls.map((call) => (call[1] as { head: string[][] }).head[0][0]);
    expect(heads).toEqual(['Propriedade', 'Amostra']);
  });

  it('flags out-of-control measurements with the "FORA DE CONTROLE" status', async () => {
    await exportSPCReport(buildParameter(), [buildMeasurement({ is_in_control: false })], null);
    const measurementsCall = autoTableMock.mock.calls[1];
    expect((measurementsCall[1] as { body: unknown[][] }).body[0][5]).toBe('FORA DE CONTROLE');
  });

  it('falls back to "N/A" / "Não calculado" when optional parameter fields are missing', async () => {
    await exportSPCReport(
      buildParameter({ product_name: null, upper_control_limit: null, lower_control_limit: null }),
      [],
      null,
    );
    const detailsBody = (autoTableMock.mock.calls[0][1] as { body: string[][] }).body;
    expect(detailsBody).toContainEqual(['Produto', 'N/A']);
    expect(detailsBody).toContainEqual(['Limite de Controle Superior (UCL)', 'Não calculado']);
    expect(detailsBody).toContainEqual(['Limite de Controle Inferior (LCL)', 'Não calculado']);
  });

  it('renders an empty measurement history (header only) when there are no measurements', async () => {
    await exportSPCReport(buildParameter(), [], null);
    const measurementsCall = autoTableMock.mock.calls[1];
    expect((measurementsCall[1] as { body: unknown[][] }).body).toEqual([]);
  });

  it('handles a large measurement history (600 rows) without throwing or truncating', async () => {
    const measurements = Array.from({ length: 600 }, (_, i) => buildMeasurement({ id: `m-${i}`, sample_number: i }));
    await expect(exportSPCReport(buildParameter(), measurements, capability)).resolves.toBeUndefined();

    const measurementsCall = autoTableMock.mock.calls[2];
    // The section title says "últimas 50" but the implementation does not
    // slice the array — documenting the actual (unbounded) behavior.
    expect((measurementsCall[1] as { body: unknown[][] }).body).toHaveLength(600);
  });

  it('sanitizes the parameter name (spaces -> underscore) in the output filename', async () => {
    await exportSPCReport(buildParameter({ name: 'Peso Final Embalagem' }), [], null);
    expect(jsPdfSave.mock.calls[0][0]).toMatch(/^Relatorio_SPC_Peso_Final_Embalagem_\d{8}\.pdf$/);
  });
});
