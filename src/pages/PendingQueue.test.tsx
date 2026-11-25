import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import PendingQueue from './PendingQueue';
import { bulkDeleteBlocker, selectBulkDeleteTargets, selectHiddenDeleteTargets } from '@/features/jobs/lib/pending-queue';

const refetchAll = vi.fn();

const schedulingState: Record<string, unknown> = {
  jobs: [],
  techniques: [],
  machines: [],
  isLoading: false,
  isLoadingTechniques: false,
  error: null,
  refetchAll,
};

vi.mock('@/components/layout/MainLayout', () => ({
  MainLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/features/jobs', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useSchedulingData: () => schedulingState,
    useAutoBufferPromotion: () => ({ triggerPromotion: vi.fn(), isPromoting: false, bufferTarget: 5 }),
    useSmartSequencingWithActions: () => ({ suggestions: [], actions: {} }),
  };
});

vi.mock('@/features/admin', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return { ...actual, useDataExport: () => ({ exportData: vi.fn(), isExporting: false }) };
});

vi.mock('@/features/analytics/hooks/useLoadBalancingWithActions', () => ({
  useLoadBalancingWithActions: () => ({ suggestions: [], actions: {} }),
}));

vi.mock('@/hooks/useFuseSearch', () => ({ useFuseSearch: (items: unknown[]) => items }));

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: () => ({ getTotalSize: () => 0, getVirtualItems: () => [] }),
}));

vi.mock('@/components/planning/pending-queue/PendingJobsView', () => ({
  PendingJobsView: ({ onSelectAll }: { onSelectAll: () => void }) => (
    <div data-testid="pending-jobs-view">
      <button type="button" onClick={onSelectAll}>selecionar todos</button>
    </div>
  ),
}));

vi.mock('@/components/planning/pending-queue/SmartSuggestionsSection', () => ({
  SmartSuggestionsSection: () => <div data-testid="smart-suggestions" />,
}));

vi.mock('@/components/planning/PendingQueueStats', () => ({
  PendingQueueStats: () => <div data-testid="pending-stats" />,
}));

vi.mock('@/components/planning/AISuggestionDetails', () => ({
  AISuggestionDetails: () => null,
}));

vi.mock('@/components/jobs/JobDetailsModal', () => ({ JobDetailsModal: () => null }));

vi.mock('@/components/navigation/Breadcrumbs', () => ({ Breadcrumbs: () => null }));

const { deleteIn, jobRows } = vi.hoisted(() => ({
  deleteIn: vi.fn(),
  jobRows: {} as Record<string, { status: string; produced_quantity: number; lost_pieces: number }>,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: (_column: string, id: string) => ({
          maybeSingle: () => ({ data: jobRows[id] ? { id, ...jobRows[id] } : null, error: null }),
        }),
        in: (_column: string, ids: string[]) => ({
          data: ids.filter(id => jobRows[id]).map(id => ({ id, ...jobRows[id] })),
          error: null,
        }),
      }),
      delete: () => {
        let pending: string[] = [];
        const chain = {
          in: (column: string, ids: string[]) => {
            if (column === 'id') {
              pending = ids;
              deleteIn(ids);
            }
            return chain;
          },
          or: () => chain,
          select: () => ({ data: pending.map(id => ({ id })), error: null }),
        };
        return chain;
      },
    }),
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}>
      <PendingQueue />
    </QueryClientProvider>
  );

describe('PendingQueue - estado de erro da fila (etapa 260)', () => {
  beforeEach(() => {
    refetchAll.mockClear();
    schedulingState.jobs = [];
    schedulingState.error = null;
  });

  it('mostra bloco de erro com ação de tentar novamente no lugar da fila', () => {
    schedulingState.error = new Error('falha de leitura');
    renderPage();

    expect(screen.getByText('Não foi possível carregar a fila')).toBeInTheDocument();
    expect(screen.queryByText('Fila de Produção')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pending-jobs-view')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Tentar novamente/i }));
    expect(refetchAll).toHaveBeenCalledTimes(1);
  });

  it('sem erro e sem jobs mantém o estado vazio legítimo, não o de erro', () => {
    renderPage();

    expect(screen.getByText('Fila de Produção')).toBeInTheDocument();
    expect(screen.getByTestId('pending-jobs-view')).toBeInTheDocument();
    expect(screen.queryByText('Não foi possível carregar a fila')).not.toBeInTheDocument();
  });

  it('com jobs renderiza a fila normal', () => {
    schedulingState.jobs = [{ id: 'j1', status: 'queue', priority: 'normal', technique_id: 't1' }];
    renderPage();

    expect(screen.getByText('Fila de Produção')).toBeInTheDocument();
    expect(screen.getByTestId('pending-jobs-view')).toBeInTheDocument();
    expect(screen.queryByText('Não foi possível carregar a fila')).not.toBeInTheDocument();
  });
});

    describe('bulkDeleteBlocker - regra do trigger de exclusão (etapas 036/037)', () => {
      it('impede OS com peças produzidas', () => {
        expect(bulkDeleteBlocker({ produced_quantity: 12, lost_pieces: 0, status: 'queue' }))
          .toMatch(/12 peça\(s\) produzida/);
      });

      it('impede OS com peças perdidas mesmo sem produzidas', () => {
        expect(bulkDeleteBlocker({ produced_quantity: 0, lost_pieces: 3, status: 'queue' }))
          .toMatch(/3 perdida/);
      });

      it('impede status fora de fila, agendada ou cancelada', () => {
        expect(bulkDeleteBlocker({ produced_quantity: 0, lost_pieces: 0, status: 'finished' }))
          .toMatch(/status "finished" não permite/);
      });

      it('libera OS em fila sem produção registrada', () => {
        expect(bulkDeleteBlocker({ produced_quantity: 0, lost_pieces: 0, status: 'queue' })).toBeNull();
      });
    });

          describe('selectBulkDeleteTargets - seleção sobrevive ao filtro (etapa 037)', () => {
            it('inclui OS marcadas que a busca atual escondeu', () => {
              const jobs = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
              expect(selectBulkDeleteTargets(jobs, new Set(['a', 'c']))).toEqual([{ id: 'a' }, { id: 'c' }]);
            });

            it('ignora IDs que já não existem na lista carregada', () => {
              expect(selectBulkDeleteTargets([{ id: 'a' }], new Set(['a', 'fantasma']))).toEqual([{ id: 'a' }]);
            });

            it('sinaliza os alvos que o filtro atual esconde', () => {
              const targets = [{ id: 'a' }, { id: 'b' }];
              expect(selectHiddenDeleteTargets(targets, [{ id: 'a' }])).toEqual([{ id: 'b' }]);
              expect(selectHiddenDeleteTargets(targets, targets)).toEqual([]);
            });
          });

    describe('PendingQueue - aviso antes da exclusão em massa (etapa 037)', () => {
      beforeEach(() => {
        deleteIn.mockClear();
        for (const key of Object.keys(jobRows)) delete jobRows[key];
        schedulingState.error = null;
        schedulingState.jobs = [];
      });

      it('mostra o que será apagado, marca as impedidas e exclui só as permitidas', async () => {
        schedulingState.jobs = [
          { id: 'sem-producao', order_number: 'PED-1', status: 'queue', priority: 'normal', technique_id: 't1', produced_quantity: 0, lost_pieces: 0 },
          { id: 'com-producao', order_number: 'PED-2', status: 'queue', priority: 'normal', technique_id: 't1', produced_quantity: 40, lost_pieces: 2 },
        ];
        jobRows['sem-producao'] = { status: 'queue', produced_quantity: 0, lost_pieces: 0 };
        jobRows['com-producao'] = { status: 'queue', produced_quantity: 40, lost_pieces: 2 };
        renderPage();

        fireEvent.click(screen.getByRole('button', { name: /selecionar todos/i }));
        fireEvent.click(screen.getByRole('button', { name: /^Excluir$/i }));

        expect(await screen.findByText('Excluir 1 OS permanentemente?')).toBeInTheDocument();
        expect(screen.getByText(/perdas de produção, expedições, tarefas de embalagem/i)).toBeInTheDocument();
        expect(screen.getByText(/PED-2 — 40 peça\(s\) produzida\(s\) e 2 perdida\(s\)/)).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /^Excluir 1 OS$/i }));

        await waitFor(() => expect(deleteIn).toHaveBeenCalledWith(['sem-producao']));
      });
    });