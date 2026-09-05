import { assertEquals, assertMatch } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createLogger, getOrCreateRequestId, withRequestId } from "./logger.ts";

Deno.test("getOrCreateRequestId reuses valid header", () => {
  const req = new Request("http://x", { headers: { "x-request-id": "abc-123" } });
  assertEquals(getOrCreateRequestId(req), "abc-123");
});

Deno.test("getOrCreateRequestId generates uuid when missing", () => {
  const req = new Request("http://x");
  const id = getOrCreateRequestId(req);
  assertMatch(id, /^[0-9a-f-]{36}$/);
});

Deno.test("getOrCreateRequestId ignores oversize header", () => {
  const big = "x".repeat(200);
  const req = new Request("http://x", { headers: { "x-request-id": big } });
  const id = getOrCreateRequestId(req);
  assertMatch(id, /^[0-9a-f-]{36}$/);
});

Deno.test("logger emits structured JSON", () => {
  const captured: string[] = [];
  const origLog = console.log;
  console.log = (line: string) => captured.push(line);
  try {
    const log = createLogger({ fn: "test-fn", requestId: "rid-1" });
    log.info("hello", { userId: "u1" });
    const parsed = JSON.parse(captured[0]);
    assertEquals(parsed.level, "info");
    assertEquals(parsed.fn, "test-fn");
    assertEquals(parsed.requestId, "rid-1");
    assertEquals(parsed.msg, "hello");
    assertEquals(parsed.userId, "u1");
  } finally {
    console.log = origLog;
  }
});

Deno.test("logger.error serializes Error", () => {
  const captured: string[] = [];
  const origErr = console.error;
  console.error = (line: string) => captured.push(line);
  try {
    const log = createLogger({ fn: "test-fn", requestId: "rid-2" });
    log.error("boom", new Error("bad thing"));
    const parsed = JSON.parse(captured[0]);
    assertEquals(parsed.level, "error");
    assertEquals(parsed.error.name, "Error");
    assertEquals(parsed.error.message, "bad thing");
  } finally {
    console.error = origErr;
  }
});

Deno.test("withRequestId adds header", () => {
  const h = withRequestId({ "Content-Type": "application/json" }, "rid-9");
  assertEquals(h["x-request-id"], "rid-9");
  assertEquals(h["Content-Type"], "application/json");
});
