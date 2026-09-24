import { createContext, useContext, useEffect, useRef, ReactNode } from 'react';
import { useOfflineSync } from '@/hooks/useOfflineSync';

type OfflineSyncContextType = ReturnType<typeof useOfflineSync>;

const OfflineSyncContext = createContext<OfflineSyncContextType | null>(null);

interface OfflineSyncProviderProps {
  children: ReactNode;
}

type E2ETestHooks = {
  __E2E_ADD_PENDING_ACTION__?: OfflineSyncContextType['addPendingAction'];
  __E2E_GET_PENDING_COUNT__?: () => number;
};

export function OfflineSyncProvider({ children }: OfflineSyncProviderProps) {
  const offlineSync = useOfflineSync();

  const { cacheData, isOnline, addPendingAction, pendingActionsCount } = offlineSync;

  // Kept in sync via its own effect (not during render — react-hooks/refs)
  // so the test-only getter below always reads the latest count without
  // needing pendingActionsCount in the OTHER effect's deps, which would
  // tear the window hooks down and back up on every queue change instead
  // of once per mount.
  const pendingCountRef = useRef(pendingActionsCount);
  useEffect(() => {
    pendingCountRef.current = pendingActionsCount;
  }, [pendingActionsCount]);

  // Test-only escape hatch so E2E specs can queue a pending action through
  // the real addPendingAction/localStorage/React-state path instead of a
  // fake DOM event nothing in the app listens for, and observe the queue
  // actually draining afterwards instead of matching toast text — a toast
  // saying "conexão restaurada" fires on any online transition regardless
  // of whether a queued action was ever processed, so it can't tell a real
  // sync pass from a coincidence. Built only when VITE_E2E_TEST_HOOKS=true
  // (set solely by the CI job that builds the artifact used for E2E
  // testing) — absent from every other build, including the real
  // production deploy.
  useEffect(() => {
    if (import.meta.env.VITE_E2E_TEST_HOOKS !== 'true') return;
    const hooks = window as unknown as E2ETestHooks;
    hooks.__E2E_ADD_PENDING_ACTION__ = addPendingAction;
    hooks.__E2E_GET_PENDING_COUNT__ = () => pendingCountRef.current;
    return () => {
      delete hooks.__E2E_ADD_PENDING_ACTION__;
      delete hooks.__E2E_GET_PENDING_COUNT__;
    };
  }, [addPendingAction]);

  // Cache data on mount and periodically
  useEffect(() => {
    // Initial cache
    cacheData();

    // Refresh cache every 5 minutes when online
    const interval = setInterval(() => {
      if (isOnline) {
        cacheData();
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [isOnline, cacheData]);

  return (
    <OfflineSyncContext.Provider value={offlineSync}>
      {children}
    </OfflineSyncContext.Provider>
  );
}

export function useOfflineSyncContext() {
  const context = useContext(OfflineSyncContext);
  if (!context) {
    throw new Error('useOfflineSyncContext must be used within OfflineSyncProvider');
  }
  return context;
}
