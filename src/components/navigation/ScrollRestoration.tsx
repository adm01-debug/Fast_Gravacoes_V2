import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

const STORAGE_KEY = 'fg-scroll-restore';
const MAX_ENTRIES = 30;

function readMap(): Record<string, number> {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, number>;
  } catch {
    return {};
  }
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

  const save = () => {
    const map = readMap();
    map[lastKeyRef.current] = getScrollY();
    writeMap(map);
  };

  useEffect(() => {
    // scroll não borbulha — listener em capture no document pega tanto o
    // scroll do window quanto o do <main>, mesmo quando o <main> ainda
    // não existia na montagem (páginas lazy).
    const onScroll = () => save();
    document.addEventListener('scroll', onScroll, { passive: true, capture: true });
    window.addEventListener('beforeunload', save);
    return () => {
      document.removeEventListener('scroll', onScroll, { capture: true });
      window.removeEventListener('beforeunload', save);
    };
  }, []);

  useEffect(() => {
    // Guarda a posição da entrada que está saindo antes de trocar de key.
    save();
    lastKeyRef.current = location.key;

    const samePage = location.pathname === lastPathRef.current;
    lastPathRef.current = location.pathname;

    // Troca só de query (?q=, ?categoria=, ?modal=) na mesma página não
    // deve mover o scroll.
    if (samePage) return;

    if (navType === 'POP') {
      const saved = readMap()[location.key];
      if (saved !== undefined && saved > 0) {
        // Página lazy pode demorar para pintar — retenta até o conteúdo
        // ter altura suficiente (ou ~1.2s).
        let attempts = 0;
        const tryRestore = () => {
          const main = document.querySelector<HTMLElement>('main');
          const enough = (main?.scrollHeight ?? document.body.scrollHeight) >= saved;
          setScrollY(saved);
          attempts += 1;
          if (!enough && attempts < 12) requestAnimationFrame(tryRestore);
        };
        requestAnimationFrame(() => requestAnimationFrame(tryRestore));
        return;
      }
    }
    window.scrollTo(0, 0);
    document.querySelector('main')?.scrollTo(0, 0);
  }, [location.key, location.pathname, navType]);

  return null;
}
