import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock } from 'lucide-react';
import { SchedulingConflict } from '@/features/jobs';

interface ConflictResolutionPanelProps {
  conflicts: SchedulingConflict[];
  onResolved: () => void;
}

export function ConflictResolutionPanel({ conflicts, onResolved }: ConflictResolutionPanelProps) {
  if (conflicts.length === 0) return null;

  return (
    <Card className="border-destructive/30 bg-destructive/5 overflow-hidden animate-in fade-in slide-in-from-top-4">
      <CardHeader className="bg-destructive/10 pb-3">
        <CardTitle className="text-destructive flex items-center gap-2 text-base">
          <AlertTriangle className="h-5 w-5" />
          Conflitos de Agendamento Detectados ({conflicts.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {conflicts.map((conflict, idx) => (
          <div
            key={conflict.id}
            className="p-3 rounded-lg border border-destructive/20 bg-card/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-destructive/30 text-destructive font-mono text-[10px]">
                  {conflict.machineCode}
                </Badge>
                <span className="font-semibold text-sm">{conflict.machineName}</span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {conflict.jobs.map((job) => (
                  <div key={job.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3 text-destructive/70" />
                    <span className="font-medium text-foreground">{job.startTime} - {job.endTime}</span>
                    <span className="truncate max-w-[100px]">{job.orderNumber}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
                onClick={() => {
                  // In a real scenario, this would trigger an optimization algorithm
                  // or open a drag-and-drop auto-rescheduler
                  onResolved();
                }}
              >
                Resolver Manualmente
              </Button>
              <Button
                variant="default"
                size="sm"
                className="h-8 text-xs bg-destructive hover:bg-destructive/90"
                onClick={() => {
                  // Trigger AI resolution
                }}
              >
                Otimizar via IA
              </Button>
            </div>
          </div>
        ))}

        <p className="text-[10px] text-muted-foreground text-center italic">
          Os conflitos de horário podem comprometer os KPIs de eficiência (OEE) e atrasar a entrega final.
        </p>
      </CardContent>
    </Card>
  );
}
