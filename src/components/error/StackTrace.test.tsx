import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import { StackTrace } from "./StackTrace";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
});

const definePreSize = (scrollHeight: number, clientHeight: number) => {
  Object.defineProperty(HTMLPreElement.prototype, "scrollHeight", {
    configurable: true,
    get: () => scrollHeight,
  });
  Object.defineProperty(HTMLPreElement.prototype, "clientHeight", {
    configurable: true,
    get: () => clientHeight,
  });
};

describe("StackTrace", () => {
  it("torna o bloco focavel por teclado quando o trace transborda", () => {
    definePreSize(400, 100);
    render(<StackTrace text={"erro\n" + "frame ".repeat(500)} />);
    const region = screen.getByRole("region", { name: "Stack trace do erro" });
    expect(region.tagName).toBe("PRE");
    expect(region.getAttribute("tabindex")).toBe("0");
  });

  it("nao cria parada de Tab quando o trace cabe", () => {
    definePreSize(40, 100);
    render(<StackTrace text="erro curto" />);
    const region = screen.getByRole("region", { name: "Stack trace do erro" });
    expect(region.hasAttribute("tabindex")).toBe(false);
  });
});