import { assertEquals, assertNotEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

// APP_URL/EXTRA_ALLOWED_ORIGINS are read at module load time (top-level
// consts in cors.ts), so each env combination needs its own dynamic import
// with a cache-busting query param — importing "./cors.ts" twice in one
// process would reuse the first evaluation's ALLOWED_ORIGINS.
async function loadCors(env: Record<string, string | undefined>) {
  const keys = ["APP_URL", "EXTRA_ALLOWED_ORIGINS"];
  const previous = new Map(keys.map((k) => [k, Deno.env.get(k)]));
  for (const k of keys) {
    const v = env[k];
    if (v === undefined) Deno.env.delete(k);
    else Deno.env.set(k, v);
  }
  try {
    return await import(`./cors.ts?t=${crypto.randomUUID()}`);
  } finally {
    for (const k of keys) {
      const v = previous.get(k);
      if (v === undefined) Deno.env.delete(k);
      else Deno.env.set(k, v);
    }
  }
}

function req(origin?: string, method = "GET"): Request {
  const headers: Record<string, string> = {};
  if (origin !== undefined) headers.origin = origin;
  return new Request("https://example.test/fn", { method, headers });
}

Deno.test("pickAllowedOrigin: retorna o próprio origin quando está na allowlist", async () => {
  const { pickAllowedOrigin } = await loadCors({ APP_URL: "https://fastgravacoes.com.br" });
  assertEquals(pickAllowedOrigin(req("https://fastgravacoes.com.br")), "https://fastgravacoes.com.br");
});

Deno.test("pickAllowedOrigin: origin fora da allowlist cai para o primeiro permitido, nunca *", async () => {
  const { pickAllowedOrigin, ALLOWED_ORIGINS } = await loadCors({ APP_URL: "https://fastgravacoes.com.br" });
  const picked = pickAllowedOrigin(req("https://evil.example"));
  assertEquals(picked, ALLOWED_ORIGINS[0]);
  assertNotEquals(picked, "*");
});

Deno.test("pickAllowedOrigin: ausência de header Origin cai para o primeiro permitido", async () => {
  const { pickAllowedOrigin, ALLOWED_ORIGINS } = await loadCors({ APP_URL: "https://fastgravacoes.com.br" });
  assertEquals(pickAllowedOrigin(req(undefined)), ALLOWED_ORIGINS[0]);
});

Deno.test("EXTRA_ALLOWED_ORIGINS: entradas extras são aceitas quando presentes na env", async () => {
  const { pickAllowedOrigin } = await loadCors({
    APP_URL: "https://fastgravacoes.com.br",
    EXTRA_ALLOWED_ORIGINS: "https://staging.fastgravacoes.com.br, https://preview.example.com",
  });
  assertEquals(pickAllowedOrigin(req("https://staging.fastgravacoes.com.br")), "https://staging.fastgravacoes.com.br");
  assertEquals(pickAllowedOrigin(req("https://preview.example.com")), "https://preview.example.com");
});

Deno.test("getCorsHeaders: nunca emite Access-Control-Allow-Origin: * e sempre varia por Origin", async () => {
  const { getCorsHeaders } = await loadCors({ APP_URL: "https://fastgravacoes.com.br" });
  for (const origin of ["https://fastgravacoes.com.br", "https://evil.example", undefined]) {
    const headers = getCorsHeaders(req(origin));
    assertNotEquals(headers["Access-Control-Allow-Origin"], "*");
    assertEquals(headers["Vary"], "Origin");
  }
});

Deno.test("handleCorsPreflight: responde 204 só a OPTIONS, com os mesmos headers de getCorsHeaders", async () => {
  const { handleCorsPreflight, getCorsHeaders } = await loadCors({ APP_URL: "https://fastgravacoes.com.br" });
  const preflightReq = req("https://fastgravacoes.com.br", "OPTIONS");
  const res = handleCorsPreflight(preflightReq);
  assertEquals(res?.status, 204);
  assertEquals(res?.headers.get("Access-Control-Allow-Origin"), getCorsHeaders(preflightReq)["Access-Control-Allow-Origin"]);
  assertEquals(handleCorsPreflight(req("https://fastgravacoes.com.br", "GET")), null);
});
