import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { requireCronSecret } from '../_shared/cronAuth.ts'

import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) })
  }

  // Internal/cron-only — no frontend caller. Fail closed.
  const unauthorized = requireCronSecret(req, { failClosed: true, corsHeaders: getCorsHeaders(req) })
  if (unauthorized) return unauthorized

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Iniciando processamento de notificações TPM...')

    // 1. Verificar manutenções que precisam ser notificadas (Regras atuais)
    // Buscamos manutenções pendentes/atrasadas
    const { data: schedules, error: scheduleError } = await supabase
      .from('maintenance_schedules')
      .select(`
        *,
        machine:machines(id, name, code)
      `)
      .eq('is_active', true)

    if (scheduleError) throw scheduleError

    // 2. Processar cada agendamento e verificar regras de severidade
    for (const schedule of schedules || []) {
      // Verificar se existe execução em andamento ou aguardando aprovação
      const { data: ongoingRecords } = await supabase
        .from('maintenance_records')
        .select('id, status')
        .eq('schedule_id', schedule.id)
        .in('status', ['in_progress', 'completed'])
        .limit(1)

      if (ongoingRecords && ongoingRecords.length > 0) {
        console.log(`Pulando notificações para ${schedule.machine?.code ?? schedule.machine_id}: Manutenção em execução ou aguardando revisão.`)
        continue
      }

      // Lógica de severidade e throttling aqui...
      console.log(`Verificando máquina: ${schedule.machine?.code ?? schedule.machine_id}`)
    }

    // 3. Processar Fila (Retentativas)
    const { data: queueItems, error: queueError } = await supabase
      .from('tpm_notification_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('next_retry_at', new Date().toISOString())
      .lt('retry_count', 3)
      .limit(10)

    if (queueError) throw queueError

    const resendApiKey = Deno.env.get('RESEND_API_KEY')

    for (const item of queueItems || []) {
      console.log(`Processando item da fila: ${item.id} (${item.channel})`)

      try {
        if (item.channel === 'email' && resendApiKey) {
          // Envio real via Resend — mesmo padrão já usado e validado em send-tpm-email.
          const subject = item.payload?.subject ?? `Alerta TPM (${item.severity})`
          const html = item.payload?.html ?? item.payload?.message ?? 'Notificação de manutenção TPM.'
          const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            signal: AbortSignal.timeout(10_000),
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: '52 STÚDIOS DE GRAVAÇÃO TPM <notifications@resend.dev>',
              to: [item.recipient],
              subject,
              html,
            }),
          })
          if (!response.ok) throw new Error(`Falha ao enviar e-mail: ${await response.text()}`)
        } else {
          // Sem provedor real de envio para este canal (ex.: whatsapp/push sem
          // integração implementada, ou email sem RESEND_API_KEY configurada) —
          // nunca marcar como enviado sem ter tentado enviar de verdade.
          throw new Error(`Canal '${item.channel}' sem provedor de envio configurado`)
        }

        await supabase
          .from('tpm_notification_queue')
          .update({
            status: 'sent',
            processed_at: new Date().toISOString()
          })
          .eq('id', item.id)

        // Registrar no log
        await supabase.from('tpm_notification_logs').insert({
          machine_id: item.machine_id,
          channel: item.channel,
          severity: item.severity,
          recipient: item.recipient,
          status: 'success',
          sent_at: new Date().toISOString()
        })
      } catch (e: unknown) {
        console.error('Error processing TPM notification item:', item.id, e)
        const nextRetry = new Date()
        nextRetry.setMinutes(nextRetry.getMinutes() + Math.pow(2, item.retry_count + 1))

        await supabase
          .from('tpm_notification_queue')
          .update({
            status: 'failed',
            retry_count: item.retry_count + 1,
            next_retry_at: nextRetry.toISOString(),
            error_log: e instanceof Error ? e.message : String(e)
          })
          .eq('id', item.id)
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: queueItems?.length || 0 }),
      { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    )
  } catch (error: unknown) {
    console.error('Erro no processamento TPM:', error instanceof Error ? error.message : String(error))
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    )
  }
})
