import { useMachineUtilization } from '@/features/production';
import { useSchedulingData } from '@/features/jobs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { DbJob } from '@/features/jobs';

interface MachineForHeatmap {
  id: string;
  code: string;
  name: string;
  technique_id?: string | null;
}

interface UtilizationHeatmapProps {
  jobs: DbJob[];
  machines: MachineForHeatmap[];
}

export function UtilizationHeatmap({ jobs, machines }: UtilizationHeatmapProps) {
  const utilization = useMachineUtilization(jobs, { startHour: 7, endHour: 21 });
  const { getTechniqueById } = useSchedulingData();

  if (!machines.length) return <Skeleton className="h-10 w-full" />;

  const getHeatColor = (value: number) => {
    if (value === 0) return 'bg-secondary/20';
    if (value < 0.3) return 'bg-success/40';
    if (value < 0.6) return 'bg-warning/40';
    if (value < 0.9) return 'bg-orange-500/60';
    return 'bg-destructive/70';
  };

  const getHeatLabel = (value: number) => {
    if (value === 0) return 'Livre';
    if (value < 0.3) return 'Baixa';
    if (value < 0.6) return 'Média';
    if (value < 0.9) return 'Alta';
    return 'Crítica';
  };

  return (
    <TooltipProvider>
      <div className="flex flex-wrap gap-1 items-center">
        <span className="text-[10px] uppercase font-bold text-muted-foreground mr-2 tracking-widest">Carga:</span>
        {machines.map((machine) => {
          const value = utilization[machine.id] || 0;
          const technique = machine.technique_id ? getTechniqueById(machine.technique_id) : null;

          return (
            <Tooltip key={machine.id}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "w-6 h-6 rounded-sm border border-border/30 flex items-center justify-center cursor-help transition-all hover:scale-110 hover:z-10 hover:border-primary/50",
                    getHeatColor(value)
                  )}
                >
                  <span className="text-[8px] font-mono font-bold text-foreground/80">{machine.code.slice(-2)}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="p-2 text-xs">
                <div className="space-y-1">
                  <p className="font-bold">{machine.code} — {machine.name}</p>
                  <p className="text-muted-foreground">{technique?.name}</p>
                  <div className="flex items-center justify-between gap-4 pt-1 border-t border-border/50">
                    <span>Ocupação:</span>
                    <span className="font-mono font-bold">{Math.round(value * 100)}%</span>
                  </div>
                  <p className={cn(
                    "text-[10px] font-bold uppercase",
                    value > 0.8 ? "text-destructive" : value > 0.5 ? "text-warning" : "text-success"
                  )}>
                    Carga {getHeatLabel(value)}
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
