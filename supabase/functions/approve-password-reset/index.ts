import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { approvePasswordResetSchema } from '../_shared/validation.ts'
import { getCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts'
import { checkRateLimit } from '../_shared/rateLimit.ts'
import { createLogger, getOrCreateRequestId, withRequestId } from '../_shared/logger.ts'
import { parseOrError } from '../_shared/validate.ts'

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

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado', requestId }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const supabaseClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user: requestingUser } } = await supabaseClient.auth.getUser()
    if (!requestingUser) {
      return new Response(JSON.stringify({ error: 'Não autorizado', requestId }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Check if requesting user is coordinator or manager. Use list (no .single())
    // because a user may have multiple active roles.
    const { data: roleRows, error: roleCheckError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id)
      .eq('is_active', true)

    if (roleCheckError) {
      return new Response(JSON.stringify({ error: 'Falha ao verificar permissão' }), {
        status: 500,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    if (!(roleRows ?? []).some((r: { role: string }) => ['coordinator', 'manager'].includes(r.role))) {
      return new Response(JSON.stringify({ error: 'Apenas coordenadores e gerentes podem aprovar solicitações', requestId }), {
        status: 403,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Rate limit: 30 approvals per hour per reviewer.
    const rateLimited = await checkRateLimit(supabaseAdmin, {
      endpoint: 'approve-password-reset',
      identity: { userId: requestingUser.id, email: requestingUser.email ?? null },
      max: 30,
      windowSeconds: 3600,
      corsHeaders: cors,
      requestId,
    })
    if (rateLimited) {
      log.warn('rate_limited', { userId: requestingUser.id })
      return rateLimited
    }

    // Get reviewer name
    const { data: reviewerProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', requestingUser.id)
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
        reviewed_by: requestingUser.id,
        reviewed_by_name: reviewerProfile?.full_name || requestingUser.email,
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
