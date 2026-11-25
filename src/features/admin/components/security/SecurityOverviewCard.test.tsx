import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SecurityOverviewCard } from './SecurityOverviewCard';

const auth = {
  mfaEnabled: false,
  user: { email_confirmed_at: null as string | null } as { email_confirmed_at: string | null },
};
const devices = { list: [] as { is_trusted?: boolean }[] };
const protocol = { value: 'http:' };

vi.mock('@/features/auth', () => ({
  useAuth: () => ({ user: auth.user }),
  useMFA: () => ({ isMFAEnabled: auth.mfaEnabled }),
}));

vi.mock('@/hooks/useUserDevices', () => ({
  useUserDevices: () => ({ devices: devices.list }),
}));

/** jsdom sempre nasce em http://localhost:3000; a sessão segura só existe em HTTPS. */
const setProtocol = (value: string) => {
  protocol.value = value;
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, protocol: value },
  });
};

describe('SecurityOverviewCard (etapa 066)', () => {
  beforeEach(() => {
    auth.mfaEnabled = false;
    auth.user = { email_confirmed_at: null };
    devices.list = [];
    setProtocol('http:');
  });

  afterEach(() => {
    setProtocol('http:');
  });

  it('não dá pontos nem aprova itens sem verificação na conta nova', () => {
    render(<SecurityOverviewCard />);

    expect(screen.getByText('0/100 pontos')).toBeInTheDocument();
    expect(screen.getByText('Não verificado — email ainda não confirmado')).toBeInTheDocument();
    expect(
      screen.getByText('Não verificado — o navegador não mede a força da senha')
    ).toBeInTheDocument();
    expect(screen.getByText('0 dispositivo(s) confiável(is)')).toBeInTheDocument();
    // A soma fixa anterior (20 senha + 20 email + 15 sessão + 5 dispositivos) dava 60.
    expect(screen.queryByText('60/100 pontos')).not.toBeInTheDocument();
  });

  it('aprova e pontua só o que foi verificado de verdade', () => {
    auth.mfaEnabled = true;
    auth.user = { email_confirmed_at: '2026-01-01T00:00:00Z' };
    devices.list = [{ is_trusted: true }];

    render(<SecurityOverviewCard />);

    expect(screen.getByText('81/100 pontos')).toBeInTheDocument();
    expect(screen.getByText('Email confirmado')).toBeInTheDocument();
    expect(screen.getByText('Ativo e configurado')).toBeInTheDocument();
    expect(screen.queryByText('Não verificado — email ainda não confirmado')).not.toBeInTheDocument();
  });

  it('marca a verificação de senha como não verificada em qualquer conta', () => {
    auth.mfaEnabled = true;
    auth.user = { email_confirmed_at: '2026-01-01T00:00:00Z' };
    devices.list = [{ is_trusted: true }];

    render(<SecurityOverviewCard />);

    expect(
      screen.getByText('Não verificado — o navegador não mede a força da senha')
    ).toBeInTheDocument();
  });

  it('não pontua dispositivo registrado que não está marcado como confiável', () => {
    auth.mfaEnabled = false;
    devices.list = [{ is_trusted: false }];

    render(<SecurityOverviewCard />);

    expect(screen.getByText('0 dispositivo(s) confiável(is)')).toBeInTheDocument();
    expect(screen.getByText('0/100 pontos')).toBeInTheDocument();
  });

  it('pontua a sessão só sob HTTPS', () => {
    auth.mfaEnabled = true;
    auth.user = { email_confirmed_at: '2026-01-01T00:00:00Z' };
    devices.list = [{ is_trusted: true }];

    const { unmount } = render(<SecurityOverviewCard />);
    expect(screen.getByText('Não verificada — conexão sem HTTPS')).toBeInTheDocument();
    expect(screen.getByText('81/100 pontos')).toBeInTheDocument();
    unmount();

    setProtocol('https:');
    render(<SecurityOverviewCard />);
    expect(screen.getByText('Conexão criptografada (HTTPS)')).toBeInTheDocument();
    expect(screen.getByText('100/100 pontos')).toBeInTheDocument();
    // Teto dos itens verificáveis, não "segurança máxima" — a senha continua
    // sem verificação automática.
    expect(screen.getByText('Todos os itens verificáveis concluídos')).toBeInTheDocument();
    expect(screen.queryByText(/segurança máxima/)).not.toBeInTheDocument();
  });
});
