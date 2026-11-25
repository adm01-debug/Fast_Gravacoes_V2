// Testes do aviso de rotina (etapa 014): o texto e o metadado só podem afirmar
// envio de e-mail quando o envio realmente aconteceu.
import { assertEquals, assertStringIncludes, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildAlertNotification } from "./alertNotification.ts";

Deno.test("envio concluído marca email_enviado e o tipo de deduplicação", () => {
  const n = buildAlertNotification({
    label: "archive-finished-jobs-daily",
    kind: "failure",
    delivered: true,
  });

  assertEquals(n.data.email_enviado, true);
  assertEquals(n.data.type, "cron_email_sent");
  assertEquals(n.data.severity, "critical");
  assertStringIncludes(n.body, "E-mail de alerta enviado sobre archive-finished-jobs-daily.");
});

Deno.test("sem chave de envio não afirma envio nem grava o marcador", () => {
  const n = buildAlertNotification({
    label: "job 22",
    kind: "stale",
    delivered: false,
  });

  assertEquals(n.data.email_enviado, false);
  assertEquals(n.data.type, "cron_alert_undelivered");
  assertEquals(n.data.severity, "warning");
  assertStringIncludes(n.body, "não foi enviado (serviço de e-mail não configurado)");
  assert(!n.body.includes("E-mail de alerta enviado"), "o texto não pode afirmar envio");
});

Deno.test("provedor recusando o envio é distinguido de configuração ausente", () => {
  const n = buildAlertNotification({
    label: "Rotina X",
    kind: "stale",
    delivered: false,
    providerRejected: true,
  });

  assertStringIncludes(n.body, "(o provedor de e-mail recusou o envio)");
  assertEquals(n.data.email_enviado, false);
});