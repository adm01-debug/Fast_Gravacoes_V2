import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SwipeActions } from '@/components/mobile/SwipeActions';
import { ProductionTimer } from '@/components/operator/ProductionTimer';
import { DbJob } from '@/features/jobs';
import { Play, Pause, CheckCircle2, AlertTriangle, ClipboardCheck, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface OperatorProductionCardProps {
  job: DbJob;
  technique?: { name: string; color: string; short_name: string } | null;
  machine?: { name: string; code: string } | null;
  onPause: (job: DbJob) => void;
  onFinish: (job: DbJob) => void;
  onClick: (job: DbJob) => void;
}

export function OperatorProductionCard({ job, technique, machine, onPause, onFinish, onClick }: OperatorProductionCardProps) {
  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
      <SwipeActions
        leftActions={[{ id: 'pause', icon: <Pause className="h-5 w-5" />, label: 'Pausar', color: 'hsl(0, 0%, 100%)', bgColor: 'hsl(var(--warning))', onAction: () => onPause(job) }]}
        rightActions={[{ id: 'finish', icon: <CheckCircle2 className="h-5 w-5" />, label: 'Finalizar', color: 'hsl(0, 0%, 100%)', bgColor: 'hsl(var(--success))', onAction: () => onFinish(job) }]}
      >
        <Card className={cn("glass-card cursor-pointer transition-colors", "border-status-production/40 hover:border-status-production/60", "animate-pulse-border")} onClick={() => onClick(job)}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{job.client}</CardTitle>
              <Badge className="bg-status-production/20 text-status-production border-status-production/50">Em Produção</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" style={{ borderColor: technique?.color, color: technique?.color }}>{technique?.name}</Badge>
              {machine && <Badge variant="secondary">{machine.name}</Badge>}
              {job.priority === 'urgent' && <Badge variant="destructive" className="shrink-0"><AlertTriangle className="h-3 w-3 mr-1" />Urgente</Badge>}
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-muted-foreground">Produto</p><p className="font-medium">{job.product}</p></div>
              <div><p className="text-muted-foreground">Quantidade</p><p className="font-medium">{job.quantity.toLocaleString()} pçs</p></div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Timer className="h-3 w-3" />Estimado: {job.estimated_duration}min</div>
            <ProductionTimer job={job} />
            <div className="flex gap-2 pt-2" role="presentation" onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
              <Button variant="outline" size="sm" className="flex-1 border-warning/50 text-warning hover:bg-warning/10" onClick={() => onPause(job)}><Pause className="h-4 w-4 mr-1" />Pausar</Button>
              <Button size="sm" className="flex-1 bg-success hover:bg-success/90 text-success-foreground" onClick={() => onFinish(job)}><ClipboardCheck className="h-4 w-4 mr-1" />Registrar</Button>
            </div>
          </CardContent>
        </Card>
      </SwipeActions>
    </motion.div>
  );
}
