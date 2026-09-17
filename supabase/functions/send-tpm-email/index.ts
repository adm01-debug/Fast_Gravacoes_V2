import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireCronSecret } from "../_shared/cronAuth.ts";
import { escapeHtml } from "../_shared/htmlEscape.ts";

import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  // Triggered only by the Supabase DB webhook on maintenance_alerts INSERT —
  // requires the shared secret configured on that webhook's headers.
  const unauthorized = requireCronSecret(req, { failClosed: true, corsHeaders: getCorsHeaders(req) });
  if (unauthorized) return unauthorized;

  try {
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
    
    console.log('[send-tpm-email] Payload received:', payload?.event_type, 'machine_id:', payload?.record?.machine_id);
    
    const { record, event_type } = payload;
    
    if (event_type !== 'INSERT' || !record) {
      return new Response(JSON.stringify({ message: 'Ignore non-insert events' }), { status: 200 });
    }

    const alert = record;
    
    // 1. Fetch machine info
    const { data: machine } = await supabase
      .from('machines')
      .select('name, code')
      .eq('id', alert.machine_id)
      .single();

    // 2. Find users who should receive this notification
    const { data: subscribers } = await supabase
      .from('user_notification_settings')
      .select('user_id, email_enabled, notification_types, machine_filters')
      .eq('email_enabled', true);

    if (!subscribers || subscribers.length === 0) {
      return new Response(JSON.stringify({ message: 'No email subscribers found' }), { status: 200 });
    }

    const filteredSubscribers = subscribers.filter(s => {
      // notification_types / machine_filters can be NULL in the DB — guard against it.
      const types = s.notification_types ?? [];
      const machineFilters = s.machine_filters ?? [];
      const typeMatch = types.includes(alert.alert_type);
      const machineMatch = machineFilters.length === 0 || machineFilters.includes(alert.machine_id);
      return typeMatch && machineMatch;
    });

    if (filteredSubscribers.length === 0) {
      return new Response(JSON.stringify({ message: 'No matching subscribers for this alert' }), { status: 200 });
    }

    // 3. Get subscriber emails — must paginate: default listUsers() returns only 50 rows
    const subscriberIds = new Set(filteredSubscribers.map(s => s.user_id));
    const emailById = new Map<string, string>();
    const perPage = 1000;
    for (let page = 1; ; page++) {
      const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers({ page, perPage });
      if (usersError) throw usersError;
      const users = usersData?.users ?? [];
      for (const u of users) {
        if (u.email && subscriberIds.has(u.id)) emailById.set(u.id, u.email);
      }
      if (users.length < perPage || emailById.size >= subscriberIds.size) break;
    }
    const subscriberEmails = filteredSubscribers
      .map(s => emailById.get(s.user_id))
      .filter((email): email is string => !!email);

    if (subscriberEmails.length === 0) {
      return new Response(JSON.stringify({ message: 'No subscriber emails found' }), { status: 200 });
    }

    // 4. Send email via Resend
    if (resendApiKey) {
      const iconMap: Record<string, string> = { upcoming: '📅', due: '⚠️', overdue: '🔴', critical: '🚨' };
      const titleMap: Record<string, string> = { upcoming: 'Manutenção Próxima', due: 'Manutenção Vencendo', overdue: 'Manutenção Atrasada', critical: 'ALERTA CRÍTICO' };

      const htmlContent = `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #f97316;">${iconMap[alert.alert_type]} ${escapeHtml(titleMap[alert.alert_type])}</h2>
          <p>Olá,</p>
          <p>Uma nova notificação de manutenção foi gerada para o sistema TPM:</p>
          <div style="background: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p><strong>Máquina:</strong> ${escapeHtml(machine?.name)} (${escapeHtml(machine?.code)})</p>
            <p><strong>Mensagem:</strong> ${escapeHtml(alert.message)}</p>
            <p><strong>Data/Hora:</strong> ${escapeHtml(new Date(alert.created_at).toLocaleString('pt-BR'))}</p>
          </div>
          <p>Para mais detalhes e execução da manutenção, acesse o painel TPM:</p>
          <a href="${Deno.env.get('PUBLIC_URL') || '#'}/tpm" style="display: inline-block; padding: 10px 20px; background: #f97316; color: white; text-decoration: none; border-radius: 6px;">Ver Painel TPM</a>
          <p style="margin-top: 30px; font-size: 12px; color: #666;">52 STÚDIOS DE GRAVAÇÃO - Sistema de Gestão de Produção</p>
        </div>
      `;

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        signal: AbortSignal.timeout(10_000),
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: '52 STÚDIOS DE GRAVAÇÃO TPM <notifications@resend.dev>',
          to: subscriberEmails,
          subject: `${iconMap[alert.alert_type]} Alerta TPM: ${machine?.code}`,
          html: htmlContent,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to send email: ${error}`);
      }
    }

    return new Response(JSON.stringify({ success: true, notified: subscriberEmails.length }), { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } });
  } catch (error: unknown) {
    console.error('[send-tpm-email] Error:', error instanceof Error ? error.message : String(error));
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } });
  }
});
