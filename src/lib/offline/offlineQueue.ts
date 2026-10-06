import { logger } from '@/lib/logger';

export interface PendingAction {
  id: string;
  type: 'update_job' | 'register_production' | 'qr_scan';
  payload: Record<string, unknown>;
  createdAt: string;
  retryCount: number;
}

/** Outcome of replaying one queued action against the server. */
export type ReplayResult = 'success' | 'retry' | 'conflict';

export interface FailedAction extends PendingAction {
  failedAt: string;
  reason: 'conflict' | 'exhausted';
}

export type CachedJob = Record<string, unknown> & { id: string };
export type CachedMachine = Record<string, unknown> & { id: string };
export type CachedTechnique = Record<string, unknown> & { id: string };

export interface CachedData {
  jobs: CachedJob[];
  machines: CachedMachine[];
  techniques: CachedTechnique[];
  lastSyncedAt: string | null;
}

export const STORAGE_KEYS = {
  PENDING_ACTIONS: 'fastgravacoes_pending_actions',
  CACHED_DATA: 'fastgravacoes_cached_data',
  FAILED_ACTIONS: 'fastgravacoes_failed_actions',
  ACKNOWLEDGED_ACTIONS: 'fastgravacoes_acknowledged_actions',
} as const;

export const MAX_RETRIES = 3;
// Base delay for the exponential backoff between sync passes when actions
// are re-queued (retryable failures) — without this, a partial-failure pass
// re-triggers instantly via the pendingActions.length effect dependency,
// hammering a flaky/down backend in a tight loop.
export const RETRY_BACKOFF_BASE_MS = 3000;

/** The pending queue in localStorage is the source of truth: several
 * components mount independent useOfflineSync instances (provider, status
 * banner, ready indicator), each with its own React state. Reading fresh at
 * every mutation/sync prevents a stale instance from resurrecting actions
 * another instance already processed. */
export function readQueueFromStorage(): PendingAction[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.PENDING_ACTIONS);
    return stored ? (JSON.parse(stored) as PendingAction[]) : [];
  } catch {
    return [];
  }
}

/** IDs already replayed whose removal from the pending queue could not be
 * persisted. Shared across tabs via localStorage so a second tab doesn't
 * replay a ghost entry the first tab already applied. */
export function readAcknowledgedFromStorage(): Set<string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.ACKNOWLEDGED_ACTIONS);
    return stored ? new Set(JSON.parse(stored) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

/** try/catch around localStorage.setItem — quota-exceeded and private-mode
 * errors must not throw into the caller; the caller already has the data in
 * memory (React state), so a failed persist only risks losing it on reload,
 * not losing it right now. */
export function safeLocalStorageSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    logger.error(`Falha ao persistir "${key}" no localStorage (quota excedida?)`, error, 'offlineQueue');
    return false;
  }
}

/** Returns a new CachedData with `patch` merged into the job with `jobId`,
 * or null when there is nothing cached. */
export function mergeJobIntoCache(
  cachedData: CachedData | null,
  jobId: string,
  patch: Partial<CachedJob>
): CachedData | null {
  if (!cachedData) return null;
  const updatedJobs = cachedData.jobs.map((job) =>
    job.id === jobId ? { ...job, ...patch } : job
  );
  return { ...cachedData, jobs: updatedJobs };
}
