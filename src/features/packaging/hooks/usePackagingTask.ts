import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { packagingService } from '../services/packagingService';
import type {
  DefectTriageForm,
  PackagingRegisterForm,
  PackagingTaskStatus,
} from '../types/packaging.schema';

export function usePackagingTask(taskId: string | null) {
  const queryClient = useQueryClient();

  const taskQuery = useQuery({
    queryKey: ['packaging-task', taskId],
    queryFn: () => (taskId ? packagingService.getTask(taskId) : null),
    enabled: !!taskId,
    staleTime: 30_000,
  });

  const defectsQuery = useQuery({
    queryKey: ['packaging-task-defects', taskId],
    queryFn: () => (taskId ? packagingService.listDefects(taskId) : []),
    enabled: !!taskId,
    staleTime: 30_000,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['packaging-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['packaging-task', taskId] });
    queryClient.invalidateQueries({ queryKey: ['packaging-task-defects', taskId] });
  };

  const assign = useMutation({
    mutationFn: () => packagingService.assignToMe(taskId!),
    onSuccess: () => {
      toast.success('Tarefa assumida');
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message || 'Erro ao assumir tarefa'),
  });

  const changeStatus = useMutation({
    mutationFn: (
      input: PackagingTaskStatus | { status: PackagingTaskStatus; delay_reason?: string; delay_category?: string; was_overdue?: boolean },
    ) => {
      if (typeof input === 'string') return packagingService.updateStatus(taskId!, input);
      const { status, ...extra } = input;
      return packagingService.updateStatus(taskId!, status, extra);
    },
    onSuccess: () => {
      toast.success('Status atualizado');
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message || 'Erro ao atualizar status'),
  });

  const registerPackaging = useMutation({
    mutationFn: (values: PackagingRegisterForm) => packagingService.registerPackaging(taskId!, values),
    onSuccess: () => {
      toast.success('Embalagem registrada');
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message || 'Erro ao registrar embalagem'),
  });

  const recordDefect = useMutation({
    mutationFn: (form: DefectTriageForm) => packagingService.recordDefect(taskId!, form),
    onSuccess: () => {
      toast.success('Defeito registrado');
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message || 'Erro ao registrar defeito'),
  });

  return {
    task: taskQuery.data ?? null,
    defects: defectsQuery.data ?? [],
    isLoading: taskQuery.isLoading || defectsQuery.isLoading,
    assign,
    changeStatus,
    registerPackaging,
    recordDefect,
  };
}
