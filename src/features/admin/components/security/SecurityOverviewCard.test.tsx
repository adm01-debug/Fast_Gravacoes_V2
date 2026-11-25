import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SecurityOverviewCard } from './SecurityOverviewCard';

const auth = {
  mfaEnabled: false,
  user: { email_confirmed_at: null as string | null } as { email_confirmed_at: string | null },
};
const devices = { list: [] as unknown[] };

vi.mock('@/features/auth', () => ({
  useAuth: () => ({ user: auth.user }),
  useMFA: () => ({ isMFAEnabled: auth.mfaEnabled }),
}));

vi.mock('@/hooks/useUserDevices', () => ({
  useUserDevices: () => ({ devices: devices.list }),
}));

describe('SecurityOverviewCard (etapa 066)', () => {
  beforeEach(() => {
    auth.mfaEnabled = false;
    auth.user = { email_confirmed_at: null };
    devices.list = [];
  });

  it('não dá pontos nem aprova itens sem verificação na conta nova', () => {
    render(<SecurityOverviewCard />);

    expect(screen.getByText('0/100 pontos')).toBeInTheDocument();
    expect(screen.getByText('Não verificado — email ainda não confirmado')).toBeInTheDocument();
    expect(
      screen.getByText('Não verificado — o navegador não mede a força da senha')
    ).toBeInTheDocument();
    expect(screen.getByText('0 dispositivo(s) registrado(s)')).toBeInTheDocument();
    // A soma fixa anterior (20 senha + 20 email + 15 sessão + 5 dispositivos) dava 60.
    expect(screen.queryByText('60/100 pontos')).not.toBeInTheDocument();
  });

  it('aprova e pontua só o que foi verificado de verdade', () => {
    auth.mfaEnabled = true;
    auth.user = { email_confirmed_at: '2026-01-01T00:00:00Z' };
    devices.list = [{}];

    render(<SecurityOverviewCard />);

    expect(screen.getByText('81/100 pontos')).toBeInTheDocument();
    expect(screen.getByText('Email confirmado')).toBeInTheDocument();
    expect(screen.getByText('Ativo e configurado')).toBeInTheDocument();
    expect(screen.queryByText('Não verificado — email ainda não confirmado')).not.toBeInTheDocument();
  });

  it('marca a verificação de senha como não verificada em qualquer conta', () => {
    auth.mfaEnabled = true;
    auth.user = { email_confirmed_at: '2026-01-01T00:00:00Z' };
    devices.list = [{}];

    render(<SecurityOverviewCard />);

    expect(
      screen.getByText('Não verificado — o navegador não mede a força da senha')
    ).toBeInTheDocument();
  });
});