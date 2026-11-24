import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import React from 'react';
import AuthPage from './AuthPage';

const navigateMock = vi.hoisted(() => vi.fn());
const signOutMock = vi.hoisted(() => vi.fn());
const mfa = vi.hoisted(() => ({
  getAuthenticatorAssuranceLevel: vi.fn(),
  listFactors: vi.fn(),
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback ?? key }),
}));

vi.mock('next-themes', () => ({ useTheme: () => ({ theme: 'dark', setTheme: vi.fn() }) }));

vi.mock('@/features/auth', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 'a@b.c' }, signIn: vi.fn(), signOut: signOutMock }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { auth: { mfa }, from: () => ({ insert: vi.fn() }) },
}));

vi.mock('@/integrations/lovable/index', () => ({
  lovable: { auth: { signInWithOAuth: vi.fn() } },
}));

vi.mock('@/components/layout/LanguageSwitcher', () => ({ LanguageSwitcher: () => null }));

vi.mock('@/components/auth/AuthLoginForm', () => ({
  AuthLoginForm: () => <div data-testid="login-form" />,
}));

vi.mock('@/components/auth/MFALoginVerification', () => ({
  MFALoginVerification: ({ factorId }: { factorId: string }) => (
    <div data-testid="mfa-challenge">{factorId}</div>
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
    mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: { currentLevel: 'aal1', nextLevel: 'aal2' },
    });
  });

  it('mostra saida explicita em vez de navegar quando nao ha fator TOTP verificado', async () => {
    mfa.listFactors.mockResolvedValue({
      data: { totp: [], all: [{ id: 'phone-1', factor_type: 'phone', status: 'verified' }] },
      error: null,
    });

    renderPage();

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('nenhum aplicativo autenticador');
    expect(navigateMock).not.toHaveBeenCalled();
    expect(screen.queryByTestId('login-form')).toBeNull();
    expect(screen.getByRole('button', { name: 'Sair' })).toBeInTheDocument();
  });

  it('mostra saida explicita quando a consulta de fatores falha', async () => {
    mfa.listFactors.mockResolvedValue({ data: null, error: { message: 'unavailable' } });

    renderPage();

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('possível consultar os fatores');
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('sair encerra a sessao', async () => {
    mfa.listFactors.mockResolvedValue({ data: { totp: [] }, error: null });

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Sair' }));

    expect(signOutMock).toHaveBeenCalledTimes(1);
  });

  it('tentar novamente reconsulta e abre o desafio quando o fator aparece', async () => {
    mfa.listFactors
      .mockResolvedValueOnce({ data: { totp: [] }, error: null })
      .mockResolvedValueOnce({ data: { totp: [{ id: 'totp-1', status: 'verified' }] }, error: null });

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByTestId('mfa-challenge')).toHaveTextContent('totp-1');
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('mantem o desafio quando ha fator TOTP verificado', async () => {
    mfa.listFactors.mockResolvedValue({ data: { totp: [{ id: 'totp-9', status: 'verified' }] }, error: null });

    renderPage();

    expect(await screen.findByTestId('mfa-challenge')).toHaveTextContent('totp-9');
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
