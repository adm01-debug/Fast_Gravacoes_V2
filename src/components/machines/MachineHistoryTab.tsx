import { useState, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEntityAuditTrail, useDataExport } from '@/features/admin';
import { AuditEntryCard } from '@/features/admin/components/audit/AuditEntryCard';
import { HistoryPeriodFilter, type HistoryPeriodValue } from '@/features/admin/components/audit/HistoryPeriodFilter';

export function MachineHistoryTab({ machineId }: { machineId: string }) {
  const [period, setPeriod] = useState<HistoryPeriodValue>({ preset: 'all' });
  const { data, isLoading, error } = useEntityAuditTrail('machines', machineId, {
    fromDate: period.fromDate,
    toDate: period.toDate,
  });
  const { exportAuditTrail } = useDataExport('machines');

  const handleExport = useCallback((format: 'csv' | 'pdf') => {
    exportAuditTrail({
      entityType: 'machines',
      entityId: machineId,
      fromDate: period.fromDate,
      toDate: period.toDate,
    }, `auditoria_maquina_${machineId.slice(0, 8)}`, format);
  }, [machineId, period, exportAuditTrail]);

  return (
    <div className="space-y-6">
      <HistoryPeriodFilter
        value={period}
        onChange={setPeriod}
        onExport={handleExport}
        resultCount={data?.length}
      />
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : error ? (
        <div className="text-sm text-destructive p-4 border border-destructive/30 rounded-xl bg-destructive/10">
          Não foi possível carregar o histórico.
        </div>
      ) : !data || data.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-12 border border-dashed rounded-2xl bg-muted/10">
          Nenhum registro encontrado no período selecionado.
        </div>
      ) : (
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3 pb-4">
            {data.map((entry) => (
              <AuditEntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

