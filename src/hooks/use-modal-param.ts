import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

export const MODAL_PUSHED_STATE = 'modalPushed';

type ModalLocationState = { [MODAL_PUSHED_STATE]?: string } | null;

// Quantos dialogs abertos são "dono de URL" (entrada própria no histórico
// via PUSH do hook). O DialogHistoryGuard usa para não criar sentinela
// duplicada — mas continua protegendo outros dialogs empilhados acima.
let urlOwnedDialogs = 0;

export function urlOwnedDialogCount(): number {
  return urlOwnedDialogs;
}

/**
 * Torna um modal compartilhável via URL: `?modal=<name>` abre o modal e a
 * URL pode ser copiada/enviada. Aberto pela UI, o modal ganha uma entrada
 * própria no histórico (PUSH) e fechar consome essa entrada. Deep-links
 * são normalizados para o mesmo formato (entrada sem modal + PUSH com
 * modal), então Voltar sempre fecha o modal antes de sair da página.
 */
export function useModalParam(
  name: string
): [boolean, (open: boolean, extraParams?: Record<string, string>) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const isOpen = searchParams.get('modal') === name;
  const pushedByHook = (location.state as ModalLocationState)?.[MODAL_PUSHED_STATE] === name;
  const normalizedRef = useRef(false);
  const pendingPushRef = useRef<string | null>(null);

  // Fase 1 — deep-link `?modal=` direto: REPLACE na entrada base (sem
  // modal) e agenda o PUSH do modal. Rodar os dois navigate na mesma
  // passada faria o React Router renderizar só o PUSH e a entrada base
  // nunca seria registrada no navHistory — ao fechar o modal, o voltar
  // trataria a base como entrada externa.
  useEffect(() => {
    if (!isOpen || pushedByHook || normalizedRef.current) return;
    normalizedRef.current = true;
    const withModal = new URLSearchParams(location.search);
    const withoutModal = new URLSearchParams(location.search);
    withoutModal.delete('modal');
    const base = withoutModal.toString();
    pendingPushRef.current = `${location.pathname}?${withModal.toString()}${location.hash}`;
    navigate(`${location.pathname}${base ? `?${base}` : ''}${location.hash}`, { replace: true });
  }, [isOpen, pushedByHook, location.pathname, location.search, location.hash, name, navigate]);

  // Fase 2 — depois do REPLACE ser observado (entrada base registrada),
  // empurra a entrada do modal com o state que a marca como do hook.
  useEffect(() => {
    if (!pendingPushRef.current || isOpen || pushedByHook) return;
    const url = pendingPushRef.current;
    pendingPushRef.current = null;
    navigate(url, { state: { [MODAL_PUSHED_STATE]: name } });
  }, [isOpen, pushedByHook, name, navigate]);

  // Registra este modal como "dono de URL" enquanto `?modal=` está na
  // URL — ver urlOwnedDialogCount(). Conta também o deep-link direto
  // antes da normalização (pushedByHook=false): sem reservar já no
  // primeiro commit, o MutationObserver da guarda veria o dialog aberto
  // e empurraria sentinela — que o REPLACE da fase 1 reescreveria,
  // deixando a URL do modal presa no histórico. Layout effect roda
  // síncrono no commit, antes do observer (microtask).
  useLayoutEffect(() => {
    if (!isOpen) return;
    urlOwnedDialogs += 1;
    return () => { urlOwnedDialogs -= 1; };
  }, [isOpen]);

  const setOpen = useCallback(
    (open: boolean, extraParams?: Record<string, string>) => {
      if (!open && pushedByHook) {
        navigate(-1);
        return;
      }
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (open) {
            next.set('modal', name);
            for (const [key, value] of Object.entries(extraParams ?? {})) next.set(key, value);
          } else {
            next.delete('modal');
          }
          return next;
        },
        open ? { state: { [MODAL_PUSHED_STATE]: name } } : { replace: true }
      );
    },
    [name, navigate, pushedByHook, setSearchParams]
  );

  return [isOpen, setOpen];
}
