import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, ChevronRight } from "lucide-react";
import { DbJob, StuckJob } from "@/features/jobs";
import { parseDateOnly } from "@/lib/dateUtils";
import { BottleneckAlert, LoadBalancingSuggestion } from "@/features/analytics";
import { priorityColors, priorityLabels } from "./AlertJobCard";
import { clickableProps } from "@/lib/a11y";


interface JobsViewAllProps {
  jobs: DbJob[];
  onJobClick: (job: DbJob) => void;
  getTechniqueById: (id: string) => { color: string; short_name: string } | undefined;
}

export function JobsViewAll({ jobs, onJobClick, getTechniqueById }: JobsViewAllProps) {
  return (
    <ScrollArea className="max-h-[60vh]">
      <div className="space-y-3 pr-4">
        {jobs.map((job) => {
          const technique = getTechniqueById(job.technique_id);
          return (
            <div
              key={job.id}
              {...clickableProps(() => onJobClick(job), { label: `Abrir job ${job.order_number}` })}
              className="p-3 rounded-lg bg-muted/30 border border-border/30 hover:bg-muted/50 transition-colors cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{job.order_number}</span>
                    <Badge className={`${priorityColors[job.priority] || priorityColors.medium} border text-xs`}>
                      {priorityLabels[job.priority] || 'Média'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate mt-1">{job.client} - {job.product}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {job.scheduled_date ? (parseDateOnly(job.scheduled_date)?.toLocaleDateString('pt-BR') ?? '-') : '-'}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-xs"
                      style={{
                        backgroundColor: `${technique?.color}20`,
                        borderColor: `${technique?.color}50`,
                        color: technique?.color
                      }}
                    >
                      {technique?.short_name}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={job.status} />
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}

export function BottleneckViewAll({ alerts }: { alerts: BottleneckAlert[] }) {
  return (
    <ScrollArea className="max-h-[60vh]">
      <div className="space-y-3 pr-4">
        {alerts.map((alert, index) => (
          <div key={index} className="p-3 rounded-lg bg-muted/30 border border-border/30">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-medium text-foreground">{alert.techniqueName}</span>
              <Badge className={`${alert.severity === 'critical' ? 'bg-primary/20 text-primary border-primary/30' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'} border text-xs`}>
                {alert.severity === 'critical' ? 'Crítico' : 'Atenção'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{alert.message}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(alert.date).toLocaleDateString('pt-BR')}
              </span>
              <span>Ocupação: {alert.currentCapacity.toFixed(0)}%</span>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

export function LoadBalancingViewAll({ suggestions }: { suggestions: LoadBalancingSuggestion[] }) {
  return (
    <ScrollArea className="max-h-[60vh]">
      <div className="space-y-3 pr-4">
        {suggestions.map((suggestion, index) => (
          <div key={index} className="p-3 rounded-lg bg-muted/30 border border-border/30">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-medium text-foreground">
                {suggestion.currentMachineName} → {suggestion.suggestedMachineName}
              </span>
              <Badge className="bg-teal-500/20 text-teal-400 border-teal-500/30 border text-xs">
                Redistribuir
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Mover job {suggestion.orderNumber} ({suggestion.client})
            </p>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span>Diferença: {suggestion.loadDifference.toFixed(0)}%</span>
              <span>Carga atual: {suggestion.currentLoad.toFixed(0)}%</span>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

interface StuckJobsViewAllProps {
  stuckJobs: StuckJob[];
  onJobClick: (job: DbJob) => void;
  getTechniqueById: (id: string) => { color: string; short_name: string } | undefined;
}

export function StuckJobsViewAll({ stuckJobs, onJobClick, getTechniqueById }: StuckJobsViewAllProps) {
  return (
    <ScrollArea className="max-h-[60vh]">
      <div className="space-y-3 pr-4">
        {stuckJobs.map((stuck) => {
          const technique = getTechniqueById(stuck.job.technique_id);
          return (
            <div
              key={stuck.job.id}
              {...clickableProps(() => onJobClick(stuck.job), { label: `Abrir job travado ${stuck.job.order_number}` })}
              className={`p-3 rounded-lg border cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                stuck.severity === 'critical'
                  ? 'bg-primary/10 border-primary/30 hover:bg-primary/20'
                  : 'bg-warning/10 border-warning/30 hover:bg-warning/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{stuck.job.order_number}</span>
                    <Badge variant={stuck.severity === 'critical' ? 'destructive' : 'outline'} className="text-xs">
                      {Math.round(stuck.hoursInProduction)}h em produção
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{stuck.job.client} - {stuck.job.product}</p>
                </div>
                <Badge
                  variant="outline"
                  className="text-xs"
                  style={{
                    backgroundColor: `${technique?.color}20`,
                    borderColor: `${technique?.color}50`,
                    color: technique?.color
                  }}
                >
                  {technique?.short_name}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
