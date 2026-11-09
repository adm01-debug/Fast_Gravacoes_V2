import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './button';
import { logger } from '@/lib/logger';

interface Props {
  children: ReactNode;
  /** Section name shown in the error fallback */
  section?: string;
  /** Optional compact mode for small widgets */
  compact?: boolean;
  /** Optional custom fallback */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Granular ErrorBoundary for individual sections/widgets.
 * Unlike the global ErrorBoundary, this renders an inline error card
 * so the rest of the page remains functional.
 */
export class SectionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logger.error('Erro capturado pelo SectionErrorBoundary', error, this.props.section || 'section');
    void errorInfo;
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    const { compact, section } = this.props;

    if (compact) {
      return (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-destructive/20 bg-destructive/5 text-sm">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
          <span className="text-muted-foreground truncate">
            {section ? `Erro em ${section}` : 'Erro ao carregar'}
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={this.handleRetry}
            className="ml-auto shrink-0 h-7 px-2"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border border-destructive/20 bg-destructive/5">
        <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="h-5 w-5 text-destructive" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-foreground">
            {section ? `Erro em "${section}"` : 'Erro ao carregar seção'}
          </p>
          <p className="text-xs text-muted-foreground">
            Esta seção encontrou um problema. Tente recarregar.
          </p>
        </div>
        {import.meta.env.DEV && this.state.error && (
          <p className="text-xs font-mono text-destructive/80 max-w-xs truncate">
            {this.state.error.message}
          </p>
        )}
        <Button size="sm" variant="outline" onClick={this.handleRetry}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Tentar novamente
        </Button>
      </div>
    );
  }
}
