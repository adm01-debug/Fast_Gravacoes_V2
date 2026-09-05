import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { createAppError, showErrorToast } from '@/lib/errorHandling';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log using our standard error handling
    const appError = createAppError(error, { errorInfo });
    import('@/lib/logger').then(({ logger }) => {
      logger.error('Critical UI Error captured by Boundary', {
        error: appError,
        componentStack: errorInfo.componentStack
      });
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isTelemetryError = this.state.error?.message?.toLowerCase().includes('telemetry') || 
                               this.state.error?.message?.toLowerCase().includes('postgrest') ||
                               this.state.error?.message?.toLowerCase().includes('inventory');
      const isRealtimeError = this.state.error?.message?.toLowerCase().includes('realtime') || 
                              this.state.error?.message?.toLowerCase().includes('websocket') ||
                              this.state.error?.message?.toLowerCase().includes('network');

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="w-full max-w-md border-destructive/20 shadow-2xl animate-in fade-in zoom-in duration-500">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4 ring-8 ring-destructive/5">
                <AlertTriangle className="h-8 w-8 text-destructive motion-safe:animate-pulse" />
              </div>
              <CardTitle className="text-2xl font-black tracking-tight uppercase">
                {isTelemetryError ? 'Falha na Infraestrutura' : isRealtimeError ? 'Falha de Sincronização' : 'Ops! Algo deu errado'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 text-center">
              <p className="text-muted-foreground font-medium">
                {isTelemetryError 
                  ? 'Detectamos uma instabilidade nos nossos serviços de telemetria. O sistema principal continua operando, mas algumas métricas podem estar indisponíveis.'
                  : isRealtimeError
                  ? 'A conexão em tempo real foi interrompida. Tente recarregar a página para restabelecer o fluxo de dados.'
                  : 'Ocorreu um erro inesperado na interface. Nossa equipe técnica já foi notificada automaticamente via telemetria.'}
              </p>
              
              <div className="bg-muted/50 p-4 rounded-xl text-left overflow-auto max-h-40 text-[10px] font-mono text-muted-foreground/80 border shadow-inner">
                <div className="flex items-center gap-2 mb-2 text-destructive/70 font-bold uppercase tracking-widest">
                  <div className="w-1.5 h-1.5 rounded-full bg-destructive" />
                  Stack Trace / Debug Info
                </div>
                {this.state.error?.stack || this.state.error?.message || 'Erro desconhecido'}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <Button 
                  variant="outline" 
                  onClick={this.handleGoHome}
                  className="flex items-center gap-2 h-11 font-bold uppercase tracking-widest text-[10px]"
                >
                  <Home className="h-4 w-4" />
                  Início
                </Button>
                <Button 
                  onClick={this.handleReset}
                  className="flex items-center gap-2 h-11 font-bold uppercase tracking-widest text-[10px] shadow-glow-primary"
                >
                  <RefreshCw className="h-4 w-4" />
                  Recarregar
                </Button>
              </div>
              
              <div className="pt-4 flex flex-col items-center gap-2">
                <p className="text-[10px] text-muted-foreground/60 uppercase tracking-[0.3em] font-black">
                  FAST GRAVAÇÕES - SISTEMA DE GESTÃO
                </p>
                <div className="flex gap-2">
                   <div className="h-1 w-8 rounded-full bg-primary/20" />
                   <div className="h-1 w-16 rounded-full bg-primary" />
                   <div className="h-1 w-8 rounded-full bg-primary/20" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
