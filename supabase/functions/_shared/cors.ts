// Shared CORS helper — single source of truth for allowed origins and headers
// across all edge functions. Prefer this over per-function duplication.
//
// Usage:
//   import { getCorsHeaders, handleCorsPreflight } from "../_shared/cors.ts";
//   const preflight = handleCorsPreflight(req);
//   if (preflight) return preflight;
//   const cors = getCorsHeaders(req);

// Kept in sync with what every per-function ALLOWED_ORIGINS array actually
// allows today (APP_URL + the one active Lovable preview project domain).
// Two additional preview domains (an old project preview + a "figma-fighter"
// domain) previously lived only in this unused shared module and were never
// part of any deployed function's allowlist — dropped rather than widening
// every function's CORS exposure the moment they adopt this shared helper.
// `fast-gravacoes-v2.vercel.app` e o dominio de producao servido hoje pela
// Vercel (campo `homepage` do repo; ver docs/agentes/vercel-deploy.md). Sem ele
// aqui, `pickAllowedOrigin` caia no fallback e devolvia o dominio custom,
// fazendo o browser bloquear toda chamada vinda da Vercel — inclusive o login.
const DEFAULT_ORIGINS = [
  Deno.env.get("APP_URL") || "https://fastgravacoes.com.br",
  "https://fast-gravacoes-v2.vercel.app",
  "https://xxroejpvloldkmqdydar.lovableproject.com",
].filter(Boolean) as string[];

const EXTRA_ORIGINS = (Deno.env.get("EXTRA_ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export const ALLOWED_ORIGINS: readonly string[] = [
  ...new Set([...DEFAULT_ORIGINS, ...EXTRA_ORIGINS]),
];

const DEFAULT_ALLOWED_HEADERS =
  "authorization, x-client-info, apikey, content-type, x-api-key, x-cron-secret, x-request-id, x-webhook-signature, x-forwarded-for, x-real-ip, x-simulation-mode, x-simulation-severity";

const DEFAULT_ALLOWED_METHODS = "GET, POST, PATCH, PUT, DELETE, OPTIONS";

// Servidores locais (Vite em http://127.0.0.1:8090, E2E do Playwright) tambem
// precisam ler a resposta: sem eles o browser bloqueia a chamada, o cliente
// reporta FunctionsFetchError e o login local segue sem avaliacao de lockout.
// A fronteira de autenticacao continua sendo o JWT do gateway, nao o CORS.
const LOOPBACK_ORIGIN = /^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/;

export function pickAllowedOrigin(req: Request): string {
  const origin = req.headers.get("origin") ?? "";
  if (ALLOWED_ORIGINS.includes(origin)) return origin;
  if (LOOPBACK_ORIGIN.test(origin)) return origin;
  return ALLOWED_ORIGINS[0];
}

export function getCorsHeaders(
  req: Request,
  overrides: { headers?: string; methods?: string } = {},
): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": pickAllowedOrigin(req),
    "Access-Control-Allow-Headers": overrides.headers ?? DEFAULT_ALLOWED_HEADERS,
    "Access-Control-Allow-Methods": overrides.methods ?? DEFAULT_ALLOWED_METHODS,
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

export function handleCorsPreflight(req: Request): Response | null {
  if (req.method !== "OPTIONS") return null;
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}
