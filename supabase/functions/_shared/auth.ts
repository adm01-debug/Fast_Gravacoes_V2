// Etapa 6 do plano-mestre 10/10 — middleware comum de segurança Edge.
//
// Composição recomendada em toda function:
//   const preflight = handleCorsPreflight(req); if (preflight) return preflight;
//   const requestId = getOrCreateRequestId(req);
//   const cors = withRequestId(getCorsHeaders(req), requestId);
//   const auth = await authenticate(req, { supabaseUrl, supabaseAnonKey, requestId, corsHeaders: cors });
//   if (!auth.ok) return auth.response;              // 401 ausência/fraude
//   const forbidden = requireRole(auth.ctx, ['admin']); if (forbidden) return forbidden;
//   const mfa = requireAal2(auth.ctx); if (mfa) return mfa;  // Etapa 7: papéis elevados
//   ... handler ...
//   return jsonOk(data, { requestId, corsHeaders: cors });
//
// Envelope padronizado (premissa do plano-mestre):
//   sucesso: { ok: true,  data, meta: { requestId } }
//   erro:    { ok: false, error: { code, message, details? }, meta: { requestId } }
//
// A dependência externa (supabase-js) é importada dinamicamente e injetável
// em `authenticate`, mantendo este módulo testável offline (ver auth.test.ts).

export type AppRole = "admin" | "manager" | "coordinator" | "operator";

/** Papéis que o plano-mestre exige em AAL2 (MFA verificado). Etapa 7. */
export const ELEVATED_ROLES: readonly AppRole[] = ["admin", "manager", "coordinator"];

export type Aal = "aal1" | "aal2";

export interface AuthContext {
  requestId: string;
  userId: string;
  email: string | null;
  /** Papéis ativos (is_active) do usuário — fonte: public.user_roles. */
  roles: AppRole[];
  /** Nível de garantia da SESSÃO atual, lido do claim `aal` do access token. */
  aal: Aal;
  isElevated: boolean;
}

export type AuthResult = { ok: true; ctx: AuthContext } | { ok: false; response: Response };

export interface EnvelopeOptions {
  requestId: string;
  corsHeaders: Record<string, string>;
}

// ── Envelope HTTP padronizado ────────────────────────────────────────────────

export function jsonOk(
  data: unknown,
  opts: EnvelopeOptions = { requestId: "", corsHeaders: {} },
): Response {
  return new Response(
    JSON.stringify({ ok: true, data, meta: { requestId: opts.requestId } }),
    {
      status: 200,
      headers: { ...opts.corsHeaders, "Content-Type": "application/json" },
    },
  );
}

export function jsonError(
  code: string,
  message: string,
  opts: EnvelopeOptions & { status?: number; details?: unknown } = {
    requestId: "",
    corsHeaders: {},
  },
): Response {
  return new Response(
    JSON.stringify({
      ok: false,
      error: { code, message, ...(opts.details !== undefined ? { details: opts.details } : {}) },
      meta: { requestId: opts.requestId },
    }),
    {
      status: opts.status ?? 400,
      headers: { ...opts.corsHeaders, "Content-Type": "application/json" },
    },
  );
}

// ── Guards (funções puras sobre AuthContext — ausência, fraude, sucesso) ────

/** 403 quando nenhum papel do usuário está na allowlist. null = pode prosseguir. */
export function requireRole(
  ctx: AuthContext,
  allowed: readonly AppRole[],
  opts: EnvelopeOptions,
): Response | null {
  if (ctx.roles.some((r) => allowed.includes(r))) return null;
  return jsonError("FORBIDDEN", "Seu perfil não tem permissão para esta operação.", {
    ...opts,
    status: 403,
    details: { requiredRoles: allowed },
  });
}

/**
 * Etapa 7 — sessões AAL1 não podem executar operações sensíveis.
 * 403 MFA_REQUIRED quando o nível de garantia da sessão não é aal2.
 */
export function requireAal2(ctx: AuthContext, opts: EnvelopeOptions): Response | null {
  if (ctx.aal === "aal2") return null;
  return jsonError(
    "MFA_REQUIRED",
    "Esta operação exige verificação em duas etapas (MFA). Autentique-se novamente e conclua o desafio MFA.",
    { ...opts, status: 403 },
  );
}

/** Combinação canônica para functions administrativas: papel elevado + AAL2. */
export function requireElevatedAal2(
  ctx: AuthContext,
  opts: EnvelopeOptions,
  allowed: readonly AppRole[] = ELEVATED_ROLES,
): Response | null {
  return requireRole(ctx, allowed, opts) ?? requireAal2(ctx, opts);
}

// ── Decodificação do claim AAL (pós-validação — seguro sem verificar assinatura) ──

/** Extrai `aal` do payload do JWT. Falha conservadora: aal1. */
export function decodeJwtAal(authHeader: string): Aal {
  try {
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const payloadB64 = token.split(".")[1];
    if (!payloadB64) return "aal1";
    const json = atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(json) as { aal?: string };
    return payload.aal === "aal2" ? "aal2" : "aal1";
  } catch {
    return "aal1";
  }
}

// ── Autenticação (IO) ────────────────────────────────────────────────────────

export interface UserLike {
  id: string;
  email?: string | null;
}

/** Superfície de supabase-js usada por `authenticate` (injetável em testes). */
export interface UserClient {
  auth: { getUser(): Promise<{ data: { user: UserLike | null } }> };
  from(table: "user_roles"): {
    select(columns: "role"): {
      eq(column: "user_id", value: string): {
        eq(column: "is_active", value: boolean): Promise<{
          data: { role: string }[] | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
}

export interface AuthenticateOptions extends EnvelopeOptions {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

/**
 * Valida o Bearer token com o Supabase Auth (auth.getUser — valida assinatura
 * e expiração), carrega os papéis ativos de `public.user_roles` e o AAL da
 * sessão. Retorna 401 em ausência de credencial ou sessão inválida/fraudada;
 * 500 quando a verificação de papel falha por infra (falha de infra NUNCA é
 * reportada como negação de permissão).
 */
export async function authenticate(
  req: Request,
  opts: AuthenticateOptions,
  deps: { createUserClient?: (url: string, anonKey: string, authHeader: string) => UserClient } = {},
): Promise<AuthResult> {
  const { requestId, corsHeaders, supabaseUrl, supabaseAnonKey } = opts;
  const authHeader = req.headers.get("Authorization");

  if (!authHeader) {
    return {
      ok: false,
      response: jsonError("UNAUTHENTICATED", "Credencial de acesso ausente.", {
        requestId,
        corsHeaders,
        status: 401,
      }),
    };
  }

  let userClient: UserClient;
  if (deps.createUserClient) {
    userClient = deps.createUserClient(supabaseUrl, supabaseAnonKey, authHeader);
  } else {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.49.1");
    userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    }) as unknown as UserClient;
  }

  const { data: { user } } = await userClient.auth.getUser();
  if (!user) {
    return {
      ok: false,
      response: jsonError("INVALID_SESSION", "Sessão inválida ou expirada.", {
        requestId,
        corsHeaders,
        status: 401,
      }),
    };
  }

  const { data: roleRows, error: roleError } = await userClient
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("is_active", true);

  if (roleError) {
    // Falha de infraestrutura ≠ negação de permissão.
    return {
      ok: false,
      response: jsonError("ROLE_LOOKUP_FAILED", "Falha ao verificar permissões.", {
        requestId,
        corsHeaders,
        status: 500,
        details: { reason: roleError.message },
      }),
    };
  }

  const roles = (roleRows ?? []).map((r) => r.role as AppRole);
  return {
    ok: true,
    ctx: {
      requestId,
      userId: user.id,
      email: user.email ?? null,
      roles,
      aal: decodeJwtAal(authHeader),
      isElevated: roles.some((r) => ELEVATED_ROLES.includes(r)),
    },
  };
}

// ── Verificação HMAC de webhooks (etapa 6, subetapa 6) ──────────────────────
//
// Premissa do plano: webhooks aceitam SOMENTE assinatura HMAC verificada sobre
// os BYTES ORIGINAIS do corpo. Por isso `verifyWebhook` consome o corpo uma
// única vez e devolve a string para o handler parsear — nunca re-ler `req`.

export type WebhookResult =
  | { ok: true; body: string }
  | { ok: false; response: Response };

export async function hmacSha256Hex(secret: string, body: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyWebhook(
  req: Request,
  secret: string,
  opts: EnvelopeOptions & { header?: string } = { requestId: "", corsHeaders: {} },
): Promise<WebhookResult> {
  const headerName = opts.header ?? "x-webhook-signature";
  const body = await req.text(); // bytes originais — hash antes de qualquer parse
  const provided = (req.headers.get(headerName) ?? "").replace(/^sha256=/, "").toLowerCase();

  const expected = await hmacSha256Hex(secret, body);
  if (!timingSafeEqual(provided, expected)) {
    return {
      ok: false,
      response: jsonError("INVALID_SIGNATURE", "Assinatura de webhook inválida.", {
        ...opts,
        status: 401,
      }),
    };
  }
  return { ok: true, body };
}

/** Comparação em tempo constante (mitiga timing attack no compare de hex). */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Consome esforço equivalente antes de falhar, para não vazar o tamanho.
    let noop = 0;
    for (let i = 0; i < Math.max(a.length, b.length); i++) noop |= 1;
    void noop;
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
