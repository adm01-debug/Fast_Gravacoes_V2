import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { getCorsHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { createLogger, getOrCreateRequestId, withRequestId } from "../_shared/logger.ts";
import { authenticate, requireRole } from "../_shared/auth.ts";

// Only allow export from these tables
const ALLOWED_TABLES = [
  'jobs',
  'machines',
  'techniques',
  'maintenance_schedules',
  'maintenance_records',
  'production_lots',
  'energy_consumption',
  'spc_measurements',
  'operator_rankings',
  'shift_handovers',
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: getCorsHeaders(req) });

  const requestId = getOrCreateRequestId(req);
  const log = createLogger({ fn: "excel-export", requestId });
  const cors = withRequestId(getCorsHeaders(req), requestId);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // Etapas 26-27 do plano-50: middleware comum substitui a verificação manual
    // duplicada. Contrato preservado: coordinator/manager/admin (sem AAL2).
    const auth = await authenticate(req, {
      supabaseUrl,
      supabaseAnonKey,
      requestId,
      corsHeaders: cors,
    });
    if (!auth.ok) {
      log.warn("auth.rejected");
      return auth.response;
    }

    const forbidden = requireRole(auth.ctx, ['coordinator', 'manager', 'admin'], { requestId, corsHeaders: cors });
    if (forbidden) {
      log.warn("guard.rejected", { roles: auth.ctx.roles });
      return forbidden;
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return new Response(JSON.stringify({ error: "Corpo da requisição inválido" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const { table, filters, columns } = body as Record<string, unknown>;

    // Validate table name against allowlist (narrow unknown -> string)
    if (typeof table !== "string" || !ALLOWED_TABLES.includes(table)) {
      return new Response(JSON.stringify({ error: "Tabela não permitida para exportação" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Validate caller-supplied columns: only plain identifiers are allowed.
    // This blocks embedded-relation selects (e.g. "*, user_roles(role)") that
    // would exfiltrate joined data through the service-role client.
    const COLUMN_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    if (columns !== undefined && columns !== null) {
      if (!Array.isArray(columns) || !columns.every((c: unknown) => typeof c === "string" && COLUMN_RE.test(c))) {
        return new Response(JSON.stringify({ error: "Parâmetro 'columns' inválido" }), {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }
    }

    // Build query using service role for data access. Capped — an
    // unbounded select on a large table (e.g. jobs, spc_measurements) risks
    // function timeout/OOM; exports beyond this size should be paginated by
    // the caller instead of one giant response.
    const EXPORT_ROW_LIMIT = 20000;
    // `table` foi validado contra a allowlist acima — o nome é literalmente um
    // dos valores permitidos; o alias tipado evita propagar `unknown` ao builder.
    const tableName: string = table;
    let query = adminClient.from(tableName).select(columns?.join(",") || "*").limit(EXPORT_ROW_LIMIT);

    if (filters) {
      const filterEntries = Object.entries(filters);
      const invalidKey = filterEntries.find(([key]) => !COLUMN_RE.test(key));
      if (invalidKey) {
        return new Response(JSON.stringify({ error: "Chave de filtro inválida" }), {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      filterEntries.forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }

    const { data, error } = await query;
    if (error) throw error;

    if (!data || data.length === 0) {
      return new Response("", {
        headers: {
          ...cors,
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${tableName}-export-${Date.now()}.csv"`,
        },
      });
    }

    // Convert to CSV. Cells starting with = + - @ are formula-injection
    // vectors in Excel/Sheets (e.g. =HYPERLINK(...)) — prefix with a quote
    // so they render as literal text instead of executing on open.
    const headers = columns || Object.keys(data[0] || {});
    const csvContent = [
      headers.join(","),
      // `data` chega tipado como GenericStringError[] (peculiaridade do
      // supabase-js com from()/select() dinamicos) — o cast explicita a
      // forma real das linhas retornadas.
      ...(data as unknown as Record<string, unknown>[]).map((row) =>
        headers.map((h: string) => {
          const raw = String(row[h] ?? "");
          const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
          return `"${safe.replace(/"/g, '""')}"`;
        }).join(",")
      ),
    ].join("\n");

    return new Response(csvContent, {
      headers: {
        ...cors,
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${table}-export-${Date.now()}.csv"`,
      },
    });
  } catch (error) {
    console.error('Excel export error:', error instanceof Error ? error.message : String(error));
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
