// Testes do middleware comum (etapa 6) — cobrem ausência, fraude e sucesso de
// cada guarda. authenticate() é testado via injeção de dependência (offline).
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  decodeJwtAal,
  jsonError,
  jsonOk,
  requireAal2,
  requireElevatedAal2,
  requireRole,
  type AuthContext,
} from "./auth.ts";

const OPTS = { requestId: "req-1", corsHeaders: { "Access-Control-Allow-Origin": "https://app.test" } };

function ctx(partial: Partial<AuthContext> = {}): AuthContext {
  return {
    requestId: "req-1",
    userId: "u-1",
    email: "u@test",
    roles: ["operator"],
    aal: "aal1",
    isElevated: false,
    ...partial,
  };
}

// ── Envelope ─────────────────────────────────────────────────────────────────

Deno.test("jsonOk: envelope {ok:true,data,meta.requestId}", async () => {
  const res = jsonOk({ x: 1 }, OPTS);
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.ok, true);
  assertEquals(body.data, { x: 1 });
  assertEquals(body.meta.requestId, "req-1");
});

Deno.test("jsonError: envelope {ok:false,error{code,message},meta}", async () => {
  const res = jsonError("CODE", "msg", { ...OPTS, status: 418, details: { a: 1 } });
  assertEquals(res.status, 418);
  const body = await res.json();
  assertEquals(body.ok, false);
  assertEquals(body.error.code, "CODE");
  assertEquals(body.error.details, { a: 1 });
  assertEquals(body.meta.requestId, "req-1");
});

// ── requireRole: ausência, fraude, sucesso ───────────────────────────────────

Deno.test("requireRole: sucesso quando papel está na allowlist", () => {
  assertEquals(requireRole(ctx({ roles: ["admin"] }), ["admin", "manager"], OPTS), null);
});

Deno.test("requireRole: 403 FORBIDDEN com papéis exigidos em details", async () => {
  const res = requireRole(ctx({ roles: ["operator"] }), ["admin"], OPTS);
  assert(res !== null);
  assertEquals(res.status, 403);
  const body = await res.json();
  assertEquals(body.error.code, "FORBIDDEN");
  assertEquals(body.error.details.requiredRoles, ["admin"]);
});

// ── requireAal2 (etapa 7) ────────────────────────────────────────────────────

Deno.test("requireAal2: sessão aal2 passa", () => {
  assertEquals(requireAal2(ctx({ aal: "aal2" }), OPTS), null);
});

Deno.test("requireAal2: sessão aal1 recebe 403 MFA_REQUIRED", async () => {
  const res = requireAal2(ctx({ aal: "aal1" }), OPTS);
  assert(res !== null);
  assertEquals(res.status, 403);
  assertEquals((await res.json()).error.code, "MFA_REQUIRED");
});

Deno.test("requireElevatedAal2: papel ok mas AAL1 → 403 MFA_REQUIRED", async () => {
  const res = requireElevatedAal2(ctx({ roles: ["admin"], isElevated: true, aal: "aal1" }), OPTS);
  assert(res !== null);
  assertEquals((await res.json()).error.code, "MFA_REQUIRED");
});

Deno.test("requireElevatedAal2: papel insuficiente → 403 FORBIDDEN (antes do AAL)", async () => {
  const res = requireElevatedAal2(ctx({ roles: ["operator"], aal: "aal2" }), OPTS);
  assert(res !== null);
  assertEquals((await res.json()).error.code, "FORBIDDEN");
});

// ── decodeJwtAal ─────────────────────────────────────────────────────────────

function fakeJwt(payload: Record<string, unknown>): string {
  const b64url = (s: string) => btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `header.${b64url(JSON.stringify(payload))}.signature`;
}

Deno.test("decodeJwtAal: lê aal2 do payload", () => {
  assertEquals(decodeJwtAal(`Bearer ${fakeJwt({ aal: "aal2" })}`), "aal2");
});

Deno.test("decodeJwtAal: aal1 explícito e implícito", () => {
  assertEquals(decodeJwtAal(`Bearer ${fakeJwt({ aal: "aal1" })}`), "aal1");
  assertEquals(decodeJwtAal(`Bearer ${fakeJwt({ sub: "x" })}`), "aal1");
});

Deno.test("decodeJwtAal: token malformado falha conservador (aal1)", () => {
  assertEquals(decodeJwtAal("Bearer lixo.total"), "aal1");
  assertEquals(decodeJwtAal("lixo"), "aal1");
});

// ── timingSafeEqual ──────────────────────────────────────────────────────────

import { timingSafeEqual, verifyWebhook, hmacSha256Hex } from "./auth.ts";

Deno.test("timingSafeEqual: iguais true, diferentes false", () => {
  assertEquals(timingSafeEqual("abc", "abc"), true);
  assertEquals(timingSafeEqual("abc", "abd"), false);
  assertEquals(timingSafeEqual("abc", "abcd"), false);
  assertEquals(timingSafeEqual("", ""), true);
});

// ── verifyWebhook: ausência, fraude, sucesso ─────────────────────────────────

Deno.test("verifyWebhook: assinatura HMAC correta passa e devolve o corpo", async () => {
  const body = JSON.stringify({ event: "ping", n: 1 });
  const sig = await hmacSha256Hex("whsec", body);
  const req = new Request("https://fn.test/hook", {
    method: "POST",
    headers: { "x-webhook-signature": sig },
    body,
  });
  const result = await verifyWebhook(req, "whsec", OPTS);
  assert(result.ok);
  assertEquals(result.body, body);
});

Deno.test("verifyWebhook: aceita prefixo sha256= (formato GitHub-style)", async () => {
  const body = "{}";
  const sig = await hmacSha256Hex("whsec", body);
  const req = new Request("https://fn.test/hook", {
    method: "POST",
    headers: { "x-webhook-signature": `sha256=${sig}` },
    body,
  });
  assertEquals((await verifyWebhook(req, "whsec", OPTS)).ok, true);
});

Deno.test("verifyWebhook: assinatura fraudada/ausente → 401 INVALID_SIGNATURE", async () => {
  const cases: Record<string, string>[] = [{}, { "x-webhook-signature": "deadbeef" }];
  for (const headers of cases) {
    const req = new Request("https://fn.test/hook", { method: "POST", headers, body: "{}" });
    const result = await verifyWebhook(req, "whsec", OPTS);
    assert(!result.ok);
    assertEquals(result.response.status, 401);
    assertEquals((await result.response.json()).error.code, "INVALID_SIGNATURE");
  }
});

// ── authenticate (DI): ausência, fraude, infra, sucesso ─────────────────────

import { authenticate, type UserClient } from "./auth.ts";

function fakeClient(behavior: {
  user?: { id: string; email?: string } | null;
  roleError?: { message: string };
  roles?: { role: string }[];
}): UserClient {
  return {
    auth: { getUser: async () => ({ data: { user: behavior.user ?? null } }) },
    from: (_table: "user_roles") => ({
      select: (_c: "role") => ({
        eq: (_col: "user_id", _val: string) => ({
          eq: async (_col2: "is_active", _val2: boolean) => ({
            data: behavior.roleError ? null : (behavior.roles ?? []),
            error: behavior.roleError ?? null,
          }),
        }),
      }),
    }),
  };
}

function authReq(headers: Record<string, string> = {}): Request {
  return new Request("https://fn.test/op", { method: "POST", headers });
}

const AUTH_OPTS = {
  requestId: "req-2",
  corsHeaders: {},
  supabaseUrl: "https://proj.supabase.co",
  supabaseAnonKey: "anon",
};

Deno.test("authenticate: ausência de credencial → 401 UNAUTHENTICATED", async () => {
  const result = await authenticate(authReq(), AUTH_OPTS, { createUserClient: () => fakeClient({}) });
  assert(!result.ok);
  assertEquals(result.response.status, 401);
  assertEquals((await result.response.json()).error.code, "UNAUTHENTICATED");
});

Deno.test("authenticate: token fraudado/inválido (getUser null) → 401 INVALID_SESSION", async () => {
  const result = await authenticate(
    authReq({ Authorization: "Bearer falso" }),
    AUTH_OPTS,
    { createUserClient: () => fakeClient({ user: null }) },
  );
  assert(!result.ok);
  assertEquals((await result.response.json()).error.code, "INVALID_SESSION");
});

Deno.test("authenticate: falha de infra no lookup de papéis → 500 (não 403)", async () => {
  const result = await authenticate(
    authReq({ Authorization: `Bearer ${fakeJwt({ aal: "aal2" })}` }),
    AUTH_OPTS,
    { createUserClient: () => fakeClient({ user: { id: "u-1" }, roleError: { message: "boom" } }) },
  );
  assert(!result.ok);
  assertEquals(result.response.status, 500);
  assertEquals((await result.response.json()).error.code, "ROLE_LOOKUP_FAILED");
});

Deno.test("authenticate: sucesso monta ctx com papéis, AAL e isElevated", async () => {
  const result = await authenticate(
    authReq({ Authorization: `Bearer ${fakeJwt({ aal: "aal2" })}` }),
    AUTH_OPTS,
    {
      createUserClient: () =>
        fakeClient({ user: { id: "u-9", email: "adm@test" }, roles: [{ role: "admin" }] }),
    },
  );
  assert(result.ok);
  assertEquals(result.ctx.userId, "u-9");
  assertEquals(result.ctx.roles, ["admin"]);
  assertEquals(result.ctx.aal, "aal2");
  assertEquals(result.ctx.isElevated, true);
});
