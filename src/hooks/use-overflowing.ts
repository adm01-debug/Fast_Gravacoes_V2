import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * Detecta se um conteiner rolavel transborda, para expor `tabIndex={0}` apenas
 * quando ha rolagem. Regiao rolavel sem descendente focavel viola a regra axe
 * `scrollable-region-focusable`; fixar tabIndex sempre cria parada de Tab extra
 * em conteudo que cabe na tela.
 */
export function useOverflowing<T extends HTMLElement>(target?: RefObject<T | null>) {
  const internalRef = useRef<T | null>(null);
  const ref = target ?? internalRef;
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const sync = () =>
      setOverflowing(node.scrollHeight > node.clientHeight + 1 || node.scrollWidth > node.clientWidth + 1);
    sync();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(sync);
    observer.observe(node);
    const content = node.firstElementChild;
    if (content) observer.observe(content);
    return () => observer.disconnect();
  }, [ref]);

  return { ref, overflowing };
}