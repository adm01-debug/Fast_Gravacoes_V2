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
 * dentro da janela de `DEDUPE_HOURS`. O aviso no aplicativo (`cron_alert`)
 * tem deduplicação própria e é gravado mesmo quando o e-mail não sai.
 * Opt-out de e-mail desliga apenas o e-mail: o aviso na central continua.
 *
 * Marcador só conta quando existe para TODOS os destinatários ativos: a RLS
 * deixa cada usuário inserir a própria notificação, então aceitar uma linha
 * isolada permitiria a um usuário suprimir o aviso dos outros. O mesmo
 * critério vale para os avisos `cron_failure`/`cron_stale` que
 * `snapshot_cron_health()` já grava, para não duplicar na central o mesmo
 * problema da mesma rotina.
 *
 * Autenticação: exclusivamente via `x-cron-secret` (fail-closed) — não é um
 * endpoint de usuário.
 */
import {
  agruparMarcadores,
  classifyResendHttp,
  decidirRegistroAlerta,
  destinatariosPendentes,
  marcadorParaTodos,
  MOTIVO_SEM_CREDENCIAL,
} from "../_shared/emailDelivery.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js";
import { getCorsHeaders } from "../_shared/cors.ts";
import { requireCronSecret } from "../_shared/cronAuth.ts";
import { escapeHtml } from "../_shared/htmlEscape.ts";

const FAILURE_THRESHOLD = 3;
const DEDUPE_HOURS = 6;
/** `snapshot_cron_health()` usa 12h para rotina silenciosa; espelha a janela. */
const STALE_DEDUPE_HOURS = 12;
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

/**
 * Dispara o POST no Resend e classifica o resultado.
 *
 * Falha de rede (fetch que lança, sem resposta HTTP) conta como "não saiu" em
 * vez de derrubar a rodada: as rotinas seguintes ainda precisam ser avaliadas
 * e o aviso na central tem de ser gravado.
 */
async function enviarAlertaEmail(
  apiKey: string,
  emails: string[],
  row: HealthRow,
  kind: "failure" | "stale",
) {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
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
    // 2xx já é aceite do provedor: corpo ilegível não pode derrubar a rodada.
    const corpo = await res.text().catch(() => "");
    return classifyResendHttp(res.status, corpo);
  } catch (e) {
    return { ok: false, reason: `sem resposta do provedor: ${String(e)}` };
  }
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
        const emailPorId = new Map<string, string>();
    for (const id of emailRecipientIds) {
      const { data: u } = await supabase.auth.admin.getUserById(id);
          if (u?.user?.email) emailPorId.set(id, u.user.email);
    }
        const emails: string[] = Array.from(emailPorId.values());

    if (recipientIds.length === 0) {
      return json({ sent: 0, reason: "sem destinatários ativos" });
    }

    // Motivo pelo qual o e-mail não pode sair nesta rodada (null = pode).
    // Opt-out de e-mail silencia só o e-mail: o aviso na central continua.
    const motivoSemEmail = !resendApiKey
      ? MOTIVO_SEM_CREDENCIAL
      : emails.length === 0
      ? "nenhum destinatário com e-mail habilitado"
      : null;

    const dedupeSince = new Date(Date.now() - DEDUPE_HOURS * 60 * 60 * 1000).toISOString();
    const staleSince = new Date(Date.now() - STALE_DEDUPE_HOURS * 60 * 60 * 1000).toISOString();
    const marcadoresPorTipo = (type: string, since: string) =>
      supabase
        .from("push_notifications")
        .select("data, user_id")
        .gte("created_at", since)
        .eq("data->>type", type)
        .limit(500);

    const [enviados, avisosFuncao, avisosColeta, silenciosasColeta] = await Promise.all([
      marcadoresPorTipo("cron_email_sent", dedupeSince),
      marcadoresPorTipo("cron_alert", dedupeSince),
      marcadoresPorTipo("cron_failure", dedupeSince),
      marcadoresPorTipo("cron_stale", staleSince),
    ]);

    const jaEnviadoPorEmail = agruparMarcadores(enviados.data);
    const avisosDaFuncao = agruparMarcadores(avisosFuncao.data);
    const falhasDaColeta = agruparMarcadores(avisosColeta.data);
    const silenciosasDaColeta = agruparMarcadores(silenciosasColeta.data);

    // `snapshot_cron_health()` já avisa falha/silêncio para os mesmos
    // destinatários: sem isso a central ganharia um segundo aviso idêntico.
        // O e-mail já aceito pelo provedor também é aviso dado: considerar só os
        // marcadores da coleta fazia a rodada seguinte acusar "e-mail não enviado"
        // quando alguém entrava no grupo depois da coleta.
    const jaAvisadoNoApp = (jobid: string, kind: "failure" | "stale") =>
          marcadorParaTodos(jaEnviadoPorEmail, jobid, recipientIds) ||
      marcadorParaTodos(avisosDaFuncao, jobid, recipientIds) ||
      marcadorParaTodos(kind === "failure" ? falhasDaColeta : silenciosasDaColeta, jobid, recipientIds);

    let sent = 0;
    const skipped: number[] = [];
    const semCredencial: number[] = [];
    const semDestinatario: number[] = [];
    const avisosNoApp: number[] = [];

    for (const { row, kind } of problems) {
      const jobid = String(row.jobid);
      let emailSaiu = false;

          // Envia só para quem ainda não tem confirmação. Disparar para a lista
                // inteira quando um único destinatário entrou no grupo depois do envio
                // duplicava o alerta para quem já o havia recebido.
                const pendentes = destinatariosPendentes(jaEnviadoPorEmail, jobid, emailRecipientIds);
                const emailsPendentes = pendentes
                  .map((id) => emailPorId.get(id))
                  .filter((e): e is string => Boolean(e));

                if (pendentes.length === 0) {
        skipped.push(row.jobid);
                } else if (motivoSemEmail === null && resendApiKey && emailsPendentes.length > 0) {
                  const entrega = await enviarAlertaEmail(resendApiKey, emailsPendentes, row, kind);
        if (!entrega.ok) console.error("[cron-alert-email] Resend error", entrega.reason);
        emailSaiu = entrega.ok;
                } else if (motivoSemEmail === null) {
                  // Quem falta já recebeu ou desligou o e-mail: não há envio a fazer e
                  // um aviso de "e-mail não enviado" seria ruído para quem optou por não
                  // receber. Sai sem gravar marcador; a próxima rodada reavalia.
                  semDestinatario.push(row.jobid);
                  continue;
      } else {
        // Falta de credencial ou de e-mail não pode apagar o alerta: ele segue
        // para a central, sem afirmar que um e-mail saiu.
        const motivo = motivoSemEmail ?? MOTIVO_SEM_CREDENCIAL;
        console.error(`[cron-alert-email] ${motivo} — alerta por e-mail não enviado`);
        if (motivo === MOTIVO_SEM_CREDENCIAL) semCredencial.push(row.jobid);
        else semDestinatario.push(row.jobid);
      }

      const registro = decidirRegistroAlerta(emailSaiu, jaAvisadoNoApp(jobid, kind));
      if (registro === "confirmado") sent += 1;
      if (registro === "nada") continue;
      if (registro === "aviso_no_app") avisosNoApp.push(row.jobid);

      await supabase.from("push_notifications").insert(
        recipientIds.map((userId) => ({
          user_id: userId,
          title: kind === "failure" ? "Rotina automática falhando" : "Rotina automática silenciosa",
          body: registro === "confirmado"
            ? `E-mail de alerta enviado sobre ${row.jobname ?? `job ${row.jobid}`}.`
            : `Alerta no aplicativo sobre ${row.jobname ?? `job ${row.jobid}`}: e-mail não enviado (${
              motivoSemEmail ?? "provedor recusou o envio"
            }).`,
          status: "sent",
          data: {
            type: registro === "confirmado" ? "cron_email_sent" : "cron_alert",
            jobid: row.jobid,
            jobname: row.jobname,
            kind,
            route: "/admin/monitoring",
            severity: kind === "failure" ? "critical" : "warning",
          },
        })),
      );
    }

    return json({
      problems: problems.length,
      sent,
      skipped,
      semCredencial,
      semDestinatario,
      avisosNoApp,
    });
  } catch (e) {
    console.error("[cron-alert-email] unexpected", e);
    return json({ error: "Internal error" }, 500);
  }
});
