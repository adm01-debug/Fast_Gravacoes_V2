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

function notify() {
  for (const listener of listeners) listener();
}

export function subscribeNavHistory(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function recordLocation(action: NavigationType, key: string) {
  // Idempotente: vários hooks/componentes podem registrar a mesma key.
  if (stack[stack.length - 1] === key) return;
  if (action === 'POP') {
    const idx = stack.lastIndexOf(key);
    if (idx >= 0) {
      // Voltou a uma entrada conhecida — descarta o que veio depois.
      stack.length = idx + 1;
    } else {
      // POP para entrada ainda não registrada (ex.: reload mid-history).
      stack.push(key);
    }
  } else if (action === 'REPLACE') {
    if (stack.length === 0) stack.push(key);
    else stack[stack.length - 1] = key;
  } else {
    // PUSH
    stack.push(key);
  }
  notify();
}

/** Quantas entradas internas existem abaixo da atual (0 = deep-link/fallback). */
export function internalDepth(): number {
  return Math.max(0, stack.length - 1);
}

/** Limpa a pilha — usado em testes para isolar casos. */
export function resetNavHistory(): void {
  stack.length = 0;
  notify();
}
