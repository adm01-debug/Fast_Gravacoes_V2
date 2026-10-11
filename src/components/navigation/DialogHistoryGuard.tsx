import { useEffect, useRef } from 'react';
import { urlOwnedDialogCount } from '@/hooks/use-modal-param';
import { subscribeNavHistory } from '@/lib/navHistory';

export const SENTINEL_KEY = 'dialog-guard';

/** A entrada atual é a sentinela de um dialog (Back consome/fecha o dialog). */
export const hasActiveDialogSentinel = (): boolean =>
  Boolean((history.state as Record<string, unknown> | null)?.[SENTINEL_KEY]);
// Diálogos com data-history-guard="off" (ex.: confirmação de saída do
// dirty-guard, cuja ação navega) ficam fora — a sentinela faria o
// navigate(-1) só consumir a entrada extra em vez de sair da página.
// :not([data-state="closed"]) — o conteúdo animado do Radix permanece no
// DOM com data-state="closed" por ~300ms após fechar; contá-lo faria a
// guarda rearmar uma sentinela para um dialog que já está saindo.
const DIALOG_SELECTOR =
  '[role="dialog"]:not([data-history-guard="off"]):not([data-state="closed"]), [role="alertdialog"]:not([data-history-guard="off"]):not([data-state="closed"])';

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
  // Entradas reais do history carregam state.idx (posição na pilha,
  // escrita pela lib do router); a sentinela não tem. Guardando o idx da
  // última entrada real visitada, dá para saber — ao cair numa sentinela
  // órfã — se o usuário estava voltando ou avançando, e pular a entrada
  // morta na mesma direção.
  const lastRealIdxRef = useRef<number | null>(null);
  const sentinelBaseIdxRef = useRef<number | null>(null);

  useEffect(() => {
    const readIdx = () => (history.state as { idx?: number } | null)?.idx;
    lastRealIdxRef.current = readIdx() ?? null;
    // Reload com dialog aberto deixa a sentinela como entrada atual (o
    // marcador persiste no history.state) mas o dialog não reabre — sem
    // consumir a entrada, o primeiro voltar cai na duplicata da página e
    // parece não fazer nada. E dialog aberto ANTES da guarda montar
    // (componente lazy — ex.: paleta aberta durante o chunk) não é visto
    // pelo observer: arma a sentinela para proteger o voltar.
    const stateAtMount = history.state as Record<string, unknown> | null;
    if (stateAtMount?.[SENTINEL_KEY] && unownedDialogs() === 0) {
      history.back();
    } else if (!stateAtMount?.[SENTINEL_KEY] && unownedDialogs() > 0) {
      sentinelActiveRef.current = true;
      sentinelConsumedByPopRef.current = false;
      sentinelBaseIdxRef.current = readIdx() ?? null;
      history.pushState({ ...(history.state ?? {}), [SENTINEL_KEY]: true }, '');
    }
    // PUSH não emite popstate — acompanha as mudanças de rota registradas
    // pelo navHistory para manter o último idx real atualizado.
    const unsubscribeNav = subscribeNavHistory(() => {
      const idx = readIdx();
      if (typeof idx === 'number') lastRealIdxRef.current = idx;
    });

    const pushSentinel = () => {
      if (sentinelActiveRef.current || suppressUntilClosedRef.current || unownedDialogs() === 0) return;
      sentinelActiveRef.current = true;
      sentinelConsumedByPopRef.current = false;
      sentinelBaseIdxRef.current = readIdx() ?? null;
      // Preserva o state do router (idx/key/usr): um PUSH feito pelo
      // próprio diálogo logo em seguida derivaria o índice novo de um
      // state vazio, e o skip direcional perderia a referência.
      history.pushState({ ...(history.state ?? {}), [SENTINEL_KEY]: true }, '');
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
      const st = history.state as Record<string, unknown> | null;
      if (st?.[SENTINEL_KEY] && !sentinelActiveRef.current && unownedDialogs() === 0) {
        // Sentinela órfã: o diálogo navegou (PUSH) antes de fechar e a
        // entrada ficou "morta" no histórico. Pula ela na mesma direção
        // em que o usuário estava viajando — sem isso o voltar cai numa
        // cópia da página atual e o próximo voltar parece não fazer nada.
        // A sentinela órfã preserva o idx da entrada base (state
        // copiado no push) — serve de referência quando a ref se perdeu
        // (ex.: remontagem após reload).
        const base = sentinelBaseIdxRef.current ?? (typeof st.idx === 'number' ? st.idx : null);
        const last = lastRealIdxRef.current;
        if (base !== null && last !== null) {
          if (last > base) {
            history.back();
          } else {
            // Não dá para saber se existe entrada depois da sentinela:
            // o idx do router reinicia por sessão e history.length
            // inclui páginas de fora do app. Tenta avançar e, se ainda
            // estamos na MESMA sentinela quando o popstate assentar,
            // ela era a última entrada (dialog fechado pela UI) —
            // volta à base em vez de ficar parado na cópia morta.
            const probeIdx = st.idx;
            history.forward();
            window.setTimeout(() => {
              const now = history.state as Record<string, unknown> | null;
              if (now?.[SENTINEL_KEY] && now.idx === probeIdx) history.back();
            }, 60);
          }
        }
        return;
      }
      if (st && !st[SENTINEL_KEY] && typeof st.idx === 'number') {
        lastRealIdxRef.current = st.idx;
      }
      if (!sentinelActiveRef.current) return;
      sentinelConsumedByPopRef.current = true;
      sentinelActiveRef.current = false;
      // Re-arma de cara quando ainda restam diálogos abertos (pilha de
      // diálogos) — suprimir deixaria os demais sem proteção do voltar.
      const remaining = unownedDialogs();
      suppressUntilClosedRef.current = remaining <= 1;
      if (remaining > 1) {
        sentinelActiveRef.current = true;
        sentinelBaseIdxRef.current = readIdx() ?? null;
        history.pushState({ ...(history.state ?? {}), [SENTINEL_KEY]: true }, '');
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
            sentinelBaseIdxRef.current = readIdx() ?? null;
            history.pushState({ ...(history.state ?? {}), [SENTINEL_KEY]: true }, '');
          }
        }, 0);
      }
    };

    window.addEventListener('popstate', onPopState);

    return () => {
      observer.disconnect();
      unsubscribeNav();
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

  return null;
}
