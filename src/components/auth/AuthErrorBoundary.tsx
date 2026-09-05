import React, { Component, ErrorInfo, ReactNode } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AuthErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {

    this.logErrorToSupabase(error, errorInfo);
  }

  private async logErrorToSupabase(error: Error, errorInfo: ErrorInfo) {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      await supabase.from('error_logs').insert({
        message: error.message,
        stack: error.stack,
        component_name: 'AuthErrorBoundary',
        url: window.location.href,
        user_id: session?.user?.id,
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

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <div className="max-w-md w-full space-y-4">
            <Alert variant="destructive" className="border-2">
              <AlertTriangle className="h-5 w-5" />
              <AlertTitle className="text-lg font-bold">Ops! Algo deu errado</AlertTitle>
              <AlertDescription className="mt-2">
                Ocorreu um erro inesperado na tela de autenticação. Nossa equipe já foi notificada e estamos trabalhando para corrigir.
              </AlertDescription>
            </Alert>

            <div className="bg-card border rounded-lg p-6 shadow-sm space-y-4 text-center">
              <p className="text-sm text-muted-foreground italic">
                Ocorreu um erro inesperado na autenticação. Os detalhes foram registrados.
              </p>

              <Button
                onClick={this.handleReset}
                className="w-full flex items-center justify-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Tentar novamente
              </Button>

              <p className="text-xs text-muted-foreground pt-2">
                Se o problema persistir, por favor limpe o cache do seu navegador ou entre em contato com o suporte.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
