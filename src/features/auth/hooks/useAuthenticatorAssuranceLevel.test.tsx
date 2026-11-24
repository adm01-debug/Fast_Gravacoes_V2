import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useAuthenticatorAssuranceLevel } from './useAuthenticatorAssuranceLevel';

const mfa = vi.hoisted(() => ({
  getAuthenticatorAssuranceLevel: vi.fn(),
  listFactors: vi.fn(),
}));
const unsubscribe = vi.hoisted(() => vi.fn());
const onAuthStateChange = vi.hoisted(() => vi.fn());

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      mfa,
      onAuthStateChange,
    },
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const userRef = { current: { id: 'u1' } as { id: string } | null };

vi.mock('./useAuth', () => ({
  useAuth: () => ({ user: userRef.current }),
}));

const verify = (factors: Array<{ id: string; factor_type: string; status: string }>, error: unknown = null) => ({
  data: {
    totp: factors.filter((f) => f.factor_type === 'totp'),
    all: factors,
  },
  error,
});

describe('useAuthenticatorAssuranceLevel - decisao compartilhada de 2FA (etapa 032)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    userRef.current = { id: 'u1' };
    onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe } } });
    mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: { currentLevel: 'aal1', nextLevel: 'aal2' },
      error: null,
    });
    mfa.listFactors.mockResolvedValue(verify([{ id: 'totp-1', factor_type: 'totp', status: 'verified' }]));
  });

  it('expoe o fator TOTP verificado que a tela de login sabe desafiar', async () => {
    const { result } = renderHook(() => useAuthenticatorAssuranceLevel());

    await waitFor(() => expect(result.current.checked).toBe(true));
    expect(result.current.needsMfaChallenge).toBe(true);
    expect(result.current.challengeableFactorId).toBe('totp-1');
    expect(result.current.hasNoVerifiedFactor).toBe(false);
    expect(result.current.factorsUnavailable).toBe(false);
  });

  it('sem TOTP verificado nao ha fator desafiavel, mas a conta tem fator', async () => {
    mfa.listFactors.mockResolvedValue(verify([{ id: 'phone-1', factor_type: 'phone', status: 'verified' }]));

    const { result } = renderHook(() => useAuthenticatorAssuranceLevel());

    await waitFor(() => expect(result.current.checked).toBe(true));
    expect(result.current.needsMfaChallenge).toBe(true);
    expect(result.current.challengeableFactorId).toBeNull();
    expect(result.current.hasNoVerifiedFactor).toBe(false);
  });

  it('erro em listFactors nao vira "conta sem fator" nem libera o desafio', async () => {
    mfa.listFactors.mockResolvedValue({ data: null, error: { message: 'unavailable' } });

    const { result } = renderHook(() => useAuthenticatorAssuranceLevel());

    await waitFor(() => expect(result.current.checked).toBe(true));
    expect(result.current.factorsUnavailable).toBe(true);
    expect(result.current.challengeableFactorId).toBeNull();
    expect(result.current.hasNoVerifiedFactor).toBe(false);
  });

  it('sessao sem exigencia de aal2 nao pede desafio', async () => {
    mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: { currentLevel: 'aal2', nextLevel: 'aal2' },
      error: null,
    });

    const { result } = renderHook(() => useAuthenticatorAssuranceLevel());

    await waitFor(() => expect(result.current.checked).toBe(true));
    expect(result.current.needsMfaChallenge).toBe(false);
    expect(result.current.challengeableFactorId).toBe('totp-1');
  });

  it('refresh reconsulta e passa a enxergar o fator liberado depois', async () => {
    mfa.listFactors.mockResolvedValue(verify([{ id: 'phone-1', factor_type: 'phone', status: 'verified' }]));

    const { result } = renderHook(() => useAuthenticatorAssuranceLevel());
    await waitFor(() => expect(result.current.checked).toBe(true));
    expect(result.current.challengeableFactorId).toBeNull();
    const callsBefore = mfa.listFactors.mock.calls.length;

    mfa.listFactors.mockResolvedValue(verify([{ id: 'totp-2', factor_type: 'totp', status: 'verified' }]));
    act(() => result.current.refresh());

    await waitFor(() => expect(result.current.challengeableFactorId).toBe('totp-2'));
    expect(mfa.listFactors.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it('troca de sessao nao reusa a decisao da sessao anterior', async () => {
    userRef.current = null;

    // O valor de cada renderizacao e registrado ANTES de os efeitos rodarem:
    // e nessa janela que a decisao da sessao anonima podia vazar para a sessao
    // recem-criada (o login navegava para "/" antes de saber que a nova sessao
    // exige 2FA). Ler apenas `result.current` depois do `rerender` nao
    // distingue o comportamento, porque o efeito ja reescreveu o estado.
    const renders: Array<{ checked: boolean }> = [];

    const { result, rerender } = renderHook(() => {
      const value = useAuthenticatorAssuranceLevel();
      renders.push({ checked: value.checked });
      return value;
    });
    await waitFor(() => expect(result.current.checked).toBe(true));
    expect(result.current.needsMfaChallenge).toBe(false);

    userRef.current = { id: 'u2' };
    const firstAuthenticatedRender = renders.length;
    rerender();

    // Primeira renderizacao da sessao nova, ainda sem os efeitos: nao pode
    // carregar a decisao ("liberado") da sessao anterior.
    expect(renders[firstAuthenticatedRender].checked).toBe(false);
    await waitFor(() => expect(result.current.checked).toBe(true));
    expect(result.current.needsMfaChallenge).toBe(true);
    expect(result.current.challengeableFactorId).toBe('totp-1');
  });

  it('sem usuario a decisao fica resolvida e sem desafio', async () => {
    userRef.current = null;

    const { result } = renderHook(() => useAuthenticatorAssuranceLevel());

    await waitFor(() => expect(result.current.checked).toBe(true));
    expect(result.current.needsMfaChallenge).toBe(false);
    expect(result.current.challengeableFactorId).toBeNull();
    expect(mfa.listFactors).not.toHaveBeenCalled();
  });
});
