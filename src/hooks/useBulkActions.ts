import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { showErrorToast } from '@/lib/errorHandling';
import type { Database } from '@/integrations/supabase/types';

type TableName = keyof Database['public']['Tables'];

export interface BulkActionProgress {
  total: number;
  completed: number;
  failed: number;
  percentage: number;
}

export function useBulkActions<T extends { id: string }>(tableName: TableName) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<BulkActionProgress | null>(null);
  const queryClient = useQueryClient();

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((items: T[]) => {
    setSelectedIds(new Set(items.map(item => item.id)));
  }, []);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = useCallback((id: string) => {
    return selectedIds.has(id);
  }, [selectedIds]);

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ ids, updates }: { ids: string[]; updates: Record<string, unknown> }) => {
      const total = ids.length;
      let completed = 0;
      let failed = 0;

      const batchSize = 50;
      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        const table = supabase.from(tableName) as unknown as {
          update: (v: Record<string, unknown>) => { in: (col: string, vals: string[]) => Promise<{ error: unknown }> };
        };
        const { error } = await table.update(updates).in('id', batch);

        if (error) {
          failed += batch.length;
        } else {
          completed += batch.length;
        }

        setProgress({
          total,
          completed: completed + failed,
          failed,
          percentage: Math.round(((completed + failed) / total) * 100),
        });
      }

      if (failed > 0) {
        toast.warning(`${completed} atualizados, ${failed} falharam`);
      } else {
        toast.success(`${completed} registros atualizados`);
      }

      return { completed, failed };
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [tableName] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      setProgress(null);
    },
    onError: (error: Error) => {
      showErrorToast(error, 'Erro na atualização em lote');
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const total = ids.length;
      let completed = 0;
      let failed = 0;

      const batchSize = 50;
      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        const table = supabase.from(tableName) as unknown as {
          delete: () => { in: (col: string, vals: string[]) => Promise<{ error: unknown }> };
        };
        const { error } = await table.delete().in('id', batch);

        if (error) {
          failed += batch.length;
        } else {
          completed += batch.length;
        }

        setProgress({
          total,
          completed: completed + failed,
          failed,
          percentage: Math.round(((completed + failed) / total) * 100),
        });
      }

      if (failed > 0) {
        toast.warning(`${completed} excluídos, ${failed} falharam`);
      } else {
        toast.success(`${completed} registros excluídos`);
      }

      return { completed, failed };
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [tableName] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      deselectAll();
      setProgress(null);
    },
    onError: (error: Error) => {
      showErrorToast(error, 'Erro na exclusão em lote');
    },
  });

  const bulkUpdate = useCallback(
    (updates: Record<string, unknown>) => {
      const ids = Array.from(selectedIds);
      if (ids.length === 0) {
        toast.error('Nenhum item selecionado');
        return;
      }
      bulkUpdateMutation.mutate({ ids, updates });
    },
    [selectedIds, bulkUpdateMutation]
  );

  const bulkDelete = useCallback(() => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      toast.error('Nenhum item selecionado');
      return;
    }
    bulkDeleteMutation.mutate(ids);
  }, [selectedIds, bulkDeleteMutation]);

  return {
    selectedIds,
    selectedCount: selectedIds.size,
    toggleSelection,
    selectAll,
    deselectAll,
    isSelected,
    bulkUpdate,
    bulkDelete,
    progress,
    isProcessing: bulkUpdateMutation.isPending || bulkDeleteMutation.isPending,
  };
}
