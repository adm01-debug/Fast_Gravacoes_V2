import { useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

export const MODAL_PUSHED_STATE = 'modalPushed';

type ModalLocationState = { [MODAL_PUSHED_STATE]?: string } | null;

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

  useEffect(() => {
    if (!isOpen || pushedByHook || normalizedRef.current) return;
    normalizedRef.current = true;
    const withModal = new URLSearchParams(location.search);
    const withoutModal = new URLSearchParams(location.search);
    withoutModal.delete('modal');
    const base = withoutModal.toString();
    navigate(`${location.pathname}${base ? `?${base}` : ''}${location.hash}`, { replace: true });
    navigate(`${location.pathname}?${withModal.toString()}${location.hash}`, {
      state: { [MODAL_PUSHED_STATE]: name },
    });
  }, [isOpen, pushedByHook, location.pathname, location.search, location.hash, name, navigate]);

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
