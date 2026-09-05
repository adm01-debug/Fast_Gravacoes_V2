import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { usePackagingChecklist } from '../hooks/usePackagingChecklist';

interface Props {
  taskId: string;
}

export function PackagingChecklistPanel({ taskId }: Props) {
  const { items, isLoading, total, done, requiredMissing, canShip, toggle } =
    usePackagingChecklist(taskId);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (total === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum item de conferência configurado.
      </p>
    );
  }

  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm">
          <span className="font-medium">Conferência antes do envio</span>
          <span className="text-muted-foreground ml-2">
            {done}/{total}
          </span>
        </div>
        {canShip ? (
          <Badge variant="outline" className="gap-1 border-emerald-500/40 text-emerald-500">
            <CheckCircle2 className="h-3 w-3" /> Pronto para envio
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1 border-amber-500/40 text-amber-500">
            <AlertTriangle className="h-3 w-3" /> {requiredMissing} pendente(s)
          </Badge>
        )}
      </div>

      <Progress value={progress} />

      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-start gap-3 rounded-md border p-3 bg-card/50"
          >
            <Checkbox
              id={`chk-${item.id}`}
              checked={item.is_checked}
              disabled={toggle.isPending}
              onCheckedChange={(checked) =>
                toggle.mutate({ item, checked: checked === true })
              }
              className="mt-0.5"
            />
            <label htmlFor={`chk-${item.id}`} className="flex-1 cursor-pointer">
              <div className="flex items-center gap-2 text-sm">
                <span className={item.is_checked ? 'line-through text-muted-foreground' : ''}>
                  {item.label}
                </span>
                {item.is_required && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    Obrigatório
                  </Badge>
                )}
              </div>
              {item.description && (
                <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
              )}
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
