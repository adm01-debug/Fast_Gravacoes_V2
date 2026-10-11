import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  /** Exibe a trilha de navegação acima do título (default true). */
  showBreadcrumbs?: boolean;
}

/**
 * Cabeçalho padronizado de página: breadcrumbs + título (h1) + descrição +
 * ações à direita. O h1 recebe foco após a transição (MainLayout) para
 * leitores de tela anunciarem o novo contexto.
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
  showBreadcrumbs = true,
}: PageHeaderProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {showBreadcrumbs && <Breadcrumbs />}
      <div className="flex items-center gap-4 justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl text-title font-bold gradient-text truncate">
            {title}
          </h1>
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
