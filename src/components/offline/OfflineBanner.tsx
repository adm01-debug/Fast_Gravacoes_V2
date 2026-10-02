import { AnimatePresence, motion } from 'framer-motion';
import { Wifi, WifiOff, Cloud, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useOfflineSyncContext } from '@/contexts/OfflineSyncContext';

// Banner/indicator de status offline. Consome o OfflineSyncProvider único
// (fila real de sincronização) — a fila genérica inerte do antigo
// OfflineProvider foi removida.
export function OfflineBanner() {
  const { isOnline, isSyncing, pendingActions, syncPendingActions } = useOfflineSyncContext();

  if (isOnline && pendingActions.length === 0) return null;

  return (
    <AnimatePresence>
      {!isOnline ? (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-orange-500/10 border-b border-orange-500/20"
        >
          <div className="container mx-auto px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-orange-500">
              <WifiOff className="h-4 w-4" />
              <span className="text-sm font-medium">Você está offline</span>
              {pendingActions.length > 0 && (
                <span className="text-xs bg-orange-500/20 px-2 py-0.5 rounded-full">
                  {pendingActions.length} pendentes
                </span>
              )}
            </div>
          </div>
        </motion.div>
      ) : pendingActions.length > 0 ? (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-primary/10 border-b border-primary/20"
        >
          <div className="container mx-auto px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary">
              <Cloud className="h-4 w-4" />
              <span className="text-sm font-medium">
                {pendingActions.length} ações pendentes para sincronizar
              </span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => void syncPendingActions()}
              disabled={isSyncing}
              className="gap-2"
            >
              <RefreshCw className={cn('h-4 w-4', isSyncing && 'animate-spin')} />
              {isSyncing ? 'Sincronizando...' : 'Sincronizar agora'}
            </Button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

// Indicador compacto de status de conexão
export function ConnectionStatus({ showLabel = false }: { showLabel?: boolean }) {
  const { isOnline, isSyncing, pendingActions } = useOfflineSyncContext();

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          'relative p-2 rounded-full transition-colors',
          isOnline ? 'bg-green-500/10' : 'bg-orange-500/10'
        )}
      >
        {isOnline ? (
          <Wifi className="h-4 w-4 text-green-500" />
        ) : (
          <WifiOff className="h-4 w-4 text-orange-500" />
        )}
        {isSyncing && (
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        )}
        {pendingActions.length > 0 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-orange-500 text-[10px] font-bold flex items-center justify-center text-white">
            {pendingActions.length}
          </span>
        )}
      </div>
      {showLabel && (
        <span className={cn('text-sm', isOnline ? 'text-green-500' : 'text-orange-500')}>
          {isOnline ? 'Online' : 'Offline'}
        </span>
      )}
    </div>
  );
}
