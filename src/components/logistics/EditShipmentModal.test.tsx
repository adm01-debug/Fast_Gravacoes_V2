import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }));

const updateShipmentMutate = vi.fn();
vi.mock('@/features/inventory', () => ({
  useLogistics: () => ({
    providers: { data: [{ id: 'prov-1', name: 'Loggi' }], isSuccess: true },
    updateShipment: { mutate: updateShipmentMutate, isPending: false },
  }),
}));

// Stubs leves para os componentes shadcn; o modal só usa a estrutura.
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: React.PropsWithChildren) => <div data-testid="dialog">{children}</div>,
  DialogContent: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  DialogHeader: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  DialogTitle: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  DialogDescription: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
}));
vi.mock('@/components/ui/button', () => ({
  Button: (p: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...p} />,
}));
vi.mock('@/components/ui/input', () => ({
  Input: (p: React.InputHTMLAttributes<HTMLInputElement>) => <input {...p} />,
}));
vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: React.PropsWithChildren) => <label>{children}</label>,
}));
vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  SelectTrigger: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  SelectValue: () => <span />,
  SelectContent: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  SelectItem: (p: { value: string; children: React.ReactNode }) => <div>{p.children}</div>,
}));

import { EditShipmentModal } from './EditShipmentModal';
import { DbShipment } from '@/features/inventory';

const deliveredShipment: DbShipment = {
  id: 'ship-1',
  job_id: 'job-1',
  provider_id: 'prov-1',
  tracking_code: 'OLD-TRACK',
  destination: 'Sao Paulo',
  status: 'delivered',
  freight_cost: 10,
  estimated_delivery: '2026-11-10T00:00:00.000Z',
  actual_delivery: '2026-11-10T00:00:00.000Z',
} as DbShipment;

describe('EditShipmentModal', () => {
  beforeEach(() => {
    updateShipmentMutate.mockReset();
  });

  it('nao sobrescreve actual_delivery ao corrigir rastreio de envio ja entregue (F-010/Devin)', () => {
    render(
      <EditShipmentModal shipment={deliveredShipment} open={true} onOpenChange={() => {}} />
    );

    // muda só o rastreio (mantém o status 'delivered' já preenchido)
    const tracking = screen.getByPlaceholderText('Ex: LOG-123456') as HTMLInputElement;
    fireEvent.change(tracking, { target: { value: 'NEW-TRACK' } });

    fireEvent.click(screen.getByRole('button', { name: 'common.save' }));

    expect(updateShipmentMutate).toHaveBeenCalledTimes(1);
    const [arg] = updateShipmentMutate.mock.calls[0];
    const data = arg.data;
    expect(data.status).toBeUndefined(); // sem mudança de status: RPC nem é chamada
    expect(data.actual_delivery).toBe('2026-11-10T00:00:00.000Z'); // data real preservada
    expect(data.tracking_code).toBe('NEW-TRACK');
  });

  it('nao envia status/actual_delivery quando nenhum campo de status muda (correcao de frete)', () => {
    const transitShipment: DbShipment = {
      ...deliveredShipment,
      tracking_code: 'NEW-TRACK',
      status: 'in_transit',
      actual_delivery: undefined as unknown as string,
    } as DbShipment;
    render(
      <EditShipmentModal shipment={transitShipment} open={true} onOpenChange={() => {}} />
    );

    fireEvent.change(screen.getByPlaceholderText('Ex: LOG-123456'), { target: { value: 'OTHER' } });
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }));

    expect(updateShipmentMutate).toHaveBeenCalledTimes(1);
    const [arg] = updateShipmentMutate.mock.calls[0];
    const data = arg.data;
    expect(data.status).toBeUndefined();
    expect(data.actual_delivery).toBeUndefined();
  });
});