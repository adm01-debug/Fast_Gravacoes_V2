import { describe, it, expect, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { ScrollableRegionFocusGuard } from "./ScrollableRegionFocusGuard";

interface Opcoes {
  transborda: boolean;
  comFilhoFocavel?: boolean;
  tabindex?: string;
  overflowY?: string;
}

function criarLista({ transborda, comFilhoFocavel, tabindex, overflowY }: Opcoes): HTMLElement {
  const el = document.createElement("div");
  el.className = "overflow-y-auto max-h-[200px]";
  // jsdom nao aplica Tailwind: o valor computado precisa vir do estilo inline.
  el.style.overflowY = overflowY ?? "auto";
  Object.defineProperty(el, "scrollHeight", { value: transborda ? 400 : 100, configurable: true });
  Object.defineProperty(el, "clientHeight", { value: 100, configurable: true });
  if (comFilhoFocavel) {
    const botao = document.createElement("button");
    botao.textContent = "acao";
    el.appendChild(botao);
  }
  if (tabindex !== undefined) el.setAttribute("tabindex", tabindex);
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("ScrollableRegionFocusGuard", () => {
  it("torna a regiao rolavel alcancavel por teclado quando ela transborda", async () => {
    const lista = criarLista({ transborda: true });

    render(<ScrollableRegionFocusGuard />);

    await waitFor(() => expect(lista.getAttribute("tabindex")).toBe("0"));
  });

  it("nao adiciona parada de Tab quando existe filho focavel na lista", async () => {
    const lista = criarLista({ transborda: true, comFilhoFocavel: true });

    render(<ScrollableRegionFocusGuard />);

    await waitFor(() => expect(document.body.contains(lista)).toBe(true));
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(lista.hasAttribute("tabindex")).toBe(false);
  });

  it("nao sobrescreve um tabIndex definido pelo componente", async () => {
    const lista = criarLista({ transborda: true, tabindex: "-1" });

    render(<ScrollableRegionFocusGuard />);

    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(lista.getAttribute("tabindex")).toBe("-1");
  });

  it("remove a parada de Tab quando a lista deixa de transbordar", async () => {
      const lista = criarLista({ transborda: true });

    render(<ScrollableRegionFocusGuard />);
    await waitFor(() => expect(lista.getAttribute("tabindex")).toBe("0"));

    Object.defineProperty(lista, "scrollHeight", { value: 100, configurable: true });
      window.dispatchEvent(new Event("resize"));

    await waitFor(() => expect(lista.hasAttribute("tabindex")).toBe(false));
  });

    it("nao cria parada de Tab em decoracao recortada por overflow-hidden", async () => {
      const decoracao = criarLista({ transborda: true, overflowY: "hidden" });

      render(<ScrollableRegionFocusGuard />);

      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(decoracao.hasAttribute("tabindex")).toBe(false);
    });
});