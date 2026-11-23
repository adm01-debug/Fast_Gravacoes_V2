import { describe, it, expect, vi, beforeAll } from "vitest";
import { render } from "@testing-library/react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "./resizable";

// jsdom nao implementa ResizeObserver e o react-resizable-panels v4 constroi
// um ao montar o Group. Browsers reais sempre tem a API; aqui basta um stub.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
});

const renderGroup = (orientation?: "horizontal" | "vertical") =>
  render(
    <ResizablePanelGroup orientation={orientation} data-testid="group">
      <ResizablePanel defaultSize={50} data-testid="panel-a">
        A
      </ResizablePanel>
      <ResizableHandle withHandle data-testid="handle" />
      <ResizablePanel defaultSize={50} data-testid="panel-b">
        B
      </ResizablePanel>
    </ResizablePanelGroup>,
  );

describe("resizable (react-resizable-panels v4)", () => {
  it("renderiza paineis e divisor sem quebrar", () => {
    const { getByTestId } = renderGroup();
    expect(getByTestId("group")).toBeTruthy();
    expect(getByTestId("panel-a")).toBeTruthy();
    expect(getByTestId("panel-b")).toBeTruthy();
    expect(getByTestId("handle")).toBeTruthy();
  });

  // O v4 nao expoe mais data-panel-group-direction: a orientacao que o divisor
  // usa para virar linha (e nao coluna) chega via aria-orientation invertido.
  it("grupo vertical marca o divisor como aria-orientation=horizontal", () => {
    const { getByTestId } = renderGroup("vertical");
    const group = getByTestId("group");
    const handle = getByTestId("handle");

    expect(group.getAttribute("data-group")).toBe("true");
    expect(handle.getAttribute("aria-orientation")).toBe("horizontal");
    expect(group.contains(handle)).toBe(true);
  });

  it("grupo horizontal marca o divisor como aria-orientation=vertical", () => {
    const { getByTestId } = renderGroup("horizontal");
    expect(getByTestId("group").getAttribute("data-group")).toBe("true");
    expect(getByTestId("handle").getAttribute("aria-orientation")).toBe("vertical");
  });

  it("divisor carrega as classes variantes de orientacao que o Tailwind compila", () => {
    const cls = renderGroup("vertical").getByTestId("handle").className;
    expect(cls).toContain("aria-[orientation=horizontal]:h-px");
    expect(cls).toContain("aria-[orientation=horizontal]:w-full");
    expect(cls).toContain("[&>div]:aria-[orientation=horizontal]:rotate-90");
    expect(cls).not.toContain("data-panel-group-direction");
  });
});