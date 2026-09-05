// Structured logger for Edge Functions.
// Emits single-line JSON so Supabase/Logflare can index fields (level, fn,
// requestId, latencyMs, etc.) instead of relying on free-text `console.log`.
//
// Usage:
//   import { createLogger, getOrCreateRequestId } from "../_shared/logger.ts";
//   const requestId = getOrCreateRequestId(req);
//   const log = createLogger({ fn: "webhook-handler", requestId });
//   log.info("webhook.received", { source, event });

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  fn: string;
  requestId: string;
  [key: string]: unknown;
}

export interface Logger {
  requestId: string;
  debug(message: string, extra?: Record<string, unknown>): void;
  info(message: string, extra?: Record<string, unknown>): void;
  warn(message: string, extra?: Record<string, unknown>): void;
  error(message: string, error?: unknown, extra?: Record<string, unknown>): void;
  child(extra: Record<string, unknown>): Logger;
}

const REQUEST_ID_HEADER = "x-request-id";

export function getOrCreateRequestId(req: Request): string {
  const existing = req.headers.get(REQUEST_ID_HEADER);
  if (existing && existing.length > 0 && existing.length <= 128) return existing;
  return crypto.randomUUID();
}

function serializeError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack };
  }
  return { message: String(err) };
}

function emit(level: LogLevel, ctx: LogContext, message: string, extra?: Record<string, unknown>): void {
  const record = {
    level,
    ts: new Date().toISOString(),
    msg: message,
    ...ctx,
    ...(extra ?? {}),
  };
  const line = JSON.stringify(record);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export function createLogger(ctx: LogContext): Logger {
  return {
    requestId: ctx.requestId,
    debug: (m, e) => emit("debug", ctx, m, e),
    info: (m, e) => emit("info", ctx, m, e),
    warn: (m, e) => emit("warn", ctx, m, e),
    error: (m, err, e) => emit("error", ctx, m, { ...(e ?? {}), error: err ? serializeError(err) : undefined }),
    child: (extra) => createLogger({ ...ctx, ...extra }),
  };
}

// Adds x-request-id to response headers so callers can correlate.
export function withRequestId(headers: Record<string, string>, requestId: string): Record<string, string> {
  return { ...headers, [REQUEST_ID_HEADER]: requestId };
}
