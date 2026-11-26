import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LoginLockoutsPanel } from './LoginLockoutsPanel';
import { useLoginLockouts } from '@/features/admin/hooks/useLoginLockouts';

vi.mock('@/features/admin/hooks/useLoginLockouts', () => ({
  useLoginLockouts: vi.fn(),
}));

const mutate = vi.fn();
const base = {
  lockouts: [],
  ativos: 0,
  isLoading: false,
  error: null,
  release: { isPending: false, mutate },
} as unknown as ReturnType<typeof useLoginLockouts>;

describe('LoginLockoutsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useLoginLockouts).mockReturnValue(base);
  });

  it('mostra o estado vazio quando nao ha bloqueio', () => {
    render(<LoginLockoutsPanel />);
    expect(screen.getByText('Nenhum bloqueio registrado.')).toBeTruthy();
  });

  it('lista as linhas e libera a conta escolhida', () => {
    vi.mocked(useLoginLockouts).mockReturnValue({
      ...base,
      ativos: 1,
      lockouts: [
        {
          id: 'l1',
          identifier: 'operador@empresa.com',
          identifier_type: 'email',
          failed_attempts: 0,
          last_failed_at: '2026-11-26T10:00:00Z',
          locked_until: '2026-11-26T16:00:00Z',
          lockout_count: 3,
          is_active: true,
        },
      ],
    });

    render(<LoginLockoutsPanel />);

    expect(screen.getByText('operador@empresa.com')).toBeTruthy();
    expect(screen.getByText('1 ativa(s)')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /liberar/i }));

    expect(mutate).toHaveBeenCalledWith({
      identifier: 'operador@empresa.com',
      identifier_type: 'email',
    });
  });

  it('exibe o erro da consulta', () => {
    vi.mocked(useLoginLockouts).mockReturnValue({
      ...base,
      error: new Error('sem permissao'),
    });

    render(<LoginLockoutsPanel />);

    expect(screen.getByText(/sem permissao/)).toBeTruthy();
  });
});
