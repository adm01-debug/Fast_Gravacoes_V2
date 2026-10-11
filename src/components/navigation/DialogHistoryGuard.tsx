import { useEffect, useRef } from 'react';

const SENTINEL_KEY = 'dialog-guard';
const DIALOG_SELECTOR = '[role="dialog"], [role="alertdialog"]';

function openDialogs(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(DIALOG_SELECTOR));
}

function urlOwnsModal(): boolean {
  // Modais via useModalParam já possuem sua própria entrada no histórico
  // (?modal=<name>) — sentinela duplicada faria o voltar reabrir o modal.
  return new URLSearchParams(window.location.search).has('modal');
}

/**
 * Integra dialogs Radix com o histórico do browser: enquanto houver um
 * dialog aberto, mantém uma entrada sentinela no histórico — o botão/gesto
 * "voltar" consome a sentinela e fecha o dialog (via Escape) em vez de
 * sair da página. Quando o dialog fecha pela UI, a sentinela é removida
 * para não deixar um "back morto".
 */
export function DialogHistoryGuard() {
  // Refs no nível do componente: estado persiste entre re-execuções do
  // effect (mudanças de rota com dialog aberto não perdem a sentinela).
  const sentinelActiveRef = useRef(false);
  const sentinelConsumedByPopRef = useRef(false);

  useEffect(() => {
    const pushSentinel = () => {
      if (sentinelActiveRef.current || urlOwnsModal()) return;
      sentinelActiveRef.current = true;
      sentinelConsumedByPopRef.current = false;
      history.pushState({ [SENTINEL_KEY]: true }, '');
    };

    const popSentinel = () => {
      if (!sentinelActiveRef.current || sentinelConsumedByPopRef.current) return;
      sentinelActiveRef.current = false;
      history.back();
    };

    const observer = new MutationObserver(() => {
      if (openDialogs().length > 0) {
        pushSentinel();
      } else {
        popSentinel();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-state', 'open', 'class'],
    });

    const onPopState = () => {
      if (!sentinelActiveRef.current) return;
      sentinelConsumedByPopRef.current = true;
      sentinelActiveRef.current = false;
      if (openDialogs().length > 0) {
        // Escape aciona o close nativo de Dialog/Sheet do Radix.
        document.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
        );
      }
    };

    window.addEventListener('popstate', onPopState);

    return () => {
      observer.disconnect();
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

  return null;
}
