import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import { useSchedulingData } from '@/features/jobs';
import { cn } from '@/lib/utils';
import { parseISO, isToday } from 'date-fns';

export function CompactTimeline() {
  const { jobs } = useSchedulingData();

  const todayJobs = useMemo(() => {
    if (!jobs) return [];
    return jobs
      .filter(j => j.scheduled_date && isToday(parseISO(j.scheduled_date)))
      .sort((a, b) => {
        const aTime = a.start_time || '99:99';
        const bTime = b.start_time || '99:99';
        return aTime.localeCompare(bTime);
      })
      .slice(0, 8);
  }, [jobs]);

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500',
    ready: 'bg-blue-500',
    production: 'bg-green-500',
    completed: 'bg-muted-foreground',
    paused: 'bg-orange-500',
  };

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          Timeline de Hoje
          <Badge variant="outline" className="ml-auto">{todayJobs.length} jobs</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {todayJobs.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Nenhum job agendado para hoje
          </p>
        ) : (
          <div className="space-y-2">
            {todayJobs.map((job) => (
              <div key={job.id} className="flex items-center gap-2 text-xs">
                <div className={cn(
                  "w-2 h-2 rounded-full shrink-0",
                  statusColors[job.status] || 'bg-muted'
                )} />
                <span className="text-muted-foreground w-10 shrink-0">
                  {job.start_time || '--:--'}
                </span>
                <span className="font-medium truncate">{job.order_number}</span>
                <span className="text-muted-foreground truncate ml-auto">{job.client}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
