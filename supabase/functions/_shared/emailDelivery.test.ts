import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  agruparMarcadores,
  classifyResendHttp,
  classifyResendSend,
  decidirRegistroAlerta,
  marcadorParaTodos,
  MOTIVO_SEM_CREDENCIAL,
} from "./emailDelivery.ts";

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

Deno.test("rodada sem chave avisa no app e não grava marcador de e-mail", () => {
  assertEquals(decidirRegistroAlerta(false, false), "aviso_no_app");
});

Deno.test("rodada seguinte sem avanço não repete o aviso no app", () => {
  assertEquals(decidirRegistroAlerta(false, true), "nada");
});

Deno.test("envio aceito grava o marcador mesmo com o app já avisado", () => {
  assertEquals(decidirRegistroAlerta(true, true), "confirmado");
  assertEquals(decidirRegistroAlerta(true, false), "confirmado");
});

Deno.test("agruparMarcadores: ignora linhas sem jobid e aceita user_id nulo", () => {
  const map = agruparMarcadores([
    { data: { jobid: 7 }, user_id: "a" },
    { data: { jobid: 7 }, user_id: "b" },
    { data: { jobid: null }, user_id: "a" },
    { data: null, user_id: "a" },
    { data: { jobid: 9 }, user_id: null },
  ]);
  assertEquals(map.get("7"), new Set(["a", "b"]));
  assertEquals(map.get("9"), new Set());
  assertEquals(map.size, 2);
});

Deno.test("marcadorParaTodos: linha isolada não vale como aviso ao grupo", () => {
  // Um usuário autenticado insere a própria notificação com o mesmo `jobid`;
  // com isso ele não pode calar o aviso dos demais.
  const forjado = agruparMarcadores([{ data: { jobid: 11 }, user_id: "ana" }]);
  assertEquals(marcadorParaTodos(forjado, 11, ["ana", "bruno"]), false);
  assertEquals(marcadorParaTodos(forjado, 11, ["ana"]), true);
});

Deno.test("marcadorParaTodos: vale só com todos os destinatários ativos", () => {
  const completo = agruparMarcadores([
    { data: { jobid: 11 }, user_id: "ana" },
    { data: { jobid: 11 }, user_id: "bruno" },
  ]);
  assertEquals(marcadorParaTodos(completo, 11, ["ana", "bruno"]), true);
  assertEquals(marcadorParaTodos(completo, 11, ["ana", "bruno", "carla"]), false);
});

Deno.test("marcadorParaTodos: sem destinatários ou sem marcador não avisa", () => {
  const map = agruparMarcadores([{ data: { jobid: 3 }, user_id: "ana" }]);
  assertEquals(marcadorParaTodos(map, 3, []), false);
  assertEquals(marcadorParaTodos(map, 4, ["ana"]), false);
});
