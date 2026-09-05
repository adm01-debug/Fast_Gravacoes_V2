import { Card } from '@/components/ui/card';
import { Package as PackageIcon, AlertTriangle as AlertIcon, CircleCheck as CheckIcon, Clock as ClockIcon, TimerOff as OverdueIcon } from 'lucide-react';
import type { PackagingTaskWithJob } from '../services/packagingService';
import { usePackagingSettings, computeSla } from '../hooks/usePackagingSettings';
import { usePackagingSlaOverrides } from '../hooks/usePackagingSlaOverrides';

interface Props {
  tasks: PackagingTaskWithJob[];
}

export function PackagingStatsCards({ tasks }: Props) {
  const { data: settings } = usePackagingSettings();
  const { data: overrides } = usePackagingSlaOverrides();

  const pending = tasks.filter(t => t.status === 'pending').length;
  const inProgress = tasks.filter(t => t.status === 'in_triage' || t.status === 'packaging').length;
  const ready = tasks.filter(t => t.status === 'ready_to_ship').length;
  const totalRejected = tasks.reduce((sum, t) => sum + (t.rejected_quantity ?? 0), 0);
  const overdue = settings
    ? tasks.filter(t => computeSla(t, settings, overrides).level === 'overdue').length
    : 0;

  const cards = [
    { icon: ClockIcon, label: 'Pendentes', value: pending, tone: 'text-status-queue' },
    { icon: PackageIcon, label: 'Em andamento', value: inProgress, tone: 'text-status-production' },
    { icon: CheckIcon, label: 'Prontos p/ envio', value: ready, tone: 'text-status-finished' },
    { icon: OverdueIcon, label: 'SLA vencido', value: overdue, tone: 'text-destructive' },
    { icon: AlertIcon, label: 'Peças rejeitadas', value: totalRejected, tone: 'text-destructive' },
  ] as const;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map(({ icon: Icon, label, value, tone }) => (
        <Card key={label} className="p-4">
          <div className="flex items-center gap-3">
            <Icon className={`w-5 h-5 ${tone}`} />
            <div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-2xl font-semibold">{value}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
