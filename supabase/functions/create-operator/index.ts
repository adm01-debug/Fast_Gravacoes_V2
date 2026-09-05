import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { getCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts'
import { checkRateLimit } from '../_shared/rateLimit.ts'
import { createLogger, getOrCreateRequestId, withRequestId } from '../_shared/logger.ts'

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  const requestId = getOrCreateRequestId(req);
  const log = createLogger({ fn: 'create-operator', requestId });
  const cors = withRequestId(getCorsHeaders(req), requestId);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Verify the requesting user is a coordinator
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user: requestingUser } } = await supabaseClient.auth.getUser()
    if (!requestingUser) {
      return new Response(JSON.stringify({ error: 'Não autorizado', requestId }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Rate limit: 10 operator-creations per hour per requesting user.
    const rateLimited = await checkRateLimit(supabaseAdmin, {
      endpoint: 'create-operator',
      identity: { userId: requestingUser.id, email: requestingUser.email ?? null },
      max: 10,
      windowSeconds: 3600,
      corsHeaders: cors,
      requestId,
    })
    if (rateLimited) {
      log.warn('rate_limited', { userId: requestingUser.id })
      return rateLimited
    }

    // Check if requesting user is coordinator/admin. Fetch all role rows: a
    // user may have more than one, and .single() would error in that case.
    const { data: roleRows, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id)
      .eq('is_active', true)

    if (roleError) {
      // Backend failure must not be reported as an authorization denial.
      return new Response(JSON.stringify({ error: 'Falha ao verificar permissão' }), {
        status: 500,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    const requesterRoles = (roleRows ?? []).map((r: { role: string }) => r.role)
    if (!requesterRoles.some((role) => ['coordinator', 'admin'].includes(role))) {
      return new Response(JSON.stringify({ error: 'Apenas coordenadores e administradores podem criar operadores' }), {
        status: 403,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      })
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