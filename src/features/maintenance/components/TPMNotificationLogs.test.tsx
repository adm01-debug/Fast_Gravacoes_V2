import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TPMNotificationLogs } from './TPMNotificationLogs';

const rows = [
  {
    id: '1',
    machine_id: 'm1',
    channel: 'email',
    severity: 'critical',
    recipient: 'a@b.c',
    status: 'success',
    error_message: null,
    sent_at: '2026-11-26T12:00:00.000Z',
    machine: { name: 'Maquina A', code: 'M-01' },
  },
  {
    id: '2',
    machine_id: 'm1',
    channel: 'whatsapp',
    severity: 'due',
    recipient: 'x',
    status: 'provider_not_configured',
    error_message: "Canal 'whatsapp' sem provedor de envio configurado",
    sent_at: null,
    machine: { name: 'Maquina A', code: 'M-01' },
  },
  {
    id: '3',
    machine_id: 'm1',
    channel: 'email',
    severity: 'due',
    recipient: 'y',
    status: 'failure',
    error_message: 'Falha ao enviar e-mail: 500',
    sent_at: null,
    machine: { name: 'Maquina A', code: 'M-01' },
  },
];

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        order: () => ({
          limit: async () => ({ data: rows, error: null }),
        }),
      }),
    }),
  },
}));

function renderComponent() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <TPMNotificationLogs />
    </QueryClientProvider>,
  );
}

describe('TPMNotificationLogs', () => {
  it('distingue canal sem provedor de falha de entrega', async () => {
    renderComponent();

    expect(await screen.findByText('Sucesso')).toBeInTheDocument();
    // Etapa 016: canal sem provedor nao pode aparecer igual a falha de entrega.
    expect(screen.getByText('Sem provedor')).toBeInTheDocument();
    expect(screen.getByText('Falha')).toBeInTheDocument();
  });
});