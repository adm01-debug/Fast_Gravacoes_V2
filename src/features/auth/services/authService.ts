import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export interface LockoutStatus {
  locked: boolean;
  remaining_minutes?: number;
  lockout_minutes?: number;
  message?: string;
  attempts_remaining?: number;
  blocked_by_ip?: boolean;
  geo_blocked?: boolean;
  country_code?: string | null;
  country_name?: string | null;
  block_reason?: string | null;
  /** true quando o gate respondeu 429 (cota esgotada) — não é decisão de bloqueio. */
  rate_limited?: boolean;
}

export const AuthService = {
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  },

  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  async getUser() {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user;
  },

  // Security Helpers.
  // The client IP is no longer sent to the edge function — the server derives
  // it from the trusted x-forwarded-for/x-real-ip request headers instead of
  // trusting a self-reported value, which an attacker could spoof/rotate to
  // evade or weaponize IP-based lockout (see check-login-lockout/index.ts).
  async checkLockout(email: string): Promise<LockoutStatus> {
    try {
      const { data, error } = await supabase.functions.invoke('check-login-lockout', {
        body: { email, action: 'check' }
      });
      if (error) {
        // 429 = rate limit esgotado no gate pré-login. Um IP que saturou o
        // bucket de check-login-lockout é exatamente quem a allowlist deve
        // barrar (o gate limita ANTES da allowlist para não permitir varredura
        // de listUsers). Tratar como bloqueio em vez de fail-open — caso
        // contrário bastaria saturar o bucket para entrar de uma rede proibida.
        const status = (error as { context?: { status?: number } })?.context?.status;
        if (status === 429) {
          logger.warn('Lockout check rate-limited — treating as IP block', { error }, 'authService');
          return {
            locked: true,
            blocked_by_ip: true,
            // Sinaliza cota esgotada (não é decisão de bloqueio): o signIn recusa
            // novos logins, mas o re-gate de sessão existente NÃO desloga — a
            // sessão já emitida não deve ser revogada só porque a cota acabou.
            rate_limited: true,
            block_reason: 'Muitas tentativas a partir desta rede. Tente novamente em 1 minuto.',
            message: 'Muitas tentativas a partir desta rede. Tente novamente em 1 minuto.',
          };
        }
        logger.warn('Lockout check returned error — brute-force protection may be inactive', { error }, 'authService');
        return { locked: false };
      }
      return data;
    } catch (err) {
      logger.warn('Lockout check threw exception — brute-force protection may be inactive', { error: String(err) }, 'authService');
      return { locked: false };
    }
  },

  async recordLoginAttempt(email: string, success: boolean): Promise<LockoutStatus> {
    try {
      const { data, error } = await supabase.functions.invoke('check-login-lockout', {
        body: {
          email,
          action: success ? 'record_success' : 'record_failure'
        }
      });
      if (error) {
        logger.warn('recordLoginAttempt returned error — attempt count may be inaccurate', { error }, 'authService');
        return { locked: false };
      }
      return data;
    } catch (err) {
      logger.warn('recordLoginAttempt threw exception — attempt count may be inaccurate', { error: String(err) }, 'authService');
      return { locked: false };
    }
  }
};
