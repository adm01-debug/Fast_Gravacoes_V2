import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Home, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useCallback } from 'react';
import { useSmartBack } from '@/hooks/use-smart-back';
import { useDirtyGuard } from '@/contexts/DirtyFormContext';
import { hasActiveDialogSentinel } from '@/components/navigation/DialogHistoryGuard';
import { useBreadcrumbContext } from '@/contexts/BreadcrumbContext';
import { trackNavBack } from '@/lib/navTelemetry';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Máximo de itens visíveis antes de colapsar em "..."
// Estrutura visível: Home > primeiro > ... > penúltimo > último
const MAX_VISIBLE_ITEMS = 4;
const LABEL_MAX_CHARS = 22;

interface BreadcrumbItem {
  label: string;
  href?: string;
}

// Route to breadcrumb mapping
const routeLabels: Record<string, string> = {
  '': 'Início',
  'dashboard': 'Dashboard',
  'kanban': 'Kanban',
  'jobs': 'Jobs',
  'new-job': 'Novo Job',
  'operators': 'Operadores',
  'operator': 'Visão Operador',
  'operator-view': 'Visão Operador',
  'productivity': 'Produtividade',
  'machines': 'Máquinas',
  'efficiency': 'Eficiência',
  'energy': 'Energia',
  'tpm': 'TPM',
  'oee': 'OEE',
  'spc': 'SPC',
  'kpis': 'KPIs',
  'bi': 'Business Intelligence',
  'ml-predictions': 'Predições ML',
  'abc': 'Custeio ABC',
  'gamification': 'Gamificação',
  'traceability': 'Rastreabilidade',
  'documents': 'Documentos',
  'security': 'Segurança',
  'settings': 'Configurações',
  'notifications': 'Notificações',
  'scanner': 'Scanner QR',
  'shift-handover': 'Passagem de Turno',
  'weekly': 'Semanal',
  'daily': 'Diário',
  'calendar': 'Calendário',
  'pending': 'Fila Pendente',
  'alerts': 'Alertas',
  'executive': 'Fábrica Autônoma',
  'assistant': 'Assistente Técnico',
  'knowledge': 'Base de Conhecimento',
  'design-system': 'Design System',
  'code-quality': 'Qualidade de Código',
  'integrations': 'Integrações',
  'bitrix24': 'Bitrix24',
  'install': 'Instalar App',
  'auth': 'Autenticação',
  'reset-password': 'Redefinir Senha',
  'abc-costing': 'Custeio ABC',
  'compare': 'Comparação',
  'audit': 'Auditoria',
  'master-api': 'Master API',
  'telemetria': 'Telemetria',
  'kiosk': 'Kiosk',
  'track': 'Rastreio Público',
  'admin': 'Administração',
  'digital-twin': 'Gêmeo Digital',
  'inventory': 'Inventário',
  'logistics': 'Logística',
  'mfa-enrollment': 'Ativar MFA',
  'monitoring': 'Monitoramento',
  'monthly': 'Mensal',
  'operator-history': 'Histórico do Operador',
  'operator-productivity': 'Produtividade do Operador',
  'packaging': 'Embalagem',
  'report-builder': 'Construtor de Relatórios',
  'simulation': 'Simulação',
  'status': 'Status do Sistema'
};

export function Breadcrumbs({ className }: { className?: string }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { trigger } = useHapticFeedback();
  const { canGoBack: hasInternalEntry, goBack } = useSmartBack();
  const { confirmIfDirty } = useDirtyGuard();
  const { items: contextItems } = useBreadcrumbContext();
  const pathnames = location.pathname.split('/').filter(Boolean);

  const handleBack = useCallback(() => {
    trigger('light');
    trackNavBack('breadcrumb', hasInternalEntry ? 'history' : 'fallback');
    if (hasActiveDialogSentinel()) { goBack(); } else { confirmIfDirty(goBack); }
  }, [trigger, goBack, hasInternalEntry, confirmIfDirty]);

  // Don't show breadcrumbs on home page or specific utility pages
  if (pathnames.length === 0 || ['/auth', '/reset-password', '/install', '/track'].includes(location.pathname)) {
    return null;
  }

  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Início', href: '/' },
  ];

  // Prefixos de rota que EXISTEM em AppRoutes e podem ser pai de outra
  // rota — atualizar quando uma rota-pai ganhar página própria.
  const NAVIGABLE_PARENT_PATHS = new Set(['/machines', '/operators', '/packaging']);

  let currentPath = '';
  pathnames.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === pathnames.length - 1;

    breadcrumbs.push({
      label: routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' '),
      // Segmento-pai só vira link quando é uma rota REAL — '/calendar',
      // '/integrations' e '/admin' não existem em AppRoutes e caíam no 404.
      href: isLast || !NAVIGABLE_PARENT_PATHS.has(currentPath) ? undefined : currentPath,
    });
  });

  // Páginas podem substituir o último item pelo nome do recurso
  // (useBreadcrumbLabel) — ex.: "Job OS-2024-001" em vez do id.
  if (contextItems.length > 0) {
    const start = Math.max(0, breadcrumbs.length - contextItems.length);
    breadcrumbs.splice(start, breadcrumbs.length - start, ...contextItems);
  }

  // Truncamento inteligente: se a trilha for muito longa, colapsamos os itens
  // intermediários em um botão "..." que abre um menu com o caminho completo.
  const shouldCollapse = breadcrumbs.length > MAX_VISIBLE_ITEMS;
  
  const collapsedItems: BreadcrumbItem[] = shouldCollapse
    ? breadcrumbs.slice(1, breadcrumbs.length - 2)
    : [];

  const firstItem = breadcrumbs[0];
  const lastTwoItems = breadcrumbs.slice(-2);

  const truncateLabel = (label: string) =>
    label.length > LABEL_MAX_CHARS ? `${label.slice(0, LABEL_MAX_CHARS - 1)}…` : label;

  const fullPathLabel = breadcrumbs.map((b) => b.label).join(' › ');

  return (
    <TooltipProvider delayDuration={300}>
      <nav
        aria-label="Trilha de navegação"
        className={cn(
          "flex items-center gap-2 text-sm text-muted-foreground no-export animate-in fade-in slide-in-from-left-2 duration-500 ease-out",
          className
        )}
      >
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none whitespace-nowrap px-1 scroll-smooth mask-fade-right max-w-full">
          {/* Home Item */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  to="/"
                  onClick={() => trigger('light')}
                  className="flex items-center justify-center h-8 w-8 rounded-md hover:bg-primary/15 hover:text-foreground transition-all hover:scale-110 active:scale-95 shadow-sm border border-transparent hover:border-primary/30 group/home"
                  aria-label="Ir para o início"
                >
                  <Home className="h-4 w-4 transition-transform group-hover/home:rotate-[-5deg]" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="bottom">Início</TooltipContent>
            </Tooltip>
          </div>

          {/* Ellipsis / Collapsed Menu */}
          {shouldCollapse && (
            <>
              <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 opacity-40 text-muted-foreground/60" />
              <div className="flex items-center gap-1">
                <DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          onClick={() => trigger('light')}
                          aria-label={`Mostrar ${collapsedItems.length} níveis ocultos`}
                          className="flex items-center justify-center h-7 px-2 rounded-md hover:bg-primary/15 hover:text-foreground transition-all hover:scale-105 active:scale-95 border border-transparent hover:border-primary/30 text-muted-foreground/80"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <div className="text-xs opacity-70">Caminho completo</div>
                      <div className="font-medium">{fullPathLabel}</div>
                    </TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent align="start" className="min-w-[200px] z-[70]">
                    {collapsedItems.map((collapsed, i) => (
                      <DropdownMenuItem
                        key={`${collapsed.href}-${i}`}
                        onClick={() => {
                          trigger('light');
                          if (collapsed.href) navigate(collapsed.href);
                        }}
                        className="cursor-pointer"
                      >
                        <ChevronRight className="h-3.5 w-3.5 mr-2 opacity-50" />
                        <span className="truncate">{collapsed.label}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </>
          )}

          {/* Visible Items (Last 2 or All minus Home) */}
          {(shouldCollapse ? lastTwoItems : breadcrumbs.slice(1)).map((item, index) => (
            <div key={`${item.href ?? 'last'}-${index}`} className="flex items-center gap-1">
              <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 opacity-40 text-muted-foreground/60" />
              
              {item.href ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      to={item.href}
                      onClick={() => trigger('light')}
                      className="px-2.5 py-1 rounded-md hover:bg-primary/15 hover:text-foreground transition-all hover:scale-105 active:scale-95 hover:underline underline-offset-4 border border-transparent hover:border-primary/30 font-medium text-muted-foreground/80 max-w-[180px] truncate inline-block"
                    >
                      {truncateLabel(item.label)}
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{item.label}</TooltipContent>
                </Tooltip>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      aria-current="page"
                      className="px-3 py-1 text-foreground font-bold tracking-tight bg-primary/10 rounded-md border border-primary/20 shadow-sm animate-in zoom-in-95 duration-300 max-w-[220px] truncate inline-block"
                    >
                      {truncateLabel(item.label)}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <div className="font-semibold">{item.label}</div>
                    <div className="text-xs opacity-70 mt-1">{fullPathLabel}</div>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          ))}
        </div>
      </nav>
    </TooltipProvider>
  );
}