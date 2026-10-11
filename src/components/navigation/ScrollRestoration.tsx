import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

const STORAGE_KEY = 'fg-scroll-restore';
const MAX_ENTRIES = 30;

// Mapa cacheado em memória — parse/serialize do sessionStorage a cada
// evento de scroll rodava várias vezes por segundo na thread principal.
let cachedMap: Record<string, number> | null = null;
let writeTimer = 0;

function readMap(): Record<string, number> {
  if (cachedMap) return cachedMap;
  try {
    cachedMap = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, number>;
  } catch {
    cachedMap = {};
  }
  return cachedMap;
}

function writeMap(map: Record<string, number>) {
  try {
    const keys = Object.keys(map);
    if (keys.length > MAX_ENTRIES) {
      for (const key of keys.slice(0, keys.length - MAX_ENTRIES)) delete map[key];
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // sessionStorage indisponível — restauração desligada
  }
}

function flushWrites() {
  if (writeTimer) {
    window.clearTimeout(writeTimer);
    writeTimer = 0;
  }
  writeMap(readMap());
}

function getScrollY(): number {
  const main = document.querySelector<HTMLElement>('main');
  if (main && main.scrollHeight > main.clientHeight) return main.scrollTop;
  return window.scrollY;
}

function setScrollY(y: number) {
  const main = document.querySelector<HTMLElement>('main');
  if (main && main.scrollHeight > main.clientHeight) {
    main.scrollTop = y;
  } else {
    window.scrollTo(0, y);
  }
}

/**
 * Restaura a posição de scroll ao voltar (POP): cada location.key guarda
 * seu scrollY; num POP a posição salva é reaplicada após a pintura, e uma
 * navegação nova (PUSH) volta ao topo.
 */
export function ScrollRestoration() {
  const location = useLocation();
  const navType = useNavigationType();
  const lastKeyRef = useRef<string>(location.key);
  const lastPathRef = useRef<string>(location.pathname);
  const firstRunRef = useRef(true);

  const save = () => {
    const map = readMap();
    map[lastKeyRef.current] = getScrollY();
    writeMap(map);
  };

  useEffect(() => {
    // scroll não borbulha — listener em capture no document pega tanto o
    // scroll do window quanto o do <main>, mesmo quando o <main> ainda
    // não existia na montagem (páginas lazy). Escrita no storage é
    // debounced; o flush acontece na saída da rota e no unload.
    const onScroll = () => {
      readMap()[lastKeyRef.current] = getScrollY();
      if (!writeTimer) writeTimer = window.setTimeout(() => { writeTimer = 0; writeMap(readMap()); }, 150);
    };
    document.addEventListener('scroll', onScroll, { passive: true, capture: true });
    window.addEventListener('beforeunload', flushWrites);
    return () => {
      document.removeEventListener('scroll', onScroll, { capture: true });
      window.removeEventListener('beforeunload', flushWrites);
      flushWrites();
    };
  }, []);

  useEffect(() => {
    // Na montagem (reload), não há entrada saindo — o save() aqui
    // sobrescreveria com a posição atual (zero) o offset que o
    // beforeunload persistiu, antes da restauração poder lê-lo.
    const isFirst = firstRunRef.current;
    firstRunRef.current = false;
    if (!isFirst) {
      // Guarda a posição da entrada que está saindo antes de trocar de key.
      flushWrites();
      save();
      flushWrites();
      lastKeyRef.current = location.key;
    }

    const samePage = !isFirst && location.pathname === lastPathRef.current;
    lastPathRef.current = location.pathname;

    // Troca só de query (?q=, ?categoria=, ?modal=) na mesma página não
    // deve mover o scroll.
    if (samePage) return;

    let rafId = 0;
    let cancelled = false;

    if (navType === 'POP') {
      const saved = readMap()[location.key];
      if (saved !== undefined && saved > 0) {
        // Página lazy pode demorar para pintar — retenta por ~1.5s até
        // alcançar de fato o offset salvo (scrollTop real, não só altura
        // do conteúdo). Só aceita o offset num <main> que NÃO é o da rota
        // que sai: o AnimatePresence mode="wait" mantém o <main> antigo
        // montado por ~350ms, e parar nele deixaria o destino no topo. O
        // <main> novo precisa ser confirmado em DUAS verificações seguidas
        // (mesmo elemento) para não parar numa pintura intermediária.
        // Frames pendentes são cancelados se a rota mudar no meio para
        // não aplicar offset de outra página.
        const deadline = performance.now() + 1500;
        const outgoingMain = document.querySelector<HTMLElement>('main');
        let seenEl: Element | null = null;
        const tryRestore = () => {
          if (cancelled) return;
          setScrollY(saved);
          const main = document.querySelector<HTMLElement>('main');
          const achieved = (main && main.scrollHeight > main.clientHeight) ? main.scrollTop : window.scrollY;
          if (main && main !== outgoingMain && main === seenEl && achieved >= saved - 2) return;
          seenEl = main;
          if (performance.now() < deadline) rafId = requestAnimationFrame(tryRestore);
        };
        rafId = requestAnimationFrame(() => { rafId = requestAnimationFrame(tryRestore); });
        return () => { cancelled = true; cancelAnimationFrame(rafId); };
      }
    }
    window.scrollTo(0, 0);
    document.querySelector('main')?.scrollTo(0, 0);
    return () => { cancelled = true; cancelAnimationFrame(rafId); };
  }, [location.key, location.pathname, navType]);

  return null;
}
