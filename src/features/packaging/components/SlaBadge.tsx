import { Badge } from '@/components/ui/badge';
import { AlertTriangle as AlertIcon, Clock as ClockIcon, CheckCircle2 as CheckIcon } from 'lucide-react';
import type { SlaInfo } from '../hooks/usePackagingSettings';

const CLASSES: Record<SlaInfo['level'], string> = {
  ok: 'border-emerald-500/40 text-emerald-300',
  warning: 'border-amber-500/50 text-amber-300',
  overdue: 'border-destructive/60 text-destructive',
};

export function SlaBadge({ sla }: { sla: SlaInfo }) {
  const Icon = sla.level === 'overdue' ? AlertIcon : sla.level === 'warning' ? ClockIcon : CheckIcon;
  return (
    <Badge variant="outline" className={`gap-1 ${CLASSES[sla.level]}`}>
      <Icon className="w-3 h-3" />
      <span className="text-[10px]">{sla.label}</span>
    </Badge>
  );
}
