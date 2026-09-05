import { Card, CardContent } from "@/components/ui/card";
import {
  AlertTriangle, Clock, Zap, AlertCircle, RotateCcw,
  Activity, Scale, Timer, Database
} from "lucide-react";

interface AlertStatsGridProps {
  delayed: number;
  overdue: number;
  urgent: number;
  atRisk: number;
  rework: number;
  bottlenecks: number;
  loadBalancing: number;
  stuckJobs: number;
  stuckCritical: number;
  dataIssues: number;
}

export function AlertStatsGrid({
  delayed, overdue, urgent, atRisk, rework,
  bottlenecks, loadBalancing, stuckJobs, stuckCritical, dataIssues
}: AlertStatsGridProps) {
  const stats = [
    { value: delayed, label: 'Atrasados', Icon: AlertTriangle, bgClass: 'bg-red-500/20', iconClass: 'text-red-400' },
    { value: overdue, label: 'Vencidos', Icon: Clock, bgClass: 'bg-orange-500/20', iconClass: 'text-orange-400' },
    { value: urgent, label: 'Urgentes', Icon: Zap, bgClass: 'bg-yellow-500/20', iconClass: 'text-yellow-400' },
    { value: atRisk, label: 'Em Risco', Icon: AlertCircle, bgClass: 'bg-cyan-500/20', iconClass: 'text-cyan-400' },
    { value: rework, label: 'Retrabalho', Icon: RotateCcw, bgClass: 'bg-purple-500/20', iconClass: 'text-purple-400' },
    { value: bottlenecks, label: 'Gargalos', Icon: Activity, bgClass: bottlenecks > 0 ? (bottlenecks > 3 ? 'bg-red-500/20' : 'bg-pink-500/20') : 'bg-muted/10', iconClass: bottlenecks > 0 ? (bottlenecks > 3 ? 'text-red-400 animate-pulse' : 'text-pink-400') : 'text-muted-foreground' },
    { value: loadBalancing, label: 'Desbalanc.', Icon: Scale, bgClass: 'bg-teal-500/20', iconClass: 'text-teal-400' },
    { value: stuckJobs, label: 'Travados', Icon: Timer, bgClass: stuckCritical > 0 ? 'bg-red-500/20' : 'bg-indigo-500/20', iconClass: stuckCritical > 0 ? 'text-red-400' : 'text-indigo-400' },
    { value: dataIssues, label: 'Integridade', Icon: Database, bgClass: dataIssues > 0 ? 'bg-warning/20' : 'bg-slate-500/20', iconClass: dataIssues > 0 ? 'text-warning' : 'text-slate-400' },
  ];

  return (
    <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2 sm:gap-4">
      {stats.map(({ value, label, Icon, bgClass, iconClass }) => (
        <Card key={label} className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
            <div className={`p-2 sm:p-3 rounded-xl ${bgClass}`}>
              <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${iconClass}`} />
            </div>
            <div>
              <p className="text-lg sm:text-2xl font-bold text-foreground">{value}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">{label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
