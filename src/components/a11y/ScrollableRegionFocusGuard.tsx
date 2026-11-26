import { useEffect } from "react";

/**
 * Guarda global do `scrollable-region-focusable` (axe / WCAG 2.1.1).
 *
 * O produto tem dezenas de listas `overflow-y-auto` + `max-h-*` sem nenhum
 * descendente focavel: quando transbordam, o teclado nao alcanca a area
 * rolavel. Corrigir caso a caso deixava a regra dependente de alguem lembrar
 * do `tabIndex` em cada card novo, entao o guard cobre qualquer container que
 * passe a transbordar — hoje ou depois.
 *
 * Containers que ja controlam o proprio `tabIndex` (`useOverflowing` em Table,
 * RecentJobsTable, CalendarTimeline, FactoryHeatmap, OEEMachineTable) nao sao
 * tocados: o guard so age em quem ainda nao tem parada de Tab.
 */
const CANDIDATOS = '[class*="overflow"]';
const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';
const MARCA = 'data-scroll-focus-guard';

// `overflow-hidden` recorta decoracao (gradientes do login, formas do
// reset de senha) e `overflow-visible` nao rola: nenhum dos dois e area
// rolavel pelo usuario, entao nao devem virar parada de Tab.
function rolaPor(eixo: string): boolean {
  return eixo === 'auto' || eixo === 'scroll' || eixo === 'overlay';
}

function transborda(el: HTMLElement): boolean {
  const estilo = getComputedStyle(el);
  const horizontal = rolaPor(estilo.overflowX) && el.scrollWidth > el.clientWidth + 1;
  const vertical = rolaPor(estilo.overflowY) && el.scrollHeight > el.clientHeight + 1;
  return horizontal || vertical;
}

function sincronizar(el: HTMLElement): void {
  const nosso = el.getAttribute(MARCA) === 'true';

  if (!transborda(el)) {
    if (nosso) {
      el.removeAttribute('tabindex');
      el.removeAttribute(MARCA);
    }
    return;
  }

  if (nosso || el.hasAttribute('tabindex') || el.matches(FOCAVEIS) || el.querySelector(FOCAVEIS)) {
    return;
  }

  el.setAttribute('tabindex', '0');
  el.setAttribute(MARCA, 'true');
}

export function ScrollableRegionFocusGuard() {
  useEffect(() => {
    let agendado = 0;

    const varrer = () => {
      agendado = 0;
      document.querySelectorAll<HTMLElement>(CANDIDATOS).forEach(sincronizar);
    };

    const agendar = () => {
      if (agendado) return;
      agendado = window.setTimeout(varrer, 120);
    };

    agendar();
    window.addEventListener('resize', agendar);
    const observador = new MutationObserver(agendar);
    observador.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      // `class` cobre ganho/perda de overflow em re-render; os atributos que o
      // proprio guard escreve ficam de fora para nao realimentar a varredura.
      attributeFilter: ['class'],
    });

    return () => {
      window.clearTimeout(agendado);
      window.removeEventListener('resize', agendar);
      observador.disconnect();
    };
  }, []);

  return null;
}