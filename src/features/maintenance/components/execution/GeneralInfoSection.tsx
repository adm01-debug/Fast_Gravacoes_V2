import { Clock, PenTool } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ReplacementParts } from '@/features/maintenance/components/execution/ReplacementParts';

interface PartEntry {
  _key: string;
  name: string;
  code: string;
  quantity: number;
}

interface GeneralInfoSectionProps {
  downtime: number;
  onDowntimeChange: (v: number) => void;
  totalCost: number;
  onTotalCostChange: (v: number) => void;
  notes: string;
  onNotesChange: (v: string) => void;
  parts: PartEntry[];
  onAddPart: () => void;
  onRemovePart: (index: number) => void;
  onUpdatePart: (index: number, field: 'name' | 'code' | 'quantity', value: string | number) => void;
  signature: string;
  onSignatureChange: (v: string) => void;
}

export function GeneralInfoSection({
  downtime, onDowntimeChange, totalCost, onTotalCostChange, notes, onNotesChange,
  parts, onAddPart, onRemovePart, onUpdatePart, signature, onSignatureChange,
}: GeneralInfoSectionProps) {
  return (
            <div className="space-y-4 pt-4 border-t border-border/50">
              <h3 className="text-lg font-semibold">Informações Gerais</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Tempo de Máquina Parada (min)
                  </Label>
                  <Input
                    type="number"
                    value={downtime}
                    onChange={(e) => onDowntimeChange(parseInt(e.target.value, 10) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Custo Total (Opcional)</Label>
                  <Input
                    type="number"
                    placeholder="R$ 0,00"
                    value={totalCost}
                    onChange={(e) => onTotalCostChange(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Observações Adicionais</Label>
                <Textarea
                  placeholder="Relate problemas encontrados, peças trocadas, etc."
                  value={notes}
                  onChange={(e) => onNotesChange(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>

              {/* Parts Replacement */}
              <ReplacementParts
                parts={parts}
                onAdd={onAddPart}
                onRemove={onRemovePart}
                onUpdate={onUpdatePart}
              />

              {/* Signature */}
              <div className="space-y-4 pt-4 border-t border-border/50">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <PenTool className="h-5 w-5 text-primary" />
                  Assinatura Digital
                </h3>
                <div className="p-4 border border-dashed rounded-lg bg-muted/20 text-center">
                  <Input
                    placeholder="Assine aqui (Nome Completo)"
                    value={signature}
                    onChange={(e) => onSignatureChange(e.target.value)}
                    className="max-w-md mx-auto text-center font-serif italic text-lg"
                  />
                  <p className="text-[10px] text-muted-foreground mt-2">Esta assinatura declara a veracidade dos dados informados.</p>
                </div>
              </div>
            </div>
  );
}
