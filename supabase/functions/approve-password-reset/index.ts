import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { approvePasswordResetSchema } from '../_shared/validation.ts'
import { getCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts'
import { checkRateLimit } from '../_shared/rateLimit.ts'
import { createLogger, getOrCreateRequestId, withRequestId } from '../_shared/logger.ts'
import { parseOrError } from '../_shared/validate.ts'
import { authenticate, requireRole } from '../_shared/auth.ts'

const APP_URL = Deno.env.get('APP_URL') || 'https://fastgravacoes.com.br';

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  const requestId = getOrCreateRequestId(req);
  const log = createLogger({ fn: 'approve-password-reset', requestId });
  const cors = withRequestId(getCorsHeaders(req), requestId);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // Etapas 26-27 do plano-50: middleware comum substitui a verificação manual
    // duplicada (header -> getUser -> role lookup -> gate).
    const auth = await authenticate(req, {
      supabaseUrl,
      supabaseAnonKey: anonKey,
      requestId,
      corsHeaders: cors,
    })
    if (!auth.ok) {
      log.warn('auth.rejected')
      return auth.response
    }

    // Comportamento preservado (coordinator/manager). Elevação para AAL2 é
    // evolução futura do plano-mestre — não introduzida aqui para não quebrar
    // o contrato atual do aprovador.
    const forbidden = requireRole(auth.ctx, ['coordinator', 'manager'], { requestId, corsHeaders: cors })
    if (forbidden) {
      log.warn('guard.rejected', { roles: auth.ctx.roles })
      return forbidden
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Rate limit: 30 approvals per hour per reviewer.
    const rateLimited = await checkRateLimit(supabaseAdmin, {
      endpoint: 'approve-password-reset',
      identity: { userId: auth.ctx.userId, email: auth.ctx.email },
      max: 30,
      windowSeconds: 3600,
      corsHeaders: cors,
      requestId,
    })
    if (rateLimited) {
      log.warn('rate_limited', { userId: auth.ctx.userId })
      return rateLimited
    }

    // Get reviewer name
    const { data: reviewerProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', auth.ctx.userId)
      .single()

    const parsed = await parseOrError(approvePasswordResetSchema, req, { corsHeaders: cors, requestId });
    if (parsed.response) return parsed.response;

    const { requestId: resetRequestId, action, rejectionReason, redirectUrl } = parsed.data;


    // Get the request
    const { data: resetRequest, error: fetchError } = await supabaseAdmin
      .from('password_reset_requests')
      .select('*')
      .eq('id', resetRequestId)
      .single()

    if (fetchError || !resetRequest) {
      console.error('Error fetching request:', fetchError)
      return new Response(JSON.stringify({ error: 'Solicitação não encontrada' }), {
        status: 404,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    if (resetRequest.status !== 'pending') {
      return new Response(JSON.stringify({ error: 'Solicitação já foi processada' }), {
        status: 400,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    // Check if expired
    if (new Date(resetRequest.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'Solicitação expirada' }), {
        status: 400,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    // Update the request status
    const { error: updateError } = await supabaseAdmin
      .from('password_reset_requests')
      .update({
        status: action === 'approve' ? 'approved' : 'rejected',
        reviewed_by: auth.ctx.userId,
        reviewed_by_name: reviewerProfile?.full_name || auth.ctx.email,
        reviewed_at: new Date().toISOString(),
        rejection_reason: action === 'reject' ? rejectionReason : null,
      })
      .eq('id', resetRequestId)

    if (updateError) {
      console.error('Error updating request:', updateError)
      return new Response(JSON.stringify({ error: 'Erro ao atualizar solicitação' }), {
        status: 500,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    // If approved, send the password reset email
    if (action === 'approve') {
      // Validate redirectUrl against APP_URL origin to prevent open redirects
      const safeRedirectUrl = (() => {
        const defaultUrl = `${APP_URL}/reset-password`;
        if (!redirectUrl) return defaultUrl;
        try {
          const parsed = new URL(redirectUrl);
          const allowed = new URL(APP_URL);
          if (parsed.origin !== allowed.origin) return defaultUrl;
          return redirectUrl;
        } catch {
          return defaultUrl;
        }
      })();

      const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(
        resetRequest.user_email,
        { redirectTo: safeRedirectUrl }
      )

      if (resetError) {
        console.error('Error sending reset email:', resetError)
        return new Response(JSON.stringify({ error: 'Erro ao enviar email de redefinição' }), {
          status: 500,
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        })
      }

      console.log('Password reset email sent after approval')
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: action === 'approve' 
        ? 'Solicitação aprovada. Email de redefinição enviado.' 
        : 'Solicitação rejeitada.'
    }), {
      status: 200,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), {
      status: 500,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    })
  }
})
