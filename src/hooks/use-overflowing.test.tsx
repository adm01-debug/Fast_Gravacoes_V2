import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useOverflowing } from "./use-overflowing";

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

const notifyResize = (target: Element) => {
  observers.forEach((observer) => {
    if (observer.targets.includes(target)) observer.callback();
  });
};

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
});

beforeEach(() => {
  observers = [];
});

const node = (scrollHeight: number, clientHeight: number) => {
  const element = document.createElement("div");
  Object.defineProperty(element, "scrollHeight", { value: scrollHeight, configurable: true });
  Object.defineProperty(element, "clientHeight", { value: clientHeight, configurable: true });
  return element;
};

describe("useOverflowing", () => {
  it("detecta transbordo a partir do tamanho medido", () => {
    const element = node(400, 100);
    const { result } = renderHook(() => useOverflowing<HTMLDivElement>({ current: element }));
    expect(result.current.overflowing).toBe(true);
  });

  it("nao marca conteudo que cabe", () => {
    const element = node(100, 400);
    const { result } = renderHook(() => useOverflowing<HTMLDivElement>({ current: element }));
    expect(result.current.overflowing).toBe(false);
  });

  it("reavalia quando o conteudo cresce depois do mount", () => {
    const element = node(100, 400);
    const { result } = renderHook(() => useOverflowing<HTMLDivElement>({ current: element }));
    expect(result.current.overflowing).toBe(false);
    Object.defineProperty(element, "scrollHeight", { value: 900, configurable: true });
    act(() => notifyResize(element));
    expect(result.current.overflowing).toBe(true);
  });
});