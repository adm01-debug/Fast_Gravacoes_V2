import { Activity, AlertTriangle, CheckCircle2, Zap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TargetArrowIcon } from '@/components/icons/TargetArrowIcon';
import type { DbMachine } from '@/features/jobs';

interface MachineStatsCardsProps {
  machines: DbMachine[];
  isLoadingReliability: boolean;
  reliabilitySummary: { averageAvailability: number; criticalMachines: unknown[] };
}

export function MachineStatsCards({ machines, isLoadingReliability, reliabilitySummary }: MachineStatsCardsProps) {
  return (
    <>
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center shrink-0">
                  <TargetArrowIcon className="h-5 w-5 text-primary-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold">{machines.length}</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider truncate">Frota Total</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold">{machines.filter(m => m.is_active).length}</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider truncate">Operacionais</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                  <Activity className="h-5 w-5 text-blue-500" />
                </div>
                <div className="min-w-0">
                  <div className="text-2xl font-bold">
                    {isLoadingReliability ? <Skeleton className="h-6 w-12" /> : `${Math.round(reliabilitySummary.averageAvailability)}%`}
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider truncate">Disponibilidade</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-destructive/20 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div className="min-w-0">
                  <div className="text-2xl font-bold">
                    {isLoadingReliability ? <Skeleton className="h-6 w-12" /> : reliabilitySummary.criticalMachines.length}
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider truncate">Críticas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
    </>
  );
}
