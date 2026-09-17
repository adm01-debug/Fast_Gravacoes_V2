import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getCorsHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { createLogger, getOrCreateRequestId, withRequestId } from "../_shared/logger.ts";
import { authenticate, requireRole } from "../_shared/auth.ts";

// NOTE — esta função NÃO gera PDFs binários hoje: ela monta um relatório em
// texto plano. Para não induzir clientes ao erro (Content-Type application/pdf
// com bytes de texto), respondemos honestamente como `text/plain`. A geração
// de PDF real deve ser implementada com `pdf-lib` ou similar; até lá o texto
// pode ser convertido para PDF do lado do cliente via jspdf, se necessário.

// Sanitize caller-supplied strings before embedding in plain-text report output.
// Collapses CR+LF to LF (prevents CRLF injection), strips ASCII control chars
// (except LF/TAB which are expected in multi-line fields).
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS_RE = new RegExp('[\\x00-\\x08\\x0b\\x0c\\x0e-\\x1f\\x7f]', 'g');

function sanitizeText(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\r\n?/g, '\n').replace(CONTROL_CHARS_RE, '');
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  const requestId = getOrCreateRequestId(req);
  const log = createLogger({ fn: "pdf-generator", requestId });
  const cors = withRequestId(getCorsHeaders(req), requestId);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Etapas 26-27 do plano-50: middleware comum substitui a verificação manual
    // duplicada. Contrato preservado: coordinator/manager/admin (sem AAL2).
    const auth = await authenticate(req, {
      supabaseUrl,
      supabaseAnonKey: Deno.env.get("SUPABASE_ANON_KEY")!,
      requestId,
      corsHeaders: cors,
    });
    if (!auth.ok) {
      log.warn("auth.rejected");
      return auth.response;
    }

    const forbidden = requireRole(auth.ctx, ["coordinator", "manager", "admin"], { requestId, corsHeaders: cors });
    if (forbidden) {
      log.warn("guard.rejected", { roles: auth.ctx.roles });
      return forbidden;
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const { type, data, options } = body;

    const ALLOWED_TYPES = ["job-report", "quality-report", "maintenance-report"] as const;
    type AllowedType = typeof ALLOWED_TYPES[number];
    if (!ALLOWED_TYPES.includes(type)) {
      return new Response(JSON.stringify({ error: "Tipo de relatório inválido" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    let textContent: Uint8Array;

    switch (type as AllowedType) {
      case "job-report":
        textContent = await generateJobReport(data, options);
        break;
      case "quality-report":
        textContent = await generateQualityReport(data, options);
        break;
      case "maintenance-report":
        textContent = await generateMaintenanceReport(data, options);
        break;
    }

    return new Response(textContent!.buffer as ArrayBuffer, {
      headers: {
        ...cors,
        // Honesto: o corpo é texto UTF-8, não um PDF binário.
        "Content-Type": "text/plain; charset=utf-8",
        "X-Report-Format": "text",
        "Content-Disposition": `attachment; filename="${type}-${Date.now()}.txt"`,
      },
    });
  } catch (error) {
    console.error("Error in pdf-generator:", error instanceof Error ? error.message : error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});

async function generateJobReport(data: any, options: any): Promise<Uint8Array> {
  // PDF generation logic here
  const content = `Job Report\n\nGenerated: ${new Date().toISOString()}\n\nData: ${JSON.stringify(data, null, 2)}`;
  return new TextEncoder().encode(content);
}

async function generateQualityReport(data: any, options: any): Promise<Uint8Array> {
  const content = `Quality Report\n\nGenerated: ${new Date().toISOString()}\n\nData: ${JSON.stringify(data, null, 2)}`;
  return new TextEncoder().encode(content);
}

async function generateMaintenanceReport(data: any, _options: any): Promise<Uint8Array> {
  const { execution, machine, technical_sheet, supplies, alerts } = data;

  let content = `ORDEM DE SERVIÇO TÉCNICA - TPM\n`;
  content += `====================================\n\n`;
  content += `ID Execução: ${sanitizeText(execution?.id) || 'N/A'}\n`;
  content += `Data: ${new Date(execution?.completed_at || execution?.started_at).toLocaleString('pt-BR')}\n`;
  content += `Operador: ${sanitizeText(execution?.performed_by_name) || 'N/A'}\n\n`;

  content += `DADOS DA MÁQUINA E SERVIÇO\n`;
  content += `--------------------------\n`;
  content += `Máquina: ${sanitizeText(machine?.name)} (${sanitizeText(machine?.code)})\n`;
  content += `Técnica: ${sanitizeText(technical_sheet?.techniques?.name) || 'N/A'}\n`;
  content += `Produto: ${sanitizeText(technical_sheet?.product_categories?.name) || 'N/A'}\n\n`;

  content += `PARÂMETROS DE REGULAGEM APLICADOS\n`;
  content += `---------------------------------\n`;
  const params = execution?.adjustment_parameters || {};
  content += `Passadas de Rodo: ${sanitizeText(params.squeegee_passes) || 'N/A'}\n`;
  content += `Pressão: ${sanitizeText(params.pressure) || 'N/A'}\n`;
  content += `Velocidade: ${sanitizeText(params.speed) || 'N/A'}\n`;
  content += `Temperatura: ${sanitizeText(params.temperature) || 'N/A'}\n\n`;

  if (technical_sheet?.setup_instructions) {
    content += `GUIA DE SETUP E PREPARAÇÃO\n`;
    content += `--------------------------\n`;
    content += `${sanitizeText(technical_sheet.setup_instructions)}\n\n`;
  }

  if (supplies && supplies.length > 0) {
    content += `INSUMOS E CONSUMÍVEIS UTILIZADOS\n`;
    content += `--------------------------------\n`;
    supplies.forEach((s: any) => {
      content += `- ${sanitizeText(s.name)}: ${sanitizeText(s.quantity)}${s.alternative_used ? ' (Alternativo)' : ''}\n`;
    });
    content += `\n`;
  }

  if (execution?.quality_checklist_results && execution.quality_checklist_results.length > 0) {
    content += `CHECKLIST DE QUALIDADE\n`;
    content += `----------------------\n`;
    execution.quality_checklist_results.forEach((q: any) => {
      const sheet = technical_sheet?.quality_checklist?.find((i: any) => i.id === q.id);
      content += `[${q.approved ? 'OK' : 'X'}] ${sanitizeText(sheet?.description || q.id)}${q.justification ? ` - Justificativa: ${sanitizeText(q.justification)}` : ''}\n`;
    });
    content += `\n`;
  }

  if (alerts && alerts.length > 0) {
    content += `ALERTAS E CENÁRIOS DE FALHA (RISCO DE PERDA)\n`;
    content += `-------------------------------------------\n`;
    alerts.forEach((a: any) => {
      content += `! ${a.severity === 'critical' ? '[RISCO CRÍTICO] ' : '[AVISO] '}${sanitizeText(a.description)} (Valor: ${sanitizeText(a.actual_value)} / Esperado: ${sanitizeText(a.expected_range)})\n`;
      if (a.evidence_urls && a.evidence_urls.length > 0) {
        content += `  Evidências: ${a.evidence_urls.length} fotos anexadas.\n`;
        a.evidence_urls.forEach((url: string, idx: number) => {
           content += `  - Link Evidência ${idx + 1}: ${sanitizeText(url)}\n`;
        });
      }
    });
    content += `\n`;
  }

  content += `OBSERVAÇÕES GERAIS\n`;
  content += `------------------\n`;
  content += `${sanitizeText(execution?.notes) || 'Nenhuma observação.'}\n\n`;

  content += `------------------------------------\n`;
  content += `Assinatura: ${sanitizeText(execution?.signature_url) || '____________________'}\n`;

  return new TextEncoder().encode(content);
}
