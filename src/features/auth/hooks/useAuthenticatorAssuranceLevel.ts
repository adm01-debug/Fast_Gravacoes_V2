/* eslint-disable react-hooks/set-state-in-effect --
   Sincroniza com o estado de sessão/MFA do Supabase Auth (sistema externo),
   incluindo a reação a onAuthStateChange — não é estado derivado de props. */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { useAuth } from './useAuth';

export interface AALState {
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
  /**
   * Etapa 032 / AUT-04: id do fator TOTP verificado — o único tipo que a tela de
   * login sabe desafiar. `null` com `needsMfaChallenge` verdadeiro significa
   * "não há como desafiar". Login (bloqueio explícito) e guarda de rota
   * (redirecionamento) leem ESTA mesma decisão; antes cada um consultava o
   * Supabase por conta própria e as duas conclusões divergiam, produzindo o
   * laço /auth ⇄ / descrito no achado AUT-04.
   */
  challengeableFactorId: string | null;
  /** true quando `listFactors` falhou: estado indefinido, não "conta sem fator". */
  factorsUnavailable: boolean;
  /** Reconsulta AAL + fatores (botão "Tentar novamente" da tela de login). */
  refresh: () => void;
}

/**
 * Session existing (a truthy `user`) only proves password-grade auth (AAL1).
 * It does NOT prove an enrolled MFA factor was verified. Any route gated by
 * `ProtectedRoute` must not treat an AAL1 session as fully authenticated when
 * the account has a verified TOTP factor and the session hasn't reached
 * aal2 — otherwise MFA is enforced only by client UI and is bypassable by
 * navigating directly to a protected route right after password sign-in.
 */
type AALValue = Omit<AALState, 'refresh'>;

const CLEARED: AALValue = {
  checked: false,
  needsMfaChallenge: false,
  hasNoVerifiedFactor: false,
  challengeableFactorId: null,
  factorsUnavailable: false,
};

/** Decisao ja resolvida + a sessao a que ela pertence. */
interface ResolvedValue {
  forUserId: string | null;
  value: AALValue;
}

export function useAuthenticatorAssuranceLevel(): AALState {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [refreshToken, setRefreshToken] = useState(0);
  const [resolved, setResolved] = useState<ResolvedValue>({
    forUserId: null,
    value: { ...CLEARED, checked: true },
  });
  const refresh = useCallback(() => setRefreshToken((n) => n + 1), []);

  useEffect(() => {
    if (!userId) {
      setResolved({ forUserId: null, value: { ...CLEARED, checked: true } });
      return;
    }

    let cancelled = false;
    setResolved({ forUserId: userId, value: CLEARED });

    const evaluate = async () => {
      try {
        const [aalRes, factorsRes] = await Promise.all([
          supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
          supabase.auth.mfa.listFactors(),
        ]);
        if (aalRes.error) {
          throw aalRes.error;
        }
        const needsMfaChallenge = !!aalRes.data &&
          aalRes.data.nextLevel === 'aal2' &&
          aalRes.data.currentLevel !== 'aal2';
        // Só concluímos que não há fator quando a consulta foi bem-sucedida.
        // `listFactors` devolve { data, error } em vez de rejeitar a promise.
        // Tratar um erro como lista vazia causava um redirecionamento falso ao
        // enrollment para uma conta que já possuía MFA configurado.
        if (factorsRes.error) {
          logger.warn('Não foi possível listar fatores MFA; enrollment não será inferido', factorsRes.error, 'useAuthenticatorAssuranceLevel');
        }
        const hasVerifiedFactor = !factorsRes.error && (factorsRes.data?.all ?? []).some(
          (f) => f.status === 'verified',
        );
        // A tela de login só sabe desafiar TOTP: expor o fator desafiavel aqui
        // é o que permite as duas telas tomarem a mesma decisão.
        const challengeableFactor = factorsRes.error
          ? undefined
          : (factorsRes.data?.totp ?? []).find((f) => f.status === 'verified');
        if (!cancelled) {
          setResolved({
            forUserId: userId,
            value: {
              checked: true,
              needsMfaChallenge,
              hasNoVerifiedFactor: !factorsRes.error && !hasVerifiedFactor,
              challengeableFactorId: challengeableFactor?.id ?? null,
              factorsUnavailable: !!factorsRes.error,
            },
          });
        }
      } catch {
        // If the check itself fails, do not block access on it — this is a
        // defense-in-depth layer on top of the AuthPage-level challenge, not
        // the only gate, so fail open here rather than locking everyone out
        // on a transient Supabase error.
        if (!cancelled) {
          setResolved({ forUserId: userId, value: { ...CLEARED, checked: true } });
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
  }, [userId, refreshToken]);

  // Nunca devolver a decisao de OUTRA sessao: logo apos o login por senha o
  // valor resolvido ainda e o da sessao anonima ("liberado"), e usa-lo fazia a
  // tela de login navegar para "/" antes de saber que a nova sessao exige 2FA
  // — o guarda de rota entao devolvia para o login. Sessao diferente da
  // resolvida (inclusive login recem-criado) reporta "ainda checando".
  const decision = resolved.forUserId === userId
    ? resolved.value
    : { ...CLEARED, checked: !userId };

  return { ...decision, refresh };
}
