import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { ErpApiKeysPanel } from './ErpApiKeysPanel';
import { useErpApiKeys } from '@/features/admin/hooks/useErpApiKeys';

vi.mock('@/features/admin/hooks/useErpApiKeys', () => ({ useErpApiKeys: vi.fn() }));

const mutateAsync = vi.fn();
const mutate = vi.fn();

const base = {
  keys: [],
  ativas: 0,
  isLoading: false,
  error: null,
  create: { isPending: false, mutateAsync },
  revoke: { isPending: false, mutate },
} as unknown as ReturnType<typeof useErpApiKeys>;

describe('ErpApiKeysPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useErpApiKeys).mockReturnValue(base);
  });

  it('mostra o estado vazio quando nao ha chave', () => {
    render(<ErpApiKeysPanel />);
    expect(screen.getByText('Nenhuma chave cadastrada. Crie a primeira para liberar o acesso do ERP.')).toBeTruthy();
  });

  it('traduz a negativa de RLS em mensagem de permissao', () => {
    vi.mocked(useErpApiKeys).mockReturnValue({
      ...base,
      error: new Error('new row violates row-level security policy for table "erp_api_keys"'),
    });

    render(<ErpApiKeysPanel />);

    expect(
      screen.getByText(/Sua conta não tem permissão para gerenciar chaves \(papel manager ou admin\)\./),
    ).toBeTruthy();
  });

  it('lista as chaves e revoga somente depois da confirmacao', async () => {
    vi.mocked(useErpApiKeys).mockReturnValue({
      ...base,
      ativas: 1,
      keys: [
        { id: 'k1', name: 'Promo Design', is_active: true, created_at: '2026-11-23T23:42:23Z', last_used_at: null, created_by: null },
        { id: 'k2', name: 'Antiga', is_active: false, created_at: '2026-11-20T10:00:00Z', last_used_at: '2026-11-22T10:00:00Z', created_by: null },
      ],
    });

    render(<ErpApiKeysPanel />);

    expect(screen.getByText('Promo Design')).toBeTruthy();
    // Só a chave sem uso mostra o rótulo; a que já foi usada mostra a data.
    expect(screen.getByText('Nunca usada')).toBeTruthy();
    // Chave já usada mostra a data do último acesso na própria linha.
    const linhaAntiga = screen.getByText('Antiga').closest('tr') as HTMLTableRowElement;
    expect(within(linhaAntiga).getByText(/22\/11\/2026/)).toBeTruthy();
    // So a chave ativa oferece revogacao.
    expect(screen.getAllByRole('button', { name: 'Revogar' })).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Revogar' }));
    expect(mutate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Confirmar/ }));
    expect(mutate).toHaveBeenCalledWith('k1', expect.anything());
  });

  it('mostra a chave recem-criada para copia e limpa o campo de nome', async () => {
    mutateAsync.mockResolvedValue('fgv_live_0123456789abcdef0123456789abcdef0123456789abcdef');
    vi.mocked(useErpApiKeys).mockReturnValue(base);

    render(<ErpApiKeysPanel />);

    const campo = screen.getByLabelText('Nome da chave') as HTMLInputElement;
    fireEvent.change(campo, { target: { value: 'Promo Design' } });
    fireEvent.click(screen.getByRole('button', { name: /Nova chave/ }));

    expect(await screen.findByText(/Copie agora/)).toBeTruthy();
    expect(screen.getByText('fgv_live_0123456789abcdef0123456789abcdef0123456789abcdef')).toBeTruthy();
    expect(mutateAsync).toHaveBeenCalledWith('Promo Design');
    await waitFor(() => expect(campo.value).toBe(''));
  });

  it('nao cria chave sem nome', () => {
    render(<ErpApiKeysPanel />);
    fireEvent.click(screen.getByRole('button', { name: /Nova chave/ }));
    expect(mutateAsync).not.toHaveBeenCalled();
  });
});