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
  }),
});

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

// Relatórios CSP reais têm < 4 KB. O schema não usa passthrough, então o zod
// descarta campos extras — o `raw` persistido fica limitado aos campos
// declarados com max() próprio.
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

  const tooLarge = () =>
    new Response(JSON.stringify({ error: "Payload too large" }), {
      status: 413,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  // Rejeição precoce quando o cliente declara o tamanho — evita bufferizar
  // um body gigante só para descartá-lo.
  const declaredLength = Number(req.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES) return tooLarge();

  // Throttle grosso ANTES de ler/parsear o body: endpoint público, então a
  // primeira linha de defesa cobre todo o tráfego (válido ou não) sem
  // discriminar origem — limita o custo de stream+zod por flood. Os buckets
  // de produção/rejeitados abaixo ficam com cotas próprias e mais apertadas.
  const inboundGlobalLimited = await checkRateLimit(supabase, {
    endpoint: "csp-report-inbound-global",
    identity: { ip: "0.0.0.0" },
    max: 1800,
    windowSeconds: 60,
    corsHeaders,
    requestId,
  });
  if (inboundGlobalLimited) return inboundGlobalLimited;

  const inboundLimited = await checkRateLimit(supabase, {
    endpoint: "csp-report-inbound",
    identity: { ip: getClientIp(req) },
    max: 300,
    windowSeconds: 60,
    corsHeaders,
    requestId,
  });
  if (inboundLimited) return inboundLimited;

  // Leitura streamada com teto: cobre chunked/sem Content-Length sem
  // materializar o body inteiro na memória da function.
  let body: unknown;
  try {
    const reader = req.body?.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;
    if (reader) {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.byteLength;
        if (received > MAX_BODY_BYTES) {
          await reader.cancel();
          return tooLarge();
        }
        chunks.push(value);
      }
    }
    const merged = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.byteLength;
    }
    body = JSON.parse(new TextDecoder().decode(merged));
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

  // Vercel preview deploys herdam o mesmo vercel.json e reportam para este
  // coletor de produção — poluem a telemetria e não podem consumir a cota de
  // produção. CSP_REPORT_ALLOWED_HOSTS (vírgula-separado) restringe a origem:
  // relatório de host fora da lista é descartado com 204 — mas antes passa
  // por um bucket per-IP PRÓPRIO ('csp-report-rejected'), que throttles o
  // spam sem cobrar a cota de produção. Vazio = aceita tudo (comportamento
  // anterior).
  const allowedHosts = (Deno.env.get("CSP_REPORT_ALLOWED_HOSTS") ?? "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  if (allowedHosts.length > 0) {
    const reportHost = (() => {
      try {
        return new URL(parsed.data["csp-report"]["document-uri"] ?? "").hostname.toLowerCase();
      } catch {
        return "";
      }
    })();
    if (!allowedHosts.some((h) => reportHost === h || reportHost.endsWith("." + h))) {
      // Teto agregado próprio: IPs rotativos não podem gerar RPCs ilimitados.
      const rejectedGlobalLimited = await checkRateLimit(supabase, {
        endpoint: "csp-report-rejected-global",
        identity: { ip: "0.0.0.0" },
        max: 600,
        windowSeconds: 60,
        corsHeaders,
        requestId,
      });
      if (rejectedGlobalLimited) return rejectedGlobalLimited;
      const rejectedLimited = await checkRateLimit(supabase, {
        endpoint: "csp-report-rejected",
        identity: { ip: getClientIp(req) },
        max: 120,
        windowSeconds: 60,
        corsHeaders,
        requestId,
      });
      if (rejectedLimited) return rejectedLimited;
      return new Response(null, { status: 204, headers: corsHeaders });
    }
  }

  // Bucket global ANTES do per-IP: saturado, o agregado corta a request sem
  // gravar linha per-IP — senão IPs novos continuariam escrevendo
  // rate_limit_logs mesmo com o teto global estourado. O mesmo padrão se
  // repete nos buckets inbound e rejected acima.
  const globalLimited = await checkRateLimit(supabase, {
    endpoint: "csp-report-global",
    identity: { ip: "0.0.0.0" }, // ip_address é INET — 'global' quebraria o cast
    max: 300,
    windowSeconds: 60,
    corsHeaders,
    requestId,
  });
  if (globalLimited) return globalLimited;

  const limited = await checkRateLimit(supabase, {
    endpoint: "csp-report",
    identity: { ip: getClientIp(req) },
    max: 120,
    windowSeconds: 60,
    corsHeaders,
    requestId,
  });
  if (limited) return limited;

  const report = parsed.data["csp-report"];

  // original_policy já vai para a coluna própria; tirar do raw evita
  // duplicar o maior campo do payload (até 4 KiB) em JSONB.
  const { "csp-report": rawReport } = parsed.data;
  const { "original-policy": _originalPolicy, ...rawTrimmed } = rawReport;

  // Insert atômico com dedupe: a RPC faz verificação + insert numa única
  // transação com advisory lock por assinatura (mesma página + diretiva +
  // uri bloqueada + origem + disposition na última hora → duplicata). Sem
  // esse teto de volume, floods repetidos encheriam a tabela muito antes da
  // retenção de 14 dias agir; o lock fecha a janela check-then-insert que
  // deixava rajadas concorrentes idênticas passarem juntas.
  const { data: inserted, error } = await supabase.rpc("insert_csp_report_dedup", {
    p_document_uri: report["document-uri"] ?? null,
    p_referrer: report.referrer ?? null,
    p_violated_directive: report["violated-directive"] ?? null,
    p_effective_directive: report["effective-directive"] ?? null,
    p_original_policy: report["original-policy"] ?? null,
    p_blocked_uri: report["blocked-uri"] != null ? String(report["blocked-uri"]) : null,
    p_source_file: report["source-file"] ?? null,
    p_line_number: report["line-number"] ?? null,
    p_column_number: report["column-number"] ?? null,
    p_status_code: report["status-code"] ?? null,
    p_disposition: report.disposition ?? null,
    p_user_agent: req.headers.get("user-agent")?.slice(0, 512) ?? null,
    p_raw: { "csp-report": rawTrimmed },
  });

  if (inserted === false) {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (error) {
    console.error("[csp-report] insert failed", requestId, error.message);
    return new Response(JSON.stringify({ error: "Failed to store report" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(null, { status: 204, headers: corsHeaders });
});
