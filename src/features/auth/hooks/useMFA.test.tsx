import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const enroll = vi.fn();
const listFactors = vi.fn();
const unenroll = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      mfa: {
        enroll: (...a: unknown[]) => enroll(...a),
        listFactors: (...a: unknown[]) => listFactors(...a),
        unenroll: (...a: unknown[]) => unenroll(...a),
        challengeAndVerify: vi.fn(),
      },
    },
  },
}));
const USUARIO = { id: 'u1' };
vi.mock('../index', () => ({ useAuth: () => ({ user: USUARIO }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { useMFA } from './useMFA';

const FATOR_NOVO = {
  id: 'factor-1',
  type: 'totp',
  totp: { qr_code: 'svg', secret: 'JBSWY3DPEHPK3PXP', uri: 'otpauth://totp/x' },
};

describe('useMFA.startEnrollment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Reproduz o GoTrue: enquanto sobrar um fator TOTP nao verificado, o enroll
  // responde 422 por nome duplicado. So depois do unenroll ele cria o novo.
  const simularFatorOrfao = () => {
    const vivos = [
      { id: 'factor-orfao', status: 'unverified', factor_type: 'totp', friendly_name: 'Fast Gravacoes MFA', created_at: '', updated_at: '' },
    ];
    listFactors.mockImplementation(async () => ({ data: { all: [...vivos] }, error: null }));
    unenroll.mockImplementation(async ({ factorId }: { factorId: string }) => {
      const i = vivos.findIndex(f => f.id === factorId);
      if (i >= 0) vivos.splice(i, 1);
      return { data: null, error: null };
    });
    enroll.mockImplementation(async () =>
      vivos.length > 0
        ? { data: null, error: new Error('A factor with the friendly name "Fast Gravacoes MFA" already exists') }
        : { data: FATOR_NOVO, error: null },
    );
  };

  it('remove fatores TOTP nao verificados antes de criar um novo (evita 422)', async () => {
    simularFatorOrfao();
    const { result } = renderHook(() => useMFA());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let retorno: unknown;
    await act(async () => {
      retorno = await result.current.startEnrollment();
    });

    expect(unenroll).toHaveBeenCalledWith({ factorId: 'factor-orfao' });
    expect(retorno).toEqual(FATOR_NOVO);
  });

  it('nao remove um fator TOTP ja verificado', async () => {
    listFactors.mockResolvedValue({
      data: { all: [{ id: 'factor-ok', status: 'verified', factor_type: 'totp', created_at: '', updated_at: '' }] },
      error: null,
    });
    enroll.mockResolvedValue({ data: FATOR_NOVO, error: null });
    const { result } = renderHook(() => useMFA());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.startEnrollment();
    });

    expect(unenroll).not.toHaveBeenCalled();
  });
});