import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { AlertTriangle, MoveHorizontal, Thermometer } from 'lucide-react';

interface Range {
  min?: string | null;
  max?: string | null;
}

interface AdjustmentParametersData {
  squeegee_passes?: string;
  pressure?: string;
  speed?: string;
  temperature?: string;
  ranges?: Record<string, Range | undefined>;
  recommended?: Record<string, string | undefined>;
  [key: string]: unknown;
}

interface AdjustmentParametersProps {
  adjustmentParameters: AdjustmentParametersData | null | undefined;
}

export function AdjustmentParameters({ adjustmentParameters }: AdjustmentParametersProps) {
  if (!adjustmentParameters || !Object.values(adjustmentParameters).some(v => v && typeof v === 'string')) {
    return null;
  }

  const isOutOfRange = (val: string, r: Range | undefined) => {
    if (!r || (!r.min && !r.max)) return false;
    const v = parseFloat(val.replace(/[^0-9.]/g, ''));
    const min = r.min ? parseFloat(r.min.replace(/[^0-9.]/g, '')) : -Infinity;
    const max = r.max ? parseFloat(r.max.replace(/[^0-9.]/g, '')) : Infinity;
    return !isNaN(v) && (v < min || v > max);
  };

  const params = [
    { key: 'squeegee_passes', label: 'Passadas', icon: <MoveHorizontal className="h-3 w-3" /> },
    { key: 'pressure', label: 'Pressão', icon: null },
    { key: 'speed', label: 'Velocidade', icon: null },
    { key: 'temperature', label: 'Temp.', icon: <Thermometer className="h-3 w-3" /> }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {params.map(({ key, label, icon }) => {
        const rawValue = adjustmentParameters[key];
        const value = typeof rawValue === 'string' ? rawValue : '';
        const range = adjustmentParameters.ranges?.[key];
        const recommended = adjustmentParameters.recommended?.[key];

        if (!value) return null;

        const outOfRange = isOutOfRange(value, range);
        const differsFromRecommended = recommended && value !== recommended;

        return (
          <div
            key={key}
            className={`p-3 rounded-lg border ${
              outOfRange ? 'bg-destructive/5 border-destructive/20' :
              differsFromRecommended ? 'bg-warning/10 border-warning/30' :
              'bg-secondary/20 border-border/50'
            }`}
          >
            <Label className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
              {icon} {label}
            </Label>
            <p className={`text-sm font-bold ${outOfRange ? 'text-destructive' : ''}`}>
              {value}
              {outOfRange && <AlertTriangle className="h-3 w-3 inline ml-1" />}
            </p>
            {range && (range.min || range.max) && (
              <p className="text-[10px] text-muted-foreground mt-1">
                Ref: {range.min || '-'} a {range.max || '-'}
              </p>
            )}
            {differsFromRecommended && !outOfRange && (
              <p className="text-[9px] text-warning font-medium">Rec: {recommended}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
