/**
 * cron-alert-email
 *
 * Envia alerta por e-mail (Resend) quando uma rotina automática (pg_cron)
 * está falhando de forma consecutiva ou ficou silenciosa (sem executar dentro
 * do intervalo esperado).
 *
 * Fonte de verdade: última linha de `public.cron_health_history` por rotina,
 * alimentada a cada 15 min por `public.snapshot_cron_health()`.
 *
 * Deduplicação: grava um marcador em `public.push_notifications`
 * (`data->>'type' = 'cron_email_sent'`) e não reenvia para a mesma rotina
 * dentro da janela de `DEDUPE_HOURS`.
 *
 * Autenticação: exclusivamente via `x-cron-secret` (fail-closed) — não é um
 * endpoint de usuário.
 */
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { requireCronSecret } from "../_shared/cronAuth.ts";
import { escapeHtml } from "../_shared/htmlEscape.ts";

const FAILURE_THRESHOLD = 3;
const DEDUPE_HOURS = 6;
const FROM = "Fast Gravações <alertas@resend.dev>";

interface HealthRow {
  jobid: number;
  jobname: string | null;
  schedule: string | null;
  last_status: string | null;
  last_run: string | null;
  last_error: string | null;
  consecutive_failures: number | null;
  is_stale: boolean | null;
  expected_interval_minutes: number | null;
  captured_at: string;
}

/** Mantém apenas a coleta mais recente de cada rotina. */
function latestPerJob(rows: HealthRow[]): HealthRow[] {
  const map = new Map<number, HealthRow>();
  for (const row of rows) {
    const current = map.get(row.jobid);
    if (!current || row.captured_at > current.captured_at) map.set(row.jobid, row);
  }
  return Array.from(map.values());
}

function isProblem(row: HealthRow): "failure" | "stale" | null {
  if ((row.consecutive_failures ?? 0) >= FAILURE_THRESHOLD) return "failure";
  if (row.is_stale === true) return "stale";
  return null;
}

function buildHtml(row: HealthRow, kind: "failure" | "stale"): string {
  const name = escapeHtml(row.jobname ?? `job ${row.jobid}`);
  const title = kind === "failure" ? "Rotina automática falhando" : "Rotina automática silenciosa";
  const detail =
    kind === "failure"
      ? `Falhou <strong>${row.consecutive_failures}</strong> ciclos consecutivos.`
      : `Não executa há mais tempo do que o intervalo esperado (~${
        row.expected_interval_minutes ?? "?"
      } min).`;

  return `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px">
      <h2 style="color:#c2410c;margin:0 0 12px">${escapeHtml(title)}</h2>
      <p style="margin:0 0 8px"><strong>Rotina:</strong> ${name}</p>
      <p style="margin:0 0 8px"><strong>Agenda:</strong> ${escapeHtml(row.schedule ?? "—")}</p>
      <p style="margin:0 0 8px"><strong>Última execução:</strong> ${
    escapeHtml(row.last_run ?? "nunca")
  }</p>
      <p style="margin:0 0 8px"><strong>Último status:</strong> ${
    escapeHtml(row.last_status ?? "—")
  }</p>
      <p style="margin:0 0 12px">${detail}</p>
      ${
    row.last_error
      ? `<pre style="background:#f4f4f5;padding:12px;border-radius:6px;white-space:pre-wrap">${
        escapeHtml(row.last_error.slice(0, 500))
      }</pre>`
      : ""
  }
      <p style="color:#71717a;font-size:12px">Verifique o painel Administração › Monitoramento.</p>
    </div>`;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const unauthorized = requireCronSecret(req, { failClosed: true, corsHeaders });
  if (unauthorized) return unauthorized;

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const since = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("cron_health_history")
      .select(
        "jobid, jobname, schedule, last_status, last_run, last_error, consecutive_failures, is_stale, expected_interval_minutes, captured_at",
      )
      .gte("captured_at", since)
      .order("captured_at", { ascending: true })
      .limit(1000);

    if (error) return json({ error: error.message }, 500);

    const problems = latestPerJob((data ?? []) as HealthRow[])
      .map((row) => ({ row, kind: isProblem(row) }))
      .filter((p): p is { row: HealthRow; kind: "failure" | "stale" } => p.kind !== null);

    if (problems.length === 0) return json({ checked: data?.length ?? 0, sent: 0 });

    // Destinatários: coordenadores e gestores ativos.
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["coordinator", "manager"])
      .eq("is_active", true);

    const recipientIds = Array.from(new Set((roles ?? []).map((r) => r.user_id as string)));

    // Preferência do usuário (#40): opt-out explícito. O usuário deixa de
    // receber e-mail se desligar e-mails (`email_enabled = false`) ou marcar
    // 'cron_alerts_off' em `notification_types`. Sem registro => recebe,
    // para nunca silenciar alerta crítico por omissão de configuração.
    const { data: prefs } = await supabase
      .from("user_notification_settings")
      .select("user_id, email_enabled, notification_types")
      .in("user_id", recipientIds.length > 0 ? recipientIds : ["00000000-0000-0000-0000-000000000000"]);

    const optedOut = new Set(
      (prefs ?? [])
        .filter((p) => {
          const types = (p.notification_types as string[] | null) ?? [];
          const emailOn = p.email_enabled !== false;
          return !emailOn || types.includes("cron_alerts_off");
        })
        .map((p) => p.user_id as string),
    );

    const emailRecipientIds = recipientIds.filter((id) => !optedOut.has(id));
    const emails: string[] = [];
    for (const id of emailRecipientIds) {
      const { data: u } = await supabase.auth.admin.getUserById(id);
      if (u?.user?.email) emails.push(u.user.email);
    }

    if (emails.length === 0) {
      return json({ sent: 0, reason: "sem destinatários (opt-out ou sem e-mail)" });
    }


    const dedupeSince = new Date(Date.now() - DEDUPE_HOURS * 60 * 60 * 1000).toISOString();
    const { data: recent } = await supabase
      .from("push_notifications")
      .select("data")
      .gte("created_at", dedupeSince)
      .eq("data->>type", "cron_email_sent")
      .limit(200);

    const alreadySent = new Set(
      (recent ?? []).map((r) => String((r.data as Record<string, unknown> | null)?.jobid ?? "")),
    );

    let sent = 0;
    const skipped: number[] = [];

    for (const { row, kind } of problems) {
      if (alreadySent.has(String(row.jobid))) {
        skipped.push(row.jobid);
        continue;
      }

      if (resendApiKey) {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: FROM,
            to: emails,
            subject: `[Fast Gravações] ${
              kind === "failure" ? "Rotina falhando" : "Rotina silenciosa"
            }: ${row.jobname ?? row.jobid}`,
            html: buildHtml(row, kind),
          }),
        });
        if (!res.ok) {
          console.error("[cron-alert-email] Resend error", res.status, await res.text());
          continue;
        }
      } else {
        console.warn("[cron-alert-email] RESEND_API_KEY ausente — apenas marcando envio.");
      }

      await supabase.from("push_notifications").insert(
        recipientIds.map((userId) => ({
          user_id: userId,
          title: kind === "failure" ? "Rotina automática falhando" : "Rotina automática silenciosa",
          body: `E-mail de alerta enviado sobre ${row.jobname ?? `job ${row.jobid}`}.`,
          status: "sent",
          data: {
            type: "cron_email_sent",
            jobid: row.jobid,
            jobname: row.jobname,
            kind,
            route: "/admin/monitoring",
            severity: kind === "failure" ? "critical" : "warning",
          },
        })),
      );

      sent += 1;
    }

    return json({ problems: problems.length, sent, skipped });
  } catch (e) {
    console.error("[cron-alert-email] unexpected", e);
    return json({ error: "Internal error" }, 500);
  }
});
