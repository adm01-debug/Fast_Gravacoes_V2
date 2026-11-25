import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { classifyResendHttp, classifyResendSend, MOTIVO_SEM_CREDENCIAL } from "./emailDelivery.ts";

Deno.test("classifyResendSend: id presente conta como enviado", () => {
  assertEquals(classifyResendSend({ data: { id: "abc-123" }, error: null }), {
    ok: true,
    reason: null,
  });
});

Deno.test("classifyResendSend: erro do provedor não conta como enviado", () => {
  const r = classifyResendSend({ data: null, error: { message: "domain is not verified" } });
  assertEquals(r.ok, false);
  assertEquals(r.reason, "domain is not verified");
});

Deno.test("classifyResendSend: sem id e sem erro não conta como enviado", () => {
  const r = classifyResendSend({ data: {}, error: null });
  assertEquals(r.ok, false);
  assertEquals(r.reason, "provedor não devolveu id da mensagem");
});

Deno.test("classifyResendSend: resposta ausente não conta como enviado", () => {
  assertEquals(classifyResendSend(undefined).ok, false);
  assertEquals(classifyResendSend(null).ok, false);
});

Deno.test("classifyResendHttp: 2xx é enviado, 4xx/5xx carrega o corpo", () => {
  assertEquals(classifyResendHttp(200, '{"id":"x"}'), { ok: true, reason: null });
  const r = classifyResendHttp(429, '{"message":"Too many requests"}');
  assertEquals(r.ok, false);
  assertEquals(r.reason, 'HTTP 429: {"message":"Too many requests"}');
  assertEquals(classifyResendHttp(500, "").reason, "HTTP 500");
});

Deno.test("motivo da falta de credencial é explícito", () => {
  assertEquals(MOTIVO_SEM_CREDENCIAL, "RESEND_API_KEY ausente");
});
