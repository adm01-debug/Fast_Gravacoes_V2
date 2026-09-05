import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock } from 'lucide-react';
import { DbJob } from '@/features/jobs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface OperatorQuickHistoryProps {
  jobs: DbJob[];
  getTechniqueName: (id: string) => string | undefined;
}

export function OperatorQuickHistory({ jobs, getTechniqueName }: OperatorQuickHistoryProps) {
  const recentFinished = useMemo(() => {
    return jobs
      .filter(j => j.status === 'finished' && j.actual_end_time)
      .sort((a, b) => new Date((b.actual_end_time ?? "")).getTime() - new Date((a.actual_end_time ?? "")).getTime())
      .slice(0, 5);
  }, [jobs]);

  if (recentFinished.length === 0) return null;

  return (
    <Card className="card-elevated">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4" />
          Últimos finalizados
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {recentFinished.map(job => (
          <div key={job.id} className="flex items-center gap-3 py-1.5 text-sm">
            <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="truncate font-medium">{job.client}</p>
              <p className="text-xs text-muted-foreground truncate">{job.product}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-muted-foreground">
                {job.actual_end_time && format(new Date(job.actual_end_time), "HH:mm", { locale: ptBR })}
              </p>
              <p className="text-xs font-medium">{(job.produced_quantity || job.quantity).toLocaleString()} pçs</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
