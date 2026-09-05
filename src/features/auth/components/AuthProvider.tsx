/* eslint-disable react-hooks/immutability, react-hooks/exhaustive-deps -- Padrões intencionais: sync com sistemas externos, memoização manual por performance, integração com libs (dnd-kit, framer-motion, supabase realtime). */
import { useEffect, useState, ReactNode, useCallback, useRef, useMemo } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import { toast } from 'sonner';
import { AuthService } from '../services/authService';
import { logger } from '@/lib/logger';
import { offlineStorage } from '@/lib/offlineStorage';
import {
  AuthContext,
  type AuthContextType,
  type AppRole,
  type Profile,
} from '../types/auth.types';

const AUTH_BOOT_TIMEOUT_MS = 8000;
const USER_DATA_TIMEOUT_MS = 6000;

function isAppRole(value: unknown): value is AppRole {
  return value === 'coordinator' || value === 'operator' || value === 'manager' || value === 'admin';
}

class LockoutError extends Error {
  isLockout = true as const;
  remainingMinutes?: number;
  lockoutMinutes?: number;
  constructor(message: string, opts?: { remainingMinutes?: number; lockoutMinutes?: number }) {
    super(message);
    this.name = 'LockoutError';
    this.remainingMinutes = opts?.remainingMinutes;
    this.lockoutMinutes = opts?.lockoutMinutes;
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error(`${label} excedeu o tempo limite`));
    }, timeoutMs);

    promise
      .then(resolve)
      .catch(reject)
      .finally(() => window.clearTimeout(timeoutId));
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();
  const { checkDevice } = useDeviceDetection();
  
  const lastActivityRef = useRef<Date>(new Date());
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const authRequestSeqRef = useRef(0);
  const ACTIVITY_TIMEOUT_MINUTES = 60;
  const REFRESH_INTERVAL_MINUTES = 30;

  const fetchUserData = async (userId: string, requestSeq: number) => {
    try {
      const [profileResult, roleResult] = await withTimeout(
        Promise.allSettled([
          supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle(),
          supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', userId)
            .eq('is_active', true)
            .limit(1),
        ]),
        USER_DATA_TIMEOUT_MS,
        'Carregamento dos dados do usuário'
      );

      const profileData = profileResult.status === 'fulfilled' ? profileResult.value?.data : null;
      const roleData = roleResult.status === 'fulfilled' ? roleResult.value?.data?.[0]?.role : null;

      if (authRequestSeqRef.current !== requestSeq) return;

      if (profileData) {
        setProfile(profileData as Profile);
      } else {
        setProfile(null);
      }

      if (isAppRole(roleData)) {
        setRole(roleData);
      } else {
        // Explicitly set to null if no role is returned to avoid "stuck" states
        setRole(null);
      }
    } catch (error) {
      if (authRequestSeqRef.current !== requestSeq) return;
      setRole(null);
      logger.warn('Não foi possível carregar todos os dados do usuário', error, 'AuthProvider');
    }
  };

  const updateActivity = useCallback(() => {
    lastActivityRef.current = new Date();
  }, []);

  const isSessionActive = useCallback(() => {
    const now = new Date();
    const diffMs = now.getTime() - lastActivityRef.current.getTime();
    const diffMinutes = diffMs / (1000 * 60);
    return diffMinutes < ACTIVITY_TIMEOUT_MINUTES;
  }, []);

  const refreshSession = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        const isAuthError = error.message.includes('refresh_token_not_found') || 
                           error.message.includes('Invalid Refresh Token');
        if (isAuthError || !isSessionActive()) {
          await signOut();
        }
        return;
      }
      if (!data.session) await signOut();
    } catch (error) {
      logger.warn('Não foi possível renovar a sessão', error, 'AuthProvider');
    }
  }, [user, isSessionActive]);

  useEffect(() => {
    if (!user) return;
    
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    const handleUserActivity = () => updateActivity();
    
    activityEvents.forEach(event => 
      window.addEventListener(event, handleUserActivity, { passive: true })
    );
    
    refreshIntervalRef.current = setInterval(() => {
      if (isSessionActive()) refreshSession();
    }, REFRESH_INTERVAL_MINUTES * 60 * 1000);

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        const session = await AuthService.getSession();
        if (!session) {
          await signOut();
          return;
        }
        const expiresAt = session.expires_at;
        if (expiresAt) {
          const diffHours = (new Date(expiresAt * 1000).getTime() - new Date().getTime()) / (1000 * 60 * 60);
          if (diffHours < 1) await refreshSession();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      activityEvents.forEach(event => window.removeEventListener(event, handleUserActivity));
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, updateActivity, isSessionActive, refreshSession]);

  // Auth boot: onAuthStateChange é a ÚNICA fonte de verdade (dispara INITIAL_SESSION no mount).
  // Não usar async/await dentro do callback — bloqueia a fila interna de eventos do Supabase.
  useEffect(() => {
    let cancelled = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (cancelled) return;

      logger.debug('Auth state change event:', { event, hasSession: !!nextSession }, 'AuthProvider');

      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      const requestSeq = ++authRequestSeqRef.current;

      if (nextSession?.user) {
        setIsLoading(true);
        // Fire-and-forget: nunca await dentro de onAuthStateChange
        fetchUserData(nextSession.user.id, requestSeq).finally(() => {
          if (!cancelled && authRequestSeqRef.current === requestSeq) setIsLoading(false);
        });
      } else {
        setProfile(null);
        setRole(null);
        setIsLoading(false);
      }
    });

    // Safety net: se onAuthStateChange demorar mais que o timeout, libera o loading.
    const bootTimeoutId = window.setTimeout(() => {
      if (!cancelled) setIsLoading(false);
    }, AUTH_BOOT_TIMEOUT_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(bootTimeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const lockoutStatus = await AuthService.checkLockout(email);

    if (lockoutStatus.locked) {
      const lockoutError = new LockoutError(
        lockoutStatus.message || 'Conta temporariamente bloqueada',
        { remainingMinutes: lockoutStatus.remaining_minutes || 0 }
      );
      return { error: lockoutError };
    }

    try {
      const data = await AuthService.signIn(email, password);
      await AuthService.recordLoginAttempt(email, true);

      if (data.user) {
        // NÃO chamamos setSession/setUser/fetchUserData aqui — onAuthStateChange
        // dispara SIGNED_IN logo após signIn e é a única fonte de verdade.
        // Isso evita double-fetch de profile/role.

        // Verificação de dispositivo em background (não bloqueia o login)
        (async () => {
          try {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', data.user.id)
              .maybeSingle();

            const result = await checkDevice(
              data.user.id,
              data.user.email || email,
              profileData?.full_name || undefined
            );

            if (result.isNewDevice) {
              toast.info('Novo dispositivo detectado', {
                description: 'Um email de alerta foi enviado para sua caixa de entrada.',
                duration: 5000,
              });
            }
          } catch (e) {
            logger.warn('Erro ao verificar dispositivo (em background)', e, 'AuthProvider');
          }
        })();
      }

      return { error: null };
    } catch (error: unknown) {
      const result = await AuthService.recordLoginAttempt(email, false);

      if (result.locked) {
        const lockoutError = new LockoutError(
          result.message || `Conta bloqueada por ${result.lockout_minutes} minuto(s)`,
          { lockoutMinutes: result.lockout_minutes || 0 }
        );
        return { error: lockoutError };
      }

      if (result.attempts_remaining !== undefined && result.attempts_remaining <= 2) {
        toast.warning(`Atenção: ${result.attempts_remaining} tentativa(s) restante(s)`, {
          description: 'Após 5 tentativas falhas, sua conta será bloqueada temporariamente.',
          duration: 5000,
        });
      }

      return { error: error instanceof Error ? error : new Error('Falha inesperada ao autenticar') };
    }
  };

  const signUp = async (_email: string, _password: string, _fullName: string) => {
    return { error: new Error('Cadastro público desabilitado. Solicite acesso ao gestor.') };
  };

  const signOut = async () => {
    authRequestSeqRef.current += 1;
    await AuthService.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
    // Wipe React Query cache so a subsequent login never sees another user's data.
    queryClient.clear();
    // Best-effort: clear offline IndexedDB data (user-specific jobs, pending actions, etc.)
    offlineStorage.clearAll().catch((err) => {
      logger.warn('Failed to clear offline storage on sign out', err, 'AuthProvider');
    });
  };

  // Memoizado: evita re-render em cascata de todos os consumidores quando
  // o AuthProvider re-renderiza sem mudança real de estado relevante.
  const value = useMemo<AuthContextType>(() => ({
    user,
    session,
    profile,
    role,
    isLoading,
    signIn,
    signUp,
    signOut,
    isCoordinator: role === 'coordinator' || role === 'admin',
    isOperator: role === 'operator',
    isManager: role === 'manager',
    isAdmin: role === 'admin',
  }), [user, session, profile, role, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
