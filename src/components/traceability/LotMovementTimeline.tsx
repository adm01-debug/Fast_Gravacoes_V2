import { format } from 'date-fns';
import { Package, Truck, ArrowRight, ArrowLeft, Layers, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { LotMovement } from '@/features/inventory';

interface LotMovementTimelineProps {
  movements: LotMovement[];
}

const MOVEMENT_CONFIG: Record<string, { label: string; icon: typeof ArrowRight; color: string }> = {
  production: { label: 'Produção', icon: Package, color: 'text-success bg-success/10 border-success/30' },
  transfer: { label: 'Transferência', icon: Truck, color: 'text-blue-500 bg-blue-500/10 border-blue-500/30' },
  consumption: { label: 'Consumo', icon: ArrowRight, color: 'text-orange-500 bg-orange-500/10 border-orange-500/30' },
  adjustment: { label: 'Ajuste', icon: Layers, color: 'text-purple-500 bg-purple-500/10 border-purple-500/30' },
  return: { label: 'Devolução', icon: ArrowLeft, color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30' },
};

export function LotMovementTimeline({ movements }: LotMovementTimelineProps) {
  if (movements.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-10 w-10 mx-auto mb-2 opacity-50" />
        <p>Nenhuma movimentação registrada</p>
      </div>
    );
  }

  return (
    <div className="relative space-y-0">
      {/* Vertical line */}
      <div className="absolute left-5 top-3 bottom-3 w-px bg-border" />

      {movements.map((mov, idx) => {
        const config = MOVEMENT_CONFIG[mov.movement_type] || MOVEMENT_CONFIG.adjustment;
        const Icon = config.icon;
        const isFirst = idx === 0;

        return (
          <div key={mov.id} className="relative flex gap-4 pb-4">
            {/* Icon node */}
            <div className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 shrink-0 ${config.color}`}>
              <Icon className="h-4 w-4" />
            </div>

            {/* Content */}
            <div className={`flex-1 p-3 rounded-lg border transition-colors ${isFirst ? 'bg-card border-border' : 'bg-muted/30 border-border/50'}`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {config.label}
                  </Badge>
                  <span className="text-sm font-semibold">{mov.quantity} un</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(mov.created_at), 'dd/MM/yyyy HH:mm')}
                </span>
              </div>

              {(mov.from_location || mov.to_location) && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  {mov.from_location && <span>{mov.from_location}</span>}
                  {mov.from_location && mov.to_location && <ArrowRight className="h-3 w-3" />}
                  {mov.to_location && <span>{mov.to_location}</span>}
                </div>
              )}

              {mov.reason && (
                <p className="text-xs text-muted-foreground mt-1 italic">"{mov.reason}"</p>
              )}

              {mov.performed_by_name && (
                <p className="text-xs text-muted-foreground mt-1">
                  por {mov.performed_by_name}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
