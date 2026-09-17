import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { getCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';
import { createLogger, getOrCreateRequestId, withRequestId } from '../_shared/logger.ts';
import { authenticate, requireElevatedAal2 } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  const requestId = getOrCreateRequestId(req);
  const log = createLogger({ fn: 'update-operator', requestId });
  const cors = withRequestId(getCorsHeaders(req), requestId);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;

    const supabaseAdmin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Etapas 26-27 do plano-50: middleware comum substitui a verificacao
    // manual duplicada (header -> getUser -> role lookup -> gate).
    const auth = await authenticate(req, {
      supabaseUrl,
      supabaseAnonKey: Deno.env.get('SUPABASE_ANON_KEY')!,
      requestId,
      corsHeaders: cors,
    });
    if (!auth.ok) {
      log.warn('auth.rejected');
      return auth.response;
    }

    // Editar operadores e operacao administrativa — mesmo criterio do
    // create-operator: papel elevado (coordinator/admin) E sessao AAL2.
    const guard = requireElevatedAal2(
      auth.ctx,
      { requestId, corsHeaders: cors },
      ['coordinator', 'admin'],
    );
    if (guard) {
      log.warn('guard.rejected', { roles: auth.ctx.roles, aal: auth.ctx.aal });
      return guard;
    }

    const rawBody = await req.json().catch(() => null);
    if (!rawBody || typeof rawBody !== 'object') {
      return new Response(JSON.stringify({ error: 'Corpo da requisição inválido' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    const { operator_id, full_name, phone } = rawBody;

    if (!operator_id) {
      return new Response(JSON.stringify({ error: 'ID do operador é obrigatório' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    if (!full_name?.trim()) {
      return new Response(JSON.stringify({ error: 'Nome é obrigatório' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    log.info('operator.update', { operatorId: operator_id });

    // Update profile
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        full_name: full_name.trim(),
        phone: phone?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', operator_id);

    if (updateError) {
      log.error('profile.update_failed', { reason: updateError.message });
      return new Response(JSON.stringify({ error: 'Erro ao atualizar operador' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    log.info('operator.updated');

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    log.error('unhandled', { reason: String(error) });
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
