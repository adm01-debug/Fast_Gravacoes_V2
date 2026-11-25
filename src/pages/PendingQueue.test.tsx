import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import PendingQueue from './PendingQueue';

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
  PendingJobsView: () => <div data-testid="pending-jobs-view" />,
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