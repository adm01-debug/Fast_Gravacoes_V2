import { format } from 'date-fns';
import { AlertTriangle, CheckCircle2, Clock, Wrench, Shield, Package, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShiftOccurrence } from '@/hooks/useShiftHandover';

const OCCURRENCE_TYPES: Record<string, { label: string; icon: typeof AlertTriangle; color: string }> = {
  incident: { label: 'Incidente', icon: AlertTriangle, color: 'text-red-500' },
  maintenance: { label: 'Manutenção', icon: Wrench, color: 'text-blue-500' },
  quality: { label: 'Qualidade', icon: CheckCircle2, color: 'text-green-500' },
  safety: { label: 'Segurança', icon: Shield, color: 'text-warning' },
  production: { label: 'Produção', icon: Package, color: 'text-purple-500' },
  other: { label: 'Outro', icon: FileText, color: 'text-slate-500' }
};

const SEVERITY_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  info: { label: 'Info', variant: 'secondary' },
  warning: { label: 'Atenção', variant: 'outline' },
  error: { label: 'Erro', variant: 'default' },
  critical: { label: 'Crítico', variant: 'destructive' }
};

interface OccurrenceItemProps {
  occurrence: ShiftOccurrence;
  onResolve: (occ: ShiftOccurrence) => void;
}

export function OccurrenceItem({ occurrence: occ, onResolve }: OccurrenceItemProps) {
  const typeConfig = OCCURRENCE_TYPES[occ.occurrence_type];
  const TypeIcon = typeConfig?.icon || AlertTriangle;

  return (
    <div className={`p-4 rounded-lg border ${
      occ.severity === 'critical' ? 'border-destructive/50 bg-destructive/5' :
      occ.severity === 'error' ? 'border-orange-500/50 bg-orange-500/5' :
      occ.resolved_at ? 'bg-muted/50' : ''
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-background border">
            <TypeIcon className={`h-5 w-5 ${typeConfig?.color}`} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-medium">{occ.title}</h4>
              <Badge variant={SEVERITY_CONFIG[occ.severity]?.variant || 'default'}>
                {SEVERITY_CONFIG[occ.severity]?.label}
              </Badge>
              <Badge variant="outline">{typeConfig?.label}</Badge>
              {occ.resolved_at && (
                <Badge variant="secondary" className="text-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />Resolvida
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">{occ.description}</p>
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span>📅 {format(new Date(occ.occurred_at), "dd/MM/yyyy 'às' HH:mm")}</span>
              {occ.machine && <span>📍 {occ.machine.name}</span>}
            </div>
            {occ.resolution && (
              <div className="mt-3 p-2 bg-green-500/10 rounded text-sm">
                <p className="text-green-600 font-medium">Resolução:</p>
                <p>{occ.resolution}</p>
                {occ.resolved_at && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Resolvida em {format(new Date(occ.resolved_at), "dd/MM/yyyy 'às' HH:mm")}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
        {!occ.resolved_at && (
          <Button variant="outline" size="sm" onClick={() => onResolve(occ)}>
            <CheckCircle2 className="h-4 w-4 mr-1" />Resolver
          </Button>
        )}
      </div>
    </div>
  );
}
