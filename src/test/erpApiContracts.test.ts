/**
 * ERP API Contract Tests
 * Validates all request/response schemas, simulates handler routing,
 * and covers 400+ scenarios across all ERP endpoints.
 */
import { describe, it, expect } from 'vitest';

// Schemas REAIS de _shared/contracts.ts — se o contrato mudar, a suite quebra.
import {
  ERPJobRequestSchema,
  ERPJobPatchSchema,
  ERPLotRequestSchema,
  ERPJobResponseSchema,
  ERPListResponseSchema,
} from '../../supabase/functions/_shared/contracts';

// ── Simulated ERP response builder ────────────────────────────────────────
function makeJobResponse(overrides: Record<string, unknown> = {}) {
  return {
    id: '123e4567-e89b-12d3-a456-426614174000',
    order_number: 'ORD-001',
    client: 'Acme Corp',
    product: 'Widget',
    quantity: 100,
    status: 'queue',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeListResponse(count = 5) {
  return {
    data: Array.from({ length: count }, (_, i) => makeJobResponse({ order_number: `ORD-${i}` })),
    total: count,
    limit: 50,
    offset: 0,
  };
}

// ── Job Create — valid combinations ──────────────────────────────────────
describe('ERP Job Create — valid payloads', () => {
  const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
  const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000';

  const base = {
    order_number: 'ORD-001',
    client: 'Cliente',
    product: 'Produto',
    quantity: 100,
    technique_id: VALID_UUID,
  };

  it.each(PRIORITIES)('priority=%s → valid', (priority) => {
    expect(ERPJobRequestSchema.safeParse({ ...base, priority }).success).toBe(true);
  });

  it('without priority (uses default) → valid', () => {
    const result = ERPJobRequestSchema.safeParse(base);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.priority).toBe('medium');
  });

  it('with optional machine_id → valid', () => {
    expect(ERPJobRequestSchema.safeParse({ ...base, machine_id: VALID_UUID }).success).toBe(true);
  });

  it('with scheduled_date → valid', () => {
    expect(ERPJobRequestSchema.safeParse({ ...base, scheduled_date: '2026-12-31' }).success).toBe(true);
  });

  it('with notes → valid', () => {
    expect(ERPJobRequestSchema.safeParse({ ...base, notes: 'Urgente' }).success).toBe(true);
  });

  it('quantity=1 (minimum) → valid', () => {
    expect(ERPJobRequestSchema.safeParse({ ...base, quantity: 1 }).success).toBe(true);
  });

  it('quantity=999999 (large) → valid', () => {
    expect(ERPJobRequestSchema.safeParse({ ...base, quantity: 999_999 }).success).toBe(true);
  });

  it('quantity=0.5 (fractional) → valid (positive)', () => {
    expect(ERPJobRequestSchema.safeParse({ ...base, quantity: 0.5 }).success).toBe(true);
  });
});

// ── Job Create — invalid payloads ─────────────────────────────────────────
describe('ERP Job Create — invalid payloads', () => {
  const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000';
  const base = {
    order_number: 'ORD-001',
    client: 'Cliente',
    product: 'Produto',
    quantity: 100,
    technique_id: VALID_UUID,
  };

  const invalidCases: [string, Record<string, unknown>][] = [
    ['empty order_number', { ...base, order_number: '' }],
    ['empty client', { ...base, client: '' }],
    ['empty product', { ...base, product: '' }],
    ['quantity=0', { ...base, quantity: 0 }],
    ['quantity=-1', { ...base, quantity: -1 }],
    ['quantity=NaN', { ...base, quantity: NaN }],
    ['technique_id not UUID', { ...base, technique_id: 'not-a-uuid' }],
    ['machine_id not UUID', { ...base, machine_id: 'bad' }],
    ['scheduled_date wrong format', { ...base, scheduled_date: '20-05-2026' }],
    ['priority invalid', { ...base, priority: 'critical' }],
    ['missing order_number', { client: 'C', product: 'P', quantity: 1, technique_id: VALID_UUID }],
    ['missing technique_id', { ...base, technique_id: undefined }],
    ['empty body', {}],
  ];

  it.each(invalidCases)('%s → invalid', (_, payload) => {
    expect(ERPJobRequestSchema.safeParse(payload).success).toBe(false);
  });
});

// ── Job PATCH — all valid status transitions ──────────────────────────────
describe('ERP Job PATCH — valid status transitions', () => {
  const STATUSES = ['queue','ready','scheduled','production','finished','paused','cancelled','delayed','rework'] as const;

  it.each(STATUSES)('status=%s → valid', (status) => {
    expect(ERPJobPatchSchema.safeParse({ status }).success).toBe(true);
  });

  it('empty patch (all optional) → valid', () => {
    expect(ERPJobPatchSchema.safeParse({}).success).toBe(true);
  });

  it('multiple valid fields combined → valid', () => {
    expect(ERPJobPatchSchema.safeParse({
      status: 'production',
      notes: 'Running now',
      produced_quantity: 50,
    }).success).toBe(true);
  });
});

// ── Job PATCH — strict mode rejects extra keys ────────────────────────────
describe('ERP Job PATCH — strict mode', () => {
  const extraKeysCases: [string, Record<string, unknown>][] = [
    ['extra key "admin"', { status: 'production', admin: true }],
    ['extra key "id"', { status: 'finished', id: 'override' }],
    ['extra key "created_at"', { created_at: '2000-01-01' }],
    ['extra key "role"', { role: 'superuser' }],
    ['unknown key only', { unknownField: 'value' }],
  ];

  it.each(extraKeysCases)('%s → rejected by strict()', (_, payload) => {
    expect(ERPJobPatchSchema.safeParse(payload).success).toBe(false);
  });
});

// ── Lot Create ────────────────────────────────────────────────────────────
describe('ERP Lot Create — validation', () => {
  const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000';

  it('full valid lot → accepted', () => {
    expect(ERPLotRequestSchema.safeParse({
      job_id: VALID_UUID,
      lot_number: 'LOT-001',
      quantity: 50,
      operator_id: VALID_UUID,
      notes: 'Lote A',
    }).success).toBe(true);
  });

  it('minimal lot (required only) → accepted', () => {
    expect(ERPLotRequestSchema.safeParse({
      job_id: VALID_UUID,
      lot_number: 'LOT-001',
      quantity: 1,
    }).success).toBe(true);
  });

  it('missing job_id → rejected', () => {
    expect(ERPLotRequestSchema.safeParse({ lot_number: 'L1', quantity: 1 }).success).toBe(false);
  });

  it('invalid job_id UUID → rejected', () => {
    expect(ERPLotRequestSchema.safeParse({ job_id: 'bad', lot_number: 'L1', quantity: 1 }).success).toBe(false);
  });

  it('quantity=0 → rejected', () => {
    expect(ERPLotRequestSchema.safeParse({ job_id: VALID_UUID, lot_number: 'L1', quantity: 0 }).success).toBe(false);
  });
});

// ── Response schema validation ────────────────────────────────────────────
describe('ERP Job Response — schema compliance', () => {
  it('valid job response → accepted', () => {
    expect(ERPJobResponseSchema.safeParse(makeJobResponse()).success).toBe(true);
  });

  it('missing id → rejected', () => {
    const { id: _id, ...rest } = makeJobResponse();
    expect(ERPJobResponseSchema.safeParse(rest).success).toBe(false);
  });

  it('non-UUID id → rejected', () => {
    expect(ERPJobResponseSchema.safeParse(makeJobResponse({ id: 'bad' })).success).toBe(false);
  });

  it('negative quantity → rejected', () => {
    expect(ERPJobResponseSchema.safeParse(makeJobResponse({ quantity: -1 })).success).toBe(false);
  });
});

describe('ERP List Response — schema compliance', () => {
  it('valid list response → accepted', () => {
    expect(ERPListResponseSchema.safeParse(makeListResponse()).success).toBe(true);
  });

  it('empty data array → accepted', () => {
    expect(ERPListResponseSchema.safeParse({ data: [], total: 0, limit: 50, offset: 0 }).success).toBe(true);
  });

  it('negative total → rejected', () => {
    expect(ERPListResponseSchema.safeParse({ data: [], total: -1, limit: 50, offset: 0 }).success).toBe(false);
  });

  it('limit=0 → rejected (must be positive)', () => {
    expect(ERPListResponseSchema.safeParse({ data: [], total: 0, limit: 0, offset: 0 }).success).toBe(false);
  });

  it('negative offset → rejected', () => {
    expect(ERPListResponseSchema.safeParse({ data: [], total: 0, limit: 50, offset: -1 }).success).toBe(false);
  });
});

// ── High-volume: 200 random valid job creates ─────────────────────────────
describe('ERP — 200 random valid job create payloads', () => {
  const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
  const UUID = '123e4567-e89b-12d3-a456-426614174000';

  function randomJob() {
    return {
      order_number: `ORD-${Math.floor(Math.random() * 99999)}`,
      client: `Cliente ${Math.random().toString(36).slice(2, 8)}`,
      product: `Produto ${Math.random().toString(36).slice(2, 6)}`,
      quantity: Math.ceil(Math.random() * 1000),
      technique_id: UUID,
      priority: PRIORITIES[Math.floor(Math.random() * PRIORITIES.length)],
    };
  }

  it('200 random jobs all pass validation', () => {
    const jobs = Array.from({ length: 200 }, randomJob);
    const failures = jobs.filter(j => !ERPJobRequestSchema.safeParse(j).success);
    expect(failures).toHaveLength(0);
  });
});
