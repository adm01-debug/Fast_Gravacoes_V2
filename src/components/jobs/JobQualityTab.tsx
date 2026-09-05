import { useState } from 'react';
import { useSPCParameters, useSPCMeasurements, useSPCMutations } from '@/features/analytics/hooks/useSPC';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CheckCircle2,
  AlertTriangle,
  Activity,
  Plus,
  ChevronRight,
  TrendingUp,
  History,
  Target
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface JobQualityTabProps {
  jobId: string;
  techniqueId: string;
  machineId?: string | null;
}

export function JobQualityTab({ jobId, techniqueId, machineId }: JobQualityTabProps) {
  const { data: allParameters, isLoading: loadingParams } = useSPCParameters();
  const { addMeasurement } = useSPCMutations();
  const [selectedParamId, setSelectedParamId] = useState<string | null>(null);
  const [newValues, setNewValues] = useState<string>('');
  const [notes, setNotes] = useState('');

  // Filter parameters relevant to this job
  const parameters = allParameters?.filter(p =>
    p.is_active &&
    (p.technique_id === techniqueId || !p.technique_id) &&
    (p.machine_id === machineId || !p.machine_id)
  ) || [];

  const { data: measurements, isLoading: loadingMeasurements } = useSPCMeasurements(selectedParamId, 10);
  const selectedParam = parameters.find(p => p.id === selectedParamId);

  const handleAddMeasurement = async () => {
    if (!selectedParamId || !newValues) return;

    const values = newValues.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));

    if (values.length === 0) return;

    addMeasurement.mutate({
      parameter_id: selectedParamId,
      job_id: jobId,
      values,
      notes: notes || undefined
    }, {
      onSuccess: () => {
        setNewValues('');
        setNotes('');
      }
    });
  };

  if (loadingParams) {
    return <div className="space-y-4 py-4"><Skeleton className="h-20 w-full" /><Skeleton className="h-40 w-full" /></div>;
  }

  if (parameters.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed rounded-xl space-y-3">
        <Activity className="h-12 w-12 text-muted-foreground mx-auto opacity-50" />
        <div className="space-y-1">
          <p className="font-medium">Nenhum parâmetro de qualidade configurado</p>
          <p className="text-xs text-muted-foreground max-w-[250px] mx-auto">
            Não existem parâmetros SPC (Controle Estatístico de Processo) definidos para esta técnica ou máquina.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4">
      {/* Parameter Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
            <Target className="h-4 w-4" /> Parâmetros de Controle
          </h4>
          <div className="space-y-2">
            {parameters.map(param => (
              <div
                key={param.id}
                role="button"
                tabIndex={0}
                aria-label={`Selecionar parâmetro ${param.name}`}
                onClick={() => setSelectedParamId(param.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedParamId(param.id); } }}
                className={cn(
                  "p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  selectedParamId === param.id
                    ? "bg-primary/10 border-primary shadow-sm"
                    : "bg-secondary/30 border-border/50 hover:bg-secondary/50"
                )}
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate">{param.name}</p>
                  <p className="text-[10px] text-muted-foreground">Freq: {param.frequency_minutes} min | Alvo: {param.target_value}{param.unit}</p>
                </div>
                <ChevronRight className={cn("h-4 w-4 transition-transform", selectedParamId === param.id && "rotate-90 text-primary")} />
              </div>
            ))}
          </div>
        </section>

        {/* New Measurement Form */}
        <section className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
            <Plus className="h-4 w-4" /> Nova Inspeção
          </h4>
          <Card className="border-border/50 bg-secondary/10 shadow-none">
            <CardContent className="p-4 space-y-4">
              {!selectedParamId ? (
                <p className="text-xs text-muted-foreground text-center py-6 italic">Selecione um parâmetro para registrar medições</p>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="values" className="text-xs">Valores (separados por vírgula)</Label>
                    <Input
                      id="values"
                      placeholder={`Ex: 10.5, 10.2, 10.8 (Tam. Amostra: ${selectedParam?.sample_size})`}
                      value={newValues}
                      onChange={(e) => setNewValues(e.target.value)}
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes" className="text-xs">Observações</Label>
                    <Input
                      id="notes"
                      placeholder="Alguma anomalia observada?"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="bg-background"
                    />
                  </div>
                  <Button
                    className="w-full h-8 text-xs font-bold uppercase tracking-wider"
                    onClick={handleAddMeasurement}
                    disabled={!newValues || addMeasurement.isPending}
                  >
                    {addMeasurement.isPending ? 'Salvando...' : 'Registrar Medição'}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </section>
      </div>

      {/* Recent Measurements for selected parameter */}
      {selectedParamId && (
        <section className="space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
              <History className="h-4 w-4" /> Histórico de Inspeções: {selectedParam?.name}
            </h4>
            {selectedParam && (
              <div className="flex gap-2">
                <Badge variant="outline" className="text-[10px] bg-blue-500/5 border-blue-500/20 text-blue-400">
                  LSL: {selectedParam.lower_spec_limit}
                </Badge>
                <Badge variant="outline" className="text-[10px] bg-blue-500/5 border-blue-500/20 text-blue-400">
                  USL: {selectedParam.upper_spec_limit}
                </Badge>
              </div>
            )}
          </div>

          <ScrollArea className="h-[250px] pr-4">
            {loadingMeasurements ? (
              <div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
            ) : !measurements || measurements.length === 0 ? (
              <p className="text-xs text-muted-foreground py-8 text-center border border-dashed rounded-lg">Nenhuma medição registrada para este job.</p>
            ) : (
              <div className="space-y-2">
                {measurements.map(m => (
                  <div key={m.id} className="p-3 rounded-lg bg-background border border-border/50 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono font-bold">Média: {m.mean_value.toFixed(3)}</span>
                        <Badge className={cn(
                          "h-4 text-[8px] uppercase px-1",
                          m.is_in_control ? "bg-success/20 text-success border-success/30" : "bg-destructive/20 text-destructive border-destructive/30"
                        )}>
                          {m.is_in_control ? 'Estável' : 'Fora de Controle'}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">
                        Valores: [{m.values.join(', ')}]
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] font-medium">{format(new Date(m.measured_at), 'dd/MM HH:mm')}</p>
                      <p className="text-[10px] text-muted-foreground italic truncate max-w-[100px]">{m.operator_name || 'Operador'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </section>
      )}

      <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
        <div className="flex items-center gap-2 mb-1 text-primary">
          <TrendingUp className="h-4 w-4" />
          <h5 className="text-xs font-bold uppercase tracking-wider">Dashboard de Qualidade (SPC)</h5>
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          O Controle Estatístico de Processo ajuda a identificar desvios na produção antes que gerem refugo. Os dados aqui registrados alimentam os gráficos de capabilidade (Cp/Cpk) disponíveis no menu principal.
        </p>
      </div>
    </div>
  );
}
