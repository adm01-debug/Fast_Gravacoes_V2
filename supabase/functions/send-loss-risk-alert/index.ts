import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireCronSecret } from "../_shared/cronAuth.ts";
import { escapeHtml } from "../_shared/htmlEscape.ts";

function safeImageUrl(url: unknown): string | null {
  if (typeof url !== 'string') return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return null;
    return escapeHtml(url);
  } catch {
    return null;
  }
}

import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  // Triggered only by the Supabase DB webhook on loss-risk-alert INSERT —
  // requires the shared secret configured on that webhook's headers.
  const unauthorized = requireCronSecret(req, { failClosed: true, corsHeaders: getCorsHeaders(req) });
  if (unauthorized) return unauthorized;

  try {
    // Validate webhook caller: accept service-role key or WEBHOOK_API_KEY
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const webhookApiKey = Deno.env.get('WEBHOOK_API_KEY');
    const authHeader = req.headers.get('authorization');
    const providedKey = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1] || req.headers.get('x-api-key');
    const isServiceRole = providedKey === supabaseKey;
    const isWebhookKey = webhookApiKey && providedKey === webhookApiKey;
    if (!isServiceRole && !isWebhookKey) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseKey);
    const payload = await req.json();
    
    console.log('[send-loss-risk-alert] Payload received:', payload?.event_type, 'execution_id:', payload?.record?.execution_id);
    
    const { record, event_type } = payload;
    
    if (event_type !== 'INSERT' || !record) {
      return new Response(JSON.stringify({ message: 'Ignore non-insert events' }), { status: 200 });
    }

    const alert = record;
    
    // 1. Fetch execution and machine info
    const { data: execution } = await supabase
      .from('tpm_executions')
      .select(`
        *,
        machine:machines(id, name, code)
      `)
      .eq('id', alert.execution_id)
      .single();

    if (!execution) {
      console.error('Execution not found:', alert.execution_id);
      return new Response(JSON.stringify({ error: 'Execution not found' }), { status: 404 });
    }

    const machine = (execution as any).machine;

    // 2. Find users with critical notification enabled
    const { data: subscribers } = await supabase
      .from('user_notification_settings')
      .select('user_id, email_enabled')
      .eq('email_enabled', true);

    if (!subscribers || subscribers.length === 0) {
      return new Response(JSON.stringify({ message: 'No email subscribers found' }), { status: 200 });
    }

    // 3. Get subscriber emails. listUsers() is paginated (default 50/page), so
    // we must walk every page or subscribers beyond the first page silently
    // never receive this critical alert.
    const subscriberIds = new Set(subscribers.map(s => s.user_id));
    const emailById = new Map<string, string>();
    const perPage = 1000;
    for (let page = 1; ; page++) {
      const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers({ page, perPage });
      if (usersError) throw usersError;
      const users = usersData?.users ?? [];
      for (const u of users) {
        if (u.email && subscriberIds.has(u.id)) emailById.set(u.id, u.email);
      }
      // Stop early once every subscriber email is resolved or the last page is reached.
      if (users.length < perPage || emailById.size >= subscriberIds.size) break;
    }

    const subscriberEmails = subscribers
      .map(s => emailById.get(s.user_id))
      .filter((email): email is string => !!email);

    if (subscriberEmails.length === 0) {
      return new Response(JSON.stringify({ message: 'No subscriber emails found' }), { status: 200 });
    }

    // 4. Send email via Resend
    if (resendApiKey) {
      const safeEvidenceUrls = Array.isArray(alert.evidence_urls)
        ? alert.evidence_urls.map(safeImageUrl).filter((u: string | null): u is string => u !== null)
        : [];
      const evidenceHtml = safeEvidenceUrls.length > 0
        ? `<p><strong>Evidências:</strong></p><div style="display: flex; gap: 10px; margin-top: 10px;">
           ${safeEvidenceUrls.map((url: string) => `<img src="${url}" style="width: 150px; height: 150px; object-fit: cover; border-radius: 4px; border: 1px solid #ddd;" />`).join('')}
           </div>`
        : '<p><em>Nenhuma foto de evidência anexada.</em></p>';

      const htmlContent = `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #fee2e2; border-radius: 8px; border-left: 6px solid #ef4444;">
          <h2 style="color: #ef4444;">⚠️ ALERTA: Risco de Perda Detectado</h2>
          <p>Olá,</p>
          <p>Um novo alerta de risco crítico foi registrado durante a execução de uma manutenção TPM:</p>
          <div style="background: #fef2f2; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p><strong>Máquina:</strong> ${escapeHtml(machine?.name)} (${escapeHtml(machine?.code)})</p>
            <p><strong>Evento:</strong> ${escapeHtml(alert.description)}</p>
            <p><strong>Valor Registrado:</strong> ${escapeHtml(alert.actual_value)}</p>
            <p><strong>Range Esperado:</strong> ${escapeHtml(alert.expected_range)}</p>
            <p><strong>Horário da Ocorrência:</strong> ${escapeHtml(new Date(alert.created_at).toLocaleString('pt-BR'))}</p>
            <p><strong>Operador:</strong> ${escapeHtml(execution.performed_by_name || 'N/A')}</p>
          </div>
          ${evidenceHtml}
          <div style="margin-top: 25px;">
            <a href="${Deno.env.get('PUBLIC_URL') || '#'}/tpm" style="display: inline-block; padding: 12px 24px; background: #ef4444; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Investigar Ocorrência</a>
          </div>
          <p style="margin-top: 30px; font-size: 12px; color: #666;">52 STÚDIOS DE GRAVAÇÃO - Sistema de Gestão de Produção</p>
        </div>
      `;

      // Resend allows at most 50 recipients per send, so chunk the list — a
      // single 100+ recipient request would fail and nobody would be alerted.
      const RESEND_MAX_RECIPIENTS = 50;
      let sentCount = 0;
      const sendErrors: string[] = [];
      for (let i = 0; i < subscriberEmails.length; i += RESEND_MAX_RECIPIENTS) {
        const chunk = subscriberEmails.slice(i, i + RESEND_MAX_RECIPIENTS);
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          signal: AbortSignal.timeout(10_000),
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Alertas de Risco 52 STÚDIOS DE GRAVAÇÃO <notifications@resend.dev>',
            to: chunk,
            subject: `🚨 RISCO DE PERDA: ${machine?.code} - ${alert.parameter_name || 'Parâmetro'} fora do range`,
            html: htmlContent,
          }),
        });

        if (response.ok) {
          sentCount += chunk.length;
        } else {
          // Don't let one failed batch suppress the others.
          sendErrors.push(await response.text());
        }
      }

      // Only fail the whole request if every batch failed.
      if (sentCount === 0 && sendErrors.length > 0) {
        throw new Error(`Failed to send email: ${sendErrors.join('; ')}`);
      }
      if (sendErrors.length > 0) {
        console.error('[send-loss-risk-alert] Some email batches failed:', sendErrors.join('; '));
      }
    }

    return new Response(JSON.stringify({ success: true, notified: subscriberEmails.length }), { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } });
  } catch (error: unknown) {
    console.error('[send-loss-risk-alert] Error:', error instanceof Error ? error.message : String(error));
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } });
  }
});
