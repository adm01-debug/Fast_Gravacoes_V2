/* eslint-disable react-hooks/set-state-in-effect --
   Sincroniza com o estado de sessão/MFA do Supabase Auth (sistema externo),
   incluindo a reação a onAuthStateChange — não é estado derivado de props. */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface AALState {
  /** true once the initial AAL check for the current session has resolved */
  checked: boolean;
  /** true when the account has a verified MFA factor that the current session has not stepped up to (aal2) */
  needsMfaChallenge: boolean;
  /**
   * Etapa 7 do plano-mestre: true quando a conta NÃO possui nenhum fator MFA
   * verificado. Papéis elevados (admin/manager/coordinator) nessa situação
   * precisam concluir o enrollment (Configurações → Segurança) — o desafio de
   * login não basta porque não existe fator para desafiar.
   */
  hasNoVerifiedFactor: boolean;
}

/**
 * Session existing (a truthy `user`) only proves password-grade auth (AAL1).
 * It does NOT prove an enrolled MFA factor was verified. Any route gated by
 * `ProtectedRoute` must not treat an AAL1 session as fully authenticated when
 * the account has a verified TOTP factor and the session hasn't reached
 * aal2 — otherwise MFA is enforced only by client UI and is bypassable by
 * navigating directly to a protected route right after password sign-in.
 */
export function useAuthenticatorAssuranceLevel(): AALState {
  const { user } = useAuth();
  const [state, setState] = useState<AALState>({
    checked: false,
    needsMfaChallenge: false,
    hasNoVerifiedFactor: false,
  });

  useEffect(() => {
    if (!user) {
      setState({ checked: true, needsMfaChallenge: false, hasNoVerifiedFactor: false });
      return;
    }

    let cancelled = false;

    const evaluate = async () => {
      try {
        const [aalRes, factorsRes] = await Promise.all([
          supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
          supabase.auth.mfa.listFactors(),
        ]);
        const needsMfaChallenge = !!aalRes.data &&
          aalRes.data.nextLevel === 'aal2' &&
          aalRes.data.currentLevel !== 'aal2';
        // Sem fatores verificados = nenhum desafio possível; quem precisa de
        // MFA (papéis elevados) deve ser encaminhado ao enrollment.
        const hasVerifiedFactor = (factorsRes.data?.all ?? []).some(
          (f) => f.status === 'verified'
        );
        if (!cancelled) {
          setState({ checked: true, needsMfaChallenge, hasNoVerifiedFactor: !hasVerifiedFactor });
        }
      } catch {
        // If the check itself fails, do not block access on it — this is a
        // defense-in-depth layer on top of the AuthPage-level challenge, not
        // the only gate, so fail open here rather than locking everyone out
        // on a transient Supabase error.
        if (!cancelled) {
          setState({ checked: true, needsMfaChallenge: false, hasNoVerifiedFactor: false });
        }
      }
    };

    void evaluate();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'MFA_CHALLENGE_VERIFIED' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        void evaluate();
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [user]);

  return state;
}
