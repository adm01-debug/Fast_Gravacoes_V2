import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Camera, Zap, Info } from 'lucide-react';

export interface RiskAlert {
  description: string;
  expected_range?: string;
  evidence_urls: string[];
  is_critical_risk?: boolean;
}

interface AlertRiskPanelProps {
  alerts: RiskAlert[];
  onEvidenceUpload: (index: number, file: File) => void;
  isUploading: boolean;
}

export function AlertRiskPanel({ alerts, onEvidenceUpload, isUploading }: AlertRiskPanelProps) {
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-4 p-4 rounded-xl border-2 border-destructive/30 bg-destructive/5 animate-in fade-in slide-in-from-top-2">
      <h3 className="text-sm font-bold text-destructive flex items-center gap-2">
        <Zap className="h-4 w-4 animate-pulse" />
        Riscos de Perda Detectados ({alerts.length})
      </h3>
      <div className="space-y-3">
        {alerts.map((alert, idx) => (
          <div key={idx} className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm font-semibold text-destructive">{alert.description}</p>
                <p className="text-xs text-muted-foreground">Range Recomendado: {alert.expected_range}</p>
              </div>
              <div className="flex flex-col gap-2">
                <Input
                  type="file"
                  className="hidden"
                  id={`alert-evidence-${idx}`}
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onEvidenceUpload(idx, file);
                  }}
                  disabled={isUploading}
                />
                <Label
                  htmlFor={`alert-evidence-${idx}`}
                  className="inline-flex items-center justify-center rounded-md text-xs font-medium border-2 border-destructive bg-background hover:bg-destructive/10 h-8 px-3 cursor-pointer gap-2"
                >
                  <Camera className="h-3 w-3" /> Anexar Foto
                </Label>
              </div>
            </div>

            {alert.evidence_urls.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-destructive/10">
                {alert.evidence_urls.map((url: string, pIdx: number) => (
                  <div key={pIdx} className="relative h-12 w-12 rounded border border-destructive/20 overflow-hidden">
                    <img src={url} alt="Evidência" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            )}

            {alert.is_critical_risk && alert.evidence_urls.length === 0 && (
              <Badge variant="outline" className="text-[8px] bg-destructive/10 text-destructive border-destructive/20 uppercase">
                Bloqueante
              </Badge>
            )}
          </div>
        ))}
      </div>
      <div className="p-3 bg-destructive/10 rounded-lg text-[11px] text-destructive-foreground font-medium flex items-center gap-2">
        <Info className="h-3 w-3" />
        Bloqueio Ativo: Anexe fotos e justifique nas observações para liberar o override.
      </div>
    </div>
  );
}
