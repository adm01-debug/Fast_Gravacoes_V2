import { describe, it, expect } from 'vitest';
import { calculateRealOEE } from '@/features/production/services/oeeCalculations';
import type { DbJob } from '@/features/jobs';

function makeJob(overrides: Partial<DbJob> = {}): DbJob {
  return {
    id: 'j1',
    order_number: 'OS-001',
    client: 'Test',
    product: 'Widget',
    quantity: 100,
    produced_quantity: 100,
    lost_pieces: 0,
    status: 'finished',
    priority: 'normal',
    technique_id: null,
    machine_id: null,
    scheduled_date: null,
    actual_start_time: '2024-01-15T08:00:00.000Z',
    actual_end_time: '2024-01-15T09:00:00.000Z',
    estimated_duration: 60,
    start_time: null,
    end_time: null,
    operator_id: null,
    created_at: '2024-01-15T07:00:00.000Z',
    updated_at: '2024-01-15T09:00:00.000Z',
    notes: null,
    description: null,
    tags: null,
    is_buffer: false,
    buffer_priority: null,
    requested_date: null,
    ...overrides,
  } as DbJob;
}

describe('calculateRealOEE', () => {
  it('returns 100% quality when no jobs', () => {
    const result = calculateRealOEE([]);
    expect(result.quality).toBe(100);
    expect(result.oee).toBe(100);
  });

  it('calculates standard metrics correctly', () => {
    const job = makeJob({ produced_quantity: 90, lost_pieces: 10 });
    const result = calculateRealOEE([job]);
    expect(result.goodPieces).toBe(80);
    expect(result.quality).toBeCloseTo(88.9, 0);
    expect(result.quality).toBeGreaterThan(0);
  });

  it('floors goodPieces at 0 when lost > produced (data quality issue)', () => {
    const job = makeJob({ produced_quantity: 50, lost_pieces: 80 });
    const result = calculateRealOEE([job]);
    // goodPieces should not be negative
    expect(result.goodPieces).toBe(0);
    expect(result.quality).toBe(0);
    expect(result.oee).toBeGreaterThanOrEqual(0);
  });

  it('does not propagate negative quality into OEE', () => {
    const job = makeJob({ produced_quantity: 10, lost_pieces: 100 });
    const result = calculateRealOEE([job]);
    expect(result.quality).toBeGreaterThanOrEqual(0);
    expect(result.oee).toBeGreaterThanOrEqual(0);
  });

  it('handles zero produced_quantity gracefully', () => {
    const job = makeJob({ produced_quantity: 0, lost_pieces: 0, quantity: 100 });
    const result = calculateRealOEE([job]);
    expect(result.quality).toBe(100); // no production = no defects
  });

  it('caps quality at 100 when loss rate is 0', () => {
    const job = makeJob({ produced_quantity: 200, lost_pieces: 0 });
    const result = calculateRealOEE([job]);
    expect(result.quality).toBe(100);
    expect(result.goodPieces).toBe(200);
  });

  it('aggregates multiple jobs correctly', () => {
    const j1 = makeJob({ id: 'j1', produced_quantity: 100, lost_pieces: 10 });
    const j2 = makeJob({
      id: 'j2',
      produced_quantity: 80,
      lost_pieces: 5,
      actual_start_time: '2024-01-15T10:00:00.000Z',
      actual_end_time: '2024-01-15T11:00:00.000Z',
    });
    const result = calculateRealOEE([j1, j2]);
    expect(result.goodPieces).toBe(165); // (100-10) + (80-5)
    expect(result.lostPieces).toBe(15);
    expect(result.quality).toBeGreaterThan(0);
    expect(result.quality).toBeLessThanOrEqual(100);
  });

  it('ignores non-finished jobs', () => {
    const finishedJob = makeJob({ id: 'j1', produced_quantity: 50, lost_pieces: 0 });
    const inProgressJob = makeJob({
      id: 'j2',
      status: 'production',
      produced_quantity: 200,
      lost_pieces: 0,
    });
    const result = calculateRealOEE([finishedJob, inProgressJob]);
    expect(result.totalProducedPieces).toBe(50); // only finished job counted
  });
});
