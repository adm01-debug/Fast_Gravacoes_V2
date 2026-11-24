import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import React from 'react';
import AuthPage from './AuthPage';

const navigateMock = vi.hoisted(() => vi.fn());
const signOutMock = vi.hoisted(() => vi.fn());
const refreshMock = vi.hoisted(() => vi.fn());

type TestUser = { id: string; email: string } | null;

const shared = vi.hoisted(() => ({
  user: { id: 'u1', email: 'a@b.c' } as { id: string; email: string } | null,
  aal: {
    checked: true,
    needsMfaChallenge: true,
    hasNoVerifiedFactor: false,
    challengeableFactorId: null as string | null,
    factorsUnavailable: false,
  },
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback ?? key }),
}));

vi.mock('next-themes', () => ({ useTheme: () => ({ theme: 'dark', setTheme: vi.fn() }) }));

// Etapa 032: o AuthPage consome a decisao compartilhada de 2FA
// (useAuthenticatorAssuranceLevel) — a mesma que o ProtectedRoute usa. O teste
// controla essa decisao e verifica a reacao da tela.
vi.mock('@/features/auth', () => ({
  useAuth: () => ({ user: shared.user as TestUser, signIn: vi.fn(), signOut: signOutMock }),
  useAuthenticatorAssuranceLevel: () => ({ ...shared.aal, refresh: refreshMock }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { auth: { mfa: {} }, from: () => ({ insert: vi.fn() }) },
}));

vi.mock('@/integrations/lovable/index', () => ({
  lovable: { auth: { signInWithOAuth: vi.fn() } },
}));

vi.mock('@/components/layout/LanguageSwitcher', () => ({ LanguageSwitcher: () => null }));

vi.mock('@/components/auth/AuthLoginForm', () => ({
  AuthLoginForm: () => <div data-testid="login-form" />,
}));

vi.mock('@/components/auth/MFALoginVerification', () => ({
  MFALoginVerification: ({ factorId, onCancel }: { factorId: string; onCancel: () => void }) => (
    <div data-testid="mfa-challenge">
      {factorId}
      <button onClick={onCancel}>Voltar para o Login</button>
    </div>
  ),
}));

const renderPage = () =>
  render(
    <HelmetProvider>
      <MemoryRouter>
        <AuthPage />
      </MemoryRouter>
    </HelmetProvider>,
  );

describe('AuthPage: 2FA sem desafio possivel (etapa 032)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    shared.user = { id: 'u1', email: 'a@b.c' };
    shared.aal = {
      checked: true,
      needsMfaChallenge: true,
      hasNoVerifiedFactor: false,
      challengeableFactorId: null,
      factorsUnavailable: false,
    };
    signOutMock.mockResolvedValue(undefined);
  });

  it('mostra saida explicita em vez de navegar quando nao ha fator TOTP verificado', async () => {
    renderPage();

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('nenhum aplicativo autenticador');
    expect(navigateMock).not.toHaveBeenCalled();
    expect(screen.queryByTestId('login-form')).toBeNull();
    expect(screen.getByRole('button', { name: 'Sair' })).toBeInTheDocument();
  });

  it('mostra saida explicita quando a consulta de fatores falha', async () => {
    shared.aal.factorsUnavailable = true;

    renderPage();

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('possível consultar os fatores');
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('tentar novamente reconsulta pelo hook compartilhado', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Tentar novamente' }));

    expect(refreshMock).toHaveBeenCalledTimes(1);
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('abre o desafio quando ha fator TOTP verificado', async () => {
    shared.aal.challengeableFactorId = 'totp-9';

    renderPage();

    expect(await screen.findByTestId('mfa-challenge')).toHaveTextContent('totp-9');
    expect(navigateMock).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('navega quando a sessao nao exige um segundo fator', async () => {
    shared.aal = { ...shared.aal, needsMfaChallenge: false };

    renderPage();

    expect(await screen.findByTestId('login-form')).toBeInTheDocument();
    expect(navigateMock).toHaveBeenCalledWith('/', { replace: true });
  });

  it('espera a decisao da sessao atual antes de navegar (sem pular pelo painel)', async () => {
    shared.aal.checked = false;

    renderPage();

    expect(navigateMock).not.toHaveBeenCalled();
    expect(screen.queryByTestId('login-form')).toBeNull();
  });

  it('mostra a falha do logout tambem na tela do desafio', async () => {
    shared.aal.challengeableFactorId = 'totp-7';
    signOutMock.mockRejectedValue(new Error('auth indisponivel'));

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Voltar para o Login' }));

    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/Não foi possível encerrar a sessão/)).toBeInTheDocument();
    expect(screen.getByTestId('mfa-challenge')).toBeInTheDocument();
  });

  it('sair encerra a sessao', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Sair' }));

    expect(signOutMock).toHaveBeenCalledTimes(1);
  });

  it('mantem o aviso e explica a falha quando o logout falha', async () => {
    signOutMock.mockRejectedValue(new Error('auth indisponivel'));

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Sair' }));

    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/Não foi possível encerrar a sessão/)).toBeInTheDocument();
    // Nao pode virar tela em branco: o aviso continua com as saidas disponiveis.
    expect(screen.getByText(/nenhum aplicativo autenticador/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sair' })).toBeEnabled();
    expect(screen.queryByTestId('login-form')).toBeNull();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('volta ao formulario quando a sessao termina por fora (paleta de comandos)', async () => {
    const { rerender } = renderPage();
    expect(await screen.findByRole('alert')).toBeInTheDocument();

    shared.user = null;
    shared.aal = { ...shared.aal, checked: true, needsMfaChallenge: false, challengeableFactorId: null };

    rerender(
      <HelmetProvider>
        <MemoryRouter>
          <AuthPage />
        </MemoryRouter>
      </HelmetProvider>,
    );

    expect(await screen.findByTestId('login-form')).toBeInTheDocument();
    expect(screen.queryByText(/nenhum aplicativo autenticador/)).toBeNull();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
