import { useOfflineSync } from '@/hooks/useOfflineSync';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Wifi,
  WifiOff,
  Cloud,
  CloudOff,
  RefreshCw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface OfflineSyncIndicatorProps {
  variant?: 'minimal' | 'full';
  className?: string;
}

export function OfflineSyncIndicator({
  variant = 'minimal',
  className
}: OfflineSyncIndicatorProps) {
  const {
    isOnline,
    isSyncing,
    pendingActionsCount,
    lastSyncedAt,
    forceSync,
    hasCachedData
  } = useOfflineSync();

  if (variant === 'minimal') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('flex items-center gap-1.5', className)}>
            {isOnline ? (
              <Wifi className="w-4 h-4 text-green-500" />
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
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">
              {isOnline ? 'Conectado' : 'Offline'}
            </p>
            {pendingActionsCount > 0 && (
              <p className="text-sm text-muted-foreground">
                {pendingActionsCount} ação(ões) pendente(s)
              </p>
            )}
            {lastSyncedAt && (
              <p className="text-xs text-muted-foreground">
                Última sincronização: {formatDistanceToNow(lastSyncedAt, {
                  addSuffix: true,
                  locale: ptBR
                })}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-lg border',
      isOnline
        ? 'bg-green-500/5 border-green-500/20'
        : 'bg-warning/5 border-warning/20',
      className
    )}>
      {/* Status Icon */}
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

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={cn(
            'font-medium text-sm',
            isOnline ? 'text-green-500' : 'text-warning'
          )}>
            {isOnline ? (isSyncing ? 'Sincronizando...' : 'Conectado') : 'Modo Offline'}
          </p>
          {!isOnline && hasCachedData && (
            <Badge variant="outline" className="text-xs">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Cache ativo
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {pendingActionsCount > 0 ? (
            <span className="flex items-center gap-1 text-warning">
              <AlertCircle className="w-3 h-3" />
              {pendingActionsCount} ação(ões) pendente(s)
            </span>
          ) : (
            <span>Todos os dados sincronizados</span>
          )}

          {lastSyncedAt && (
            <>
              <span>•</span>
              <span>
                Sync: {formatDistanceToNow(lastSyncedAt, {
                  addSuffix: true,
                  locale: ptBR
                })}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Sync Button */}
      {isOnline && pendingActionsCount > 0 && (
        <Button
          size="sm"
          variant="ghost"
          onClick={forceSync}
          disabled={isSyncing}
          className="shrink-0"
        >
          <RefreshCw className={cn(
            'w-4 h-4',
            isSyncing && 'animate-spin'
          )} />
        </Button>
      )}
    </div>
  );
}
