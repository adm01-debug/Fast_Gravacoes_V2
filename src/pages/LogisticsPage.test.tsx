import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'pt-BR' } }),
}));
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

const updateShipmentMutate = vi.fn();
vi.mock('@/features/inventory', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useLogistics: () => ({
      shipments: {
        data: [
          { id: 'ship-delivered', job_id: 'job-1', tracking_code: 'OLD-TRACK', status: 'delivered', actual_delivery: '2026-11-10T12:00:00.000Z', job: { id: 'job-1', order_number: 'OS-001', client: 'Cliente A' } },
          { id: 'ship-transit', job_id: 'job-2', tracking_code: 'TRACK-2', status: 'in_transit', actual_delivery: null, job: { id: 'job-2', order_number: 'OS-002', client: 'Cliente B' } },
        ],
        isLoading: false,
      },
      updateShipment: { mutate: updateShipmentMutate, isPending: false },
    }),
  };
});

vi.mock('@/components/layout/MainLayout', () => ({
  MainLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/navigation/Breadcrumbs', () => ({ Breadcrumbs: () => null }));
vi.mock('@/components/logistics/CreateShipmentModal', () => ({ CreateShipmentModal: () => null }));
vi.mock('@/components/logistics/EditShipmentModal', () => ({ EditShipmentModal: () => null }));
vi.mock('@/components/ui/button', () => ({ Button: (p: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...p} /> }));
vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  CardContent: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  CardHeader: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  CardTitle: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  CardDescription: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
}));
vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  TabsList: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  TabsTrigger: (p: { value: string; children: React.ReactNode }) => <button>{p.children}</button>,
  TabsContent: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
}));
vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  DropdownMenuItem: (p: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...p} />,
}));
vi.mock('@/components/ui/input', () => ({ Input: (p: React.InputHTMLAttributes<HTMLInputElement>) => <input {...p} /> }));
vi.mock('@/components/ui/badge', () => ({ Badge: ({ children }: React.PropsWithChildren) => <span>{children}</span> }));
vi.mock('@/components/ui/skeleton', () => ({ Skeleton: () => <div /> }));

import LogisticsPage from './LogisticsPage';

const renderWithProviders = () =>
  render(
    <HelmetProvider>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
        <MemoryRouter>
          <LogisticsPage />
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );

describe('LogisticsPage - atalho "Marcar como Entregue" (F-010/Devin)', () => {
  beforeEach(() => {
    updateShipmentMutate.mockReset();
  });

  it('primeira transicao grava actual_delivery', async () => {
    renderWithProviders();

    // So o envio em transito exibe o atalho; o ja entregue nao
    expect(screen.getAllByText('Marcar como Entregue')).toHaveLength(1);
    fireEvent.click(screen.getByText('Marcar como Entregue'));

    await waitFor(() => expect(updateShipmentMutate).toHaveBeenCalledTimes(1));
    const [arg] = updateShipmentMutate.mock.calls[0];
    expect(arg.id).toBe('ship-transit');
    expect(arg.data.status).toBe('delivered');
    expect(arg.data.actual_delivery).toBeTruthy();
  });

  it('repetir o atalho em envio ja entregue e impossivel e preserva a data original', () => {
    renderWithProviders();

    // O card do envio entregue nao renderiza o atalho: nao ha como
    // regravar a data. So existe o atalho do envio em transito.
    expect(screen.getAllByText('Marcar como Entregue')).toHaveLength(1);
  });
});
