import { useEffect, useRef, useState, type MutableRefObject } from "react";

/**
 * Detecta se um conteiner rolavel transborda, para expor `tabIndex={0}` apenas
 * quando ha rolagem. Regiao rolavel sem descendente focavel viola a regra axe
 * `scrollable-region-focusable`; fixar tabIndex sempre cria parada de Tab extra
 * em conteudo que cabe na tela.
 */
export function useOverflowing<T extends HTMLElement>(target?: MutableRefObject<T | null>) {
  const internalRef = useRef<T | null>(null);
  const ref = target ?? internalRef;
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
      let observer: ResizeObserver | null = null;
      let mutacao: MutationObserver | null = null;
      let agendado = 0;

      const sync = (node: T) =>
      setOverflowing(node.scrollHeight > node.clientHeight + 1 || node.scrollWidth > node.clientWidth + 1);

      // O conteiner pode nao existir no primeiro render (skeleton enquanto os
      // dados carregam). Sem re-tentar depois, a area rolavel nasce sem parada de
      // Tab e o teclado nunca a alcanca.
      const conectar = (): boolean => {
        const node = ref.current;
        if (!node) return false;
        sync(node);
        if (typeof ResizeObserver === "undefined") return true;
        observer = new ResizeObserver(() => sync(node));
        observer.observe(node);
        const content = node.firstElementChild;
        if (content) observer.observe(content);
        return true;
      };

      const pararMutacao = () => {
        mutacao?.disconnect();
        mutacao = null;
      };

      if (!conectar() && typeof MutationObserver !== "undefined") {
        mutacao = new MutationObserver(() => {
          if (agendado) return;
          agendado = window.setTimeout(() => {
            agendado = 0;
            if (conectar()) pararMutacao();
          }, 60);
        });
        mutacao.observe(document.body, { childList: true, subtree: true });
      }

      return () => {
        if (agendado) window.clearTimeout(agendado);
        observer?.disconnect();
        pararMutacao();
      };
  }, [ref]);

  return { ref, overflowing };
}