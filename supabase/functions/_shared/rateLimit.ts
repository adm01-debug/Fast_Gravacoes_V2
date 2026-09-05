// Ad-hoc rate limiter for Edge Functions.
//
// Uses the existing `public.rate_limit_logs` table as a shared counter store.
// This is a fixed-window limiter (not sliding) — good enough for abuse
// mitigation on public endpoints. For high-precision limits, migrate to a
// dedicated primitive later.
//
// Behavior:
//   - Counts requests per (endpoint, identity) within `windowSeconds`.
//   - Identity is resolved as: userId > email > ip > "anonymous".
//   - When the count exceeds `max`, returns a rate-limit response.
//   - Fails OPEN on infra errors (we prefer availability to over-blocking on
//     transient DB failures; the abuse cost is bounded by the next window).
//
// Usage:
//   import { checkRateLimit } from "../_shared/rateLimit.ts";
//   const limited = await checkRateLimit(supabase, {
//     endpoint: "webhook-handler",
//     identity: { ip: req.headers.get("x-forwarded-for") },
//     max: 60,
//     windowSeconds: 60,
//     corsHeaders,
//     requestId,
//   });
//   if (limited) return limited;

// deno-lint-ignore no-explicit-any
type Supa = any;

export interface RateLimitIdentity {
  userId?: string | null;
  email?: string | null;
  ip?: string | null;
}

export interface RateLimitOptions {
  endpoint: string;
  identity: RateLimitIdentity;
  max: number;
  windowSeconds: number;
  corsHeaders: Record<string, string>;
  requestId?: string;
}

function resolveKey(identity: RateLimitIdentity): { field: "user_id" | "user_email" | "ip_address"; value: string } {
  if (identity.userId) return { field: "user_id", value: identity.userId };
  if (identity.email) return { field: "user_email", value: identity.email };
  const ip = (identity.ip ?? "").split(",")[0].trim() || "0.0.0.0";
  return { field: "ip_address", value: ip };
}

export async function checkRateLimit(
  supabase: Supa,
  opts: RateLimitOptions,
): Promise<Response | null> {
  const { endpoint, identity, max, windowSeconds, corsHeaders, requestId } = opts;
  const key = resolveKey(identity);
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowSeconds * 1000);

  try {
    const { count, error } = await supabase
      .from("rate_limit_logs")
      .select("id", { count: "exact", head: true })
      .eq("endpoint", endpoint)
      .eq(key.field, key.value)
      .gte("created_at", windowStart.toISOString());

    if (error) {
      // Fail open on infra error.
      return null;
    }

    const used = count ?? 0;
    if (used >= max) {
      const retryAfter = windowSeconds;
      return new Response(
        JSON.stringify({
          error: "Too Many Requests",
          message: `Limite de ${max} requisições por ${windowSeconds}s excedido.`,
          requestId,
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Retry-After": String(retryAfter),
            "X-RateLimit-Limit": String(max),
            "X-RateLimit-Remaining": "0",
          },
        },
      );
    }

    // Insert record (fire-and-forget style, but await to keep count truthful).
    const insertRow: Record<string, unknown> = {
      endpoint,
      request_count: 1,
      window_start: windowStart.toISOString(),
      window_end: now.toISOString(),
      is_blocked: false,
    };
    insertRow[key.field] = key.value;

    await supabase.from("rate_limit_logs").insert(insertRow);

    return null;
  } catch {
    return null; // fail open
  }
}
