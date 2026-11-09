import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { MoveHorizontal, PenTool, Zap, Thermometer, LucideIcon } from 'lucide-react';
import { TechnicalSheet } from '@/hooks/useTechnicalSheets';

export interface AdjustmentParams {
  squeegee_passes: string;
  pressure: string;
  speed: string;
  temperature: string;
}

interface AdjustmentParametersProps {
  adjustmentParams: AdjustmentParams;
  setAdjustmentParams: (fn: (prev: AdjustmentParams) => AdjustmentParams) => void;
  activeAlerts: Array<{ parameter_name?: string }>;
  selectedSheetId: string | null;
  technicalSheets: TechnicalSheet[];
}

export function AdjustmentParameters({
  adjustmentParams,
  setAdjustmentParams,
  activeAlerts,
  selectedSheetId,
  technicalSheets
}: AdjustmentParametersProps) {
  const labels: Record<string, string> = {
    squeegee_passes: 'Passadas',
    pressure: 'Pressão',
    speed: 'Velocidade',
    temperature: 'Temp.'
  };

  const Icons: Record<string, LucideIcon> = {
    squeegee_passes: MoveHorizontal,
    pressure: PenTool,
    speed: Zap,
    temperature: Thermometer
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {(['squeegee_passes', 'pressure', 'speed', 'temperature'] as Array<keyof AdjustmentParams>).map((param) => {
        const Icon = Icons[param];
        const sheet = technicalSheets.find(s => s.id === selectedSheetId);
        const range = sheet?.settings_ranges?.[param];
        const recommended = sheet?.machine_settings?.[param];

        return (
          <div key={param} className="space-y-2">
            <Label className="flex items-center gap-1 text-xs">
              {Icon && <Icon className="h-3 w-3" />} {labels[param]}
            </Label>
            <Input
              placeholder={recommended || "Valor"}
              value={adjustmentParams[param]}
              onChange={(e) => setAdjustmentParams((prev) => ({ ...prev, [param]: e.target.value }))}
              className={activeAlerts.some(a => a.parameter_name === labels[param]) ? "border-destructive ring-destructive/20" : ""}
            />
            {range && (range.min || range.max) && (
              <div className="text-[10px] text-muted-foreground bg-secondary/30 px-1.5 py-0.5 rounded flex justify-between">
                <span>Mín: {range.min || '-'}</span>
                <span>Máx: {range.max || '-'}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
