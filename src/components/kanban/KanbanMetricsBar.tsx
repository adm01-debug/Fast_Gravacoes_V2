/* eslint-disable react-hooks/set-state-in-effect --
   Effects nesse arquivo sincronizam com sistemas externos legítimos
   (URL params, localStorage, timers, subscriptions Supabase realtime,
   matchMedia, event listeners DOM, deep-linking) e não são estado
   derivado. A cascata é intencional para refletir mudanças externas. */
import { useMemo, useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { DbJob } from '@/features/jobs';
import { Clock, TrendingUp, AlertTriangle, BarChart3, Zap, Scale, Activity } from 'lucide-react';
import { differenceInHours, differenceInDays } from 'date-fns';
import { useSmartSequencing } from '@/features/jobs';
import { useLoadBalancing } from '@/features/analytics/hooks/useLoadBalancing';

interface KanbanMetricsBarProps {
  jobs: DbJob[];
}

export function KanbanMetricsBar({ jobs }: KanbanMetricsBarProps) {
  const { totalSavings } = useSmartSequencing();
  const { suggestions: balancingSuggestions } = useLoadBalancing();
  const [thresholds, setThresholds] = useState({ bottleneckRiskMinutes: 480 });

  useEffect(() => {
    const stored = localStorage.getItem('alert-thresholds');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.bottleneckRiskMinutes) {
          setThresholds({ bottleneckRiskMinutes: parsed.bottleneckRiskMinutes });
        }
      } catch {
        // Configuração corrompida no localStorage: mantém os limites padrão.
      }
    }
  }, []);

  const metrics = useMemo(() => {
    const now = new Date();
    const inProgress = jobs.filter(j => j.status === 'production').length;
    const delayed = jobs.filter(j => j.status === 'delayed').length;
    const totalWIP = jobs.filter(j => !['finished', 'cancelled'].includes(j.status)).length;

    // Calculate avg lead time for finished jobs
    const finishedJobs = jobs.filter(j => j.status === 'finished' && j.actual_start_time && j.actual_end_time);
    const avgLeadTimeHours = finishedJobs.length > 0
      ? finishedJobs.reduce((sum, j) => {
          const start = new Date((j.actual_start_time ?? ""));
          const end = new Date((j.actual_end_time ?? ""));
          return sum + differenceInHours(end, start);
        }, 0) / finishedJobs.length
      : 0;

    // Today's throughput
    const todayFinished = jobs.filter(j => {
      if (j.status !== 'finished' || !j.actual_end_time) return false;
      const endDate = new Date(j.actual_end_time);
      return differenceInDays(now, endDate) === 0;
    }).length;

    // Aging: jobs stuck > 3 days
    const stuckJobs = jobs.filter(j => {
      if (['finished', 'cancelled'].includes(j.status)) return false;
      const updated = new Date(j.updated_at);
      return differenceInDays(now, updated) > 3;
    }).length;

    // Detect bottlenecks across columns
    const columnsWithBottleneck = ['queue', 'ready', 'scheduled', 'production'].filter(status => {
      const columnJobs = jobs.filter(j => j.status === status);
      const columnTime = columnJobs.reduce((acc, job) => acc + (job.estimated_duration || 0), 0);
      return columnTime > thresholds.bottleneckRiskMinutes;
    });

    return {
      inProgress,
      delayed,
      totalWIP,
      avgLeadTimeHours,
      todayFinished,
      stuckJobs,
      bottlenecks: columnsWithBottleneck.length
    };
  }, [jobs, thresholds]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
      <MetricChip
        icon={Activity}
        label="Gargalos Ativos"
        value={metrics.bottlenecks}
        color={metrics.bottlenecks > 0 ? "text-red-500" : "text-success"}
        alert={metrics.bottlenecks > 0}
      />
      <MetricChip
        icon={Zap}
        label="Setup Otimizável"
        value={`${totalSavings}min`}
        color="text-warning"
        alert={totalSavings > 30}
      />
      <MetricChip
        icon={Scale}
        label="Desbalanceamento"
        value={balancingSuggestions.length}
        color="text-blue-400"
        alert={balancingSuggestions.length > 0}
      />
      <MetricChip
        icon={TrendingUp}
        label="Lead Time Médio"
        value={`${metrics.avgLeadTimeHours.toFixed(1)}h`}
        color="text-purple-400"
      />
      <MetricChip
        icon={TrendingUp}
        label="Finalizados Hoje"
        value={metrics.todayFinished}
        color="text-green-400"
      />
      <MetricChip
        icon={AlertTriangle}
        label="Atrasados"
        value={metrics.delayed}
        color={metrics.delayed > 0 ? "text-red-400" : "text-muted-foreground"}
        alert={metrics.delayed > 0}
      />
      <MetricChip
        icon={Clock}
        label="Parados >3d"
        value={metrics.stuckJobs}
        color={metrics.stuckJobs > 0 ? "text-orange-400" : "text-muted-foreground"}
        alert={metrics.stuckJobs > 0}
      />
    </div>
  );
}

function MetricChip({ icon: Icon, label, value, color, alert }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
  alert?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
      alert ? 'border-destructive/30 bg-destructive/5' : 'border-border/30 bg-card/50'
    }`}>
      <Icon className={`h-4 w-4 shrink-0 ${color}`} />
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground truncate">{label}</p>
        <p className="text-sm font-bold">{value}</p>
      </div>
    </div>
  );
}
