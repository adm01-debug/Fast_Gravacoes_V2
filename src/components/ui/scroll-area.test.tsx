import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { act, render } from "@testing-library/react";
import { ScrollArea } from "./scroll-area";

// jsdom nao implementa ResizeObserver. O stub registra quais elementos sao
// observados para que o teste so dispare a notificacao de quem foi registrado.
class ResizeObserverStub {
  targets: Element[] = [];
  callback: () => void;

  constructor(callback: () => void) {
    this.callback = callback;
    observers.push(this);
  }
  observe(target: Element) {
    this.targets.push(target);
  }
  unobserve(target: Element) {
    this.targets = this.targets.filter((t) => t !== target);
  }
  disconnect() {
    this.targets = [];
  }
}

let observers: ResizeObserverStub[] = [];

// Simula a notificacao apenas para os observadores que registram o elemento.
const notifyResize = (target: Element) => {
  observers.forEach((observer) => {
    if (observer.targets.includes(target)) observer.callback();
  });
};

let contentHeight = 0;

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
});

beforeEach(() => {
  observers = [];
  contentHeight = 0;
  // jsdom nao faz layout: sem estes stubs todo elemento mede 0x0 e nunca transborda.
  vi.spyOn(Element.prototype, "scrollHeight", "get").mockImplementation(() => contentHeight);
  vi.spyOn(Element.prototype, "scrollWidth", "get").mockReturnValue(50);
  vi.spyOn(Element.prototype, "clientHeight", "get").mockReturnValue(100);
  vi.spyOn(Element.prototype, "clientWidth", "get").mockReturnValue(100);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
});

const viewportOf = (container: HTMLElement) =>
  container.querySelector<HTMLElement>("[data-radix-scroll-area-viewport]");

const renderScrollArea = () =>
  render(
    <ScrollArea>
      <div>conteudo</div>
    </ScrollArea>,
  );

describe("ScrollArea (axe scrollable-region-focusable)", () => {
  it("nao cria parada de Tab quando o conteudo cabe no viewport", () => {
    contentHeight = 80;
    const viewport = viewportOf(renderScrollArea().container);

    expect(viewport).not.toBeNull();
    expect(viewport?.hasAttribute("tabindex")).toBe(false);
  });

  it("torna a regiao focavel quando o conteudo transborda", () => {
    contentHeight = 500;
    const viewport = viewportOf(renderScrollArea().container);

    expect(viewport?.getAttribute("tabindex")).toBe("0");
  });

  it("torna a regiao focavel mesmo sem ResizeObserver", () => {
    vi.stubGlobal("ResizeObserver", undefined);
    contentHeight = 500;
    const viewport = viewportOf(renderScrollArea().container);

    expect(viewport?.getAttribute("tabindex")).toBe("0");
  });

  it("torna a regiao focavel quando o conteudo observado cresce depois do mount", () => {
    contentHeight = 80;
    const viewport = viewportOf(renderScrollArea().container);
    expect(viewport?.hasAttribute("tabindex")).toBe(false);

    // Cresce o conteudo: a notificacao so chega se o codigo observar o filho do
    // viewport (observar apenas o proprio viewport nao cobriria este caso).
    contentHeight = 500;
    const content = viewport?.firstElementChild;
    expect(content).toBeTruthy();
    act(() => {
      notifyResize(content as Element);
    });

    expect(viewport?.getAttribute("tabindex")).toBe("0");
  });
});