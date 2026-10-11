import { useEffect, useRef } from 'react';
import { urlOwnedDialogCount } from '@/hooks/use-modal-param';

const SENTINEL_KEY = 'dialog-guard';
// Diálogos com data-history-guard="off" (ex.: confirmação de saída do
// dirty-guard, cuja ação navega) ficam fora — a sentinela faria o
// navigate(-1) só consumir a entrada extra em vez de sair da página.
const DIALOG_SELECTOR =
  '[role="dialog"]:not([data-history-guard="off"]), [role="alertdialog"]:not([data-history-guard="off"])';

function openDialogs(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(DIALOG_SELECTOR));
}

function unownedDialogs(): number {
  // Modais abertos pela UI via useModalParam já possuem entrada própria
  // no histórico — sentinela duplicada faria o voltar reabrir o modal.
  // Isso só vale para os próprios modais de URL: um dialog comum
  // empilhado por cima deles (ex.: ajuda de atalhos) ainda precisa da
  // sentinela, senão o voltar fecha o modal de baixo e deixa o de cima.
  return Math.max(0, openDialogs().length - urlOwnedDialogCount());
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
  // Após um voltar consumir a sentinela, não re-arma até todos os
  // diálogos fecharem: pushState sem gesto do usuário é pulado pelo botão
  // Voltar do Chrome, e o próximo voltar sairia do app.
  const suppressUntilClosedRef = useRef(false);

  useEffect(() => {
    const pushSentinel = () => {
      if (sentinelActiveRef.current || suppressUntilClosedRef.current || unownedDialogs() === 0) return;
      sentinelActiveRef.current = true;
      sentinelConsumedByPopRef.current = false;
      history.pushState({ [SENTINEL_KEY]: true }, '');
    };

    const popSentinel = () => {
      if (!sentinelActiveRef.current || sentinelConsumedByPopRef.current) return;
      sentinelActiveRef.current = false;
      // Só remove a sentinela se ela ainda é a entrada atual — se uma ação
      // do diálogo navegou (PUSH), voltar desfaria essa navegação.
      const state = history.state as Record<string, unknown> | null;
      if (state?.[SENTINEL_KEY]) history.back();
    };

    const observer = new MutationObserver(() => {
      if (unownedDialogs() > 0) {
        pushSentinel();
      } else {
        suppressUntilClosedRef.current = false;
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
      // Re-arma de cara quando ainda restam diálogos abertos (pilha de
      // diálogos) — suprimir deixaria os demais sem proteção do voltar.
      const remaining = unownedDialogs();
      suppressUntilClosedRef.current = remaining <= 1;
      if (remaining > 1) {
        sentinelActiveRef.current = true;
        history.pushState({ [SENTINEL_KEY]: true }, '');
      }
      if (remaining > 0) {
        // Escape aciona o close nativo de Dialog/Sheet do Radix.
        document.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
        );
        // Dialog controlado que rejeita Escape (ex.: SessionTimeoutDialog
        // sem onOpenChange) continua montado — re-arma a sentinela para
        // o próximo voltar em vez de deixar a página desprotegida.
        setTimeout(() => {
          if (unownedDialogs() > 0 && !sentinelActiveRef.current) {
            suppressUntilClosedRef.current = false;
            sentinelActiveRef.current = true;
            sentinelConsumedByPopRef.current = false;
            history.pushState({ [SENTINEL_KEY]: true }, '');
          }
        }, 0);
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
