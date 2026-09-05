import { useState, useEffect } from 'react';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Check,
  AlertCircle,
  Download
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { offlineStorage } from '@/lib/offlineStorage';

interface OfflineReadyIndicatorProps {
  className?: string;
}

export function OfflineReadyIndicator({ className }: OfflineReadyIndicatorProps) {
  const {
    isOnline,
    isSyncing,
    pendingActionsCount,
    lastSyncedAt,
    forceSync,
    cacheData,
    hasCachedData
  } = useOfflineSync();

  const [cachedCounts, setCachedCounts] = useState<{
    jobs: number;
    machines: number;
    techniques: number;
  }>({ jobs: 0, machines: 0, techniques: 0 });

  const [isCaching, setIsCaching] = useState(false);
  const [isStorageReady, setIsStorageReady] = useState(false);

  useEffect(() => {
    const loadCounts = async () => {
      try {
        await offlineStorage.init();
        setIsStorageReady(true);

        const [jobs, machines, techniques] = await Promise.all([
          offlineStorage.getAll('jobs'),
          offlineStorage.getAll('machines'),
          offlineStorage.getAll('techniques'),
        ]);

        setCachedCounts({
          jobs: jobs.length,
          machines: machines.length,
          techniques: techniques.length,
        });
      } catch {
        // Leitura do cache offline é best-effort; ignora se indisponível.
      }
    };

    loadCounts();
  }, [lastSyncedAt]);

  const handleCacheData = async () => {
    setIsCaching(true);
    try {
      await cacheData();
      // Reload counts after caching
      const [jobs, machines, techniques] = await Promise.all([
        offlineStorage.getAll('jobs'),
        offlineStorage.getAll('machines'),
        offlineStorage.getAll('techniques'),
      ]);
      setCachedCounts({
        jobs: jobs.length,
        machines: machines.length,
        techniques: techniques.length,
      });
    } finally {
      setIsCaching(false);
    }
  };

  const hasCache = cachedCounts.jobs > 0 || cachedCounts.machines > 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn('gap-2 h-9 px-3', className)}
        >
          {isOnline ? (
            <Wifi className={cn(
              'w-4 h-4',
              pendingActionsCount > 0 ? 'text-warning' : 'text-green-500'
            )} />
          ) : (
            <WifiOff className="w-4 h-4 text-destructive" />
          )}

          {pendingActionsCount > 0 && (
            <Badge
              variant="secondary"
              className="h-5 px-1.5 text-xs bg-warning/20 text-warning"
            >
              {pendingActionsCount}
            </Badge>
          )}

          {!isOnline && hasCache && (
            <Badge variant="outline" className="h-5 px-1.5 text-xs border-green-500/50 text-green-500">
              <Check className="w-3 h-3" />
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          {/* Status Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center',
                isOnline ? 'bg-green-500/10' : 'bg-warning/10'
              )}>
                {isOnline ? (
                  <Wifi className="w-4 h-4 text-green-500" />
                ) : (
                  <WifiOff className="w-4 h-4 text-warning" />
                )}
              </div>
              <div>
                <p className={cn(
                  'font-medium text-sm',
                  isOnline ? 'text-green-500' : 'text-warning'
                )}>
                  {isOnline ? 'Conectado' : 'Offline'}
                </p>
                {lastSyncedAt && (
                  <p className="text-xs text-muted-foreground">
                    Sync: {formatDistanceToNow(lastSyncedAt, { addSuffix: true, locale: ptBR })}
                  </p>
                )}
              </div>
            </div>

            {isSyncing && (
              <RefreshCw className="w-4 h-4 text-primary animate-spin" />
            )}
          </div>

          {/* Pending Actions */}
          {pendingActionsCount > 0 && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-warning/10">
              <AlertCircle className="w-4 h-4 text-warning" />
              <span className="text-sm text-warning">
                {pendingActionsCount} ação(ões) aguardando sincronização
              </span>
            </div>
          )}

          {/* Cached Data Stats */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Dados em cache
            </p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-lg bg-muted/50">
                <p className="text-lg font-bold">{cachedCounts.jobs}</p>
                <p className="text-xs text-muted-foreground">Jobs</p>
              </div>
              <div className="p-2 rounded-lg bg-muted/50">
                <p className="text-lg font-bold">{cachedCounts.machines}</p>
                <p className="text-xs text-muted-foreground">Máquinas</p>
              </div>
              <div className="p-2 rounded-lg bg-muted/50">
                <p className="text-lg font-bold">{cachedCounts.techniques}</p>
                <p className="text-xs text-muted-foreground">Técnicas</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-2"
              onClick={handleCacheData}
              disabled={!isOnline || isCaching}
            >
              <Download className={cn('w-4 h-4', isCaching && 'animate-bounce')} />
              {isCaching ? 'Baixando...' : 'Atualizar cache'}
            </Button>

            {pendingActionsCount > 0 && isOnline && (
              <Button
                size="sm"
                className="flex-1 gap-2"
                onClick={forceSync}
                disabled={isSyncing}
              >
                <RefreshCw className={cn('w-4 h-4', isSyncing && 'animate-spin')} />
                Sincronizar
              </Button>
            )}
          </div>

          {/* Offline Mode Info */}
          {!isOnline && (
            <p className="text-xs text-muted-foreground">
              Trabalhando offline. Alterações serão sincronizadas automaticamente.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
