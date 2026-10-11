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

    // A lista pode demorar para carregar (lazy + fetch) — retenta por ~3s.
    let attempts = 0;
    let timer = 0;
    let highlightTimer = 0;
    const tryFocus = () => {
      const el = document.querySelector<HTMLElement>(`[data-focus-id="${CSS.escape(focus)}"]`);
      if (!el) {
        attempts += 1;
        if (attempts < 15) timer = window.setTimeout(tryFocus, 200);
        return;
      }
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('deeplink-focus-highlight');
      highlightTimer = window.setTimeout(() => el.classList.remove('deeplink-focus-highlight'), 2400);
    };

    timer = window.setTimeout(tryFocus, 350); // espera a transição de página/loading

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(highlightTimer);
    };
  }, [location.search]);
}
