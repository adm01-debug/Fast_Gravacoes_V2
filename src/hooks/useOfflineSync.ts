import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { TablesUpdate } from '@/integrations/supabase/types';
import { logger } from '@/lib/logger';
import { registerBackgroundSync } from '@/lib/offlineStorage';
import { toast } from 'sonner';

interface PendingAction {
  id: string;
  type: 'update_job' | 'register_production' | 'qr_scan';
  payload: Record<string, unknown>;
  createdAt: string;
  retryCount: number;
}

/** Outcome of replaying one queued action against the server. */
type ReplayResult = 'success' | 'retry' | 'conflict';

interface FailedAction extends PendingAction {
  failedAt: string;
  reason: 'conflict' | 'exhausted';
}

type CachedJob = Record<string, unknown> & { id: string };
type CachedMachine = Record<string, unknown> & { id: string };
type CachedTechnique = Record<string, unknown> & { id: string };

interface CachedData {
  jobs: CachedJob[];
  machines: CachedMachine[];
  techniques: CachedTechnique[];
  lastSyncedAt: string | null;
}

const STORAGE_KEYS = {
  PENDING_ACTIONS: 'fastgravacoes_pending_actions',
  CACHED_DATA: 'fastgravacoes_cached_data',
  FAILED_ACTIONS: 'fastgravacoes_failed_actions',
};

const MAX_RETRIES = 3;
// Base delay for the exponential backoff between sync passes when actions
// are re-queued (retryable failures) — without this, a partial-failure pass
// re-triggers instantly via the pendingActions.length effect dependency,
// hammering a flaky/down backend in a tight loop.
const RETRY_BACKOFF_BASE_MS = 3000;

/** The pending queue in localStorage is the source of truth: several
 * components mount independent useOfflineSync instances (provider, status
 * banner, ready indicator), each with its own React state. Reading fresh at
 * every mutation/sync prevents a stale instance from resurrecting actions
 * another instance already processed. */
function readQueueFromStorage(): PendingAction[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.PENDING_ACTIONS);
    return stored ? (JSON.parse(stored) as PendingAction[]) : [];
  } catch {
    return [];
  }
}

/** try/catch around localStorage.setItem — quota-exceeded and private-mode
 * errors must not throw into the caller; the caller already has the data in
 * memory (React state), so a failed persist only risks losing it on reload,
 * not losing it right now. */
function safeLocalStorageSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    logger.error(`Falha ao persistir "${key}" no localStorage (quota excedida?)`, error, 'useOfflineSync');
    return false;
  }
}

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingActions, setPendingActions] = useState<PendingAction[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PENDING_ACTIONS);
      return stored ? (JSON.parse(stored) as PendingAction[]) : [];
    } catch (error) {
      logger.warn('Falha ao carregar ações offline do localStorage', error, 'useOfflineSync');
      localStorage.removeItem(STORAGE_KEYS.PENDING_ACTIONS);
      return [];
    }
  });
  const [cachedData, setCachedData] = useState<CachedData | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CACHED_DATA);
      return stored ? (JSON.parse(stored) as CachedData) : null;
    } catch (error) {
      logger.warn('Falha ao carregar dados em cache do localStorage', error, 'useOfflineSync');
      localStorage.removeItem(STORAGE_KEYS.CACHED_DATA);
      return null;
    }
  });
  const [failedActions, setFailedActions] = useState<FailedAction[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.FAILED_ACTIONS);
      return stored ? (JSON.parse(stored) as FailedAction[]) : [];
    } catch (error) {
      logger.warn('Falha ao carregar ações não sincronizadas do localStorage', error, 'useOfflineSync');
      localStorage.removeItem(STORAGE_KEYS.FAILED_ACTIONS);
      return [];
    }
  });
  const [isSyncing, setIsSyncing] = useState(false);
  // isSyncing (state) is not safe as a concurrency guard on its own: two
  // effect firings before the first setIsSyncing(true) commit can both pass
  // the `isSyncing` check and start syncing the same queue concurrently,
  // duplicating replays. This ref is set synchronously the instant a sync
  // pass starts, closing that window.
  const syncInFlightRef = useRef(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CACHED_DATA);
      if (!stored) return null;
      const data = JSON.parse(stored) as CachedData;
      return data.lastSyncedAt ? new Date(data.lastSyncedAt) : null;
    } catch {
      return null;
    }
  });

  // Save pending actions to localStorage whenever they change
  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEYS.PENDING_ACTIONS, JSON.stringify(pendingActions));
  }, [pendingActions]);

  // Save failed (conflicted or retry-exhausted) actions — a dead-letter
  // store so writes that couldn't be applied are never silently discarded;
  // they stay visible for manual review/re-entry instead.
  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEYS.FAILED_ACTIONS, JSON.stringify(failedActions));
  }, [failedActions]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Conexão restaurada', {
        description: 'Sincronizando dados pendentes...',
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('Sem conexão', {
        description: 'Os dados serão salvos localmente e sincronizados quando a conexão voltar.',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync pending actions when coming back online (kept in a ref to avoid
  // re-running the effect on every pendingActions/cacheData change).
  const syncRef = useRef<(() => Promise<void>) | null>(null);
  useEffect(() => {
    if (isOnline && pendingActions.length > 0) {
      syncRef.current?.();
    }
  }, [isOnline, pendingActions.length]);

  // The service worker's background 'sync' event fires when the browser
  // regains connectivity (even if the 'online' event was missed, e.g. the tab
  // was throttled). The SW can't replay the localStorage queue itself, so it
  // posts SYNC_PENDING_ACTIONS and the app runs a sync pass here.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const onMessage = (event: MessageEvent) => {
      if ((event.data as { type?: string } | null)?.type === 'SYNC_PENDING_ACTIONS') {
        syncRef.current?.();
      }
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, []);

  // Cache essential data for offline use
  const cacheData = useCallback(async () => {
    if (!isOnline) return;

    try {
      const [jobsRes, machinesRes, techniquesRes] = await Promise.all([
        supabase.from('jobs').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('machines').select('*').eq('is_active', true),
        supabase.from('techniques').select('*'),
      ]);

      const newCachedData: CachedData = {
        jobs: jobsRes.data || [],
        machines: machinesRes.data || [],
        techniques: techniquesRes.data || [],
        lastSyncedAt: new Date().toISOString(),
      };

      setCachedData(newCachedData);
      setLastSyncedAt(new Date());
      safeLocalStorageSet(STORAGE_KEYS.CACHED_DATA, JSON.stringify(newCachedData));

    } catch (error) {
      logger.error('Falha ao armazenar dados em cache offline', error, 'useOfflineSync');
    }
  }, [isOnline]);

  // Add a pending action
  const addPendingAction = useCallback((
    type: PendingAction['type'],
    payload: Record<string, unknown>
  ) => {
    const action: PendingAction = {
      id: crypto.randomUUID(),
      type,
      payload,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };

    // Read-modify-write against localStorage (not this instance's possibly
    // stale state) so an already-processed queue can't be resurrected by an
    // instance that missed another instance's sync pass.
    const next = [...readQueueFromStorage(), action];
    safeLocalStorageSet(STORAGE_KEYS.PENDING_ACTIONS, JSON.stringify(next));
    setPendingActions(next);

    // Ask the browser to fire the SW 'sync' event when connectivity returns,
    // even if this tab is throttled/closed-reopened and misses the 'online'
    // event. Best-effort — the online-event path above still covers browsers
    // without Background Sync.
    registerBackgroundSync().catch(() => { /* unsupported — online event path covers it */ });

    toast.info('Ação salva offline', {
      description: 'Será sincronizada quando a conexão voltar.',
    });

    return action.id;
  }, []);

  // Process a single pending action. When the payload carries a
  // `baseUpdatedAt` (the job's updated_at at the moment the action was
  // queued), the write is conditioned on `.eq('updated_at', baseUpdatedAt)`
  // — an optimistic-concurrency guard. Without it, a stale offline payload
  // silently overwrites whatever changed on the server while the device was
  // offline (status, machine, quantity — even a cancelled job resurrected to
  // 'finished' by register_production's unconditional status write).
  const processPendingAction = async (action: PendingAction): Promise<ReplayResult> => {
    try {
      switch (action.type) {
        case 'update_job': {
          const { jobId, updates, baseUpdatedAt } = action.payload as {
            jobId: string;
            updates: TablesUpdate<'jobs'>;
            baseUpdatedAt?: string;
          };
          let query = supabase.from('jobs').update(updates).eq('id', jobId);
          if (baseUpdatedAt) query = query.eq('updated_at', baseUpdatedAt);
          const { data, error } = await query.select('id');
          if (error) throw error;
          if (baseUpdatedAt && (!data || data.length === 0)) {
            // The job changed on the server since this action was queued —
            // applying the stale payload would silently clobber that change.
            return 'conflict';
          }
          break;
        }

        case 'register_production': {
          const { jobId, producedQuantity, lostPieces, notes, photos, baseUpdatedAt } = action.payload as {
            jobId: string;
            producedQuantity: number;
            lostPieces: number;
            notes?: string;
            photos?: string[];
            baseUpdatedAt?: string;
          };
          let query = supabase
            .from('jobs')
            .update({
              produced_quantity: producedQuantity,
              lost_pieces: lostPieces,
              notes,
              production_photos: photos,
              status: 'finished',
              actual_end_time: new Date().toISOString(),
            })
            .eq('id', jobId);
          if (baseUpdatedAt) query = query.eq('updated_at', baseUpdatedAt);
          const { data, error } = await query.select('id');
          if (error) throw error;
          if (baseUpdatedAt && (!data || data.length === 0)) {
            return 'conflict';
          }
          break;
        }

        case 'qr_scan': {
          const { jobId, operatorId, action: scanAction, deviceInfo, notes } = action.payload as {
            jobId: string;
            operatorId: string;
            action: string;
            deviceInfo?: string;
            notes?: string;
          };
          // Upsert on the client-generated action.id: if this exact action
          // was already applied in a previous pass (server committed but the
          // response was lost, so the queue entry survived), replaying it is
          // a no-op instead of inserting a duplicate scan-history row.
          const { error } = await supabase
            .from('qr_scan_history')
            .upsert({
              id: action.id,
              job_id: jobId,
              operator_id: operatorId,
              action: scanAction,
              device_info: deviceInfo,
              notes,
            }, { onConflict: 'id' });
          if (error) throw error;
          break;
        }

        default:
          return 'retry';
      }

      return 'success';
    } catch (error) {
      logger.warn(`Pending action ${action.type} failed (retry ${action.retryCount})`, error, 'useOfflineSync');
      return 'retry';
    }
  };

  // Sync all pending actions. The tab-local ref guard stops concurrent
  // passes within this tab; the Web Locks request below extends that
  // exclusion across tabs — the localStorage queue is shared, so two open
  // windows woken by the same 'online'/SW-sync signal would otherwise both
  // replay it. Replays are individually idempotent (updated_at guards,
  // upsert-by-id), so the lock is belt-and-suspenders; when Web Locks is
  // unavailable the behavior degrades to today's per-tab guard.
  const syncPendingActions = useCallback(async () => {
    if (!isOnline || pendingActions.length === 0 || syncInFlightRef.current) return;

    if (typeof navigator !== 'undefined' && 'locks' in navigator) {
      const ran = await navigator.locks.request(
        'fastgravacoes-offline-sync',
        { ifAvailable: true },
        async (lock) => {
          if (!lock) return false; // another tab/instance is already syncing
          await runSyncPass();
          return true;
        },
      );
      if (!ran) {
        logger.info('Sync pass skipped — another instance holds the sync lock', undefined, 'useOfflineSync');
        // Reconcile this instance's view with the queue the lock holder is
        // draining, so it doesn't keep exposing already-processed actions.
        setPendingActions(readQueueFromStorage());
      }
      return;
    }

    await runSyncPass();

    async function runSyncPass() {
    if (syncInFlightRef.current) return;
    syncInFlightRef.current = true;
    setIsSyncing(true);

    try {
      let successCount = 0;
      const remainingActions: PendingAction[] = [];
      const newlyFailed: FailedAction[] = [];
      let hadRetryableFailure = false;

      // Replay from storage, not this instance's state — another instance
      // may have queued or drained actions since this one last rendered.
      const queue = readQueueFromStorage();

      for (const action of queue) {
        const result = await processPendingAction(action);

        if (result === 'success') {
          successCount++;
        } else if (result === 'conflict') {
          // Not retryable — replaying the same stale payload would conflict
          // again forever. Surface it instead of silently dropping the write.
          newlyFailed.push({ ...action, failedAt: new Date().toISOString(), reason: 'conflict' });
        } else if (action.retryCount < MAX_RETRIES) {
          hadRetryableFailure = true;
          remainingActions.push({ ...action, retryCount: action.retryCount + 1 });
        } else {
          // Retries exhausted — move to the dead-letter store instead of
          // discarding; the write is never applied and never surfaced again
          // otherwise.
          newlyFailed.push({ ...action, failedAt: new Date().toISOString(), reason: 'exhausted' });
        }
      }

      // Persist immediately so other instances reading storage see the
      // drained queue even before this instance's persist effect runs.
      safeLocalStorageSet(STORAGE_KEYS.PENDING_ACTIONS, JSON.stringify(remainingActions));
      setPendingActions(remainingActions);
      if (newlyFailed.length > 0) {
        setFailedActions(prev => [...prev, ...newlyFailed]);
      }

      if (successCount > 0) {
        toast.success(`${successCount} ação(ões) sincronizada(s)`, {
          description: newlyFailed.length > 0 ? `${newlyFailed.length} não puderam ser aplicadas` : undefined,
        });
      }
      if (newlyFailed.length > 0) {
        toast.error(`${newlyFailed.length} ação(ões) não puderam ser sincronizadas`, {
          description: 'Revise em Ações Pendentes — os dados não foram perdidos, mas não foram aplicados.',
        });
      }

      // Refresh cache after sync
      await cacheData();

      // If some actions are still retryable, schedule the next pass with
      // exponential backoff instead of letting the pendingActions.length
      // effect re-trigger instantly (which hammers a flaky/down backend in
      // a tight loop with zero delay between passes).
      if (hadRetryableFailure && remainingActions.length > 0) {
        const nextRetryCount = Math.min(...remainingActions.map(a => a.retryCount));
        const delay = RETRY_BACKOFF_BASE_MS * Math.pow(2, nextRetryCount - 1);
        window.setTimeout(() => {
          syncRef.current?.();
        }, delay);
      }
    } finally {
      syncInFlightRef.current = false;
      setIsSyncing(false);
    }
    }
  }, [isOnline, pendingActions, cacheData]);

  useEffect(() => {
    syncRef.current = syncPendingActions;
  }, [syncPendingActions]);

  // Update job offline (for operators)
  const updateJobOffline = useCallback((
    jobId: string,
    updates: TablesUpdate<'jobs'>
  ) => {
    if (isOnline) {
      // If online, update directly
      return supabase.from('jobs').update(updates).eq('id', jobId);
    } else {
      // Capture the job's updated_at as it was last cached, so replay can be
      // conditioned on it (see processPendingAction) instead of blindly
      // overwriting whatever changed on the server while offline.
      const baseUpdatedAt = (cachedData?.jobs.find((j) => j.id === jobId) as { updated_at?: string } | undefined)?.updated_at;
      addPendingAction('update_job', { jobId, updates, baseUpdatedAt });

      // Update local cache
      if (cachedData) {
        const updatedJobs = cachedData.jobs.map((job) => {
          const jobObj = job as { id: string };
          if (jobObj.id === jobId) {
            return { ...jobObj, ...updates };
          }
          return job;
        });

        const newCachedData = { ...cachedData, jobs: updatedJobs };
        setCachedData(newCachedData);
        safeLocalStorageSet(STORAGE_KEYS.CACHED_DATA, JSON.stringify(newCachedData));
      }

      return { error: null, data: null };
    }
  }, [isOnline, cachedData, addPendingAction]);

  // Register production offline
  const registerProductionOffline = useCallback((
    jobId: string,
    producedQuantity: number,
    lostPieces: number,
    notes?: string,
    photos?: string[]
  ) => {
    if (isOnline) {
      return supabase
        .from('jobs')
        .update({
          produced_quantity: producedQuantity,
          lost_pieces: lostPieces,
          notes,
          production_photos: photos,
          status: 'finished',
          actual_end_time: new Date().toISOString(),
        })
        .eq('id', jobId);
    } else {
      const baseUpdatedAt = (cachedData?.jobs.find((j) => j.id === jobId) as { updated_at?: string } | undefined)?.updated_at;
      addPendingAction('register_production', {
        jobId,
        producedQuantity,
        lostPieces,
        notes,
        photos,
        baseUpdatedAt,
      });

      // Update local cache
      if (cachedData) {
        const updatedJobs = cachedData.jobs.map((job) => {
          const jobObj = job as { id: string };
          if (jobObj.id === jobId) {
            return {
              ...jobObj,
              produced_quantity: producedQuantity,
              lost_pieces: lostPieces,
              notes,
              production_photos: photos,
              status: 'finished',
            };
          }
          return job;
        });

        const newCachedData = { ...cachedData, jobs: updatedJobs };
        setCachedData(newCachedData);
        safeLocalStorageSet(STORAGE_KEYS.CACHED_DATA, JSON.stringify(newCachedData));
      }

      return { error: null, data: null };
    }
  }, [isOnline, cachedData, addPendingAction]);

  // Record QR scan offline
  const recordQRScanOffline = useCallback((
    jobId: string,
    operatorId: string,
    action: string,
    deviceInfo?: string,
    notes?: string
  ) => {
    if (isOnline) {
      return supabase
        .from('qr_scan_history')
        .insert({
          job_id: jobId,
          operator_id: operatorId,
          action,
          device_info: deviceInfo,
          notes,
        });
    } else {
      addPendingAction('qr_scan', {
        jobId,
        operatorId,
        action,
        deviceInfo,
        notes,
      });

      return { error: null, data: null };
    }
  }, [isOnline, addPendingAction]);

  // Get cached jobs for offline use
  const getCachedJobs = useCallback(() => {
    return cachedData?.jobs || [];
  }, [cachedData]);

  // Get cached machines for offline use
  const getCachedMachines = useCallback(() => {
    return cachedData?.machines || [];
  }, [cachedData]);

  // Get cached techniques for offline use
  const getCachedTechniques = useCallback(() => {
    return cachedData?.techniques || [];
  }, [cachedData]);

  // Clear all pending actions
  const clearPendingActions = useCallback(() => {
    setPendingActions([]);
    localStorage.removeItem(STORAGE_KEYS.PENDING_ACTIONS);
  }, []);

  // Clear the dead-letter store (actions that conflicted or exhausted
  // retries) — use only after the underlying data has been reviewed/manually
  // reconciled; this does not retry or apply them.
  const clearFailedActions = useCallback(() => {
    setFailedActions([]);
    localStorage.removeItem(STORAGE_KEYS.FAILED_ACTIONS);
  }, []);

  // Force sync
  const forceSync = useCallback(async () => {
    if (!isOnline) {
      toast.error('Sem conexão', {
        description: 'Aguarde a conexão ser restaurada para sincronizar.',
      });
      return;
    }

    await syncPendingActions();
    await cacheData();
  }, [isOnline, syncPendingActions, cacheData]);

  return {
    // State
    isOnline,
    isSyncing,
    pendingActions,
    pendingActionsCount: pendingActions.length,
    // Actions that conflicted with a server-side change or exhausted
    // retries — never applied, kept visible instead of silently dropped.
    failedActions,
    failedActionsCount: failedActions.length,
    cachedData,
    lastSyncedAt,
    hasCachedData: !!cachedData,

    // Actions
    cacheData,
    syncPendingActions,
    forceSync,
    clearPendingActions,
    clearFailedActions,

    // Offline operations
    updateJobOffline,
    registerProductionOffline,
    recordQRScanOffline,

    // Cached data getters
    getCachedJobs,
    getCachedMachines,
    getCachedTechniques,
  };
}
