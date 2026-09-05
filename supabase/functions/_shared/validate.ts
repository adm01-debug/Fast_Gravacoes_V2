// Central Zod validation helper for Edge Functions.
//
// Provides a single, uniform 400 response shape so clients can rely on
// `{ error, details, requestId }` across every function.
//
// Usage:
//   import { parseOrError } from "../_shared/validate.ts";
//   const parsed = await parseOrError(schema, req, { corsHeaders, requestId });
//   if (parsed.response) return parsed.response;
//   const data = parsed.data;

import { z, ZodTypeAny } from "https://deno.land/x/zod@v3.22.4/mod.ts";

export interface ParseContext {
  corsHeaders: Record<string, string>;
  requestId?: string;
}

export type ParseResult<T> =
  | { data: T; response: null }
  | { data: null; response: Response };

async function readJson(req: Request): Promise<unknown | { __parseError: true }> {
  try {
    const text = await req.text();
    if (!text) return {};
    return JSON.parse(text);
  } catch {
    return { __parseError: true };
  }
}

function badRequest(
  message: string,
  details: unknown,
  ctx: ParseContext,
): Response {
  return new Response(
    JSON.stringify({ error: message, details, requestId: ctx.requestId }),
    {
      status: 400,
      headers: { ...ctx.corsHeaders, "Content-Type": "application/json" },
    },
  );
}

export async function parseOrError<S extends ZodTypeAny>(
  schema: S,
  input: Request | unknown,
  ctx: ParseContext,
): Promise<ParseResult<z.infer<S>>> {
  let raw: unknown = input;

  if (input instanceof Request) {
    raw = await readJson(input);
    if (raw && typeof raw === "object" && "__parseError" in (raw as Record<string, unknown>)) {
      return { data: null, response: badRequest("Invalid JSON payload", null, ctx) };
    }
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    return {
      data: null,
      response: badRequest("Validation failed", result.error.format(), ctx),
    };
  }
  return { data: result.data, response: null };
}
