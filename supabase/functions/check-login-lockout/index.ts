import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

import { getCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";

const MAX_FAILED_ATTEMPTS = 5;
const BASE_LOCKOUT_MINUTES = 1; // First lockout: 1 minute

interface LockoutRequest {
  email: string;
  action: 'check' | 'record_failure' | 'record_success';
}

function getClientIp(req: Request): string | null {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  const realIp = req.headers.get('x-real-ip');
  return realIp ? realIp.trim() : null;
}

interface LockoutRecord {
  id: string;
  identifier: string;
  identifier_type: string;
  failed_attempts: number;
  last_failed_at: string | null;
  locked_until: string | null;
  lockout_count: number;
}

// Calculate lockout duration with exponential backoff
function calculateLockoutMinutes(lockoutCount: number): number {
  // 1, 2, 4, 8, 16, 32... minutes (max 24 hours)
  const minutes = BASE_LOCKOUT_MINUTES * Math.pow(2, lockoutCount);
  return Math.min(minutes, 24 * 60); // Max 24 hours
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email, action }: LockoutRequest = await req.json();
    // Server-derived — a client-supplied IP would let an attacker spoof/rotate
    // to evade IP-based lockout, or frame another IP as the failing source.
    const ip_address = getClientIp(req);

    // Endpoint público (verify_jwt = false): limita enumeração de e-mails e
    // flood de tentativas a partir de um mesmo IP.
    const limited = await checkRateLimit(supabase, {
      endpoint: 'check-login-lockout',
      identity: { ip: ip_address },
      max: 30,
      windowSeconds: 60,
      corsHeaders: getCorsHeaders(req),
    });
    if (limited) return limited;



    if (!email || !action) {
      return new Response(
        JSON.stringify({ error: 'Email and action are required' }),
        { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    // Reject malformed email addresses to prevent abuse
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || normalizedEmail.length > 254) {
      return new Response(JSON.stringify({ error: 'Invalid email' }), {
        status: 400,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    // record_success must prove the caller actually holds a session for this
    // email — otherwise anyone could call action=record_success for any
    // email to reset their own (or a stranger's) failed-attempt counter and
    // brute-force indefinitely without ever having valid credentials.
    if (action === 'record_success') {
      const authHeader = req.headers.get('Authorization');
      const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
      const userClient = authHeader
        ? createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } })
        : null;
      const { data: { user } } = userClient ? await userClient.auth.getUser() : { data: { user: null } };
      if (!user || user.email?.toLowerCase().trim() !== normalizedEmail) {
        return new Response(
          JSON.stringify({ error: 'Não autorizado' }),
          { status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get current lockout status for email
    const { data: emailLockout, error: emailError } = await supabase
      .from('login_lockouts')
      .select('*')
      .eq('identifier', normalizedEmail)
      .eq('identifier_type', 'email')
      .maybeSingle();

    if (emailError) {
      console.error('Error fetching email lockout:', emailError);
      throw emailError;
    }

    // Get current lockout status for IP (if provided)
    let ipLockout: LockoutRecord | null = null;
    if (ip_address) {
      const { data, error: ipError } = await supabase
        .from('login_lockouts')
        .select('*')
        .eq('identifier', ip_address)
        .eq('identifier_type', 'ip')
        .maybeSingle();
      
      if (ipError) {
        console.error('Error fetching IP lockout:', ipError);
      } else {
        ipLockout = data;
      }
    }

    const now = new Date();

    // CHECK action - verify if account is locked.
    // IMPORTANT: Do NOT return failed_attempts, locked_until, or lockout_count
    // to unauthenticated callers — that would allow user enumeration (attacker
    // can probe any email and learn its failed-attempt count).
    if (action === 'check') {
      // Check email lockout
      if (emailLockout?.locked_until) {
        const lockedUntil = new Date(emailLockout.locked_until);
        if (lockedUntil > now) {
          const remainingSeconds = Math.ceil((lockedUntil.getTime() - now.getTime()) / 1000);
          const remainingMinutes = Math.ceil(remainingSeconds / 60);

          console.log(`Account locked until ${lockedUntil.toISOString()}`);

          return new Response(
            JSON.stringify({
              locked: true,
              remaining_seconds: remainingSeconds,
              remaining_minutes: remainingMinutes,
              // Omit locked_until (exact timestamp), failed_attempts, lockout_count
              // to prevent account enumeration by unauthenticated callers.
              message: `Conta bloqueada por ${remainingMinutes} minuto(s) devido a múltiplas tentativas falhas.`
            }),
            { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
          );
        }
      }

      // Check IP lockout
      if (ipLockout?.locked_until) {
        const lockedUntil = new Date(ipLockout.locked_until);
        if (lockedUntil > now) {
          const remainingSeconds = Math.ceil((lockedUntil.getTime() - now.getTime()) / 1000);
          const remainingMinutes = Math.ceil(remainingSeconds / 60);

          console.log(`IP ${ip_address} is locked until ${lockedUntil.toISOString()}`);

          return new Response(
            JSON.stringify({
              locked: true,
              remaining_seconds: remainingSeconds,
              remaining_minutes: remainingMinutes,
              message: `IP bloqueado por ${remainingMinutes} minuto(s) devido a múltiplas tentativas falhas.`
            }),
            { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
          );
        }
      }

      // Not locked — return minimal response without attempt details
      return new Response(
        JSON.stringify({ locked: false }),
        { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    // RECORD_FAILURE action - increment failed attempts.
    // Guard: limit how fast a single IP can call this action to prevent
    // account-lockout DoS (attacker flooding record_failure for victim email).
    // 20 calls per minute per IP is generous for legitimate auth flows.
    if (action === 'record_failure') {
      if (ip_address) {
        const oneMinuteAgo = new Date(now.getTime() - 60_000).toISOString();
        const { count: recentCalls } = await supabase
          .from('login_lockouts')
          .select('*', { count: 'exact', head: true })
          .eq('identifier', ip_address)
          .eq('identifier_type', 'ip')
          .gte('last_failed_at', oneMinuteAgo);
        if ((recentCalls ?? 0) > 20) {
          return new Response(
            JSON.stringify({ error: 'Too many requests from this IP' }),
            { status: 429, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
          );
        }
      }
    }
    if (action === 'record_failure') {
      const currentAttempts = (emailLockout?.failed_attempts || 0) + 1;
      const currentLockoutCount = emailLockout?.lockout_count || 0;

      const updateData: Record<string, string | number> = {
        failed_attempts: currentAttempts,
        last_failed_at: now.toISOString(),
      };

      // Check if we should lock the account
      if (currentAttempts >= MAX_FAILED_ATTEMPTS) {
        const lockoutMinutes = calculateLockoutMinutes(currentLockoutCount);
        const lockedUntil = new Date(now.getTime() + lockoutMinutes * 60 * 1000);
        
        updateData.locked_until = lockedUntil.toISOString();
        updateData.lockout_count = currentLockoutCount + 1;
        updateData.failed_attempts = 0; // Reset attempts after lockout

        console.log(`Locking account for ${lockoutMinutes} minutes (lockout #${currentLockoutCount + 1})`);

        // Log security event
        await supabase.from('security_events').insert({
          event_type: 'account_locked',
          user_email: normalizedEmail,
          ip_address: ip_address || '0.0.0.0',
          severity: 'high',
          details: {
            lockout_minutes: lockoutMinutes,
            lockout_count: currentLockoutCount + 1,
            locked_until: lockedUntil.toISOString()
          }
        });
      }

      // Upsert the lockout record
      const { error: upsertError } = await supabase
        .from('login_lockouts')
        .upsert({
          identifier: normalizedEmail,
          identifier_type: 'email',
          ...updateData,
        }, {
          onConflict: 'identifier,identifier_type'
        });

      if (upsertError) {
        console.error('Error upserting lockout:', upsertError);
        throw upsertError;
      }

      // Also track IP failures
      if (ip_address) {
        const ipAttempts = (ipLockout?.failed_attempts || 0) + 1;
        const ipLockoutCount = ipLockout?.lockout_count || 0;

        const ipUpdateData: Record<string, string | number> = {
          failed_attempts: ipAttempts,
          last_failed_at: now.toISOString(),
        };

        if (ipAttempts >= MAX_FAILED_ATTEMPTS * 2) { // More lenient for IP
          const lockoutMinutes = calculateLockoutMinutes(ipLockoutCount);
          const lockedUntil = new Date(now.getTime() + lockoutMinutes * 60 * 1000);
          
          ipUpdateData.locked_until = lockedUntil.toISOString();
          ipUpdateData.lockout_count = ipLockoutCount + 1;
          ipUpdateData.failed_attempts = 0;

          console.log(`Locking IP ${ip_address} for ${lockoutMinutes} minutes`);
        }

        await supabase
          .from('login_lockouts')
          .upsert({
            identifier: ip_address,
            identifier_type: 'ip',
            ...ipUpdateData,
          }, {
            onConflict: 'identifier,identifier_type'
          });
      }

      const isNowLocked = currentAttempts >= MAX_FAILED_ATTEMPTS;
      const lockoutMinutes = isNowLocked ? calculateLockoutMinutes(currentLockoutCount) : 0;

      return new Response(
        JSON.stringify({
          recorded: true,
          failed_attempts: isNowLocked ? 0 : currentAttempts,
          locked: isNowLocked,
          lockout_minutes: lockoutMinutes,
          attempts_remaining: isNowLocked ? 0 : MAX_FAILED_ATTEMPTS - currentAttempts,
          message: isNowLocked 
            ? `Conta bloqueada por ${lockoutMinutes} minuto(s) devido a ${MAX_FAILED_ATTEMPTS} tentativas falhas.`
            : `Tentativa falha. ${MAX_FAILED_ATTEMPTS - currentAttempts} tentativa(s) restante(s).`
        }),
        { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    // RECORD_SUCCESS action - reset failed attempts
    if (action === 'record_success') {
      if (emailLockout) {
        const { error: updateError } = await supabase
          .from('login_lockouts')
          .update({
            failed_attempts: 0,
            locked_until: null,
            // Keep lockout_count for exponential backoff history
          })
          .eq('identifier', normalizedEmail)
          .eq('identifier_type', 'email');

        if (updateError) {
          console.error('Error resetting lockout:', updateError);
        }
      }

      // Also reset IP on successful login
      if (ip_address && ipLockout) {
        await supabase
          .from('login_lockouts')
          .update({
            failed_attempts: 0,
            locked_until: null,
          })
          .eq('identifier', ip_address)
          .eq('identifier_type', 'ip');
      }

      console.log('Reset lockout after successful login');

      return new Response(
        JSON.stringify({ reset: true }),
        { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Lockout check error:', error);
    
    // Fail open - don't block login if there's an error
    return new Response(
      JSON.stringify({ locked: false, error: 'Internal error' }),
      { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }
});

