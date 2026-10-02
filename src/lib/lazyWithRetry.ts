import { lazy, type LazyExoticComponent } from 'react';

/**
 * Envolve React.lazy com retry em falhas de carregamento de chunk.
 *
 * Cenários cobertos:
 * - Rede intermitente/offline: espera o evento `online` e tenta de novo (limite de
 *   tentativas para não travar a UI).
 * - Deploy novo com chunks antigos: faz um reload único da página (guardado em
 *   sessionStorage) para baixar o manifest novo.
 * - Erros genuínos: propagados para o ErrorBoundary após esgotar as tentativas.
 *
 * Sem isso, um `TypeError: Failed to fetch dynamically imported module`
 * derrubava a árvore inteira via ErrorBoundary — inclusive quando a rede era
 * apenas instável (bug de produção real).
 */

const MAX_ATTEMPTS = 3;
const RELOAD_FLAG = 'lazy-chunk-reload-attempted';
const RELOAD_FLAG_TTL_MS = 60_000;
const OFFLINE_WAIT_MS = 10_000;

function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes('dynamically imported module') ||
    msg.includes('chunk') ||
    msg.includes('loading css chunk') ||
    msg.includes('import()') ||
    error.name === 'ChunkLoadError'
  );
}

function waitForOnline(timeoutMs: number): Promise<boolean> {
  if (navigator.onLine) return Promise.resolve(true);
  return new Promise((resolve) => {
    const onOnline = () => {
      window.removeEventListener('online', onOnline);
      resolve(true);
    };
    window.addEventListener('online', onOnline, { once: true });
    window.setTimeout(() => {
      window.removeEventListener('online', onOnline);
      resolve(navigator.onLine);
    }, timeoutMs);
  });
}

function tryReloadOnce(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_FLAG) ?? 0);
    if (Date.now() - last < RELOAD_FLAG_TTL_MS) return false;
    sessionStorage.setItem(RELOAD_FLAG, String(Date.now()));
    window.location.reload();
    return true;
  } catch {
    return false;
  }
}

// Mesma restrição do React.lazy, extraída da própria assinatura (aceita memo/forwardRef).
type LazyComponentType = Awaited<
  ReturnType<Parameters<typeof lazy>[0]>
>['default'];

export function lazyWithRetry<T extends LazyComponentType>(
  importer: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  let attempt = 0;

  const load = (): Promise<{ default: T }> =>
    importer().catch(async (error: unknown) => {
      if (!isChunkLoadError(error)) throw error;

      attempt += 1;
      if (attempt >= MAX_ATTEMPTS) {
        // Último recurso: chunks de deploy antigo — um único reload pega o novo.
        if (tryReloadOnce()) {
          return new Promise<never>(() => {});
        }
        throw error;
      }

      // Se a rede caiu, espera voltar antes da próxima tentativa.
      await waitForOnline(OFFLINE_WAIT_MS);
      return load();
    });

  return lazy(load);
}
