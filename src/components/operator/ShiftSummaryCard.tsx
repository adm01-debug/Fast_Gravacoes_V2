import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Package, AlertTriangle, Clock } from 'lucide-react';
import { DbJob } from '@/features/jobs';

interface ShiftSummaryCardProps {
  jobs: DbJob[];
}

export function ShiftSummaryCard({ jobs }: ShiftSummaryCardProps) {
  const summary = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayJobs = jobs.filter(j => j.scheduled_date === today);

    const completed = todayJobs.filter(j => j.status === 'finished').length;
    const inProgress = todayJobs.filter(j => j.status === 'production').length;
    const total = todayJobs.length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    const piecesProduced = todayJobs
      .filter(j => j.status === 'finished')
      .reduce((sum, j) => sum + (j.produced_quantity || j.quantity), 0);

    const totalPieces = todayJobs.reduce((sum, j) => sum + j.quantity, 0);

    const losses = todayJobs.reduce((sum, j) => sum + (j.lost_pieces || 0), 0);
    const lossRate = piecesProduced > 0 ? (losses / (piecesProduced + losses)) * 100 : 0;

    // Calculate active production time today
    let activeMinutes = 0;
    todayJobs.forEach(j => {
      if (j.actual_start_time) {
        const start = new Date(j.actual_start_time);
        const end = j.actual_end_time ? new Date(j.actual_end_time) : new Date();
        activeMinutes += (end.getTime() - start.getTime()) / 60000;
      }
    });

    return { completed, inProgress, total, progress, piecesProduced, totalPieces, losses, lossRate, activeMinutes: Math.round(activeMinutes) };
  }, [jobs]);

  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m}min`;
  };

  return (
    <Card className="card-elevated border-primary/20 bg-gradient-to-r from-primary/5 via-transparent to-accent/5">
      <CardContent className="p-4">
        {/* Progress bar */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">Progresso do Turno</span>
          <Badge variant={summary.progress === 100 ? 'default' : 'secondary'} className="text-xs">
            {summary.progress}%
          </Badge>
        </div>
        <Progress value={summary.progress} className="h-2.5 mb-4" />

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-surface-success/50">
            <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
            <div className="min-w-0">
              <p className="text-lg font-bold text-success">{summary.completed}/{summary.total}</p>
              <p className="text-[10px] text-muted-foreground truncate">Jobs concluídos</p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5">
            <Package className="h-4 w-4 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-lg font-bold text-foreground">{summary.piecesProduced.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground truncate">Peças produzidas</p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-lg bg-surface-destructive/50">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
            <div className="min-w-0">
              <p className="text-lg font-bold text-foreground">{summary.lossRate.toFixed(1)}%</p>
              <p className="text-[10px] text-muted-foreground truncate">Taxa de perda</p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-lg bg-surface-info/50">
            <Clock className="h-4 w-4 text-info shrink-0" />
            <div className="min-w-0">
              <p className="text-lg font-bold text-foreground">{formatTime(summary.activeMinutes)}</p>
              <p className="text-[10px] text-muted-foreground truncate">Tempo ativo</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
