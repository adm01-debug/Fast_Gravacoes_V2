import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { showErrorToast } from '@/lib/errorHandling';
import type { Database } from '@/integrations/supabase/types';

type TableName = keyof Database['public']['Tables'];

interface DuplicationOptions {
  excludeFields?: string[];
  overrides?: Record<string, unknown>;
}

const DEFAULT_EXCLUDE = ['id', 'created_at', 'updated_at'];

export function useRecordDuplication(tableName: TableName) {
  const queryClient = useQueryClient();

  const duplicateMutation = useMutation({
    mutationFn: async ({
      record,
      options = {},
    }: {
      record: Record<string, unknown>;
      options?: DuplicationOptions;
    }) => {
      const excludeFields = [...DEFAULT_EXCLUDE, ...(options.excludeFields ?? [])];
      const duplicate: Record<string, unknown> = {};

      Object.entries(record).forEach(([key, value]) => {
        if (!excludeFields.includes(key)) {
          duplicate[key] = value;
        }
      });

      if (options.overrides) {
        Object.assign(duplicate, options.overrides);
      }

      const { data, error } = await supabase
        .from(tableName as never)
        .insert(duplicate as never)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tableName] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Registro duplicado com sucesso');
    },
    onError: (error) => {
      showErrorToast(error, 'Erro ao duplicar');
    },
  });

  const bulkDuplicateMutation = useMutation({
    mutationFn: async ({
      records,
      options = {},
    }: {
      records: Record<string, unknown>[];
      options?: DuplicationOptions;
    }) => {
      const excludeFields = [...DEFAULT_EXCLUDE, ...(options.excludeFields ?? [])];

      const duplicates = records.map(record => {
        const dup: Record<string, unknown> = {};
        Object.entries(record).forEach(([key, value]) => {
          if (!excludeFields.includes(key)) {
            dup[key] = value;
          }
        });
        if (options.overrides) {
          Object.assign(dup, options.overrides);
        }
        return dup;
      });

      const { data, error } = await supabase
        .from(tableName as never)
        .insert(duplicates as never)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [tableName] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success(`${data?.length ?? 0} registros duplicados`);
    },
    onError: (error) => {
      showErrorToast(error, 'Erro na duplicação em lote');
    },
  });

  const duplicateRecord = useCallback(
    (record: Record<string, unknown>, options?: DuplicationOptions) => {
      return duplicateMutation.mutateAsync({ record, options });
    },
    [duplicateMutation]
  );

  const bulkDuplicate = useCallback(
    (records: Record<string, unknown>[], options?: DuplicationOptions) => {
      return bulkDuplicateMutation.mutateAsync({ records, options });
    },
    [bulkDuplicateMutation]
  );

  return {
    duplicateRecord,
    bulkDuplicate,
    isDuplicating: duplicateMutation.isPending || bulkDuplicateMutation.isPending,
  };
}
