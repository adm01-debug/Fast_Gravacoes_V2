import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldCheckIcon } from 'lucide-react';
import { useEntityAuditTrail } from '@/features/admin';
import { AuditEntryCard } from './AuditEntryCard';
import { HistoryPeriodFilter, type HistoryPeriodValue } from './HistoryPeriodFilter';
import { useState, useCallback } from 'react';
import { useDataExport } from '@/features/admin';
import type { Database } from '@/integrations/supabase/types';

type PublicTable = keyof Database['public']['Tables'];

interface AuditTrailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: PublicTable;
  entityId: string | undefined;
  entityLabel?: string;
}

export function AuditTrailDrawer({
  open,
  onOpenChange,
  entityType,
  entityId,
  entityLabel,
}: AuditTrailDrawerProps) {
  const [period, setPeriod] = useState<HistoryPeriodValue>({ preset: 'all' });
  const { data, isLoading, error } = useEntityAuditTrail(entityType, entityId, {
    fromDate: period.fromDate,
    toDate: period.toDate,
  });

  const { exportAuditTrail } = useDataExport(entityType);

  const handleExport = useCallback(() => {
    exportAuditTrail({
      entityType,
      entityId,
      fromDate: period.fromDate,
      toDate: period.toDate,
    }, `auditoria_${entityType}_${entityId?.slice(0, 8)}`);
  }, [entityType, entityId, period, exportAuditTrail]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-hidden flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShieldCheckIcon className="h-5 w-5 text-primary" aria-hidden />
            Trilha de Auditoria
          </SheetTitle>
          <SheetDescription>
            Histórico imutável de alterações para{' '}
            <span className="font-mono">{entityLabel ?? `${entityType}#${entityId?.slice(0, 8)}`}</span>
          </SheetDescription>
        </SheetHeader>

        <div className="px-6 py-2">
          <HistoryPeriodFilter
            value={period}
            onChange={setPeriod}
            onExport={handleExport}
            resultCount={data?.length}
          />
        </div>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-3 pb-6">
            {isLoading && (
              <>
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </>
            )}

            {error && (
              <div className="text-sm text-destructive p-4 border border-destructive/30 rounded-md bg-destructive/10">
                Não foi possível carregar a trilha de auditoria.
              </div>
            )}

            {!isLoading && !error && (data?.length ?? 0) === 0 && (
              <div className="text-sm text-muted-foreground text-center py-12">
                Nenhum registro de auditoria encontrado.
              </div>
            )}

            {data?.map((entry) => <AuditEntryCard key={entry.id} entry={entry} />)}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
