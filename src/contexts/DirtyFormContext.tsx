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

export function DirtyGuardProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingNavigation | null>(null);
  const pendingRef = useRef<PendingNavigation | null>(null);

  const confirmIfDirty = useCallback((navigate: PendingNavigation) => {
    if (dirtyRegistry) {
      pendingRef.current = navigate;
      setPending(() => navigate);
    } else {
      navigate();
    }
  }, []);

  const value = useMemo<DirtyGuardState>(() => ({ confirmIfDirty }), [confirmIfDirty]);

  const handleDiscard = useCallback(() => {
    const nav = pendingRef.current;
    pendingRef.current = null;
    setPending(null);
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
        <AlertDialogContent>
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
export function useDirtyForm(isDirty: boolean) {
  useEffect(() => {
    dirtyRegistry = isDirty;
    return () => {
      dirtyRegistry = false;
    };
  }, [isDirty]);
}
