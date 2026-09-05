import { describe, it, expect } from 'vitest';
import { calculateRealOEE } from './oeeCalculations';
import type { DbJob } from '@/features/jobs';

function makeJob(overrides: Partial<DbJob>): DbJob {
  return {
    status: 'finished',
    actual_start_time: '2026-07-18T08:00:00Z',
    actual_end_time: '2026-07-18T09:00:00Z',
    estimated_duration: 60,
    quantity: 100,
    produced_quantity: null,
    lost_pieces: 0,
    ...overrides,
  } as unknown as DbJob;
}

describe('calculateRealOEE', () => {
  it('treats a finished job with unrecorded production (produced_quantity=null) as zero produced, not as the full ordered quantity', () => {
    const jobs = [makeJob({ quantity: 100, produced_quantity: null, lost_pieces: 0 })];
    const result = calculateRealOEE(jobs);

    // Before the fix this fell back to `quantity` (100) — fabricating a
    // 100%-produced, zero-loss result for a job whose actual production was
    // never logged.
    expect(result.totalProducedPieces).toBe(0);
    expect(result.goodPieces).toBe(0);
    // quality defaults to 100 only when nothing was produced at all (no
    // pieces to judge) — matches the "no data" convention, not "perfect".
    expect(result.quality).toBe(100);
  });

  it('counts a recorded produced_quantity normally, including recorded losses', () => {
    const jobs = [makeJob({ quantity: 100, produced_quantity: 90, lost_pieces: 10 })];
    const result = calculateRealOEE(jobs);

    expect(result.totalProducedPieces).toBe(90);
    expect(result.goodPieces).toBe(80);
    expect(result.quality).toBeCloseTo((80 / 90) * 100, 1);
  });

  it('ignores non-finished jobs entirely', () => {
    const jobs = [makeJob({ status: 'production', produced_quantity: 999 })];
    const result = calculateRealOEE(jobs);

    expect(result.totalProducedPieces).toBe(0);
    expect(result.oee).toBe(100);
  });

  it('sums produced pieces across multiple finished jobs, treating unrecorded ones as zero', () => {
    const jobs = [
      makeJob({ produced_quantity: 50, lost_pieces: 0 }),
      makeJob({ produced_quantity: null, lost_pieces: 0 }), // unrecorded — must not add its `quantity`
      makeJob({ produced_quantity: 30, lost_pieces: 5 }),
    ];
    const result = calculateRealOEE(jobs);

    expect(result.totalProducedPieces).toBe(80);
    expect(result.lostPieces).toBe(5);
  });
});
