import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Deep-link com foco: quando a URL traz `?focus=<id>`, rola até o elemento
 * com `data-focus-id="<id>"` e aplica um destaque temporário. Usado para
 * notificações que apontam para um item específico de uma lista.
 */
export function useDeepLinkFocus() {
  const location = useLocation();

  useEffect(() => {
    const focus = new URLSearchParams(location.search).get('focus');
    if (!focus) return;

    const timer = window.setTimeout(() => {
      const el = document.querySelector<HTMLElement>(`[data-focus-id="${CSS.escape(focus)}"]`);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('deeplink-focus-highlight');
      window.setTimeout(() => el.classList.remove('deeplink-focus-highlight'), 2400);
    }, 350); // espera a transição de página/loading

    return () => window.clearTimeout(timer);
  }, [location.search]);
}
