import { useMemo, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useOperatorDashboardData } from '@/features/production';
import { Cpu, Play, Pause, Clock, CheckCircle2, Zap, BrainCircuit, User } from 'lucide-react';
import { useMLPredictions } from '@/features/analytics/hooks/useMLPredictions';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { differenceInMinutes } from 'date-fns';
import { useOperatorPresence } from '@/features/production';
import { useOperatorMachines } from '@/features/production';
import { useOperators } from '@/features/production';

interface MachineStatus {
  machineId: string;
  machineName: string;
  machineCode: string;
  techniqueName: string;
  techniqueColor: string;
  status: 'idle' | 'producing' | 'paused';
  currentJob?: {
    orderNumber: string;
    client: string;
    product: string;
    quantity: number;
    producedQuantity: number;
    estimatedDuration: number;
    actualStartTime: string | null;
    progress: number;
    elapsedMinutes: number;
    remainingMinutes: number;
  };
  assignedOperator?: {
    id: string;
    name: string;
    isOnline: boolean;
  };
}

export const LiveMachineStatusPanel = memo(function LiveMachineStatusPanel() {
  const { jobs, machines, isLoading: loadingDash, getTechniqueById } = useOperatorDashboardData();
  const { predictions, getRiskLevel } = useMLPredictions();
  const { isOnline } = useOperatorPresence();
  const { assignments, isLoading: loadingAssignments } = useOperatorMachines();
  const { data: operators, isLoading: loadingOperators } = useOperators();

  const isLoading = loadingDash || loadingAssignments || loadingOperators;

  const machineStatuses = useMemo<MachineStatus[]>(() => {
    if (!machines || !jobs) return [];

    return machines.map((machine) => {
      const technique = getTechniqueById(machine.technique_id);
      const activeJob = jobs.find((j) => j.machine_id === machine.id && j.status === 'production');
      const pausedJob = jobs.find((j) => j.machine_id === machine.id && j.status === 'paused');
      const currentJob = activeJob || pausedJob;

      // Find assigned operator
      const assignment = assignments?.find(a => a.machine_id === machine.id);
      let assignedOperator;
      if (assignment) {
        const operatorInfo = operators?.find(o => o.user_id === assignment.operator_id);
        assignedOperator = {
          id: assignment.operator_id,
          name: operatorInfo?.full_name || 'Operador',
          isOnline: isOnline(assignment.operator_id),
        };
      }

      let jobInfo: MachineStatus['currentJob'] | undefined;
      if (currentJob) {
        const elapsed = currentJob.actual_start_time
          ? differenceInMinutes(new Date(), new Date(currentJob.actual_start_time))
          : 0;
        const progress = currentJob.estimated_duration > 0
          ? Math.min(100, (elapsed / currentJob.estimated_duration) * 100)
          : 0;

        jobInfo = {
          orderNumber: currentJob.order_number,
          client: currentJob.client,
          product: currentJob.product,
          quantity: currentJob.quantity,
          producedQuantity: currentJob.produced_quantity || 0,
          estimatedDuration: currentJob.estimated_duration,
          actualStartTime: currentJob.actual_start_time,
          progress,
          elapsedMinutes: elapsed,
          remainingMinutes: Math.max(0, currentJob.estimated_duration - elapsed),
        };
      }

      return {
        machineId: machine.id,
        machineName: machine.name,
        machineCode: machine.code,
        techniqueName: technique?.name || '',
        techniqueColor: technique?.color || '#888',
        status: activeJob ? 'producing' : pausedJob ? 'paused' : 'idle',
        currentJob: jobInfo,
        assignedOperator,
      };
    });
  }, [machines, jobs, getTechniqueById, assignments, operators, isOnline]);

  if (isLoading) return null;

  const producing = machineStatuses.filter(m => m.status === 'producing').length;
  const idle = machineStatuses.filter(m => m.status === 'idle').length;

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm text-title flex items-center gap-2">
            <Cpu className="h-4 w-4 text-primary animate-float" />
            <span className="gradient-text font-black uppercase tracking-tighter">Status das Máquinas 12/10</span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="hidden xl:flex text-[8px] gap-1 h-5 px-1.5 glass border-primary/30 text-primary font-black animate-pulse">
               <Zap className="h-2 w-2" /> Quantum Sync: Ativo
            </Badge>
            <Badge variant="secondary" className="text-[10px] gap-1 h-5 px-1.5 glass border-green-500/20">
              <Play className="h-2.5 w-2.5 text-green-400 fill-green-400" />
              {producing}
            </Badge>
            <Badge variant="outline" className="text-[10px] gap-1 h-5 px-1.5 glass">
              <Clock className="h-2.5 w-2.5 text-muted-foreground" />
              {idle}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3">
        <ScrollArea className="h-[400px] pr-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {machineStatuses.map(machine => (
              <div
                key={machine.machineId}
                className={cn(
                  'p-3 rounded-xl border transition-all duration-300 group relative overflow-hidden',
                  machine.status === 'producing' && 'border-green-500/30 bg-green-500/5 shadow-[0_0_15px_-5px_rgba(34,197,94,0.1)]',
                  machine.status === 'paused' && 'border-orange-500/30 bg-orange-500/5',
                  machine.status === 'idle' && 'border-border bg-muted/20',
                )}
              >
                {/* Machine header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col">
                      <span className="font-bold text-xs tracking-tight">{machine.machineCode}</span>
                      <span className="text-[9px] text-muted-foreground uppercase font-medium">{machine.techniqueName}</span>
                    </div>
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: machine.techniqueColor }}
                    />

                    {/* ML Risk Indicator */}
                    {predictions.find(p => p.machine_id === machine.machineId) && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center">
                              {(() => {
                                const pred = predictions.find(p => p.machine_id === machine.machineId);
                                const score = pred?.risk_score ?? 0;
                                return (
                                  <BrainCircuit className={cn(
                                    "h-3 w-3",
                                    getRiskLevel(score).color === 'destructive' ? 'text-red-400 animate-pulse' : 'text-primary/70'
                                  )} />
                                );
                              })()}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="glass-card">
                            {(() => {
                              const pred = predictions.find(p => p.machine_id === machine.machineId);
                              const score = pred?.risk_score ?? 0;
                              return (
                                <>
                                  <p className="text-xs font-bold">Saúde Preditiva (ML): {100 - score}%</p>
                                  <p className="text-[10px] text-muted-foreground">{getRiskLevel(score).label} risco de falha</p>
                                </>
                              );
                            })()}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>

                  <div className="flex gap-1">
                    {machine.status === 'producing' && (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/50 text-[9px] px-1.5 h-4 font-bold uppercase">
                        Produzindo
                      </Badge>
                    )}
                    {machine.status === 'paused' && (
                      <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/50 text-[9px] px-1.5 h-4 font-bold uppercase">
                        Pausado
                      </Badge>
                    )}
                    {machine.status === 'idle' && (
                      <Badge variant="outline" className="text-[9px] px-1.5 h-4 font-bold uppercase glass">
                        Livre
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1 mb-2">
                  <p className="text-[11px] font-medium text-foreground leading-tight truncate">{machine.machineName}</p>

                  {/* Assigned Operator info */}
                  <div className="flex items-center gap-1.5">
                    {machine.assignedOperator ? (
                      <div className="flex items-center gap-1.5 p-1 px-1.5 rounded-full bg-secondary/30 border border-border/10">
                        <div className="relative">
                          <User className="h-2.5 w-2.5 text-muted-foreground" />
                          {machine.assignedOperator.isOnline && (
                            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-500 rounded-full border border-background shadow-[0_0_5px_rgba(34,197,94,0.5)]" />
                          )}
                        </div>
                        <span className={cn(
                          "text-[9px] font-medium",
                          machine.assignedOperator.isOnline ? "text-foreground" : "text-muted-foreground"
                        )}>
                          {machine.assignedOperator.name.split(' ')[0]}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[9px] text-muted-foreground italic flex items-center gap-1">
                        <User className="h-2.5 w-2.5 opacity-50" /> Sem operador
                      </span>
                    )}
                  </div>
                </div>

                {machine.currentJob ? (
                  <div className="mt-3 space-y-2 relative pt-2 border-t border-border/10">
                    <div className="flex flex-col">
                      <p className="text-[10px] font-bold truncate">
                        {machine.currentJob.orderNumber} • {machine.currentJob.client}
                      </p>
                      <p className="text-[9px] text-muted-foreground truncate italic">
                        {machine.currentJob.product}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px] font-medium">
                        <span>Progresso</span>
                        <span>{Math.round(machine.currentJob.progress)}%</span>
                      </div>
                      <Progress
                        value={machine.currentJob.progress}
                        className={cn(
                          "h-1 rounded-full",
                          machine.status === 'producing' ? "bg-green-500/20" : "bg-muted"
                        )}
                      />
                    </div>

                    <div className="flex justify-between text-[9px] font-mono text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-2 w-2" />
                        <span>{machine.currentJob.elapsedMinutes}m</span>
                      </div>
                      <span className={cn(
                        "flex items-center gap-1 font-bold",
                        machine.currentJob.remainingMinutes <= 0 ? 'text-red-400 animate-pulse' : 'text-primary'
                      )}>
                        {machine.currentJob.remainingMinutes > 0
                          ? `${machine.currentJob.remainingMinutes}m restantes`
                          : 'Overdue!'
                        }
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 h-16 flex items-center justify-center border border-dashed border-border/10 rounded-lg bg-background/20">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter opacity-30">Aguardando Carga</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
});

