import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useOfflineSync } from '@/hooks/useOfflineSync';

type OfflineSyncContextType = ReturnType<typeof useOfflineSync>;

const OfflineSyncContext = createContext<OfflineSyncContextType | null>(null);

interface OfflineSyncProviderProps {
  children: ReactNode;
}

export function OfflineSyncProvider({ children }: OfflineSyncProviderProps) {
  const offlineSync = useOfflineSync();

  const { cacheData, isOnline, addPendingAction } = offlineSync;

  // Test-only escape hatch so E2E specs can queue a pending action through
  // the real addPendingAction/localStorage/React-state path instead of a
  // fake DOM event nothing in the app listens for. Built only when
  // VITE_E2E_TEST_HOOKS=true (set solely by the CI job that builds the
  // artifact used for E2E testing) — absent from every other build,
  // including the real production deploy.
  useEffect(() => {
    if (import.meta.env.VITE_E2E_TEST_HOOKS !== 'true') return;
    (window as unknown as { __E2E_ADD_PENDING_ACTION__?: typeof addPendingAction })
      .__E2E_ADD_PENDING_ACTION__ = addPendingAction;
    return () => {
      delete (window as unknown as { __E2E_ADD_PENDING_ACTION__?: typeof addPendingAction })
        .__E2E_ADD_PENDING_ACTION__;
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
