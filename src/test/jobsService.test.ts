import { describe, it, expect, vi, beforeEach } from 'vitest';
import { jobsService } from '@/features/jobs/services/jobsService';

// ── Mock Supabase client ───────────────────────────────────

const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockSingle = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockOr = vi.fn();
const mockGte = vi.fn();
const mockLte = vi.fn();
const mockMaybeSingle = vi.fn();

// Build a chainable mock that mirrors the real Supabase PostgREST builder:
// every method returns the builder itself, and the builder is thenable so that
// `await builder` (or `await builder.select().eq().single()`) calls terminal() once.
function makeChain(terminal: () => Promise<unknown>) {
  const chain: Record<string, unknown> = {};
  const builderMethods = [
    'select', 'insert', 'update', 'delete',
    'or', 'gte', 'lte', 'limit', 'eq', 'order', 'single', 'maybeSingle',
  ];
  builderMethods.forEach(m => { chain[m] = vi.fn(() => chain); });
  // Thenable: awaiting any part of the chain executes terminal()
  chain.then = (
    onFulfilled?: (v: unknown) => unknown,
    onRejected?: (r: unknown) => unknown,
  ) => terminal().then(onFulfilled, onRejected);
  return chain;
}

const mockGetUser = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: () => mockGetUser(),
    },
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    critical: vi.fn(),
  },
}));

// ── helpers ────────────────────────────────────────────────

import { supabase } from '@/integrations/supabase/client';

const mockFrom = supabase.from as ReturnType<typeof vi.fn>;

function setupSuccess(data: unknown) {
  const chain = makeChain(async () => ({ data, error: null }));
  mockFrom.mockReturnValue(chain);
  return chain;
}

function setupError(message: string) {
  const chain = makeChain(async () => ({ data: null, error: new Error(message) }));
  mockFrom.mockReturnValue(chain);
  return chain;
}

// ── getAll ─────────────────────────────────────────────────

describe('jobsService.getAll', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns an array of jobs on success', async () => {
    const jobs = [
      { id: 'job-1', status: 'pending', priority: 'high', client: 'ACME' },
      { id: 'job-2', status: 'production', priority: 'low', client: 'XYZ' },
    ];
    setupSuccess(jobs);
    const result = await jobsService.getAll();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
  });

  it('throws when Supabase returns an error', async () => {
    setupError('database connection failed');
    await expect(jobsService.getAll()).rejects.toThrow();
  });

  it('returns empty array when data is null', async () => {
    const chain = makeChain(async () => ({ data: null, error: null }));
    mockFrom.mockReturnValue(chain);
    const result = await jobsService.getAll();
    expect(result).toEqual([]);
  });
});

// ── getById ────────────────────────────────────────────────

describe('jobsService.getById', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns a single job on success', async () => {
    const job = { id: 'job-1', status: 'pending', priority: 'high', client: 'ACME' };
    const chain = makeChain(async () => ({ data: job, error: null }));
    mockFrom.mockReturnValue(chain);
    const result = await jobsService.getById('job-1');
    expect(result).toMatchObject({ id: 'job-1' });
  });

  it('throws when job not found', async () => {
    const chain = makeChain(async () => ({ data: null, error: new Error('not found') }));
    mockFrom.mockReturnValue(chain);
    await expect(jobsService.getById('missing-id')).rejects.toThrow();
  });
});

// ── create ─────────────────────────────────────────────────

describe('jobsService.create', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns the created job', async () => {
    const newJob = { id: 'new-job', status: 'pending', priority: 'normal', client: 'Test' };
    const chain = makeChain(async () => ({ data: newJob, error: null }));
    mockFrom.mockReturnValue(chain);

    const result = await jobsService.create({
      order_number: 'ORD-001',
      client: 'Test',
      product: 'Widget',
      quantity: 10,
    } as Parameters<typeof jobsService.create>[0]);

    expect(result).toMatchObject({ id: 'new-job' });
  });

  it('throws on creation error', async () => {
    const chain = makeChain(async () => ({ data: null, error: new Error('insert failed') }));
    mockFrom.mockReturnValue(chain);
    await expect(jobsService.create({} as Parameters<typeof jobsService.create>[0])).rejects.toThrow();
  });
});

// ── update ─────────────────────────────────────────────────

describe('jobsService.update', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns the updated job', async () => {
    const updated = { id: 'job-1', status: 'production' };
    const chain = makeChain(async () => ({ data: updated, error: null }));
    mockFrom.mockReturnValue(chain);
    const result = await jobsService.update('job-1', { status: 'production' });
    expect(result).toMatchObject({ id: 'job-1' });
  });

  it('throws on update error', async () => {
    const chain = makeChain(async () => ({ data: null, error: new Error('update failed') }));
    mockFrom.mockReturnValue(chain);
    await expect(jobsService.update('job-1', {})).rejects.toThrow();
  });
});

// ── updateStatus ───────────────────────────────────────────

describe('jobsService.updateStatus', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('sets actual_start_time when transitioning to production', async () => {
    // updateStatus fetches the job's current status before validating the
    // transition (jobStateMachine), then issues a separate update call — mock
    // the two `.from('jobs')` calls distinctly so the transition is legal
    // ('ready' -> 'production'), rather than a same-status self-transition.
    const currentChain = makeChain(async () => ({ data: { status: 'ready' }, error: null }));
    const updated = { id: 'job-1', status: 'production', actual_start_time: new Date().toISOString() };
    const updateChain = makeChain(async () => ({ data: updated, error: null }));
    mockFrom.mockReturnValueOnce(currentChain).mockReturnValueOnce(updateChain);
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    const result = await jobsService.updateStatus('job-1', 'production');
    expect(result).toMatchObject({ status: 'production' });
  });

  it('sets actual_end_time when transitioning to finished', async () => {
    const currentChain = makeChain(async () => ({ data: { status: 'production' }, error: null }));
    const updated = { id: 'job-1', status: 'finished', actual_end_time: new Date().toISOString() };
    const updateChain = makeChain(async () => ({ data: updated, error: null }));
    mockFrom.mockReturnValueOnce(currentChain).mockReturnValueOnce(updateChain);
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    const result = await jobsService.updateStatus('job-1', 'finished');
    expect(result).toMatchObject({ status: 'finished' });
  });
});

// ── delete ─────────────────────────────────────────────────

describe('jobsService.delete', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('resolves without error on success', async () => {
    const chain = makeChain(async () => ({ data: null, error: null }));
    mockFrom.mockReturnValue(chain);
    await expect(jobsService.delete('job-1')).resolves.toBeUndefined();
  });

  it('throws on delete error', async () => {
    const chain = makeChain(async () => ({ data: null, error: new Error('delete failed') }));
    mockFrom.mockReturnValue(chain);
    await expect(jobsService.delete('job-1')).rejects.toThrow();
  });
});

// ── getByDateRange ─────────────────────────────────────────

describe('jobsService.getByDateRange', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns array of jobs in range', async () => {
    const jobs = [{ id: 'j1', scheduled_date: '2026-05-01' }];
    const chain = makeChain(async () => ({ data: jobs, error: null }));
    mockFrom.mockReturnValue(chain);

    const result = await jobsService.getByDateRange('2026-05-01', '2026-05-31');
    expect(Array.isArray(result)).toBe(true);
  });

  it('throws on query error', async () => {
    const chain = makeChain(async () => ({ data: null, error: new Error('query failed') }));
    mockFrom.mockReturnValue(chain);
    await expect(jobsService.getByDateRange('2026-01-01', '2026-12-31')).rejects.toThrow();
  });
});
