import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string, o?: { order?: string }) => (o?.order ? `${k} ${o.order}` : k) }),
}));

const toastError = vi.fn();
const toastSuccess = vi.fn();
vi.mock('sonner', () => ({ toast: { success: (...a: unknown[]) => toastSuccess(...a), error: (...a: unknown[]) => toastError(...a) } }));

const updateStatusMutateAsync = vi.fn();
vi.mock('@/features/jobs', () => ({
  useSchedulingData: () => ({ getTechniqueById: () => undefined, getMachineById: () => undefined }),
  useUpdateJob: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteJob: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateJobStatus: () => ({ mutateAsync: (...a: unknown[]) => updateStatusMutateAsync(...a), isPending: false }),
  useDuplicateJob: () => ({ duplicateJob: vi.fn() }),
}));

vi.mock('@/features/admin', () => ({
  useEntityAuditTrail: () => ({ data: [], isLoading: false, error: null }),
  useDataExport: () => ({ exportAuditTrail: vi.fn() }),
}));
vi.mock('@/features/admin/components/audit/AuditEntryCard', () => ({ AuditEntryCard: () => null }));
vi.mock('@/features/admin/components/audit/HistoryPeriodFilter', () => ({ HistoryPeriodFilter: () => null }));
vi.mock('@/contexts/ConfirmationContext', () => ({ useConfirmation: () => ({ confirm: vi.fn() }) }));
vi.mock('@/components/qrcode/JobQRCode', () => ({ JobQRCode: () => null }));
vi.mock('@/components/production/ProductionPhotos', () => ({ ProductionPhotos: () => null }));

vi.mock('./JobCostsTab', () => ({ JobCostsTab: () => null }));
vi.mock('./JobTraceabilityTab', () => ({ JobTraceabilityTab: () => null }));
vi.mock('./JobQualityTab', () => ({ JobQualityTab: () => null }));
vi.mock('./JobInstructionsTab', () => ({ JobInstructionsTab: () => null }));
vi.mock('./JobInfoGrid', () => ({ JobInfoGrid: () => null }));

// O gancho real entre as quick actions e o diálogo de cancelamento.
vi.mock('./JobQuickActions', () => ({
  JobQuickActions: ({ handleAction }: { handleAction: (a: string) => void }) => (
    <button type="button" onClick={() => handleAction('cancel')}>abrir-cancelamento</button>
  ),
}));

const { passthrough, dialogPassthrough } = vi.hoisted(() => ({
  passthrough: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  // Respeita a prop `open` para o teste conseguir provar que o diálogo fecha.
  dialogPassthrough: ({ open, children }: { open?: boolean; children?: React.ReactNode }) =>
    open === false ? null : <div>{children}</div>,
}));
vi.mock('@/components/ui/dialog', () => ({
  Dialog: dialogPassthrough,
  DialogContent: passthrough,
  DialogHeader: passthrough,
  DialogTitle: passthrough,
  DialogDescription: passthrough,
}));
vi.mock('@/components/ui/button', () => ({
  Button: (p: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button type="button" {...p} />,
  LoadingButton: (p: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button type="button" {...p} />,
}));
vi.mock('@/components/ui/textarea', () => ({
  Textarea: (p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...p} />,
}));
vi.mock('@/components/ui/input', () => ({
  Input: (p: React.InputHTMLAttributes<HTMLInputElement>) => <input {...p} />,
}));
vi.mock('@/components/ui/badge', () => ({ Badge: passthrough }));
vi.mock('@/components/ui/separator', () => ({ Separator: () => null }));
vi.mock('@/components/ui/status-badge', () => ({ StatusBadge: () => null }));
vi.mock('@/components/ui/skeleton', () => ({ Skeleton: () => null }));
vi.mock('@/components/ui/scroll-area', () => ({ ScrollArea: passthrough }));
vi.mock('@/components/ui/label', () => ({ Label: passthrough }));
vi.mock('@/components/ui/tabs', () => ({
  Tabs: passthrough,
  TabsList: passthrough,
  TabsTrigger: () => null,
  TabsContent: passthrough,
}));
vi.mock('@/components/ui/select', () => ({
  Select: passthrough,
  SelectContent: passthrough,
  SelectItem: () => null,
  SelectTrigger: passthrough,
  SelectValue: () => null,
}));

import { JobDetailsModal } from './JobDetailsModal';

const baseJob = {
  id: 'job-1',
  order_number: 'OS-900',
  client: 'ACME',
  product: 'Adesivo vinil',
  quantity: 10,
  technique_id: 't1',
  machine_id: 'm1',
  product_category_id: 'c1',
  status: 'queue',
  priority: 'medium',
  notes: null,
  gravure_color: null,
  produced_quantity: 0,
  lost_pieces: 0,
  production_photos: [],
  cancel_reason: null,
};

function renderModal(job: Record<string, unknown>, onOpenChange = vi.fn()) {
  render(
    <JobDetailsModal
      job={{ ...baseJob, ...job } as never}
      open
      onOpenChange={onOpenChange}
    />,
  );
  return onOpenChange;
}

function openCancelDialog() {
  fireEvent.click(screen.getByText('abrir-cancelamento'));
  return document.getElementById('cancel-reason') as HTMLTextAreaElement;
}

describe('JobDetailsModal - cancelamento de OS', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateStatusMutateAsync.mockResolvedValue({ id: 'job-1', status: 'cancelled' });
  });

  it('shows the cancel reason of a cancelled job', () => {
    renderModal({ status: 'cancelled', cancel_reason: 'Cliente desistiu' });
    expect(screen.getByText('Cliente desistiu')).toBeTruthy();
  });

  it('keeps the confirmation disabled while the reason is empty', () => {
    renderModal({});
    openCancelDialog();
    expect(screen.getByText('Confirmar cancelamento').closest('button')).toBeDisabled();
  });

  it('sends the trimmed reason and closes the dialog on confirmation', async () => {
    const onOpenChange = renderModal({});
    const textarea = openCancelDialog();
    fireEvent.change(textarea, { target: { value: '  Cliente desistiu  ' } });
    fireEvent.click(screen.getByText('Confirmar cancelamento'));

    await vi.waitFor(() => expect(updateStatusMutateAsync).toHaveBeenCalledWith({
      jobId: 'job-1',
      status: 'cancelled',
      cancelReason: 'Cliente desistiu',
    }));
    await vi.waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    await vi.waitFor(() => expect(screen.queryByText('Confirmar cancelamento')).toBeNull());
    expect(toastSuccess).toHaveBeenCalledWith('OS cancelada.');
  });

  it('blocks a reason longer than the limit without cutting the pasted text', () => {
    renderModal({});
    const textarea = openCancelDialog();
    const pasted = 'a'.repeat(2001);
    fireEvent.change(textarea, { target: { value: pasted } });

    expect(textarea.value).toBe(pasted);
    expect(textarea.hasAttribute('maxlength')).toBe(false);
    expect(screen.getByText('2001/2000 caracteres')).toBeTruthy();
    const confirm = screen.getByText('Confirmar cancelamento').closest('button') as HTMLButtonElement;
    expect(confirm).toBeDisabled();
    fireEvent.click(confirm);
    expect(updateStatusMutateAsync).not.toHaveBeenCalled();
  });

  it('accepts a reason that only exceeds the limit because of outer spaces', async () => {
    renderModal({});
    const textarea = openCancelDialog();
    fireEvent.change(textarea, { target: { value: `  ${'b'.repeat(2000)}  ` } });

    fireEvent.click(screen.getByText('Confirmar cancelamento'));
    await vi.waitFor(() => expect(updateStatusMutateAsync).toHaveBeenCalledWith({
      jobId: 'job-1',
      status: 'cancelled',
      cancelReason: 'b'.repeat(2000),
    }));
  });

  it('does not keep the typed reason after going back', () => {
    renderModal({});
    const textarea = openCancelDialog();
    fireEvent.change(textarea, { target: { value: 'rascunho' } });
    fireEvent.click(screen.getByText('Voltar'));

    expect(openCancelDialog().value).toBe('');
    expect(updateStatusMutateAsync).not.toHaveBeenCalled();
  });
});