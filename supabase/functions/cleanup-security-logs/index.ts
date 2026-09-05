import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { requireCronSecret } from '../_shared/cronAuth.ts';

import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  // Destructive cleanup of the security audit trail — fail closed if
  // CRON_SECRET is not configured, same posture as cron-cleanup/backup-scheduler.
  const unauthorized = requireCronSecret(req, { failClosed: true, corsHeaders: getCorsHeaders(req) });
  if (unauthorized) return unauthorized;

  try {
    const apiKey = Deno.env.get('CRON_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }
    const provided = req.headers.get('x-api-key') || req.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (provided !== apiKey) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    console.log('Starting security logs cleanup...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Clean up old rate limit logs
    const { error: rateLimitError } = await supabase
      .from('rate_limit_logs')
      .delete()
      .lt('created_at', sevenDaysAgo.toISOString());

    if (rateLimitError) console.error('Error cleaning rate limit logs:', rateLimitError);

    // Clean up old security events
    const { error: securityError } = await supabase
      .from('security_events')
      .delete()
      .lt('created_at', thirtyDaysAgo.toISOString());

    if (securityError) console.error('Error cleaning security events:', securityError);

    // Clean up old login audit logs
    const { error: loginAuditError } = await supabase
      .from('login_audit')
      .delete()
      .lt('created_at', thirtyDaysAgo.toISOString());

    if (loginAuditError) console.error('Error cleaning login audit logs:', loginAuditError);

    // Clean up expired blocked IPs
    const { error: blockedError } = await supabase
      .from('blocked_ips')
      .update({ unblocked_at: now.toISOString() })
      .lt('expires_at', now.toISOString())
      .is('unblocked_at', null)
      .eq('is_permanent', false);

    if (blockedError) console.error('Error cleaning expired blocked IPs:', blockedError);

    console.log('Cleanup completed successfully');

    return new Response(
      JSON.stringify({ success: true, timestamp: now.toISOString() }),
      { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (err: unknown) {
    console.error('Cleanup error:', err instanceof Error ? err.message : String(err));
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
