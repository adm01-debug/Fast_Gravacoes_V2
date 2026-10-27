import type { NavigationType } from 'react-router-dom';

/**
 * Pilha de location.keys visitadas nesta sessão — mede a profundidade real
 * de histórico INTERNO do app. `location.key !== 'default'` sozinho não
 * basta: um redirect com `replace` (ex.: ProtectedRoute → /auth num
 * deep-link direto) cria key nova mesmo sem nenhuma entrada interna
 * anterior, e voltar nesse caso sairia do app.
 *
 * Atualizado em AnimatedRoutes (e pelo próprio useSmartBack) e lido pelo
 * useSmartBack via useSyncExternalStore.
 */
const stack: string[] = [];
const listeners = new Set<() => void>();
const MAX_STACK = 60;
const NAV_STACK_STATE = '__fgNavStack';

function notify() {
  for (const listener of listeners) listener();
}

type HistoryStateWithUsr = { usr?: Record<string, unknown> } | null;

/**
 * Retrato da pilha embutido em `history.state.usr` de cada entrada —
 * sobrevive a reload e acompanha back/forward: ao chegar numa entrada que
 * já tem retrato, restaura a pilha daquele ponto (em vez de tratar um POP
 * desconhecido pós-reload como predecessor interno, o que poderia fazer o
 * Voltar navegar para fora do app).
 */
function persistedSnapshot(): string[] | null {
  try {
    const snap = (history.state as HistoryStateWithUsr)?.usr?.[NAV_STACK_STATE];
    return Array.isArray(snap) ? snap.filter((k): k is string => typeof k === 'string') : null;
  } catch {
    return null;
  }
}

function persist() {
  try {
    const state = history.state as (Record<string, unknown> & { usr?: Record<string, unknown> }) | null;
    history.replaceState(
      { ...(state ?? {}), usr: { ...(state?.usr ?? {}), [NAV_STACK_STATE]: stack.slice(-MAX_STACK) } },
      ''
    );
  } catch {
    // history indisponível (jsdom/SSR) — pilha continua só em memória
  }
}

export function subscribeNavHistory(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function recordLocation(action: NavigationType, key: string) {
  // Idempotente: vários hooks/componentes podem registrar a mesma key.
  if (stack[stack.length - 1] === key) {
    persist();
    return;
  }
  const snap = persistedSnapshot();
  // O retrato só manda quando a pilha em memória está vazia (módulo
  // recarregado = reload da página). Com pilha viva, o fluxo normal de
  // PUSH/REPLACE/POP decide — restaurar aqui descartaria entradas reais
  // (em jsdom o history.state é global e o retrato vaza entre testes).
  if (snap && snap.length > 0 && stack.length === 0) {
    stack.push(...snap.slice(0, -1).filter((k) => k !== key), key);
  } else if (action === 'POP') {
    const idx = stack.lastIndexOf(key);
    if (idx >= 0) {
      // Voltou a uma entrada conhecida — descarta o que veio depois.
      stack.length = idx + 1;
    } else {
      // POP para entrada sem retrato nem registro — pode ser uma entrada
      // EXTERNA na mesma aba. Tratá-la como interna deixaria o Voltar
      // seguir para fora do app; rebatendo a pilha o Voltar cai no
      // fallback em vez de navegar para fora.
      stack.length = 0;
      stack.push(key);
    }
  } else if (action === 'REPLACE') {
    if (stack.length === 0) stack.push(key);
    else stack[stack.length - 1] = key;
  } else {
    // PUSH
    stack.push(key);
  }
  persist();
  notify();
}

/** Quantas entradas internas existem abaixo da atual (0 = deep-link/fallback). */
export function internalDepth(): number {
  return Math.max(0, stack.length - 1);
}

/**
 * Direção de um POP para `key`: 'back' se a entrada existe abaixo do topo,
 * 'forward' quando o usuário avançou para uma entrada que já tinha sido
 * descartada da pilha (Forward do browser também chega como POP).
 */
export function popDirectionFor(key: string): 'back' | 'forward' {
  const idx = stack.lastIndexOf(key);
  return idx >= 0 && idx < stack.length - 1 ? 'back' : 'forward';
}

/** Limpa a pilha — usado em testes para isolar casos. */
export function resetNavHistory(): void {
  stack.length = 0;
  persist();
  notify();
}
