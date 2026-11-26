import { useState } from 'react';
import { useProductionLosses } from '@/features/production';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Plus, PackageX } from 'lucide-react';
import { format } from 'date-fns';

type LossType = 'availability' | 'performance' | 'quality';

const LOSS_TYPES: Array<{ value: LossType; label: string; hint: string }> = [
  { value: 'availability', label: 'Disponibilidade', hint: 'Máquina parada / setup' },
  { value: 'performance', label: 'Performance', hint: 'Velocidade abaixo do padrão' },
  { value: 'quality', label: 'Qualidade', hint: 'Refugo / retrabalho' },
];

const LOSS_BADGE: Record<LossType, string> = {
  availability: 'border-warning text-warning',
  performance: 'border-primary text-primary',
  quality: 'border-destructive text-destructive',
};

interface JobLossesTabProps {
  jobId: string;
}

export function JobLossesTab({ jobId }: JobLossesTabProps) {
  const { losses, isLoading, recordLossAsync, isRecording } = useProductionLosses(jobId);
  const [quantity, setQuantity] = useState('1');
  const [lossType, setLossType] = useState<LossType>('performance');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const total = (losses ?? []).reduce((acc, loss) => acc + (loss.quantity ?? 0), 0);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = Number.parseInt(quantity, 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      setFormError('Informe uma quantidade maior que zero.');
      return;
    }
    setFormError(null);
    try {
      await recordLossAsync({
        job_id: jobId,
        quantity: parsed,
        loss_type: lossType,
        notes: notes.trim() ? notes.trim() : undefined,
      });
      setQuantity('1');
      setNotes('');
    } catch {
      // O toast de erro e disparado pelo hook; o formulario permanece preenchido.
    }
  };

  return (
    <div className="space-y-6 py-4">
      <section className="space-y-3">
        <h4 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
          <Plus className="h-4 w-4" /> Registrar perda
        </h4>
        <Card className="border-border/50 bg-secondary/10 shadow-none">
          <CardContent className="p-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="loss-quantity" className="text-xs">Peças perdidas</Label>
                  <Input
                    id="loss-quantity"
                    type="number"
                    min={1}
                    step={1}
                    inputMode="numeric"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="bg-background"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="loss-type" className="text-xs">Tipo de perda</Label>
                  <Select value={lossType} onValueChange={(value) => setLossType(value as LossType)}>
                    <SelectTrigger id="loss-type" className="bg-background">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {LOSS_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label} - {type.hint}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="loss-notes" className="text-xs">Observações</Label>
                <Textarea
                  id="loss-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Causa da perda, máquina, operador..."
                  className="bg-background min-h-[70px]"
                />
              </div>
              {formError && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> {formError}
                </p>
              )}
              <Button type="submit" size="sm" disabled={isRecording}>
                {isRecording ? 'Registrando...' : 'Registrar perda'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
            <PackageX className="h-4 w-4" /> Perdas da OS
          </h4>
          <Badge variant="outline" className="text-[10px]">
            {total} peça(s) em {(losses ?? []).length} registro(s)
          </Badge>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : (losses ?? []).length === 0 ? (
          <div className="text-center py-8 border border-dashed rounded-xl space-y-2">
            <PackageX className="h-10 w-10 text-muted-foreground mx-auto opacity-50" />
            <p className="text-sm font-medium">Nenhuma perda registrada</p>
            <p className="text-xs text-muted-foreground max-w-[280px] mx-auto">
              Perdas registradas aqui alimentam os gráficos de OEE (disponibilidade, performance e qualidade).
            </p>
          </div>
        ) : (
          <ul className="space-y-2" aria-label="Perdas registradas da OS">
            {(losses ?? []).map((loss) => {
              const type = (loss.loss_type ?? 'performance') as LossType;
              const label = LOSS_TYPES.find((item) => item.value === type)?.label ?? type;
              return (
                <li key={loss.id} className="p-3 rounded-lg border border-border/50 bg-secondary/20 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className={`text-[10px] ${LOSS_BADGE[type] ?? ''}`}>{label}</Badge>
                    <span className="text-sm font-bold">{loss.quantity} un.</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {format(new Date(loss.created_at), 'dd/MM/yyyy HH:mm')}
                    {loss.shift ? ` | Turno ${loss.shift}` : ''}
                  </p>
                  {loss.notes && <p className="text-xs break-words">{loss.notes}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}