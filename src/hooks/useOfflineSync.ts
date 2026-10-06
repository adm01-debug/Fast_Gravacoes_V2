import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { TablesUpdate } from '@/integrations/supabase/types';
import { logger } from '@/lib/logger';
import { registerBackgroundSync } from '@/lib/offlineStorage';
import { toast } from 'sonner';
import { processPendingAction } from '@/lib/offline/replayPendingAction';
import {
  MAX_RETRIES,
  RETRY_BACKOFF_BASE_MS,
  STORAGE_KEYS,
  mergeJobIntoCache,
  readAcknowledgedFromStorage,
  readQueueFromStorage,
  safeLocalStorageSet,
} from '@/lib/offline/offlineQueue';
import type {
  CachedData,
  FailedAction,
  PendingAction,
  ReplayResult,
} from '@/lib/offline/offlineQueue';

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
  // Live mirror of the pending queue for the sync pass — the pass can run
  // from a stale closure (the trigger effect calls the syncRef captured in
  // a previous commit), and actions whose localStorage persist failed in
  // addPendingAction exist only in memory; a ref read at pass time covers
  // both cases without depending on closure freshness.
  const pendingActionsRef = useRef<PendingAction[]>([]);
  // IDs of actions that were never durably persisted (localStorage write
  // failed in addPendingAction). Only these may be unioned into a sync pass
  // from memory — a hydrated copy of an action another tab already drained
  // from storage must NOT re-enter the queue (it would duplicate the write
  // or dead-letter a false conflict).
  const unpersistedIdsRef = useRef<Set<string>>(new Set());
  // IDs already processed but whose removal couldn't be written back to
  // storage (persist of remainingActions failed — they stay in the stored
  // queue as ghosts). Future passes must skip them or the same write gets
  // replayed: false updated_at conflicts, or a real double write when the
  // action has no baseUpdatedAt. Seeded from storage so acknowledgements
  // made by another tab are honored here too.
  const acknowledgedIdsRef = useRef<Set<string>>(readAcknowledgedFromStorage());
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

  // Save pending actions to localStorage whenever they change. When the
  // write succeeds after earlier failures, those actions are durable again —
  // clear their unpersisted marks so the next enqueue doesn't merge
  // duplicate copies into the queue.
  useEffect(() => {
    if (safeLocalStorageSet(STORAGE_KEYS.PENDING_ACTIONS, JSON.stringify(pendingActions))) {
      pendingActions.forEach(a => unpersistedIdsRef.current.delete(a.id));
    }
  }, [pendingActions]);

  useEffect(() => {
    pendingActionsRef.current = pendingActions;
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
  // Reads live connectivity, not the captured isOnline — the sync pass can
  // invoke this through a closure created while still offline (the trigger
  // effect fires before the syncRef refresh effect in the same commit).
  const cacheData = useCallback(async () => {
    if (!navigator.onLine) return;

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
  }, []);

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
    // instance that missed another instance's sync pass. Actions that only
    // exist in memory (earlier persist failures) are merged too — with
    // storage still broken, dropping them here loses those operations.
    const seenIds = new Set<string>();
    const next = [
      ...readQueueFromStorage(),
      ...pendingActionsRef.current.filter(a => unpersistedIdsRef.current.has(a.id)),
      action,
    ].filter(a => {
      // An unpersisted mark can be stale (a later persist succeeded) — the
      // same action would then arrive from both storage and memory.
      if (seenIds.has(a.id)) return false;
      seenIds.add(a.id);
      return true;
    });
    if (!safeLocalStorageSet(STORAGE_KEYS.PENDING_ACTIONS, JSON.stringify(next))) {
      unpersistedIdsRef.current.add(action.id);
    }
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

  // Sync all pending actions. The tab-local ref guard stops concurrent
  // passes within this tab; the Web Locks request below extends that
  // exclusion across tabs — the localStorage queue is shared, so two open
  // windows woken by the same 'online'/SW-sync signal would otherwise both
  // replay it. Replays are individually idempotent (updated_at guards,
  // upsert-by-id), so the lock is belt-and-suspenders; when Web Locks is
  // unavailable the behavior degrades to today's per-tab guard.
  // The guards read live state (navigator.onLine + the storage queue, which
  // is already the source of truth for runSyncPass) rather than the captured
  // render state: the trigger effect can invoke a stale closure from the
  // previous commit (its ref is only refreshed by a later effect), and a
  // stale `isOnline`/`pendingActions` would skip the pass and strand the
  // queue forever after reconnecting.
  const syncPendingActions = useCallback(async () => {
    if (!navigator.onLine || syncInFlightRef.current) return;

    const acknowledged = new Set([
      ...acknowledgedIdsRef.current,
      ...readAcknowledgedFromStorage(),
    ]);
    const storedNow = readQueueFromStorage();
    const actionable = storedNow.filter(a => !acknowledged.has(a.id));
    if (actionable.length === 0 && unpersistedIdsRef.current.size === 0) {
      // Nothing actionable — but if acknowledged ghosts still occupy the
      // stored queue, retry their removal so stale entries don't outlive
      // the storage outage and linger as fake "pending" rows forever.
      // Re-read before writing: another tab may have enqueued an action
      // between our snapshot and this cleanup.
      const fresh = readQueueFromStorage();
      const cleaned = fresh.filter(a => !acknowledged.has(a.id));
      if (fresh.length !== cleaned.length && safeLocalStorageSet(STORAGE_KEYS.PENDING_ACTIONS, JSON.stringify(cleaned))) {
        fresh.filter(a => acknowledged.has(a.id)).forEach(a => acknowledgedIdsRef.current.delete(a.id));
        safeLocalStorageSet(STORAGE_KEYS.ACKNOWLEDGED_ACTIONS, JSON.stringify([...acknowledgedIdsRef.current]));
      }
      // Reconcile this tab's state either way — it may still display actions
      // another tab already drained, while keeping true memory-only ones.
      setPendingActions([
        ...cleaned,
        ...pendingActionsRef.current.filter(a => unpersistedIdsRef.current.has(a.id) && !cleaned.some(c => c.id === a.id)),
      ]);
      return;
    }

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
        // draining, so it doesn't keep exposing already-processed actions —
        // but keep actions that exist only in memory (unpersisted): storage
        // can't contain them and dropping them here loses the operation.
        setPendingActions([
          ...readQueueFromStorage(),
          ...pendingActionsRef.current.filter(a => unpersistedIdsRef.current.has(a.id)),
        ]);
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

      // Replay storage + never-persisted actions (a failed persist in
      // addPendingAction leaves the action in React state only — without
      // the union it would never be replayed and would die on reload).
      // Hydrated in-memory copies of actions another tab already drained
      // are excluded via unpersistedIdsRef — without it, cross-tab stale
      // state would replay the same write twice.
      // Ghost entries acknowledged by this or another tab (whose removal
      // never persisted) are skipped — replaying them doubles the write.
      const storedAcknowledged = readAcknowledgedFromStorage();
      const storedQueue = readQueueFromStorage().filter(
        a => !acknowledgedIdsRef.current.has(a.id) && !storedAcknowledged.has(a.id),
      );
      const storedIds = new Set(storedQueue.map(a => a.id));
      // For ids that live in both places, prefer the memory copy: when the
      // write-back of remainingActions failed, memory holds the fresher
      // version (incremented retryCount) while storage keeps the stale one —
      // replaying the stale copy resets retries forever.
      const memoryOnlyById = new Map(
        pendingActionsRef.current
          .filter(a => unpersistedIdsRef.current.has(a.id))
          .map(a => [a.id, a]),
      );
      const queue = [
        ...storedQueue.map(a => memoryOnlyById.get(a.id) ?? a),
        ...pendingActionsRef.current.filter(a => unpersistedIdsRef.current.has(a.id) && !storedIds.has(a.id)),
      ];

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
      // Every action in this pass is done being "memory-only": processed
      // ones are finished, retried ones are in remainingActions. If that
      // persist also fails (private mode), re-mark the survivors so the
      // next pass still unions them.
      const persisted = safeLocalStorageSet(STORAGE_KEYS.PENDING_ACTIONS, JSON.stringify(remainingActions));
      queue.forEach(a => unpersistedIdsRef.current.delete(a.id));
      if (persisted) {
        queue.forEach(a => acknowledgedIdsRef.current.delete(a.id));
      } else {
        // Storage still holds every entry from this pass: mark the processed
        // ones so future passes skip them instead of replaying applied
        // writes, and re-mark the unprocessed survivors as memory-only. The
        // acknowledgement is persisted too — another tab with an empty
        // in-memory set would otherwise replay the same ghosts.
        const remainingIds = new Set(remainingActions.map(a => a.id));
        queue.forEach(a => {
          if (remainingIds.has(a.id)) {
            unpersistedIdsRef.current.add(a.id);
          } else {
            acknowledgedIdsRef.current.add(a.id);
          }
        });
        safeLocalStorageSet(STORAGE_KEYS.ACKNOWLEDGED_ACTIONS, JSON.stringify([...acknowledgedIdsRef.current]));
      }
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
  }, [cacheData]);

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

      const newCachedData = mergeJobIntoCache(cachedData, jobId, updates);
      if (newCachedData) {
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

      const newCachedData = mergeJobIntoCache(cachedData, jobId, {
        produced_quantity: producedQuantity,
        lost_pieces: lostPieces,
        notes,
        production_photos: photos,
        status: 'finished',
      });
      if (newCachedData) {
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
    addPendingAction,
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
