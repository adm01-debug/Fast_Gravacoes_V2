import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const { deleteMany, toastSuccess, toastError } = vi.hoisted(() => ({
  deleteMany: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

const schedulingState: Record<string, unknown> = {
  jobs: [],
  techniques: [],
  machines: [],
  isLoading: false,
  isLoadingTechniques: false,
  getTechniqueById: () => undefined,
  getMachineById: () => undefined,
};

vi.mock('sonner', () => ({ toast: { success: toastSuccess, error: toastError, info: vi.fn(), warning: vi.fn() } }));

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DragOverlay: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  closestCorners: vi.fn(),
  KeyboardSensor: class {},
  PointerSensor: class {},
  useSensor: () => ({}),
  useSensors: () => [],
}));

vi.mock('@dnd-kit/sortable', () => ({ sortableKeyboardCoordinates: vi.fn() }));

vi.mock('@/hooks/useFuseSearch', () => ({ useFuseSearch: (items: unknown[]) => items }));

vi.mock('@/components/layout/MainLayout', () => ({
  MainLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Cartao minimo que expoe selecao e identidade da OS, no lugar do card real.
vi.mock('@/components/kanban/DroppableColumn', () => ({
  DroppableColumn: ({
    jobs,
    selectedJobs,
    onSelectJob,
  }: {
    jobs: { id: string; order_number: string }[];
    selectedJobs: Set<string>;
    onSelectJob: (id: string) => void;
  }) => (
    <div>
      {jobs.map(job => (
        <button
          key={job.id}
          type="button"
          data-testid={`job-${job.id}`}
          data-selected={selectedJobs.has(job.id) ? 'sim' : 'nao'}
          onClick={() => onSelectJob(job.id)}
        >
          {job.order_number}
        </button>
      ))}
    </div>
  ),
}));

vi.mock('@/components/kanban/DragOverlayCard', () => ({ DragOverlayCard: () => null }));
vi.mock('@/components/kanban/KanbanMetricsBar', () => ({ KanbanMetricsBar: () => null }));
vi.mock('@/components/kanban/KanbanFiltersBar', () => ({ KanbanFiltersBar: () => null }));
vi.mock('@/components/kanban/KanbanAIAdvisor', () => ({ KanbanAIAdvisor: () => null }));
vi.mock('@/components/planning/SmartSequencingPanel', () => ({ SmartSequencingPanel: () => null }));
vi.mock('@/components/planning/LoadBalancingPanel', () => ({ LoadBalancingPanel: () => null }));
vi.mock('@/components/planning/PlanningEfficiencyDashboard', () => ({ PlanningEfficiencyDashboard: () => null }));
vi.mock('@/components/scheduling/StuckJobsPanel', () => ({ StuckJobsPanel: () => null }));
vi.mock('@/components/scheduling/CapacityHealthPanel', () => ({ CapacityHealthPanel: () => null }));
vi.mock('@/components/jobs/JobDetailsModal', () => ({ JobDetailsModal: () => null }));
vi.mock('@/components/navigation/FavoritesManager', () => ({
  FavoriteButton: () => null,
  FavoritesDropdown: () => null,
}));

vi.mock('@/features/jobs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/jobs')>();
  return {
    ...actual,
    jobsService: { ...actual.jobsService, deleteMany: (ids: string[]) => deleteMany(ids) },
    useSchedulingData: () => schedulingState,
    useKanbanDragDrop: () => ({
      activeJob: null,
      isUpdating: false,
      handleDragStart: vi.fn(),
      handleDragOver: vi.fn(),
      handleDragEnd: vi.fn(),
      handleDragCancel: vi.fn(),
    }),
  };
});

import KanbanBoard from './KanbanBoard';

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}>
      <KanbanBoard />
    </QueryClientProvider>
  );

const makeJob = (id: string, orderNumber: string, status: string) => ({
  id,
  order_number: orderNumber,
  status,
  priority: 'medium',
  technique_id: 't1',
  machine_id: null,
  client: 'Cliente',
  product: 'Produto',
  quantity: 10,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

describe('KanbanBoard - exclusao em massa (etapa 037)', () => {
  beforeEach(() => {
    deleteMany.mockReset();
    toastSuccess.mockClear();
    toastError.mockClear();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    schedulingState.jobs = [makeJob('j1', 'PED-1', 'queue'), makeJob('j2', 'PED-2', 'production')];
  });

  it('mantem visivel e selecionada a OS que o banco recusou', async () => {
    deleteMany.mockResolvedValue({
      deleted: ['j1'],
      refused: [{ id: 'j2', reason: 'status "production" nao permite exclusao' }],
    });
    renderPage();

    fireEvent.click(screen.getByTestId('job-j1'));
    fireEvent.click(screen.getByTestId('job-j2'));
    fireEvent.click(screen.getByRole('button', { name: /Excluir/i }));

    await waitFor(() => expect(deleteMany).toHaveBeenCalledWith(['j1', 'j2']));

    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith(expect.stringMatching(/1 jobs exclu.dos permanentemente/)));
    expect(toastError).toHaveBeenCalledWith(expect.stringContaining('status "production"'));

    // A recusada continua no quadro e marcada; sem isso o Kanban anunciava
    // exclusao de uma OS que nunca saiu do banco.
    expect(screen.getByTestId('job-j2')).toBeInTheDocument();
    expect(screen.getByTestId('job-j2')).toHaveAttribute('data-selected', 'sim');
    expect(screen.getByTestId('job-j1')).toHaveAttribute('data-selected', 'nao');
  });

  it('nao anuncia exclusao quando o banco nao apaga nenhuma linha', async () => {
    deleteMany.mockResolvedValue({
      deleted: [],
      refused: [{ id: 'j1', reason: 'a OS mudou de situacao ou o usuario nao tem permissao de exclusao' }],
    });
    renderPage();

    fireEvent.click(screen.getByTestId('job-j1'));
    fireEvent.click(screen.getByRole('button', { name: /Excluir/i }));

    await waitFor(() => expect(deleteMany).toHaveBeenCalledWith(['j1']));

    expect(toastSuccess).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith(expect.stringMatching(/foram exclu/));
    expect(screen.getByTestId('job-j1')).toHaveAttribute('data-selected', 'sim');
  });
});