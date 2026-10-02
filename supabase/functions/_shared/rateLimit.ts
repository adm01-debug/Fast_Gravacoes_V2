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

// XFF pode trazer texto que não é IP — sem sanitizar, o cast INET quebrava
// os dois caminhos (RPC e legado) e o rate limit por IP abria bypass.
// Valores inválidos colapsam no bucket compartilhado 0.0.0.0.
const IPV4_RE =
  /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
function isValidInet(ip: string): boolean {
  if (IPV4_RE.test(ip)) return true;
  if (!ip.includes(":")) return false;
  // Só hex/colon/dot chegam ao parser — sem isso, `::1]:80/[::2` passaria no
  // new URL (válido como host+porta+path) mas quebraria o cast INET no banco.
  if (!/^[0-9a-fA-F:.]+$/.test(ip)) return false;
  // new URL valida IPv6 completo (inclui :: e notação IPv4-mapped
  // ::ffff:a.b.c.d) — regex manual cobriria só um subconjunto.
  try {
    new URL(`http://[${ip}]`);
    return true;
  } catch {
    return false;
  }
}
function sanitizeIp(raw: string | null | undefined): string {
  const ip = (raw ?? "").split(",")[0].trim();
  return isValidInet(ip) ? ip : "0.0.0.0";
}

function resolveKey(identity: RateLimitIdentity): { field: "user_id" | "user_email" | "ip_address"; value: string } {
  if (identity.userId) return { field: "user_id", value: identity.userId };
  if (identity.email) return { field: "user_email", value: identity.email };
  return { field: "ip_address", value: sanitizeIp(identity.ip) };
}

export function tooManyRequests(
  max: number,
  windowSeconds: number,
  corsHeaders: Record<string, string>,
  requestId?: string,
): Response {
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
        "Retry-After": String(windowSeconds),
        "X-RateLimit-Limit": String(max),
        "X-RateLimit-Remaining": "0",
      },
    },
  );
}

// Consulta read-only: diz se o bucket já está saturado SEM gravar linha.
// Uso: preceder um checkRateLimit gravador quando a ordem importa — ex.
// saturado, o global corta a request sem cobrar nenhum bucket; o per-IP
// grava antes e o global grava depois, então requests rejeitadas pelo
// per-IP nunca consomem a cota agregada. Fail-open igual ao checkRateLimit.
export async function isRateLimitSaturated(
  supabase: Supa,
  opts: Pick<RateLimitOptions, "endpoint" | "identity" | "max" | "windowSeconds">,
): Promise<boolean> {
  const { endpoint, identity, max, windowSeconds } = opts;
  const key = resolveKey(identity);
  const windowStart = new Date(Date.now() - windowSeconds * 1000);
  try {
    const { count, error } = await supabase
      .from("rate_limit_logs")
      .select("id", { count: "exact", head: true })
      .eq("endpoint", endpoint)
      .eq(key.field, key.value)
      .eq("is_blocked", false)
      .gte("created_at", windowStart.toISOString());
    if (error) return false;
    return (count ?? 0) >= max;
  } catch {
    return false;
  }
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
    // Caminho atômico (migration 20261001153000): count+insert na mesma
    // transação via advisory lock — elimina a corrida do SELECT+INSERT.
    // Retorna o nº na janela antes desta requisição; -1 = bloqueado.
    const { data: used, error: rpcError } = await supabase.rpc(
      "rate_limit_check_and_record",
      {
        p_endpoint: endpoint,
        p_user_id: key.field === "user_id" ? key.value : null,
        p_user_email: key.field === "user_email" ? key.value : null,
        p_ip: key.field === "ip_address" ? key.value : sanitizeIp(identity.ip),
        p_max: max,
        p_window_seconds: windowSeconds,
      },
    );

    if (!rpcError && typeof used === "number") {
      return used >= 0 ? null : tooManyRequests(max, windowSeconds, corsHeaders, requestId);
    }
    // RPC ausente (deploy sem db push) ou erro: cai no caminho legado.

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

    const legacyUsed = count ?? 0;
    if (legacyUsed >= max) {
      return tooManyRequests(max, windowSeconds, corsHeaders, requestId);
    }

    // Insert record (fire-and-forget style, but await to keep count truthful).
    const insertRow: Record<string, unknown> = {
      endpoint,
      ip_address: sanitizeIp(identity.ip), // NOT NULL
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
