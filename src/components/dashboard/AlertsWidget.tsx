import { clickableProps } from '@/lib/a11y';
import { AlertTriangle, Clock, AlertCircle, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { parseDateOnly } from '@/lib/dateUtils';
import { format } from 'date-fns';
import { useMemo, useState } from 'react';
import { useSchedulingData } from '@/features/jobs';
import { AlertScheduleModal } from './AlertScheduleModal';
import { useStuckJobsDetection } from '@/features/jobs';
import { useOEE } from '@/features/production';

interface Alert {
  id: string;
  type: 'delayed' | 'conflict' | 'warning';
  title: string;
  description: string;
  time: Date;
  jobId?: string;
  canSchedule?: boolean;
}

export function AlertsWidget() {
  const { jobs, machines, refetchJobs: refetch } = useSchedulingData();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const { stuckJobs } = useStuckJobsDetection();
  const { data: oeeData } = useOEE(7); // Last 7 days

  const alerts = useMemo(() => {
    const alertList: Alert[] = [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Load alerts configuration for thresholds
    const storedThresholds = localStorage.getItem('alert-thresholds');
    const entityThresholdsStored = localStorage.getItem('entity-thresholds');
    const thresholds = { bottleneckRiskMinutes: 480 };
    let entityThresholds: Record<string, number> = {};

    if (storedThresholds) {
      try {
        const parsed = JSON.parse(storedThresholds);
        if (parsed.bottleneckRiskMinutes) thresholds.bottleneckRiskMinutes = parsed.bottleneckRiskMinutes;
      } catch {
        // Configuração corrompida no localStorage: descartamos para evitar loop de parse.
        localStorage.removeItem('alert-thresholds');
      }
    }

    if (entityThresholdsStored) {
      try {
        entityThresholds = JSON.parse(entityThresholdsStored);
      } catch {
        // Configuração corrompida no localStorage: descartamos para evitar loop de parse.
        localStorage.removeItem('entity-thresholds');
      }
    }

    jobs.filter(job => job.priority === 'urgent' && !job.scheduled_date && !['finished', 'cancelled'].includes(job.status)).forEach(job => {
      alertList.push({ id: `urgent-${job.id}`, type: 'conflict', title: 'Urgente Sem Agendamento', description: `${job.order_number} (${job.client}) precisa ser agendado`, time: job.created_at ? new Date(job.created_at) : now, jobId: job.id, canSchedule: true });
    });

    jobs.filter(job => job.status === 'delayed').forEach(job => {
      alertList.push({ id: `delayed-${job.id}`, type: 'delayed', title: 'Job Atrasado', description: `${job.order_number} ultrapassou o prazo previsto`, time: job.updated_at ? new Date(job.updated_at) : now });
    });

    jobs.filter(job => { if (!job.scheduled_date) return false; const jobDate = parseDateOnly(job.scheduled_date); return !!jobDate && jobDate < today && !['finished', 'cancelled'].includes(job.status); }).forEach(job => {
      alertList.push({ id: `overdue-${job.id}`, type: 'conflict', title: 'Job Vencido', description: `${job.order_number} passou da data agendada`, time: (job.scheduled_date && parseDateOnly(job.scheduled_date)) || now });
    });

    jobs.filter(job => job.priority === 'high' && !job.scheduled_date && !['finished', 'cancelled'].includes(job.status)).forEach(job => {
      alertList.push({ id: `high-priority-${job.id}`, type: 'warning', title: 'Alta Prioridade Sem Data', description: `${job.order_number} aguarda agendamento`, time: job.created_at ? new Date(job.created_at) : now, jobId: job.id, canSchedule: true });
    });

    const techniqueReadyCounts: Record<string, number> = {};
    jobs.filter(job => job.status === 'ready').forEach(job => { techniqueReadyCounts[job.technique_id] = (techniqueReadyCounts[job.technique_id] || 0) + 1; });
    Object.entries(techniqueReadyCounts).forEach(([techniqueId, count]) => {
      if (count < 3) alertList.push({ id: `buffer-${techniqueId}`, type: 'warning', title: 'Buffer Baixo', description: `Técnica ${techniqueId} com apenas ${count} job(s) prontos`, time: now });
    });

    // Bottleneck risks from Kanban columns with configurable limits
    const columnsWithJobs: Record<string, { totalTime: number, limit: number }> = {};
    jobs.forEach(job => {
      if (!['finished', 'cancelled'].includes(job.status)) {
        if (!columnsWithJobs[job.status]) {
          // Check for specific entity threshold if any machine/technique in this column has one
          const entityId = job.machine_id || job.technique_id;
          const limit = (entityId && entityThresholds[entityId]) || thresholds.bottleneckRiskMinutes;
          columnsWithJobs[job.status] = { totalTime: 0, limit };
        }
        columnsWithJobs[job.status].totalTime += (job.estimated_duration || 0);
      }
    });

    Object.entries(columnsWithJobs).forEach(([status, data]) => {
      if (data.totalTime > data.limit) {
        alertList.push({
          id: `bottleneck-high-${status}`,
          type: 'delayed',
          title: 'Gargalo Crítico',
          description: `Coluna "${status}" ultrapassou ${Math.round(data.limit / 60)}h de carga estimada.`,
          time: now
        });
      } else if (data.totalTime > data.limit * 0.7) {
        alertList.push({
          id: `bottleneck-medium-${status}`,
          type: 'warning',
          title: 'Aviso de Gargalo',
          description: `Coluna "${status}" está com carga elevada.`,
          time: now
        });
      }
    });

    // Stuck Jobs Alerts
    stuckJobs.forEach(stuck => {
      alertList.push({
        id: `stuck-${stuck.job.id}`,
        type: stuck.severity === 'critical' ? 'delayed' : 'warning',
        title: stuck.severity === 'critical' ? 'Job Travado' : 'Aviso de Job Lento',
        description: stuck.message,
        time: now
      });
    });

    // Low OEE Alerts
    if (oeeData) {
      oeeData.byMachine.filter(m => m.oee < 50 && m.totalJobs > 0).forEach(m => {
        alertList.push({
          id: `oee-low-${m.machineId}`,
          type: 'delayed',
          title: 'Eficiência Crítica (OEE)',
          description: `Máquina ${m.machineCode} operando com ${m.oee}% de OEE`,
          time: now
        });
      });
    }

    return alertList.slice(0, 10);
  }, [jobs, stuckJobs, oeeData]);

  const selectedJob = useMemo(() => selectedJobId ? jobs.find(j => j.id === selectedJobId) || null : null, [selectedJobId, jobs]);

  const handleAlertClick = (alert: Alert) => {
    if (alert.canSchedule && alert.jobId) { setSelectedJobId(alert.jobId); setIsScheduleModalOpen(true); }
  };

  const alertIcons = { delayed: AlertTriangle, conflict: AlertCircle, warning: Clock };
  const alertColors = { delayed: 'text-status-delayed bg-status-delayed/10', conflict: 'text-destructive bg-destructive/10', warning: 'text-status-ready bg-status-ready/10' };

  return (
    <>
      <Card className="glass-card card-interactive animate-fade-in-up opacity-0 [animation-fill-mode:forwards] [animation-delay:0.15s]">
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-sm text-title flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-status-delayed/20 flex items-center justify-center"><AlertTriangle className="w-3 h-3 text-status-delayed" /></div>
            <span className="gradient-text">Alertas</span>
            {alerts.length > 0 && <Badge variant="outline" className="ml-auto text-[10px] h-5">{alerts.length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 px-3 pb-3 max-h-[200px] overflow-y-auto scrollbar-thin">
          {alerts.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">Nenhum alerta</p>
          ) : (
            alerts.slice(0, 5).map((alert) => {
              const Icon = alertIcons[alert.type];
              return (
                <div key={alert.id} {...clickableProps(() => handleAlertClick(alert), { label: `Abrir alerta ${alert.title}` })} className={cn("flex items-center gap-2 p-2 rounded-lg bg-secondary/50 hover:bg-secondary/80 transition-all cursor-pointer border border-border/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary", "hover:-translate-x-0.5 hover:border-primary/30", alert.canSchedule && "group")}>
                  <div className={cn('w-6 h-6 rounded-lg flex items-center justify-center shrink-0', alertColors[alert.type])}><Icon className="w-3 h-3" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{alert.title}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{alert.description}</p>
                  </div>
                  {alert.canSchedule && <Calendar className="w-3 h-3 text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <AlertScheduleModal open={isScheduleModalOpen} onOpenChange={setIsScheduleModalOpen} selectedJob={selectedJob} jobs={jobs} machines={machines} onScheduled={refetch} />
    </>
  );
}
