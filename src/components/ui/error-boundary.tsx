import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from './button';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  async componentDidCatch(error: Error, errorInfo: ErrorInfo): Promise<void> {
    this.setState({ errorInfo });

    // Always log so we can diagnose production issues



    // Automatically log error to database
    try {
      const { data: { user } } = await supabase.auth.getUser();

      await supabase.from('error_logs').insert({
        message: error.message,
        stack: error.stack,
        component_name: this.props.componentName || 'Unknown Component',
        url: window.location.href,
        user_id: user?.id,
        metadata: {
          componentStack: errorInfo.componentStack,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      });
    } catch {
      // Persistir o log de erro é best-effort; nunca deve mascarar o erro original.
    }
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl text-title font-bold text-foreground">
                Algo deu errado
              </h1>
              <p className="text-muted-foreground">
                Ocorreu um erro inesperado. Por favor, tente novamente ou volte para a página inicial.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4 text-left space-y-2">
                <p className="text-sm text-destructive font-semibold">
                  Ocorreu um erro interno. Os detalhes foram registrados para análise.
                </p>
                {this.props.componentName && (
                  <p className="text-[11px] text-muted-foreground font-mono">
                    Módulo: {this.props.componentName}
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={this.handleRetry} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar novamente
              </Button>
              <Button onClick={this.handleGoHome}>
                <Home className="h-4 w-4 mr-2" />
                Página inicial
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
