import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { checkRateLimit } from "./rateLimit.ts";

function makeSupabaseMock(existingCount: number, opts: { insertShouldFail?: boolean } = {}) {
  const inserts: unknown[] = [];
  const mock = {
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
  return { mock, inserts };
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
