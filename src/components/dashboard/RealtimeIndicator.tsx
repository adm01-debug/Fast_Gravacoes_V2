import { Wifi, WifiOff, RefreshCw, Loader2, Database } from 'lucide-react';
import { useRealtimeConnection } from '@/features/analytics/hooks/useRealtimeConnection';
import { useIsMutating } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function RealtimeIndicator() {
  const { status, isConnected, lastUpdate, reconnect } = useRealtimeConnection();
  const isMutating = useIsMutating();

  const isSyncing = isConnected && isMutating > 0;

  const statusConfig = {
    connecting: {
      icon: Loader2,
      label: 'Conectando...',
      className: 'text-yellow-500 animate-spin',
      dotClass: 'bg-yellow-500 animate-pulse',
      ringClass: '',
    },
    connected: {
      icon: Wifi,
      label: 'Tempo real ativo',
      className: 'text-green-500',
      dotClass: 'bg-green-500',
      ringClass: 'pulse-ring',
    },
    disconnected: {
      icon: WifiOff,
      label: 'Desconectado',
      className: 'text-muted-foreground',
      dotClass: 'bg-muted-foreground',
      ringClass: '',
    },
    error: {
      icon: WifiOff,
      label: 'Erro de conexão',
      className: 'text-destructive',
      dotClass: 'bg-destructive',
      ringClass: '',
    },
  };

  const config = statusConfig[status];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              {isSyncing ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-primary animate-ping" />
                  <Database className="h-4 w-4 text-primary animate-pulse" />
                </>
              ) : (
                <>
                  <span className={cn('h-2 w-2 rounded-full', config.dotClass, config.ringClass)} />
                  <config.icon className={cn('h-4 w-4', config.className)} />
                </>
              )}
            </div>
            {!isConnected && status !== 'connecting' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={reconnect}
                aria-label="Reconectar em tempo real"
                title="Reconectar"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          <div className="space-y-1">
            <p className="font-medium">{isSyncing ? 'Sincronizando alterações...' : config.label}</p>
            {lastUpdate && !isSyncing && (
              <p className="text-muted-foreground">
                Última atualização: {formatDistanceToNow(lastUpdate, { addSuffix: true, locale: ptBR })}
              </p>
            )}
            {isSyncing && (
              <p className="text-muted-foreground animate-pulse">
                Processando dados em massa...
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
