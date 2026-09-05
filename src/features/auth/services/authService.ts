import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export interface LockoutStatus {
  locked: boolean;
  remaining_minutes?: number;
  lockout_minutes?: number;
  message?: string;
  attempts_remaining?: number;
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
