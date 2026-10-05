import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { checkRateLimit } from "./rateLimit.ts";

function makeSupabaseMock(
  existingCount: number,
  opts: { insertShouldFail?: boolean; rpcUsed?: number | null } = {},
) {
  const inserts: unknown[] = [];
  const rpcCalls: { fn: string; params: Record<string, unknown> }[] = [];
  const mock = {
    rpc(fn: string, params: Record<string, unknown>) {
      rpcCalls.push({ fn, params });
      // rpcUsed simula a migration aplicada: número = usados na janela, -1 =
      // bloqueado. Default null simula função ausente (deploy sem db push)
      // e exercita o caminho legado.
      if (opts.rpcUsed === undefined) {
        return Promise.resolve({ data: null, error: new Error("function missing") });
      }
      return Promise.resolve({ data: opts.rpcUsed, error: null });
    },
    from(_table: string) {
      return {
        select(_cols: string, _opts?: unknown) {
          return {
            eq() { return this; },
            gte() { return Promise.resolve({ count: existingCount, error: null }); },
          };
        },
        insert(row: unknown) {
          inserts.push(row);
          return Promise.resolve({ error: opts.insertShouldFail ? new Error("fail") : null });
        },
      };
    },
  };
  return { mock, inserts, rpcCalls };
}

const CORS = { "Access-Control-Allow-Origin": "*" };

Deno.test("checkRateLimit returns null when under limit", async () => {
  const { mock, inserts } = makeSupabaseMock(3);
  const r = await checkRateLimit(mock, {
    endpoint: "test-fn",
    identity: { ip: "1.2.3.4" },
    max: 10,
    windowSeconds: 60,
    corsHeaders: CORS,
  });
  assertEquals(r, null);
  assertEquals(inserts.length, 1);
});

Deno.test("checkRateLimit returns 429 when at/over limit", async () => {
  const { mock } = makeSupabaseMock(10);
  const r = await checkRateLimit(mock, {
    endpoint: "test-fn",
    identity: { userId: "u-1" },
    max: 10,
    windowSeconds: 30,
    corsHeaders: CORS,
    requestId: "rid-42",
  });
  assert(r !== null);
  assertEquals(r.status, 429);
  assertEquals(r.headers.get("Retry-After"), "30");
  assertEquals(r.headers.get("X-RateLimit-Limit"), "10");
  const body = await r.json();
  assertEquals(body.requestId, "rid-42");
});

Deno.test("checkRateLimit fails open on infra error", async () => {
  const badMock = {
    from() {
      throw new Error("db down");
    },
  };
  const r = await checkRateLimit(badMock, {
    endpoint: "test-fn",
    identity: { ip: "9.9.9.9" },
    max: 1,
    windowSeconds: 10,
    corsHeaders: CORS,
  });
  assertEquals(r, null);
});

Deno.test("checkRateLimit atomic path: allows under limit without legacy insert", async () => {
  const { mock, inserts, rpcCalls } = makeSupabaseMock(0, { rpcUsed: 2 });
  const r = await checkRateLimit(mock, {
    endpoint: "test-fn",
    identity: { ip: "1.2.3.4" },
    max: 10,
    windowSeconds: 60,
    corsHeaders: CORS,
  });
  assertEquals(r, null);
  assertEquals(inserts.length, 0); // RPC já gravou — não duplica
  // Garante que o caminho atômico levou identidade e cota corretas pro banco.
  assertEquals(rpcCalls.length, 1);
  assertEquals(rpcCalls[0].fn, "rate_limit_check_and_record");
  assertEquals(rpcCalls[0].params, {
    p_endpoint: "test-fn",
    p_user_id: null,
    p_user_email: null,
    p_ip: "1.2.3.4",
    p_max: 10,
    p_window_seconds: 60,
  });
});

Deno.test("checkRateLimit atomic path: 429 when RPC returns -1", async () => {
  const { mock, inserts, rpcCalls } = makeSupabaseMock(0, { rpcUsed: -1 });
  const r = await checkRateLimit(mock, {
    endpoint: "test-fn",
    identity: { userId: "u-9" },
    max: 10,
    windowSeconds: 60,
    corsHeaders: CORS,
  });
  assert(r !== null);
  assertEquals(r.status, 429);
  assertEquals(inserts.length, 0);
  assertEquals(rpcCalls.length, 1);
  assertEquals(rpcCalls[0].fn, "rate_limit_check_and_record");
  assertEquals(rpcCalls[0].params.p_user_id, "u-9");
  assertEquals(rpcCalls[0].params.p_ip, "0.0.0.0"); // IP ausente → bucket compartilhado
});

Deno.test("resolveKey prefers userId over email over ip", async () => {
  // Coverage via inserted row shape.
  const { mock, inserts } = makeSupabaseMock(0);
  await checkRateLimit(mock, {
    endpoint: "x",
    identity: { userId: "u1", email: "a@b.c", ip: "1.1.1.1" },
    max: 100,
    windowSeconds: 60,
    corsHeaders: CORS,
  });
  const row = inserts[0] as Record<string, unknown>;
  assertEquals(row.user_id, "u1");
  assertEquals(row.user_email, undefined);
});

Deno.test("checkRateLimit collapses malformed forwarded IP into shared bucket", async () => {
  const { mock, inserts } = makeSupabaseMock(0);
  const r = await checkRateLimit(mock, {
    endpoint: "x",
    // lixo que o new URL aceitaria como host+porta+path mas não é INET
    identity: { ip: "::1]:80/[::2" },
    max: 100,
    windowSeconds: 60,
    corsHeaders: CORS,
  });
  assertEquals(r, null);
  const row = inserts[0] as Record<string, unknown>;
  assertEquals(row.ip_address, "0.0.0.0");
});
