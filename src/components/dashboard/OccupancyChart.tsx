import { useMemo, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3 } from 'lucide-react';
import { useOperatorDashboardData } from '@/features/production';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface MachineLike {
  id: string;
  name: string;
  code: string;
}

interface JobLike {
  machine_id?: string | null;
  status?: string | null;
  estimated_duration?: number | string | null;
}

interface OccupancyRow {
  id: string;
  name: string;
  code: string;
  occupancy: number;
  jobs: number;
}

function OccupancyChartComponent() {
  const { t } = useTranslation();
  const { jobs, machines } = useOperatorDashboardData() as { jobs: JobLike[]; machines: MachineLike[] };

  const occupancyData = useMemo<OccupancyRow[]>(() => {
    if (!machines || !jobs || machines.length === 0) return [];

    const activeStatuses = ['production', 'paused', 'scheduled', 'ready', 'queue'];

    return machines.map((machine) => {
      const machineJobs = jobs.filter((j) => j.machine_id === machine.id && activeStatuses.includes(j.status ?? ''));
      const totalCapacityHours = 8;
      const usedHours = machineJobs.reduce((sum, j) => sum + (Number(j.estimated_duration) || 0) / 60, 0);
      const occupancy = totalCapacityHours > 0 ? Math.min(100, (usedHours / totalCapacityHours) * 100) : 0;

      return {
        id: machine.id,
        name: machine.name,
        code: machine.code,
        occupancy: Math.round(occupancy),
        jobs: machineJobs.length,
      };
    }).sort((a, b) => b.occupancy - a.occupancy);
  }, [machines, jobs]);

  const avgOccupancy = occupancyData.length > 0
    ? Math.round(occupancyData.reduce((sum, m) => sum + m.occupancy, 0) / occupancyData.length)
    : 0;

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          {t('dashboard.machineOccupancy', 'Ocupação das Máquinas')}
          <Badge variant="outline" className="ml-auto">{avgOccupancy}% {t('common.average', 'média')}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {occupancyData.slice(0, 10).map((machine) => (

            <div key={machine.id} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium truncate max-w-[60%]">{machine.name} ({machine.code})</span>
                <span className="text-muted-foreground">{machine.occupancy}%</span>
              </div>
              <div 
                className="h-2 rounded-full bg-muted overflow-hidden"
                role="progressbar"
                aria-valuenow={machine.occupancy}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Ocupação da máquina ${machine.name}: ${machine.occupancy}%`}
              >
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    machine.occupancy >= 90 ? "bg-destructive" :
                    machine.occupancy >= 70 ? "bg-warning" :
                    machine.occupancy >= 40 ? "bg-primary" :
                    "bg-success"
                  )}
                  style={{ width: `${machine.occupancy}%` }}
                />
              </div>
            </div>
          ))}
          {occupancyData.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              {t('dashboard.noOccupancyData', 'Nenhuma máquina com dados de ocupação')}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
export const OccupancyChart = memo(OccupancyChartComponent);
