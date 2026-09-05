import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";


interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
  blockDurationMinutes: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 100,
  windowSeconds: 60,
  blockDurationMinutes: 15,
};

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Derive caller identity from a verified JWT, not from the request body.
  // Callers without a valid JWT can still be rate-limited by IP, but they
  // cannot supply or forge user_id / user_email in the log entries.
  const authHeader = req.headers.get('Authorization');
  let verifiedUserId: string | undefined;
  let verifiedUserEmail: string | undefined;
  if (authHeader) {
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (user) {
      verifiedUserId = user.id;
      verifiedUserEmail = user.email ?? undefined;
    }
  }

  // Guarda de abuso do próprio endpoint de rate limit (público): anônimos são
  // limitados por IP para não conseguirem inflar `rate_limit_logs`.
  if (!verifiedUserId) {
    const selfLimited = await checkRateLimit(supabase, {
      endpoint: 'rate-limit-check:self',
      identity: { ip: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') },
      max: 60,
      windowSeconds: 60,
      corsHeaders: getCorsHeaders(req),
    });
    if (selfLimited) return selfLimited;
  }

  try {

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    // Accept `endpoint` from the body; ignore any client-supplied user_id/user_email.
    const { endpoint } = body;

    if (!endpoint || typeof endpoint !== 'string') {
      return new Response(
        JSON.stringify({ error: 'endpoint is required' }),
        { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validate endpoint format before storing in DB: max 255 printable ASCII chars,
    // no control characters. Rejects attempts to inject nulls or long blobs.
    if (endpoint.length > 255 || /[^\x20-\x7e]/u.test(endpoint)) {
      return new Response(
        JSON.stringify({ error: 'Invalid endpoint format' }),
        { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get client IP from headers (server-derived, not client-supplied)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || '0.0.0.0';

    console.log(`Rate limit check for IP: ${ip}, endpoint: ${endpoint}`);

    // Check if IP is blocked. Order so that a permanent / longest-lived block
    // wins when duplicate rows exist for the same IP.
    const { data: blockedIP } = await supabase
      .from('blocked_ips')
      .select('id, expires_at, is_permanent')
      .eq('ip_address', ip)
      .is('unblocked_at', null)
      .order('is_permanent', { ascending: false })
      .order('expires_at', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    if (blockedIP) {
      if (!blockedIP.is_permanent && blockedIP.expires_at) {
        const expiresAt = new Date(blockedIP.expires_at);
        if (expiresAt > new Date()) {
          console.log(`IP ${ip} is blocked until ${blockedIP.expires_at}`);
          return new Response(
            JSON.stringify({
              allowed: false,
              reason: 'ip_blocked',
              expires_at: blockedIP.expires_at,
            }),
            { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }, status: 429 }
          );
        }
      } else if (blockedIP.is_permanent) {
        console.log(`IP ${ip} is permanently blocked`);
        return new Response(
          JSON.stringify({ allowed: false, reason: 'ip_blocked_permanent' }),
          { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }, status: 429 }
        );
      }
    }

    // Get rate limit config for endpoint
    let config = DEFAULT_CONFIG;
    const { data: settings } = await supabase
      .from('rate_limit_settings')
      .select('*')
      .eq('is_active', true)
      .order('endpoint_pattern');

    if (settings) {
      for (const setting of settings) {
        const pattern = setting.endpoint_pattern;
        if (
          pattern === endpoint ||
          (pattern.endsWith('*') && endpoint.startsWith(pattern.slice(0, -1))) ||
          pattern === '*'
        ) {
          config = {
            maxRequests: setting.max_requests,
            windowSeconds: setting.window_seconds,
            blockDurationMinutes: setting.block_duration_minutes,
          };
          break;
        }
      }
    }

    const now = new Date();
    const windowStart = new Date(now.getTime() - config.windowSeconds * 1000);

    const { count, error: countError } = await supabase
      .from('rate_limit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('ip_address', ip)
      .eq('endpoint', endpoint)
      .gte('created_at', windowStart.toISOString());

    if (countError) {
      console.error('Error counting requests:', countError);
    }

    const requestCount = (count || 0) + 1;

    // Log this request using only server-verified identity fields
    await supabase.from('rate_limit_logs').insert({
      ip_address: ip,
      endpoint: endpoint,
      user_id: verifiedUserId ?? null,
      user_email: verifiedUserEmail ?? null,
      request_count: requestCount,
      window_start: windowStart.toISOString(),
      window_end: now.toISOString(),
      is_blocked: requestCount > config.maxRequests,
    });

    if (requestCount > config.maxRequests) {
      console.log(`Rate limit exceeded for IP ${ip}: ${requestCount}/${config.maxRequests}`);

      const expiresAt = new Date(now.getTime() + config.blockDurationMinutes * 60 * 1000);

      await supabase.from('blocked_ips').insert({
        ip_address: ip,
        reason: `Rate limit exceeded: ${requestCount} requests in ${config.windowSeconds}s on ${endpoint}`,
        expires_at: expiresAt.toISOString(),
        is_permanent: false,
        request_count_at_block: requestCount,
      });

      await supabase.from('security_events').insert({
        event_type: 'rate_limit_exceeded',
        severity: 'warning',
        user_id: verifiedUserId ?? null,
        user_email: verifiedUserEmail ?? null,
        ip_address: ip,
        details: {
          endpoint,
          request_count: requestCount,
          max_requests: config.maxRequests,
          window_seconds: config.windowSeconds,
          block_duration_minutes: config.blockDurationMinutes,
        },
      });

      return new Response(
        JSON.stringify({
          allowed: false,
          reason: 'rate_limit_exceeded',
          retry_after: config.blockDurationMinutes * 60,
        }),
        { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }, status: 429 }
      );
    }

    return new Response(
      JSON.stringify({
        allowed: true,
        remaining: config.maxRequests - requestCount,
        reset_at: new Date(now.getTime() + config.windowSeconds * 1000).toISOString(),
      }),
      { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Rate limit check error:', message);

    // Fail closed: on internal errors deny the request rather than silently
    // allowing unlimited traffic. Callers should handle 503 with retry logic.
    return new Response(
      JSON.stringify({ allowed: false, error: 'Rate limit check unavailable', retry_after: 5 }),
      { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }, status: 503 }
    );
  }
});
