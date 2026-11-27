import { describe, expect, it } from "vitest";
import {
  cspDirective,
  cspDirectiveLabel,
  cspPage,
  cspResource,
  formatCspTime,
  summarizeCspReports,
  type CspReport,
} from "./useCspViolationReports";

const report = (over: Partial<CspReport> = {}): CspReport => ({
  id: "1",
  document_uri: "https://app.example.com/kpis?x=1#top",
  violated_directive: "script-src-elem",
  effective_directive: "script-src",
  blocked_uri: "https://fonts.googleapis.com/css2",
  source_file: "https://app.example.com/assets/index.js",
  line_number: 42,
  disposition: "report",
  created_at: "2026-11-23T00:01:54.289502+00:00",
  ...over,
});

describe("cspDirective", () => {
  it("prefere a diretiva efetiva e cai na violada", () => {
    expect(cspDirective(report())).toBe("script-src");
    expect(cspDirective(report({ effective_directive: null }))).toBe("script-src-elem");
  });

  it("usa 'desconhecida' quando o relato não traz diretiva", () => {
    expect(cspDirective(report({ effective_directive: "  ", violated_directive: null }))).toBe(
      "desconhecida",
    );
  });
});

describe("cspDirectiveLabel", () => {
  it("traduz as diretivas conhecidas e mantém as desconhecidas", () => {
    expect(cspDirectiveLabel("connect-src")).toBe("Conexões (fetch/WebSocket)");
    expect(cspDirectiveLabel("weird-src")).toBe("weird-src");
  });
});

describe("cspResource", () => {
  it("mostra o host de uma URL", () => {
    expect(cspResource(report())).toBe("fonts.googleapis.com");
  });

  it("mantém as marcas de código inline", () => {
    expect(cspResource(report({ blocked_uri: "eval" }))).toBe("eval");
    expect(cspResource(report({ blocked_uri: "inline" }))).toBe("inline");
  });

  it("encurta origem que não é URL e trata ausência", () => {
    expect(cspResource(report({ blocked_uri: "x".repeat(80) }))).toHaveLength(60);
    expect(cspResource(report({ blocked_uri: null }))).toBe("não informado");
  });
});

describe("cspPage", () => {
  it("mostra caminho e âncora, sem domínio", () => {
    expect(cspPage(report())).toBe("/kpis#top");
  });

  it("devolve travessão quando a página não foi informada", () => {
    expect(cspPage(report({ document_uri: null }))).toBe("—");
  });
});

describe("formatCspTime", () => {
  it("formata em horário de Brasília", () => {
    expect(formatCspTime("2026-11-23T00:01:54.289502+00:00")).toMatch(/22\/11\/2026.*21:01/);
  });

  it("não inventa data inválida", () => {
    expect(formatCspTime(null)).toBe("—");
    expect(formatCspTime("nao-e-data")).toBe("—");
  });
});

describe("summarizeCspReports", () => {
  it("conta relatos, separa report-only de bloqueio efetivo e ordena reincidências", () => {
    const summary = summarizeCspReports([
      report({ id: "a", effective_directive: "connect-src", blocked_uri: "eval" }),
      report({ id: "b", effective_directive: "connect-src", disposition: "enforce" }),
      report({
        id: "c",
        effective_directive: "script-src",
        disposition: null,
        created_at: "2026-11-24T10:00:00.000Z",
      }),
    ]);

    expect(summary.total).toBe(3);
    expect(summary.reportedOnly).toBe(1);
    expect(summary.enforced).toBe(1);
    expect(summary.directives[0]).toEqual({ label: "Conexões (fetch/WebSocket)", count: 2 });
    expect(summary.resources[0]).toEqual({ label: "fonts.googleapis.com", count: 2 });
    expect(summary.lastReportAt).toBe("2026-11-24T10:00:00.000Z");
    expect(summary.rows.map((row) => row.id)).toEqual(["c", "a", "b"]);
  });

  it("resume lista vazia sem inventar valores", () => {
    expect(summarizeCspReports([])).toMatchObject({
      total: 0,
      reportedOnly: 0,
      enforced: 0,
      directives: [],
      resources: [],
      lastReportAt: null,
    });
  });
});