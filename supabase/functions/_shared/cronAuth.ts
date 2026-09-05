/**
 * Shared guard for internal/cron edge functions that run with the service-role
 * key and are NOT meant to be reachable by end users.
 *
 *  - If the `CRON_SECRET` environment variable is set, callers MUST send a
 *    matching `x-cron-secret` header (or `Authorization: Bearer <secret>`),
 *    otherwise the request is rejected with 401.
 *  - If `CRON_SECRET` is not configured:
 *      - `failClosed: true`  → reject with 401 (use for DESTRUCTIVE functions,
 *        so an unconfigured deployment can never run them unauthenticated).
 *      - `failClosed: false` (default) → allow but log a warning, so existing
 *        non-destructive deployments keep working while operators lock down.
 *
 * Returns `null` when the request may proceed, or a `Response` (401) to return
 * immediately when it must be rejected. Any `corsHeaders` provided are attached
 * to that 401 so browser callers receive a proper response instead of a CORS error.
 */
export function requireCronSecret(
  req: Request,
  options: { failClosed?: boolean; corsHeaders?: Record<string, string> } = {}
): Response | null {
  const { failClosed = false, corsHeaders = {} } = options;
  const expected = Deno.env.get("CRON_SECRET");

  const reject = () =>
    new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (!expected) {
    if (failClosed) {
      console.error(
        "[cronAuth] CRON_SECRET is not configured and this function fails closed — rejecting request."
      );
      return reject();
    }
    console.warn(
      "[cronAuth] CRON_SECRET is not configured — this function is unauthenticated. " +
        "Set CRON_SECRET and send it via the x-cron-secret header to lock it down."
    );
    return null;
  }

  const headerSecret = req.headers.get("x-cron-secret");
  const authHeader = req.headers.get("authorization") || "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (headerSecret === expected || bearer === expected) {
    return null;
  }

  return reject();
}

/**
 * Guard for functions that are both (a) invoked by the app on behalf of any
 * signed-in user (e.g. `supabase.functions.invoke(...)`, which forwards the
 * caller's session as `Authorization: Bearer <access_token>`) and (b) meant
 * to also run unattended from a scheduler. Accepts either a valid Supabase
 * user session OR the cron secret — never a bare "no header" pass-through.
 *
 * Needs a service-role client to verify the token (auth.getUser via an
 * anon-key client scoped to the caller's Authorization header).
 */
export async function requireUserOrCronSecret(
  req: Request,
  options: { supabaseUrl: string; supabaseAnonKey: string; corsHeaders?: Record<string, string> }
): Promise<Response | null> {
  const { supabaseUrl, supabaseAnonKey, corsHeaders = {} } = options;
  const authHeader = req.headers.get("Authorization");

  if (authHeader) {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (user) return null;
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return requireCronSecret(req, { failClosed: true, corsHeaders });
}
