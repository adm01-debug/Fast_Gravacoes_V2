import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { getCorsHeaders } from "../_shared/cors.ts";

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

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // Verify the requesting user is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Check user role - only coordinators and managers can export
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleRows, error: roleError } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (roleError) {
      // Surface backend failures as 500, not a misleading "permission denied".
      return new Response(JSON.stringify({ error: "Falha ao verificar permissão" }), {
        status: 500,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const allowedRoles = ['coordinator', 'manager', 'admin'];
    const hasExportRole = (roleRows ?? []).some((r: { role: string }) => allowedRoles.includes(r.role));
    if (!hasExportRole) {
      return new Response(JSON.stringify({ error: "Permissão insuficiente" }), {
        status: 403,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return new Response(JSON.stringify({ error: "Corpo da requisição inválido" }), {
        status: 400,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }
    const { table, filters, columns } = body as Record<string, unknown>;

    // Validate table name against allowlist
    if (!table || !ALLOWED_TABLES.includes(table)) {
      return new Response(JSON.stringify({ error: "Tabela não permitida para exportação" }), {
        status: 400,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
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
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      }
    }

    // Build query using service role for data access. Capped — an
    // unbounded select on a large table (e.g. jobs, spc_measurements) risks
    // function timeout/OOM; exports beyond this size should be paginated by
    // the caller instead of one giant response.
    const EXPORT_ROW_LIMIT = 20000;
    let query = adminClient.from(table).select(columns?.join(",") || "*").limit(EXPORT_ROW_LIMIT);

    if (filters) {
      const filterEntries = Object.entries(filters);
      const invalidKey = filterEntries.find(([key]) => !COLUMN_RE.test(key));
      if (invalidKey) {
        return new Response(JSON.stringify({ error: "Chave de filtro inválida" }), {
          status: 400,
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
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
          ...getCorsHeaders(req),
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${table}-export-${Date.now()}.csv"`,
        },
      });
    }

    // Convert to CSV. Cells starting with = + - @ are formula-injection
    // vectors in Excel/Sheets (e.g. =HYPERLINK(...)) — prefix with a quote
    // so they render as literal text instead of executing on open.
    const headers = columns || Object.keys(data[0] || {});
    const csvContent = [
      headers.join(","),
      ...data.map((row: Record<string, unknown>) =>
        headers.map((h: string) => {
          const raw = String(row[h] ?? "");
          const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
          return `"${safe.replace(/"/g, '""')}"`;
        }).join(",")
      ),
    ].join("\n");

    return new Response(csvContent, {
      headers: {
        ...getCorsHeaders(req),
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${table}-export-${Date.now()}.csv"`,
      },
    });
  } catch (error) {
    console.error('Excel export error:', error instanceof Error ? error.message : String(error));
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
