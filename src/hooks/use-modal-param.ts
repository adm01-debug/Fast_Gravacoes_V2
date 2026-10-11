import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Torna um modal compartilhável via URL: `?modal=<name>` abre o modal e a
 * URL pode ser copiada/enviada. Ao fechar, o param é removido sem criar
 * entrada extra no histórico (replace).
 */
export function useModalParam(name: string): [boolean, (open: boolean) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const isOpen = searchParams.get('modal') === name;

  const setOpen = useCallback(
    (open: boolean) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (open) {
            next.set('modal', name);
          } else {
            next.delete('modal');
          }
          return next;
        },
        { replace: !open }
      );
    },
    [name, setSearchParams]
  );

  return [isOpen, setOpen];
}
