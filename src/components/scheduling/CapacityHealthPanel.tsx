import { useTechniqueCapacityAlerts, type CapacityMetric } from '@/hooks/useTechniqueCapacityAlerts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, BarChart3, TrendingUp, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export function CapacityHealthPanel() {
  const { capacities } = useTechniqueCapacityAlerts();

  if (!capacities.length) return null;

  return (
    <Card className="glass-card border-warning/20">
      <CardHeader className="pb-3 pt-4 px-4">
        <CardTitle className="text-sm text-title flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-warning/20">
              <Zap className="h-4 w-4 text-warning" />
            </div>
            <span className="font-bold uppercase tracking-wider text-[11px]">Saúde de Capacidade por Técnica</span>
          </div>
          <BarChart3 className="h-4 w-4 text-muted-foreground opacity-50" />
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {capacities.slice(0, 4).map((cap: CapacityMetric, idx: number) => (
            <motion.div
              key={cap.techniqueId}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              className="p-3 rounded-xl bg-secondary/20 border border-border/50 space-y-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold truncate pr-2">{cap.techniqueName}</p>
                <Badge
                  variant="outline"
                  className={cn(
                    "h-5 text-[9px] uppercase tracking-tighter px-1",
                    cap.status === 'critical' ? "text-destructive border-destructive/40 bg-destructive/10" :
                    cap.status === 'warning' ? "text-warning border-warning/40 bg-warning/10" :
                    "text-success border-success/40 bg-success/10"
                  )}
                >
                  {cap.status === 'critical' ? 'Sobrecarga' : cap.status === 'warning' ? 'Atenção' : 'Normal'}
                </Badge>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                   <div className="flex items-baseline gap-1">
                      <span className={cn(
                        "text-lg font-bold font-mono leading-none",
                        cap.status === 'critical' ? "text-destructive" : cap.status === 'warning' ? "text-warning" : "text-foreground"
                      )}>
                        {cap.occupancyPercent}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-bold">%</span>
                   </div>
                   <div className="text-right">
                      <p className="text-[9px] text-muted-foreground font-medium leading-none">Ocupação</p>
                      <p className="text-[10px] font-mono text-foreground">{cap.activeJobs} jobs ativos</p>
                   </div>
                </div>
                <Progress
                  value={cap.occupancyPercent}
                  className={cn(
                    "h-1.5",
                    cap.status === 'critical' ? "bg-destructive/20" : cap.status === 'warning' ? "bg-warning/20" : "bg-success/20"
                  )}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
                 <div className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    <span>{cap.scheduledJobs} agendados</span>
                 </div>
                 <span className="font-medium">{cap.totalMachines} máquinas</span>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
