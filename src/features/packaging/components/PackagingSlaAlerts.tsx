import { AlertTriangle as AlertIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePackagingSettings, computeSla } from '../hooks/usePackagingSettings';
import { usePackagingSlaOverrides } from '../hooks/usePackagingSlaOverrides';
import type { PackagingTaskWithJob } from '../services/packagingService';

interface Props {
  tasks: PackagingTaskWithJob[];
  onOpen: (id: string) => void;
}

export function PackagingSlaAlerts({ tasks, onOpen }: Props) {
  const { data: settings } = usePackagingSettings();
  const { data: overrides } = usePackagingSlaOverrides();
  if (!settings) return null;

  const flagged = tasks
    .map(t => ({ task: t, sla: computeSla(t, settings, overrides) }))
    .filter(x => x.sla.level === 'overdue' || x.sla.level === 'warning')
    .sort((a, b) => b.sla.progressPct - a.sla.progressPct);

  if (flagged.length === 0) return null;

  const overdue = flagged.filter(f => f.sla.level === 'overdue').length;
  const warning = flagged.length - overdue;

  return (
    <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
      <div className="flex items-center gap-2 text-amber-200 text-sm font-medium">
        <AlertIcon className="w-4 h-4" />
        <span>
          SLA: {overdue > 0 && <strong className="text-destructive">{overdue} atrasada(s)</strong>}
          {overdue > 0 && warning > 0 && ' · '}
          {warning > 0 && <span>{warning} próxima(s) do limite</span>}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {flagged.slice(0, 6).map(({ task, sla }) => (
          <Button
            key={task.id}
            size="sm"
            variant="outline"
            className={sla.level === 'overdue' ? 'border-destructive/60 text-destructive' : 'border-amber-500/50 text-amber-300'}
            onClick={() => onOpen(task.id)}
          >
            {task.jobs?.order_number ?? task.id.slice(0, 6)} · {sla.label}
          </Button>
        ))}
        {flagged.length > 6 && (
          <span className="text-xs text-muted-foreground self-center">+{flagged.length - 6} outras</span>
        )}
      </div>
    </div>
  );
}
