import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { showErrorToast } from '@/lib/errorHandling';
import type { Database } from '@/integrations/supabase/types';

type TableName = keyof Database['public']['Tables'];

export interface ImportColumn {
  header: string;
  index: number;
  mappedTo: string | null;
}

export interface ImportPreview {
  headers: string[];
  rows: string[][];
  totalRows: number;
  columns: ImportColumn[];
}

export interface ImportResult {
  totalRows: number;
  imported: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
}

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length === 0) return { headers: [], rows: [] };

  const delimiter = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
  const rows = lines.slice(1).map(line =>
    line.split(delimiter).map(cell => cell.trim().replace(/^"|"$/g, ''))
  );

  return { headers, rows };
}

export function useDataImport(tableName: TableName) {
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const queryClient = useQueryClient();

  const parseFile = useCallback(async (inputFile: File): Promise<ImportPreview> => {
    setFile(inputFile);
    const text = await inputFile.text();
    const { headers, rows } = parseCSV(text);

    const columns: ImportColumn[] = headers.map((header, index) => ({
      header,
      index,
      mappedTo: null,
    }));

    const previewData: ImportPreview = {
      headers,
      rows: rows.slice(0, 10),
      totalRows: rows.length,
      columns,
    };

    setPreview(previewData);
    return previewData;
  }, []);

  const updateColumnMapping = useCallback((columnIndex: number, mappedTo: string | null) => {
    setPreview(prev => {
      if (!prev) return null;
      const columns = [...prev.columns];
      columns[columnIndex] = { ...columns[columnIndex], mappedTo };
      return { ...prev, columns };
    });
  }, []);

  const importMutation = useMutation({
    mutationFn: async (columnMappings: ImportColumn[]): Promise<ImportResult> => {
      if (!file) throw new Error('Nenhum arquivo selecionado');

      const text = await file.text();
      const { rows } = parseCSV(text);

      const mappedColumns = columnMappings.filter(c => c.mappedTo !== null);
      if (mappedColumns.length === 0) throw new Error('Nenhuma coluna mapeada');

      let imported = 0;
      let failed = 0;
      const errors: Array<{ row: number; error: string }> = [];

      const batchSize = 100;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batchRows = rows.slice(i, i + batchSize);
        const records = batchRows.map(row => {
          const record: Record<string, string> = {};
          mappedColumns.forEach(col => {
            if (col.mappedTo) {
              record[col.mappedTo] = row[col.index] ?? '';
            }
          });
          return record;
        });

        const { error } = await supabase.from(tableName).insert(records as never);
        if (error) {
          failed += batchRows.length;
          errors.push({ row: i, error: error.message });
        } else {
          imported += batchRows.length;
        }
      }

      return { totalRows: rows.length, imported, failed, errors };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [tableName] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      if (result.failed > 0) {
        toast.warning(`${result.imported} importados, ${result.failed} falharam`);
      } else {
        toast.success(`${result.imported} registros importados com sucesso`);
      }
    },
    onError: (error) => {
      showErrorToast(error, 'Erro na importação');
    },
  });

  const executeImport = useCallback(() => {
    if (!preview) {
      toast.error('Nenhum arquivo carregado');
      return;
    }
    importMutation.mutate(preview.columns);
  }, [preview, importMutation]);

  const reset = useCallback(() => {
    setPreview(null);
    setFile(null);
  }, []);

  return {
    preview,
    file,
    parseFile,
    updateColumnMapping,
    executeImport,
    reset,
    isImporting: importMutation.isPending,
    importResult: importMutation.data ?? null,
  };
}
