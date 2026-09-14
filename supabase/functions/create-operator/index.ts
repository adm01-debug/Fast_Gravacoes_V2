import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { getCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts'
import { checkRateLimit } from '../_shared/rateLimit.ts'
import { createLogger, getOrCreateRequestId, withRequestId } from '../_shared/logger.ts'
import { authenticate, requireElevatedAal2 } from '../_shared/auth.ts'

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  const requestId = getOrCreateRequestId(req);
  const log = createLogger({ fn: 'create-operator', requestId });
  const cors = withRequestId(getCorsHeaders(req), requestId);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!

    const supabaseAdmin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Etapa 6 (plano-mestre): middleware comum — valida o JWT do chamador,
    // carrega papéis ativos e o AAL da sessão em um único lugar.
    const auth = await authenticate(req, {
      supabaseUrl,
      supabaseAnonKey: Deno.env.get('SUPABASE_ANON_KEY')!,
      requestId,
      corsHeaders: cors,
    })
    if (!auth.ok) {
      log.warn('auth.rejected')
      return auth.response
    }

    // Etapa 7 (plano-mestre): criação de operadores é operação administrativa —
    // exige papel elevado (coordinator/admin) E sessão AAL2 (MFA verificado).
    // Sessões AAL1 recebem 403 MFA_REQUIRED.
    const guard = requireElevatedAal2(
      auth.ctx,
      { requestId, corsHeaders: cors },
      ['coordinator', 'admin'],
    )
    if (guard) {
      log.warn('guard.rejected', { roles: auth.ctx.roles, aal: auth.ctx.aal })
      return guard
    }

    // Rate limit: 10 operator-creations per hour per requesting user.
    const rateLimited = await checkRateLimit(supabaseAdmin, {
      endpoint: 'create-operator',
      identity: { userId: auth.ctx.userId, email: auth.ctx.email },
      max: 10,
      windowSeconds: 3600,
      corsHeaders: cors,
      requestId,
    })
    if (rateLimited) {
      log.warn('rate_limited', { userId: auth.ctx.userId })
      return rateLimited
    }

    const rawBody = await req.json().catch(() => null)
    if (!rawBody || typeof rawBody !== 'object') {
      return new Response(JSON.stringify({ error: 'Corpo da requisição inválido' }), {
        status: 400,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      })
    }
    const { email, password, full_name, phone } = rawBody

    if (!email || !password || !full_name) {
      return new Response(JSON.stringify({ error: 'Email, senha e nome são obrigatórios' }), {
        status: 400,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: 'Formato de email inválido' }), {
        status: 400,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    // Minimum password length
    if (password.length < 8) {
      return new Response(JSON.stringify({ error: 'A senha deve ter no mínimo 8 caracteres' }), {
        status: 400,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    // Create user with admin API
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    })

    if (createError) {
      console.error('Error creating user:', createError.message)
      return new Response(JSON.stringify({ error: 'Erro ao criar usuário' }), {
        status: 400,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    // Update profile with phone if provided
    if (phone && newUser.user) {
      await supabaseAdmin
        .from('profiles')
        .update({ phone })
        .eq('id', newUser.user.id)
    }

    return new Response(JSON.stringify({ 
      success: true, 
      user: { id: newUser.user?.id, email: newUser.user?.email } 
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
