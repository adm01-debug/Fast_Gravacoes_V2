import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { requireCronSecret } from "./cronAuth.ts";

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
