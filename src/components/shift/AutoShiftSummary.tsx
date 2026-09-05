import { useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useOperatorDashboardData } from '@/features/production';
import { useSchedulingData } from '@/features/jobs';
import { exportShiftReportPDF, type ShiftReportData } from '@/lib/shiftReportPdf';
import { toast } from 'sonner';
import {
  FileText, CheckCircle2, AlertTriangle, Clock,
  TrendingUp, Printer, FileDown
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function AutoShiftSummary() {
  const { jobs, machines, isLoading } = useOperatorDashboardData();
  const { techniques } = useSchedulingData();

  const handleExportPDF = useCallback(() => {
    if (!jobs || !machines) return;
    const now = new Date();
    const shiftStart = new Date(now);
    shiftStart.setHours(now.getHours() >= 14 ? 14 : 7, 0, 0, 0);
    const shiftEnd = new Date(now);
    shiftEnd.setHours(now.getHours() >= 14 ? 22 : 14, 0, 0, 0);
    const shiftName = now.getHours() >= 14 ? 'Tarde' : 'Manhã';

    try {
      exportShiftReportPDF({
        shiftName,
        shiftStart,
        shiftEnd,
        jobs: jobs as unknown as ShiftReportData['jobs'],
        machines: machines as unknown as ShiftReportData['machines'],
        techniques: techniques as unknown as ShiftReportData['techniques'],
      });
      toast.success('Relatório PDF gerado com sucesso!');
    } catch {
      toast.error('Erro ao gerar relatório PDF');
    }
  }, [jobs, machines, techniques]);

  const summary = useMemo(() => {
    if (!jobs) return null;

    const now = new Date();
    const shiftStart = new Date(now);
    shiftStart.setHours(now.getHours() >= 14 ? 14 : 7, 0, 0, 0);

    const shiftJobs = jobs.filter(j => {
      const updated = new Date(j.updated_at);
      return updated >= shiftStart;
    });

    const completed = shiftJobs.filter(j => j.status === 'finished');
    const inProgress = jobs.filter(j => j.status === 'production');
    const delayed = jobs.filter(j => j.status === 'delayed');
    const paused = jobs.filter(j => j.status === 'paused');

    const totalProduced = completed.reduce((acc, j) => acc + (j.produced_quantity || 0), 0);
    const totalLost = completed.reduce((acc, j) => acc + (j.lost_pieces || 0), 0);
    const lossRate = totalProduced > 0 ? (totalLost / (totalProduced + totalLost)) * 100 : 0;

    const activeMachines = new Set(inProgress.map(j => j.machine_id).filter(Boolean)).size;

    return {
      completed: completed.length,
      inProgress: inProgress.length,
      delayed: delayed.length,
      paused: paused.length,
      totalProduced,
      totalLost,
      lossRate,
      activeMachines,
      totalMachines: machines?.length || 0,
      shiftStart,
    };
  }, [jobs, machines]);

  if (isLoading || !summary) return null;

  const currentShift = new Date().getHours() >= 14 ? 'Turno Tarde' : 'Turno Manhã';

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Resumo do Turno
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportPDF} className="h-7 text-xs">
              <FileDown className="h-3 w-3 mr-1" />
              PDF
            </Button>
            <Badge variant="secondary" className="text-xs">
              {currentShift} • {format(summary.shiftStart, 'HH:mm', { locale: ptBR })}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="text-center p-2 rounded-lg bg-green-500/10 border border-green-500/20">
            <CheckCircle2 className="h-4 w-4 text-green-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-green-400">{summary.completed}</p>
            <p className="text-[10px] text-muted-foreground">Finalizados</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
            <Printer className="h-4 w-4 text-cyan-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-cyan-400">{summary.inProgress}</p>
            <p className="text-[10px] text-muted-foreground">Produzindo</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="h-4 w-4 text-red-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-red-400">{summary.delayed}</p>
            <p className="text-[10px] text-muted-foreground">Atrasados</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-primary/10 border border-primary/20">
            <TrendingUp className="h-4 w-4 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold text-primary">{summary.totalProduced.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Peças</p>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground">
          <span>
            <Clock className="h-3 w-3 inline mr-1" />
            {summary.activeMachines}/{summary.totalMachines} máquinas ativas
          </span>
          <span>
            Perda: <span className={summary.lossRate > 5 ? 'text-red-400' : 'text-green-400'}>
              {summary.lossRate.toFixed(1)}%
            </span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
