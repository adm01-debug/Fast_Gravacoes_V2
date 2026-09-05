import { clickableProps } from '@/lib/a11y';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Calendar, Clock, ChevronRight } from 'lucide-react';
import { DbJob } from '@/features/jobs';
import { parseDateOnly } from '@/lib/dateUtils';

const priorityColors: Record<string, string> = {
  urgent: 'bg-primary/20 text-primary border-primary/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-green-500/20 text-green-400 border-green-500/30'
};

const priorityLabels: Record<string, string> = {
  urgent: 'Urgente',
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa'
};

interface AlertCardProps {
  title: string;
  icon: React.ElementType;
  iconColor: string;
  bgColor: string;
  jobs: DbJob[];
  emptyMessage: string;
  isCritical?: boolean;
  onJobClick: (job: DbJob) => void;
  onViewAll: (jobs: DbJob[]) => void;
  getTechniqueById: (id: string) => { color: string; short_name: string } | undefined;
}

export function AlertCard({
  title, icon: Icon, iconColor, bgColor, jobs: cardJobs,
  emptyMessage, isCritical = false, onJobClick, onViewAll, getTechniqueById
}: AlertCardProps) {
  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${bgColor} ${isCritical && cardJobs.length > 0 ? 'animate-bounce-attention' : ''}`}>
              <Icon className={`h-5 w-5 ${iconColor}`} />
            </div>
            {title}
          </div>
          <Badge variant="outline" className="bg-muted/50 text-foreground border-border">
            {cardJobs.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {cardJobs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">{emptyMessage}</p>
        ) : (
          cardJobs.slice(0, 5).map((job) => {
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
                      <Badge className={`${priorityColors[job.priority] || priorityColors.medium} border text-xs ${job.priority === 'urgent' ? 'wiggle-infinite' : ''}`}>
                        {priorityLabels[job.priority] || 'Média'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate mt-1">{job.client}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {job.scheduled_date ? (parseDateOnly(job.scheduled_date)?.toLocaleDateString('pt-BR') ?? '-') : '-'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {job.start_time || '-'}
                      </span>
                      <Badge variant="outline" className="text-xs" style={{ backgroundColor: `${technique?.color}20`, borderColor: `${technique?.color}50`, color: technique?.color }}>
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
          })
        )}
        {cardJobs.length > 5 && (
          <Button variant="ghost" className="w-full text-muted-foreground hover:text-foreground" onClick={() => onViewAll(cardJobs)}>
            Ver todos ({cardJobs.length})
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export { priorityColors, priorityLabels };
