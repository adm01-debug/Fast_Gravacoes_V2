import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { requireCronSecret, requireUserOrCronSecret } from "./cronAuth.ts";

const CORS = { "Access-Control-Allow-Origin": "*" };
const KEY = "CRON_SECRET";

function withSecret<T>(value: string | null, fn: () => T): T {
  const previous = Deno.env.get(KEY);
  if (value === null) Deno.env.delete(KEY);
  else Deno.env.set(KEY, value);
  try {
    return fn();
  } finally {
    if (previous === undefined) Deno.env.delete(KEY);
    else Deno.env.set(KEY, previous);
  }
}

function req(headers: Record<string, string> = {}): Request {
  return new Request("https://example.test/fn", { method: "POST", headers });
}

Deno.test("aceita header x-cron-secret correto", () => {
  withSecret("s3cr3t", () => {
    assertEquals(requireCronSecret(req({ "x-cron-secret": "s3cr3t" }), { corsHeaders: CORS }), null);
  });
});

Deno.test("aceita Authorization: Bearer com o segredo", () => {
  withSecret("s3cr3t", () => {
    assertEquals(
      requireCronSecret(req({ authorization: "Bearer s3cr3t" }), { corsHeaders: CORS }),
      null,
    );
  });
});

Deno.test("rejeita segredo incorreto com 401 e CORS", async () => {
  const res = withSecret("s3cr3t", () =>
    requireCronSecret(req({ "x-cron-secret": "errado" }), { corsHeaders: CORS }));
  assert(res !== null);
  assertEquals(res.status, 401);
  assertEquals(res.headers.get("Access-Control-Allow-Origin"), "*");
  assertEquals((await res.json()).error, "Unauthorized");
});

Deno.test("rejeita ausência total de credencial quando o segredo existe", () => {
  const res = withSecret("s3cr3t", () => requireCronSecret(req(), { corsHeaders: CORS }));
  assert(res !== null);
  assertEquals(res.status, 401);
});

Deno.test("sem CRON_SECRET: fail-closed rejeita", () => {
  const res = withSecret(null, () =>
    requireCronSecret(req(), { failClosed: true, corsHeaders: CORS }));
  assert(res !== null);
  assertEquals(res.status, 401);
});

Deno.test("sem CRON_SECRET: fail-open permite (padrão)", () => {
  assertEquals(withSecret(null, () => requireCronSecret(req(), { corsHeaders: CORS })), null);
});

// Regressão: o Bearer que não resolve usuário (ex.: service_role do padrão
// dual-header Bearer + x-cron-secret dos crons versionados) deve cair na
// checagem do segredo — rejeitar aqui faria o x-cron-secret nunca ser
// avaliado e toda chamada de cron legítima virar 401.
// Versão async de withSecret — o wrapper síncrono restauraria o env antes
// da promise resolver.
async function withSecretAsync(value: string | null, fn: () => Promise<unknown>): Promise<unknown> {
  const previous = Deno.env.get(KEY);
  if (value === null) Deno.env.delete(KEY);
  else Deno.env.set(KEY, value);
  try {
    return await fn();
  } finally {
    if (previous === undefined) Deno.env.delete(KEY);
    else Deno.env.set(KEY, previous);
  }
}

Deno.test("requireUserOrCronSecret: Bearer não-usuário + x-cron-secret válido passa", async () => {
  const res = await withSecretAsync("s3cr3t", () =>
    requireUserOrCronSecret(
      req({ authorization: "Bearer service-role-key", "x-cron-secret": "s3cr3t" }),
      { supabaseUrl: "https://127.0.0.1:9", supabaseAnonKey: "anon", corsHeaders: CORS },
    ));
  assertEquals(res, null);
});

Deno.test("requireUserOrCronSecret: Bearer não-usuário sem x-cron-secret rejeita 401", async () => {
  const res = await withSecretAsync("s3cr3t", () =>
    requireUserOrCronSecret(
      req({ authorization: "Bearer service-role-key" }),
      { supabaseUrl: "https://127.0.0.1:9", supabaseAnonKey: "anon", corsHeaders: CORS },
    ));
  assert(res !== null);
  assertEquals((res as Response).status, 401);
});
