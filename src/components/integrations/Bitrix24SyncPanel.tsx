/* eslint-disable react-hooks/exhaustive-deps --
   Dependências intencionalmente omitidas: incluí-las causaria loops
   infinitos, invalidação excessiva de cache ou recomputação em cada
   render. Callbacks/valores externos são estáveis por contrato. */
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Check, X, ArrowDownToLine, Plug, Loader2, KeyRound, ExternalLink, Trash2, AlertTriangle } from 'lucide-react';
import { useBitrix24Sync } from '@/features/admin';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { sanitizeUrl } from '@/lib/sanitize';

export const Bitrix24SyncPanel = () => {
  const {
    isLoading,
    lastSync,
    oauthStatus,
    testConnection,
    pullFromBitrix,
    checkOAuthStatus,
    clearTokens
  } = useBitrix24Sync();
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');

  useEffect(() => {
    checkOAuthStatus();
  }, []);

  const handleTestConnection = async () => {
    try {
      await testConnection();
      setConnectionStatus('connected');
    } catch {
      setConnectionStatus('error');
    }
  };

  const handlePull = async () => {
    await pullFromBitrix();
  };

  const handleReauthorize = () => {
    if (oauthStatus?.authorizationUrl) {
      window.open(sanitizeUrl(oauthStatus.authorizationUrl), '_blank');
    }
  };

  const getStatusBadge = () => {
    if (oauthStatus?.needsReauthorization) {
      return (
        <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
          <KeyRound className="h-3 w-3 mr-1" />
          Reautorização Necessária
        </Badge>
      );
    }

    switch (connectionStatus) {
      case 'connected':
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            <Check className="h-3 w-3 mr-1" />
            Conectado
          </Badge>
        );
      case 'error':
        return (
          <Badge className="bg-destructive/20 text-destructive border-destructive/30">
            <X className="h-3 w-3 mr-1" />
            Erro
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
            Não verificado
          </Badge>
        );
    }
  };

  const getTokenStatusBadge = () => {
    if (!oauthStatus) return null;

    switch (oauthStatus.tokenStatus) {
      case 'valid':
        return (
          <Badge variant="outline" className="text-green-400 border-green-500/30">
            Token válido
          </Badge>
        );
      case 'expired':
        return (
          <Badge variant="outline" className="text-orange-400 border-orange-500/30">
            Token expirado
          </Badge>
        );
      case 'no_tokens':
        return (
          <Badge variant="outline" className="text-red-400 border-red-500/30">
            Sem tokens
          </Badge>
        );
    }
  };

  return (
    <Card className="glass-card border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              Integração Bitrix24
            </CardTitle>
            <CardDescription>
              Sincronização bidirecional de demandas e status
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {getTokenStatusBadge()}
            {getStatusBadge()}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {oauthStatus?.needsReauthorization && (
          <Alert className="bg-orange-500/10 border-orange-500/30">
            <AlertTriangle className="h-4 w-4 text-orange-400" />
            <AlertTitle className="text-orange-400">Reautorização Necessária</AlertTitle>
            <AlertDescription className="text-orange-300/80">
              {oauthStatus.reauthorizationReason || 'Os tokens OAuth expiraram e precisam ser renovados.'}
              <br />
              <span className="text-xs text-muted-foreground mt-1 block">
                Clique em "Reautorizar" para reconectar sua conta Bitrix24.
              </span>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Button
            variant="outline"
            onClick={handleTestConnection}
            disabled={isLoading}
            className="gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plug className="h-4 w-4" />
            )}
            Testar Conexão
          </Button>

          <Button
            variant="outline"
            onClick={handlePull}
            disabled={isLoading || connectionStatus === 'error' || oauthStatus?.needsReauthorization}
            className="gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowDownToLine className="h-4 w-4" />
            )}
            Importar do Bitrix
          </Button>

          <Button
            variant={oauthStatus?.needsReauthorization ? "default" : "outline"}
            onClick={handleReauthorize}
            disabled={isLoading || !oauthStatus?.authorizationUrl}
            className={`gap-2 ${oauthStatus?.needsReauthorization ? 'bg-orange-500 hover:bg-orange-600' : ''}`}
          >
            <KeyRound className="h-4 w-4" />
            Reautorizar
            <ExternalLink className="h-3 w-3" />
          </Button>

          <Button
            variant="outline"
            onClick={() => clearTokens()}
            disabled={isLoading}
            className="gap-2 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            Limpar Tokens
          </Button>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            {lastSync && (
              <span>Última sincronização: {format(lastSync, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
            )}
            {oauthStatus?.tokenExpiry && oauthStatus.tokenStatus === 'valid' && (
              <span>Token expira: {format(new Date(oauthStatus.tokenExpiry), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
            )}
          </div>
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            Sync Auto: 5min
          </Badge>
        </div>

        <div className="pt-3 border-t border-border/30">
          <h4 className="text-sm font-medium text-foreground mb-2">Mapeamento de Status</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center justify-between p-2 rounded bg-muted/20">
              <span className="text-muted-foreground">Bitrix: NEW</span>
              <span className="text-foreground">→ Na Fila</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-muted/20">
              <span className="text-muted-foreground">Bitrix: EXECUTING</span>
              <span className="text-foreground">→ Produção</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-muted/20">
              <span className="text-muted-foreground">Bitrix: WON</span>
              <span className="text-foreground">→ Finalizado</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-muted/20">
              <span className="text-muted-foreground">Bitrix: LOSE</span>
              <span className="text-foreground">→ Cancelado</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
