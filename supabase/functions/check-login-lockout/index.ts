import { createClient } from 'npm:@supabase/supabase-js';
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

import { getCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";
import { parseOrError } from "../_shared/validate.ts";
import { getOrCreateRequestId } from "../_shared/logger.ts";
import { lockoutRequestSchema } from "../_shared/validation.ts";

const MAX_FAILED_ATTEMPTS = 5;
const BASE_LOCKOUT_MINUTES = 1; // First lockout: 1 minute

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

// IPv4-only general-prefix CIDR match (any /0-/32) — mesma semântica da
// allowlist original em validate-login-ip, agora enforçada no gate real.
function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => Number.isNaN(p) || p < 0 || p > 255)) return null;
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function ipMatchesCidr(ip: string, cidr: string): boolean {
  if (!cidr.includes('/')) return ip === cidr;
  const [network, bitsStr] = cidr.split('/');
  const bits = parseInt(bitsStr, 10);
  const ipInt = ipv4ToInt(ip);
  const networkInt = ipv4ToInt(network);
  if (ipInt === null || networkInt === null || Number.isNaN(bits) || bits < 0 || bits > 32) return false;
  if (bits === 0) return true;
  const mask = (0xffffffff << (32 - bits)) >>> 0;
  return (ipInt & mask) === (networkInt & mask);
}

// F-006: resolve o país do IP em runtime. ipwho.is como primário (sem chave);
// ipapi.co como fallback. Fail-open: qualquer erro de infra retorna null e o
// gate decide pelo block_unknown_countries (ou libera por padrão).
async function resolveCountry(ip: string): Promise<{ country_code: string; country_name: string } | null> {
  // Teto total entre os dois providers: um provedor fora do ar não pode
  // estender a espera além do teto (antes, 15s x 2 = até 30s de latência por
  // login antes do fail-open). Cada provider ainda tem o próprio timeout para
  // o reserva não ficar refém da lentidão do primário (thread SEC do review).
  const totalTimeoutMs = 8_000;
  const perProviderTimeoutMs = 5_000;
  const providers: Array<{ url: string; parse: (json: any) => { country_code: string; country_name: string } | null }> = [
    {
      url: `https://ipwho.is/${ip}`,
      parse: (json) =>
        json && json.success === true && typeof json.country_code === 'string' && json.country_code
          ? { country_code: json.country_code, country_name: json.country_name || json.country_code }
          : null,
    },
    {
      url: `https://ipapi.co/${ip}/json/`,
      parse: (json) =>
        json && typeof json.country_code === 'string' && json.country_code && json.country_code !== 'undefined'
          ? { country_code: json.country_code, country_name: json.country_name || json.country_code }
          : null,
    },
  ];

  const deadlineAt = Date.now() + totalTimeoutMs;
  for (const provider of providers) {
    const remainingMs = deadlineAt - Date.now();
    if (remainingMs <= 0) break;
    const providerController = new AbortController();
    const providerTimer = setTimeout(() => providerController.abort(), Math.min(perProviderTimeoutMs, remainingMs));
    try {
      const resp = await fetch(provider.url, { signal: providerController.signal });
      if (!resp.ok) continue;
      const json = await resp.json();
      const parsed = provider.parse(json);
      if (parsed) return parsed;
    } catch (err) {
      console.error(`Geo lookup failed for ${provider.url}:`, err);
    } finally {
      clearTimeout(providerTimer);
    }
  }
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const parsed = await parseOrError(lockoutRequestSchema, req, { corsHeaders: getCorsHeaders(req), requestId: getOrCreateRequestId(req) });
    if (parsed.response) return parsed.response;
    const { email, action } = parsed.data;
    // Server-derived — a client-supplied IP would let an attacker spoof/rotate
    // to evade IP-based lockout, or frame another IP as the failing source.
    const ip_address = getClientIp(req);
    const normalizedEmail = email.toLowerCase().trim();

    // Hard block FIRST: IP em blocked_ips (painel admin / rate-limit) nunca
    // chega a tentar login nem consome o bucket de rate limit. Checa antes do
    // checkRateLimit para um bloqueio permanente nao ser mascarado por um 429.
    if (ip_address) {
      const { data: blockedIP, error: blockedError } = await supabase
        .from('blocked_ips')
        .select('id, expires_at, is_permanent, reason')
        .eq('ip_address', ip_address)
        .is('unblocked_at', null)
        .order('is_permanent', { ascending: false })
        .order('expires_at', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();

      if (blockedError) {
        console.error('Error fetching blocked IP:', blockedError);
      } else if (blockedIP) {
        const ipIsBlocked = blockedIP.is_permanent
          || (blockedIP.expires_at && new Date(blockedIP.expires_at) > new Date());
        if (ipIsBlocked) {
          console.log(`IP ${ip_address} blocked (${blockedIP.reason || 'sem motivo'})`);
          // Resposta dedicada: AuthService/AuthProvider distinguem este estado
          // do lockout por tentativas (mensagem propria na UI).
          return new Response(
            JSON.stringify({
              blocked_by_ip: true,
              block_reason: blockedIP.reason || null,
            }),
            { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Rate limit ANTES da allowlist: a resolução de usuário (listUsers) paga
    // custo no Auth e não pode ser varrida sem consumir o bucket — chamador
    // pré-login repetindo pedidos de fora da lista esgotaria a cota sem
    // penalidade. O hard block de blocked_ips continua acima (checagem de 1
    // linha que não deve ser mascarada por um 429).
    const limited = await checkRateLimit(supabase, {
      endpoint: 'check-login-lockout',
      identity: { ip: ip_address },
      max: 30,
      windowSeconds: 60,
      corsHeaders: getCorsHeaders(req),
    });
    if (limited) return limited;

    // F-005: allowlist de IP (painel admin). A restrição só vale para quem tem
    // entrada aplicável — global (todos) ou do próprio usuário do e-mail.
    // Usuários sem entrada aplicável não são restringidos (a UI trata a lista
    // como "usuário específico" por entrada). Entradas vencidas não ativam a
    // lista nem autorizam IP. Sem entradas aplicáveis a allowlist está
    // desligada (fail-open).
    if (ip_address) {
      const { data: ipAllowlist, error: allowlistError } = await supabase
        .from('ip_allowlist')
        .select('id, ip_address, is_global, user_id, expires_at')
        .eq('is_active', true);

      if (allowlistError) {
        console.error('Error fetching IP allowlist:', allowlistError);
      } else if (ipAllowlist && ipAllowlist.length > 0) {
        const now = new Date();
        const activeEntries = ipAllowlist.filter(entry =>
          !entry.expires_at || new Date(entry.expires_at) > now
        );

        if (activeEntries.length > 0) {
          const allowedIPs = activeEntries.filter(entry => entry.is_global);

          const userSpecific = activeEntries.filter(entry => !entry.is_global && entry.user_id);
          if (userSpecific.length > 0) {
            // Resolve o userId do e-mail via auth.admin.listUsers (paginação
            // local; a tipagem do auth-js não expõe getUserByEmail). Mesma
            // estratégia de paginação de send-loss-risk-alert.
            try {
              const perPage = 1000;
              for (let page = 1; ; page++) {
                const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers({ page, perPage });
                if (usersError) throw usersError;
                const users = usersData?.users ?? [];
                const match = users.find(u => (u.email ?? '').toLowerCase() === normalizedEmail);
                if (match) {
                  allowedIPs.push(...userSpecific.filter(entry => entry.user_id === match.id));
                  break;
                }
                if (users.length < perPage) break;
              }
            } catch (err) {
              console.error('Error resolving user for allowlist:', err);
            }
          }

          // Sem entradas aplicáveis a este usuário → não restringido.
          if (allowedIPs.length > 0) {
            const isAllowed = allowedIPs.some(entry => ipMatchesCidr(ip_address!, entry.ip_address));

            if (!isAllowed) {
              console.log(`IP ${ip_address} not in active allowlist`);
              return new Response(
                JSON.stringify({
                  blocked_by_ip: true,
                  block_reason: 'IP não está na lista de IPs permitidos',
                }),
                { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
              );
            }
          }
        }
      }
    }

    // F-006: geo-blocking (painel admin). Modo whitelist: só países com regra
    // ativa is_blocked=false passam; países sem regra são bloqueados. País
    // desconhecido respeita block_unknown_countries. Fail-open em erro de
    // infra (resolução de país) — consistente com rateLimit.ts.
    // Só avalia no action=check: record_failure/record_success são pós-login e
    // o gate já foi aplicado no check — evita lookup duplicado por login.
    // IP ausente (proxy/env sem x-forwarded-for/x-real-ip) também passa pelo
    // gate: com block_unknown_countries=true o request é tratado como
    // localização desconhecida e bloqueado (thread P2 do review).
    if (action === 'check') {
      const { data: geoSettings, error: geoSettingsError } = await supabase
        .from('geo_blocking_settings')
        .select('is_enabled, mode, block_unknown_countries, log_blocked_attempts')
        .limit(1)
        .maybeSingle();

      if (geoSettingsError) {
        console.error('Error fetching geo settings:', geoSettingsError);
      } else if (geoSettings?.is_enabled) {
        const geo = ip_address ? await resolveCountry(ip_address) : null;
        let geoBlocked = false;
        let geoReason: string | null = null;

        if (!geo) {
          // Sem resolução de país OU sem IP disponível: aplica a política de
          // país desconhecido do painel.
          geoBlocked = geoSettings.block_unknown_countries === true;
          geoReason = geoBlocked ? 'País desconhecido não permitido' : null;
        } else {
          const { data: rule, error: ruleError } = await supabase
            .from('geo_blocking_rules')
            .select('is_blocked, block_type, reason')
            .eq('country_code', geo.country_code)
            .maybeSingle();

          if (ruleError) {
            console.error('Error fetching geo rule:', ruleError);
            geoBlocked = geoSettings.block_unknown_countries === true;
            geoReason = geoBlocked ? 'País desconhecido não permitido' : null;
          } else if (!rule) {
            geoBlocked = true;
            geoReason = 'País não está na lista de países permitidos';
          } else if (rule.is_blocked) {
            geoBlocked = true;
            geoReason = rule.reason || `Acesso bloqueado para ${geo.country_name}`;
          } else {
            geoBlocked = false;
          }
        }

        if (geoBlocked) {
          console.log(`IP ${ip_address} geo-blocked (${geo?.country_code || 'unknown'})`);
          if (geoSettings.log_blocked_attempts) {
            await supabase.from('geo_blocking_logs').insert({
              ip_address,
              country_code: geo?.country_code ?? null,
              country_name: geo?.country_name ?? null,
              action: 'blocked',
              user_agent: req.headers.get('user-agent'),
              request_path: '/auth/v1/check-login-lockout',
            });
          }
          return new Response(
            JSON.stringify({
              geo_blocked: true,
              country_code: geo?.country_code ?? null,
              country_name: geo?.country_name ?? null,
              block_reason: geoReason,
            }),
            { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
          );
        }
      }
    }

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
    // Anti-flood: a linha do IP é UNIQUE(identifier, identifier_type) —
    // o contador failed_attempts dela acumula as falhas do IP na janela
    // de lockout. >20 já indica abuso antes do lock duro (que dispara em
    // MAX_FAILED_ATTEMPTS*2); o guard anterior contava LINHAS e era
    // código morto (a UNIQUE impede >1 linha por IP).
    if (action === 'record_failure' && ip_address && (ipLockout?.failed_attempts ?? 0) > 20) {
      return new Response(
        JSON.stringify({ error: 'Too many requests from this IP' }),
        { status: 429, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
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

