/**
 * Contratos das rotinas internas de monitoramento.
 *
 * Cobre os dois defeitos que impediam o monitor de saude de gravar qualquer
 * coisa e a coleta de metricas de contar o dia errado:
 *  - health-check responde healthy/degraded/unhealthy, mas a tabela
 *    edge_health_history tem CHECK ('pass','warn','fail');
 *  - a coleta usava meia-noite UTC como inicio do dia operacional.
 */
import { describe, it, expect } from "vitest";

import { toCheckStatus } from "../../supabase/functions/_shared/checkStatus";
import {
  localMidnightToUtc,
  startOfOperationalDayUtc,
} from "../../supabase/functions/_shared/operationalDay";

describe("toCheckStatus", () => {
  it("traduz o vocabulario do health-check para o CHECK da tabela", () => {
    expect(toCheckStatus("healthy")).toBe("pass");
    expect(toCheckStatus("degraded")).toBe("warn");
    expect(toCheckStatus("unhealthy")).toBe("fail");
  });

  it("aceita o vocabulario antigo e tolera caixa/espacos", () => {
    expect(toCheckStatus("pass")).toBe("pass");
    expect(toCheckStatus("WARN")).toBe("warn");
    expect(toCheckStatus(" Fail ")).toBe("fail");
  });

  it("trata valor desconhecido ou ausente como fail, nunca como pass", () => {
    expect(toCheckStatus(undefined)).toBe("fail");
    expect(toCheckStatus(null)).toBe("fail");
    expect(toCheckStatus("")).toBe("fail");
    expect(toCheckStatus("banana")).toBe("fail");
  });
});

describe("startOfOperationalDayUtc", () => {
  it("usa a meia-noite de Brasilia, nao a de UTC", () => {
    // 05:00Z = 02:00 BRT de 26/11 -> o dia operacional comeca 03:00Z de 26/11.
    expect(startOfOperationalDayUtc(new Date("2026-11-26T05:00:00Z")).toISOString())
      .toBe("2026-11-26T03:00:00.000Z");
  });

  it("mantem a producao da noite no dia anterior ate a meia-noite local", () => {
    // 02:30Z = 23:30 BRT de 25/11 -> ainda pertence ao dia 25/11.
    expect(startOfOperationalDayUtc(new Date("2026-11-26T02:30:00Z")).toISOString())
      .toBe("2026-11-25T03:00:00.000Z");
  });

  it("localMidnightToUtc devolve o instante UTC da meia-noite local", () => {
    expect(localMidnightToUtc(2026, 1, 1).toISOString()).toBe("2026-01-01T03:00:00.000Z");
  });
});