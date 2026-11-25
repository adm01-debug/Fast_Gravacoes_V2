import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReauthProvider, useReauth } from './ReauthContext';

const mocks = vi.hoisted(() => ({
  verifySignIn: vi.fn(),
  verifySignOut: vi.fn(),
  verifyDispose: vi.fn(),
  getUser: vi.fn(),
  onAuthStateChange: vi.fn(),
  insert: vi.fn(),
  authCb: null as null | ((event: string, session: { user?: { id?: string } } | null) => void),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      signInWithPassword: mocks.verifySignIn,
      signOut: mocks.verifySignOut,
      dispose: mocks.verifyDispose,
    },
  })),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: mocks.getUser,
      onAuthStateChange: mocks.onAuthStateChange,
      // Se a verificação usar o cliente compartilhado, a sessão com 2FA é
      // substituída por uma sem 2FA e esta chamada aparece.
      signInWithPassword: vi.fn(),
    },
    from: vi.fn(() => ({ insert: mocks.insert })),
  },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/errorHandling', () => ({ showErrorToast: vi.fn() }));

function Harness({ onDone }: { onDone: () => void }) {
  const { requireReauth } = useReauth();
  return (
    <button type="button" onClick={() => requireReauth('manage_users', onDone)}>
      alterar papel
    </button>
  );
}

const renderHarness = (onDone: () => void) =>
  render(
    <ReauthProvider>
      <Harness onDone={onDone} />
    </ReauthProvider>,
  );

async function confirmPassword(password: string) {
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText('Senha Atual'), password);
  await user.click(screen.getByRole('button', { name: 'Confirmar' }));
}

describe('ReauthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'user-a', email: 'a@exemplo.com' } } });
    mocks.onAuthStateChange.mockImplementation((cb: (event: string, session: { user?: { id?: string } } | null) => void) => {
      mocks.authCb = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    mocks.verifySignIn.mockResolvedValue({ data: { user: { id: 'user-a' } }, error: null });
    mocks.verifySignOut.mockResolvedValue({ error: null });
    mocks.verifyDispose.mockResolvedValue(undefined);
    mocks.insert.mockResolvedValue({ error: null });
  });

  it('não prossegue com senha incorreta (etapa 233)', async () => {
    mocks.verifySignIn.mockResolvedValue({ data: { user: null }, error: { message: 'Invalid login credentials' } });
    const onDone = vi.fn();
    renderHarness(onDone);

    await userEvent.setup().click(screen.getByRole('button', { name: 'alterar papel' }));
    await confirmPassword('senha-errada');

    await waitFor(() => expect(mocks.verifySignIn).toHaveBeenCalledWith({
      email: 'a@exemplo.com',
      password: 'senha-errada',
    }));
    expect(onDone).not.toHaveBeenCalled();
    // O cliente de verificação é descartado mesmo quando a senha está errada.
    await waitFor(() => expect(mocks.verifyDispose).toHaveBeenCalled());
    // A tentativa recusada fica registrada para auditoria.
    await waitFor(() => expect(mocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: 'reauth_failed' }),
    ));
  });

  it('confere a senha sem trocar a sessão do cliente compartilhado (etapa 233)', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    const onDone = vi.fn();
    renderHarness(onDone);

    await userEvent.setup().click(screen.getByRole('button', { name: 'alterar papel' }));
    await confirmPassword('senha-certa');

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
    expect(mocks.verifySignOut).toHaveBeenCalled();
    // Nenhum cliente de verificação fica vivo na aba depois da confirmação.
    expect(mocks.verifyDispose).toHaveBeenCalledTimes(1);
  });

  it('mantém a confirmação para o mesmo operador sem novo login (etapa 233)', async () => {
    const onDone = vi.fn();
    renderHarness(onDone);

    await userEvent.setup().click(screen.getByRole('button', { name: 'alterar papel' }));
    await confirmPassword('senha-certa');
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));

    // Renovação de token não troca o dono da confirmação.
    mocks.authCb?.('TOKEN_REFRESHED', { user: { id: 'user-a' } });

    await userEvent.setup().click(screen.getByRole('button', { name: 'alterar papel' }));

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(2));
    expect(screen.queryByText('Verificação de Segurança')).not.toBeInTheDocument();
  });

  it('pede a senha quando outra conta entra sem logout prévio (etapa 233)', async () => {
    const onDone = vi.fn();
    renderHarness(onDone);

    await userEvent.setup().click(screen.getByRole('button', { name: 'alterar papel' }));
    await confirmPassword('senha-certa');
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));

    // Sem SIGNED_OUT: só o evento de entrada da outra conta.
    mocks.authCb?.('SIGNED_IN', { user: { id: 'user-b' } });

    await userEvent.setup().click(screen.getByRole('button', { name: 'alterar papel' }));

    expect(onDone).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Verificação de Segurança')).toBeInTheDocument();
  });

  it('não empresta a confirmação para outra conta na mesma aba (etapa 233)', async () => {
    const onDone = vi.fn();
    renderHarness(onDone);

    await userEvent.setup().click(screen.getByRole('button', { name: 'alterar papel' }));
    await confirmPassword('senha-certa');
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));

    // Troca de operador no mesmo aparelho.
    mocks.authCb?.('SIGNED_OUT', null);
    mocks.authCb?.('SIGNED_IN', { user: { id: 'user-b' } });

    await userEvent.setup().click(screen.getByRole('button', { name: 'alterar papel' }));

    expect(onDone).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Verificação de Segurança')).toBeInTheDocument();
  });
});