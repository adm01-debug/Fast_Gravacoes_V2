import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SENTINEL_KEY = 'dialog-guard';
const DIALOG_SELECTOR = '[role="dialog"], [role="alertdialog"]';

function openDialogs(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(DIALOG_SELECTOR));
}

/**
 * Integra dialogs Radix com o histórico do browser: enquanto houver um
 * dialog aberto, mantém uma entrada sentinela no histórico — o botão/gesto
 * "voltar" consome a sentinela e fecha o dialog (via Escape) em vez de
 * sair da página. Quando o dialog fecha pela UI, a sentinela é removida
 * para não deixar um "back morto".
 */
export function DialogHistoryGuard() {
  const location = useLocation();

  useEffect(() => {
    let sentinelActive = false;
    // Após um popstate o browser já consumiu a sentinela; este flag evita
    // que o ramo "dialog fechou pela UI" tente removê-la de novo.
    let sentinelConsumedByPop = false;

    const pushSentinel = () => {
      if (sentinelActive) return;
      sentinelActive = true;
      sentinelConsumedByPop = false;
      history.pushState({ [SENTINEL_KEY]: true }, '');
    };

    const popSentinel = () => {
      if (!sentinelActive || sentinelConsumedByPop) return;
      sentinelActive = false;
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
      if (!sentinelActive) return;
      sentinelConsumedByPop = true;
      sentinelActive = false;
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
  }, [location.key]);

  return null;
}
