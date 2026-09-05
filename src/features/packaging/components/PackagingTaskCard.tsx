import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package as PackageIcon, User as UserIcon, ArrowRight as ArrowRightIcon } from 'lucide-react';
import type { PackagingTaskWithJob } from '../services/packagingService';
import { TASK_STATUS_LABELS } from '../types/packaging.schema';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { usePackagingSettings, computeSla } from '../hooks/usePackagingSettings';
import { usePackagingSlaOverrides } from '../hooks/usePackagingSlaOverrides';
import { SlaBadge } from './SlaBadge';

interface Props {
  task: PackagingTaskWithJob;
  onOpen: (taskId: string) => void;
}

export function PackagingTaskCard({ task, onOpen }: Props) {
  const job = task.jobs;
  const total = task.received_quantity || 0;
  const done = task.approved_quantity + task.rejected_quantity;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;
  const { data: settings } = usePackagingSettings();
  const { data: overrides } = usePackagingSlaOverrides();
  const sla = settings ? computeSla(task, settings, overrides) : null;

  const borderClass =
    sla?.level === 'overdue'
      ? 'border-destructive/60'
      : sla?.level === 'warning'
      ? 'border-amber-500/50'
      : 'hover:border-primary/50';

  return (
    <Card className={`p-4 transition-colors ${borderClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <PackageIcon className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="font-semibold truncate">
              {job?.order_number ?? 'Pedido —'}
            </span>
            <Badge variant="outline" className="text-xs">
              {TASK_STATUS_LABELS[task.status]}
            </Badge>
            {sla && sla.level !== 'ok' && <SlaBadge sla={sla} />}
          </div>
          <p className="text-sm text-muted-foreground truncate">
            {job?.client ?? '—'} · {job?.product ?? '—'}
          </p>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span>{total} peças</span>
            {task.assigned_to && (
              <span className="flex items-center gap-1">
                <UserIcon className="w-3 h-3" /> atribuído
              </span>
            )}
            <span>
              {formatDistanceToNow(new Date(task.created_at), { addSuffix: true, locale: ptBR })}
            </span>
          </div>
          <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
              aria-label={`Progresso ${progress}%`}
            />
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={() => onOpen(task.id)} aria-label="Abrir tarefa">
          <ArrowRightIcon className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}

