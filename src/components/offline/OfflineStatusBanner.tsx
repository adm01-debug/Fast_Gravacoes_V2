import { useOfflineSync } from '@/hooks/useOfflineSync';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  WifiOff,
  RefreshCw,
  CloudOff,
  Cloud,
  AlertCircle,
  CheckCircle2,
  Download,
  HardDrive
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState, useEffect } from 'react';
import { offlineStorage } from '@/lib/offlineStorage';

interface OfflineStatusBannerProps {
  showWhenOnline?: boolean;
  className?: string;
}

export function OfflineStatusBanner({
  showWhenOnline = false,
  className
}: OfflineStatusBannerProps) {
  const {
    isOnline,
    isSyncing,
    pendingActionsCount,
    lastSyncedAt,
    forceSync,
    cacheData,
    hasCachedData
  } = useOfflineSync();

  const [storageInfo, setStorageInfo] = useState<{ usage: number; quota: number; percentUsed: number } | null>(null);
  const [isCaching, setIsCaching] = useState(false);

  useEffect(() => {
    const loadStorageInfo = async () => {
      try {
        await offlineStorage.init();
        const info = await offlineStorage.getStorageInfo();
        setStorageInfo(info);
      } catch {
        // Informação de armazenamento é best-effort; ignora se indisponível.
      }
    };
    loadStorageInfo();
  }, [lastSyncedAt]);

  const handleCacheData = async () => {
    setIsCaching(true);
    try {
      await cacheData();
    } finally {
      setIsCaching(false);
    }
  };

  // Don't show when online unless explicitly requested
  if (isOnline && !showWhenOnline && pendingActionsCount === 0) {
    return null;
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className={cn(
      'rounded-lg border p-4 space-y-3',
      isOnline
        ? 'bg-card border-border'
        : 'bg-warning/5 border-warning/30',
      className
    )}>
      {/* Main Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center',
            isOnline ? 'bg-green-500/10' : 'bg-warning/10'
          )}>
            {isOnline ? (
              isSyncing ? (
                <RefreshCw className="w-5 h-5 text-green-500 animate-spin" />
              ) : (
                <Cloud className="w-5 h-5 text-green-500" />
              )
            ) : (
              <CloudOff className="w-5 h-5 text-warning" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className={cn(
                'font-semibold',
                isOnline ? 'text-green-500' : 'text-warning'
              )}>
                {isOnline ? (isSyncing ? 'Sincronizando...' : 'Online') : 'Modo Offline'}
              </h3>
              {!isOnline && (
                <WifiOff className="w-4 h-4 text-warning" />
              )}
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {pendingActionsCount > 0 ? (
                <span className="flex items-center gap-1 text-warning">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {pendingActionsCount} ação(ões) pendente(s)
                </span>
              ) : (
                <span className="flex items-center gap-1 text-green-500">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Sincronizado
                </span>
              )}

              {lastSyncedAt && (
                <>
                  <span>•</span>
                  <span>
                    Última sync: {formatDistanceToNow(lastSyncedAt, {
                      addSuffix: true,
                      locale: ptBR
                    })}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isOnline && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleCacheData}
              disabled={isCaching}
              className="gap-2"
            >
              <Download className={cn('w-4 h-4', isCaching && 'animate-bounce')} />
              {isCaching ? 'Baixando...' : 'Baixar dados'}
            </Button>
          )}

          {isOnline && pendingActionsCount > 0 && (
            <Button
              size="sm"
              onClick={forceSync}
              disabled={isSyncing}
              className="gap-2"
            >
              <RefreshCw className={cn('w-4 h-4', isSyncing && 'animate-spin')} />
              Sincronizar
            </Button>
          )}
        </div>
      </div>

      {/* Storage Info */}
      {storageInfo && storageInfo.quota > 0 && (
        <div className="space-y-1.5 pt-2 border-t border-border">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <HardDrive className="w-4 h-4" />
              <span>Armazenamento offline</span>
            </div>
            <span className="text-muted-foreground">
              {formatBytes(storageInfo.usage)} / {formatBytes(storageInfo.quota)}
            </span>
          </div>
          <Progress
            value={storageInfo.percentUsed}
            className="h-1.5"
          />
        </div>
      )}

      {/* Offline Tips */}
      {!isOnline && (
        <div className="pt-2 border-t border-warning/20">
          <p className="text-sm text-muted-foreground">
            💡 <strong>Dica:</strong> Você pode continuar trabalhando normalmente.
            Todas as alterações serão sincronizadas automaticamente quando a conexão for restaurada.
          </p>
        </div>
      )}
    </div>
  );
}
