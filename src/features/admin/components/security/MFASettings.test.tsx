import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MFASettings } from './MFASettings';

const mocks = vi.hoisted(() => ({
  unenroll: vi.fn(),
  refreshFactors: vi.fn(),
  requireReauth: vi.fn(),
}));

vi.mock('@/features/auth', () => ({
  useMFA: () => ({
    factors: [
      {
        id: 'factor-1',
        factor_type: 'totp',
        status: 'verified',
        created_at: '2026-01-01T00:00:00Z',
        friendly_name: 'Celular do gestor',
      },
    ],
    isLoading: false,
    isMFAEnabled: true,
    unenroll: mocks.unenroll,
    refreshFactors: mocks.refreshFactors,
  }),
}));

vi.mock('@/contexts/ReauthContext', () => ({
  useReauth: () => ({
    requireReauth: mocks.requireReauth,
    isReauthenticated: false,
    lastReauthAt: null,
  }),
}));

vi.mock('./MFAEnroll', () => ({ MFAEnroll: () => null }));

describe('MFASettings — remoção do segundo fator exige re-autenticação (etapa 233)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.unenroll.mockResolvedValue(true);
  });

  const abrirConfirmacao = () => {
    render(<MFASettings />);
    // O primeiro botão do cartão de fatores é o de remover (ícone de lixeira).
    fireEvent.click(screen.getAllByRole('button')[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Remover' }));
  };

  it('pede a senha em vez de remover o fator direto', () => {
    abrirConfirmacao();

    expect(mocks.requireReauth).toHaveBeenCalledWith('disable_mfa', expect.any(Function));
    // Sem a re-autenticação a ação não acontece.
    expect(mocks.unenroll).not.toHaveBeenCalled();
  });

  it('remove o fator depois que a senha é confirmada', async () => {
    mocks.requireReauth.mockImplementation((_action, onSuccess) => onSuccess());
    abrirConfirmacao();

    expect(mocks.unenroll).toHaveBeenCalledWith('factor-1');
  });
});