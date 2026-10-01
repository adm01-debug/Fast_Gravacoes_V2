// Recebe relatórios de violação de CSP (report-uri) e persiste em
// csp_violation_reports. Browsers POSTam sem Authorization, então esta é a
// única function com verify_jwt = false (ver config.toml) — a camada de
// defesa é: schema zod estrito + rate limit por IP + insert via service role
// (tabela sem policy de INSERT para anon/auth).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { getCorsHeaders, handleCorsPreflight } from "../_shared/cors.ts";
// (schema mantido local e não em _shared/validation.ts para evitar conflito
// de merge com o PR que adiciona schemas novos no mesmo arquivo)
import { checkRateLimit } from "../_shared/rateLimit.ts";
import { getOrCreateRequestId } from "../_shared/logger.ts";

const cspReportSchema = z.object({
  "csp-report": z.object({
    "document-uri": z.string().max(2048).optional(),
    referrer: z.string().max(2048).optional(),
    "violated-directive": z.string().max(512).optional(),
    "effective-directive": z.string().max(512).optional(),
    "original-policy": z.string().max(4096).optional(),
    "blocked-uri": z.union([z.string().max(2048), z.number()]).optional(),
    "source-file": z.string().max(2048).optional(),
    "line-number": z.number().optional(),
    "column-number": z.number().optional(),
    "status-code": z.number().optional(),
    disposition: z.enum(["enforce", "report", "reporting"]).optional(),
    "script-sample": z.string().max(1024).optional(),
  }).passthrough(),
}).passthrough();

// Último IP do XFF é o que o ingress anexou — o primeiro pode ser forjado
// pelo cliente e driblaria o rate limit por IP.
function getClientIp(req: Request): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const last = fwd.split(",").pop()?.trim();
    if (last) return last;
  }
  return req.headers.get("x-real-ip")?.trim() ?? null;
}

// Relatórios CSP reais têm < 4 KB; bodies maiores só servem para estourar
// memória/storage via campos extras do .passthrough().
const MAX_BODY_BYTES = 16 * 1024;

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  const requestId = getOrCreateRequestId(req);

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const limited = await checkRateLimit(supabase, {
    endpoint: "csp-report",
    identity: { ip: getClientIp(req) },
    max: 120,
    windowSeconds: 60,
    corsHeaders,
    requestId,
  });
  if (limited) return limited;

  // Bucket global: mesmo quem rotaciona IPs forjados no XFF fica limitado
  // pelo teto agregado do endpoint.
  const globalLimited = await checkRateLimit(supabase, {
    endpoint: "csp-report-global",
    identity: { ip: "global" },
    max: 600,
    windowSeconds: 60,
    corsHeaders,
    requestId,
  });
  if (globalLimited) return globalLimited;

  let body: unknown;
  try {
    const text = await req.text();
    if (text.length > MAX_BODY_BYTES) {
      return new Response(JSON.stringify({ error: "Payload too large" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    body = JSON.parse(text);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const parsed = cspReportSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "Invalid CSP report" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const report = parsed.data["csp-report"];
  const { error } = await supabase.from("csp_violation_reports").insert({
    document_uri: report["document-uri"] ?? null,
    referrer: report.referrer ?? null,
    violated_directive: report["violated-directive"] ?? null,
    effective_directive: report["effective-directive"] ?? null,
    original_policy: report["original-policy"] ?? null,
    blocked_uri: report["blocked-uri"] != null ? String(report["blocked-uri"]) : null,
    source_file: report["source-file"] ?? null,
    line_number: report["line-number"] ?? null,
    column_number: report["column-number"] ?? null,
    status_code: report["status-code"] ?? null,
    disposition: report.disposition ?? null,
    user_agent: req.headers.get("user-agent")?.slice(0, 512) ?? null,
    raw: parsed.data,
  });

  if (error) {
    console.error("[csp-report] insert failed", requestId, error.message);
    return new Response(JSON.stringify({ error: "Failed to store report" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(null, { status: 204, headers: corsHeaders });
});
