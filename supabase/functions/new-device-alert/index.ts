import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'https://esm.sh/resend@2.0.0';
import { getCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';
import { escapeHtml } from '../_shared/htmlEscape.ts';
import { createLogger, getOrCreateRequestId, withRequestId } from '../_shared/logger.ts';
import { authenticate } from '../_shared/auth.ts';

interface DeviceInfo {
  user_id: string;
  user_email: string;
  user_name?: string;
  device_fingerprint: string;
  ip_address: string;
  user_agent: string;
  browser_name?: string;
  os_name?: string;
  device_type?: string;
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  const requestId = getOrCreateRequestId(req);
  const log = createLogger({ fn: 'new-device-alert', requestId });
  const cors = withRequestId(getCorsHeaders(req), requestId);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Etapas 26-27 do plano-50: middleware comum substitui a verificação manual.
    // Contrato preservado: qualquer usuário autenticado (a identidade do device
    // é FORÇADA a partir do JWT — ver abaixo); sem role gate.
    const auth = await authenticate(req, {
      supabaseUrl,
      supabaseAnonKey: anonKey,
      requestId,
      corsHeaders: cors,
    });
    if (!auth.ok) {
      log.warn('auth.rejected');
      return auth.response;
    }
    // Header ORIGINAL preservado para repassar ao send-push-notification
    // (que revalida o JWT do usuário — service role não é aceito lá).
    const authHeader = req.headers.get('authorization');

    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseKey);

    const rawBody = await req.json().catch(() => null);
    if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
      return new Response(JSON.stringify({ error: 'Corpo da requisição inválido' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    const deviceInfo: DeviceInfo = rawBody as DeviceInfo;
    // Trust the already-verified JWT principal, not the body, for identity
    // fields — a caller must not be able to forge device records or trigger
    // alert emails for arbitrary users/addresses.
    deviceInfo.user_id = auth.ctx.userId;
    deviceInfo.user_email = auth.ctx.email ?? '';
    // Derive IP from the request, not the caller-supplied body, to prevent
    // a malicious caller from injecting a forged IP into DB rows and alert emails.
    const forwardedFor = req.headers.get('x-forwarded-for');
    deviceInfo.ip_address = forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown';

    console.log('Checking device for user:', auth.ctx.userId);
    console.log('Device fingerprint:', deviceInfo.device_fingerprint);

    // Verificar se o dispositivo já existe
    const { data: existingDevice, error: deviceError } = await supabase
      .from('user_devices')
      .select('*')
      .eq('user_id', auth.ctx.userId)
      .eq('device_fingerprint', deviceInfo.device_fingerprint)
      .maybeSingle();

    if (deviceError) {
      console.error('Error checking device:', deviceError);
      throw deviceError;
    }

    const now = new Date().toISOString();
    let isNewDevice = false;
    let deviceId: string;

    if (existingDevice) {
      // Dispositivo conhecido - atualizar last_seen_at
      console.log('Known device, updating last_seen_at');
      
      const { error: updateError } = await supabase
        .from('user_devices')
        .update({ 
          last_seen_at: now,
          ip_address: deviceInfo.ip_address,
          user_agent: deviceInfo.user_agent
        })
        .eq('id', existingDevice.id);

      if (updateError) {
        console.error('Error updating device:', updateError);
      }
      
      deviceId = existingDevice.id;
    } else {
      // Novo dispositivo detectado
      console.log('New device detected!');
      isNewDevice = true;

      const { data: newDevice, error: insertError } = await supabase
        .from('user_devices')
        .insert({
          user_id: auth.ctx.userId,
          device_fingerprint: deviceInfo.device_fingerprint,
          ip_address: deviceInfo.ip_address,
          user_agent: deviceInfo.user_agent,
          browser_name: deviceInfo.browser_name,
          os_name: deviceInfo.os_name,
          device_type: deviceInfo.device_type,
          is_trusted: false
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting device:', insertError);
        throw insertError;
      }

      deviceId = newDevice.id;

      // Criar alerta de novo dispositivo
      const { error: alertError } = await supabase
        .from('new_device_alerts')
        .insert({
          user_id: auth.ctx.userId,
          device_id: deviceId,
          ip_address: deviceInfo.ip_address,
          user_agent: deviceInfo.user_agent
        });

      if (alertError) {
        console.error('Error creating alert:', alertError);
      }

      // Enviar email de alerta
      if (resendApiKey && auth.ctx.email) {
        try {
          const resend = new Resend(resendApiKey);

          const browserInfo = deviceInfo.browser_name || 'Navegador desconhecido';
          const osInfo = deviceInfo.os_name || 'Sistema operacional desconhecido';
          const deviceTypeInfo = deviceInfo.device_type || 'desktop';
          // Escape caller-supplied fields before interpolating into HTML email body.
          const safeName = escapeHtml(deviceInfo.user_name || '');
          const safeBrowser = escapeHtml(browserInfo);
          const safeOs = escapeHtml(osInfo);
          const safeIp = escapeHtml(deviceInfo.ip_address || 'Não disponível');
          const loginTime = new Date().toLocaleString('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            dateStyle: 'full',
            timeStyle: 'medium'
          });

          const emailResponse = await resend.emails.send({
            from: 'Segurança <onboarding@resend.dev>',
            to: [auth.ctx.email],
            subject: '⚠️ Novo dispositivo detectado na sua conta',
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  
                  <!-- Header -->
                  <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; text-align: center;">
                    <div style="font-size: 48px; margin-bottom: 10px;">🔐</div>
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Alerta de Segurança</h1>
                  </div>
                  
                  <!-- Content -->
                  <div style="padding: 30px;">
                    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-top: 0;">
                      Olá${safeName ? ` ${safeName}` : ''},
                    </p>
                    
                    <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                      Detectamos um acesso à sua conta a partir de um <strong>novo dispositivo</strong>. 
                      Se foi você, pode ignorar este email. Caso contrário, recomendamos que altere sua senha imediatamente.
                    </p>
                    
                    <!-- Device Info Box -->
                    <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0;">
                      <h3 style="color: #92400e; margin: 0 0 15px 0; font-size: 16px;">📱 Detalhes do Acesso</h3>
                      
                      <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                          <td style="padding: 8px 0; color: #78716c; font-size: 14px;">Data/Hora:</td>
                          <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 500;">${loginTime}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #78716c; font-size: 14px;">Navegador:</td>
                          <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 500;">${safeBrowser}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #78716c; font-size: 14px;">Sistema:</td>
                          <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 500;">${safeOs}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #78716c; font-size: 14px;">Tipo:</td>
                          <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 500;">${deviceTypeInfo === 'mobile' ? '📱 Celular' : deviceTypeInfo === 'tablet' ? '📱 Tablet' : '💻 Computador'}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #78716c; font-size: 14px;">Endereço IP:</td>
                          <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 500;">${safeIp}</td>
                        </tr>
                      </table>
                    </div>
                    
                    <!-- Warning -->
                    <div style="background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
                      <p style="color: #991b1b; margin: 0; font-size: 14px;">
                        <strong>⚠️ Não reconhece este acesso?</strong><br>
                        Altere sua senha imediatamente e revise os dispositivos conectados à sua conta.
                      </p>
                    </div>
                  </div>
                  
                  <!-- Footer -->
                  <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="color: #6b7280; font-size: 12px; margin: 0;">
                      Este é um email automático de segurança. Por favor, não responda.
                    </p>
                  </div>
                </div>
              </body>
              </html>
            `,
          });

          console.log('Alert email sent:', emailResponse);

          // Atualizar alerta com status do email
          await supabase
            .from('new_device_alerts')
            .update({
              email_sent: true,
              email_sent_at: now
            })
            .eq('device_id', deviceId)
            .eq('user_id', auth.ctx.userId);

        } catch (emailError) {
          console.error('Error sending alert email:', emailError);
        }
      }

      // Enviar push notification
      try {
        const browserInfo = deviceInfo.browser_name || 'Navegador desconhecido';
        const osInfo = deviceInfo.os_name || 'Sistema desconhecido';
        
        const pushPayload = {
          user_id: auth.ctx.userId,
          title: '🔐 Novo Dispositivo Detectado',
          body: `Login detectado de ${browserInfo} em ${osInfo}. IP: ${deviceInfo.ip_address || 'desconhecido'}`,
          data: { 
            url: '/seguranca',
            type: 'new_device',
            device_id: deviceId
          }
        };

        // Chamar a edge function de push notification usando o JWT do usuário
        // (não o service role key, que não é aceito pelo endpoint que valida JWT).
        const pushResponse = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader!,  // garantido pelo authenticate() acima
          },
          body: JSON.stringify(pushPayload),
          signal: AbortSignal.timeout(10_000),
        });

        if (pushResponse.ok) {
          console.log('Push notification sent successfully');
        } else {
          console.log('Push notification skipped or failed:', await pushResponse.text());
        }
      } catch (pushError) {
        console.error('Error sending push notification:', pushError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        is_new_device: isNewDevice,
        device_id: deviceId
      }),
      { 
        headers: { ...cors, 'Content-Type': 'application/json' }, 
        status: 200 
      }
    );

  } catch (err: unknown) {
    console.error('Error in new-device-alert:', err instanceof Error ? err.message : String(err));
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        headers: { ...cors, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
