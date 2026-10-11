import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

/**
 * Guard de formulário sujo para navegação interna. O app usa <Routes>
 * simples (sem data router), então useBlocker não está disponível — este
 * contexto oferece o mesmo comportamento: páginas registram `isDirty` via
 * useDirtyForm e os pontos de saída (Voltar, swipe, atalhos, breadcrumb)
 * chamam `confirmIfDirty`, que abre um AlertDialog antes de abandonar.
 *
 * Uso em página com formulário:
 *   const { formState: { isDirty } } = useForm(...);
 *   useDirtyForm(isDirty);
 *
 * Uso em ponto de saída:
 *   const { confirmIfDirty } = useDirtyGuard();
 *   confirmIfDirty(() => navigate(-1));
 */

type PendingNavigation = () => void;

interface DirtyGuardState {
  confirmIfDirty: (navigate: PendingNavigation) => void;
}

const DirtyGuardContext = createContext<DirtyGuardState>({
  confirmIfDirty: (navigate) => navigate(),
});

// Registry mutável module-level: useDirtyForm escreve sem passar por
// estado React (evita re-render global a cada tecla) e confirmIfDirty lê
// na hora do clique — sempre o valor mais recente.
let dirtyRegistry = false;
// Callbacks de limpeza ao confirmar "Sair sem salvar" (ex.: descartar
// rascunho persistido do Novo Job).
const discardListeners = new Set<() => void>();

export function DirtyGuardProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingNavigation | null>(null);
  const pendingRef = useRef<PendingNavigation | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Botão Voltar do browser com a confirmação aberta: o POP já aconteceu
  // e não pode ser cancelado — a confirmação pendente apontaria para a
  // página antiga (e o callback poderia navegar de novo). Descarta sem
  // executar a navegação pendente.
  useEffect(() => {
    pendingRef.current = null;
    setPending(null);
  }, [location.key]);

  const confirmIfDirty = useCallback((nav: PendingNavigation) => {
    if (dirtyRegistry) {
      // Confirmação já aberta: ignora novos pedidos — sobrescrever o
      // pendente faria "Sair sem salvar" executar uma navegação diferente
      // da que o usuário confirmou (ex.: Alt+H disparado com o dialog
      // aberto troca o destino para Home).
      if (pendingRef.current) return;
      pendingRef.current = nav;
      setPending(() => nav);
    } else {
      nav();
    }
  }, []);

  // Intercepta cliques em links internos (<Link>/<a href="/...">) enquanto
  // houver formulário sujo — breadcrumbs, sidebar, cards e notificações
  // navegam direto, sem passar por confirmIfDirty. Navegação por
  // modifier-click/nova aba não é interrompida. O botão Voltar do browser
  // (popstate) não pode ser cancelado; formulários com rascunho
  // (ex.: Novo Job) persistem os dados e o usuário não perde nada.
  useEffect(() => {
    const onClickCapture = (event: MouseEvent) => {
      if (!dirtyRegistry || pendingRef.current) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
      const anchor = (event.target as HTMLElement).closest?.('a[href]') as HTMLAnchorElement | null;
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      const href = anchor.getAttribute('href') ?? '';
      if (!href.startsWith('/') || href.startsWith('//')) return;
      if (anchor.pathname === window.location.pathname && anchor.search === window.location.search) return;
      event.preventDefault();
      event.stopPropagation();
      confirmIfDirty(() => navigate(href));
    };
    document.addEventListener('click', onClickCapture, true);
    return () => document.removeEventListener('click', onClickCapture, true);
  }, [confirmIfDirty, navigate]);

  const value = useMemo<DirtyGuardState>(() => ({ confirmIfDirty }), [confirmIfDirty]);

  const handleDiscard = useCallback(() => {
    const nav = pendingRef.current;
    pendingRef.current = null;
    setPending(null);
    for (const listener of discardListeners) listener();
    nav?.();
  }, []);

  const handleStay = useCallback(() => {
    pendingRef.current = null;
    setPending(null);
  }, []);

  return (
    <DirtyGuardContext.Provider value={value}>
      {children}
      <AlertDialog open={pending !== null} onOpenChange={(open) => { if (!open) handleStay(); }}>
        <AlertDialogContent data-history-guard="off">
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar alterações não salvas?</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem alterações não salvas nesta página. Se sair agora, elas serão perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleStay}>Continuar editando</AlertDialogCancel>
            <AlertDialogAction onClick={handleDiscard}>Sair sem salvar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DirtyGuardContext.Provider>
  );
}

/** Lê o guard nos pontos de saída (Voltar, swipe, atalhos, breadcrumb). */
export function useDirtyGuard() {
  return useContext(DirtyGuardContext);
}

/**
 * Registra o estado sujo do formulário da página atual.
 * Deve ser chamado dentro do provider (MainLayout).
 */
export function useDirtyForm(isDirty: boolean, onDiscard?: () => void) {
  useEffect(() => {
    dirtyRegistry = isDirty;
    return () => {
      dirtyRegistry = false;
    };
  }, [isDirty]);

  useEffect(() => {
    if (!onDiscard) return;
    discardListeners.add(onDiscard);
    return () => {
      discardListeners.delete(onDiscard);
    };
  }, [onDiscard]);
}
