import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth';
import { ClipboardCheck, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface PreProductionChecklistProps {
  jobId: string;
  onComplete?: () => void;
  onSkip?: () => void;
}

interface ChecklistState {
  material_verified: boolean;
  color_verified: boolean;
  machine_clean: boolean;
  tools_ready: boolean;
  notes: string;
}

const checklistItems = [
  { key: 'material_verified' as const, label: 'Material correto verificado', description: 'Confirme que o material está de acordo com a ficha técnica' },
  { key: 'color_verified' as const, label: 'Cor/gravura verificada', description: 'Confirme a cor, arte e posicionamento da gravação' },
  { key: 'machine_clean' as const, label: 'Máquina limpa e preparada', description: 'Equipamento higienizado e pronto para produção' },
  { key: 'tools_ready' as const, label: 'Ferramentas e insumos prontos', description: 'Todos os acessórios e insumos necessários à mão' },
];

export function PreProductionChecklist({ jobId, onComplete, onSkip }: PreProductionChecklistProps) {
  const { user, profile } = useAuth();
  const [state, setState] = useState<ChecklistState>({
    material_verified: false,
    color_verified: false,
    machine_clean: false,
    tools_ready: false,
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingChecklist, setExistingChecklist] = useState<boolean>(false);

  // Check if checklist already exists
  useEffect(() => {
    async function check() {
      const { data } = await supabase
        .from('pre_production_checklists')
        .select('id')
        .eq('job_id', jobId)
        .maybeSingle();
      if (data) setExistingChecklist(true);
    }
    check();
  }, [jobId]);

  const allChecked = checklistItems.every(item => state[item.key]);

  const handleSubmit = async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('pre_production_checklists')
        .insert({
          job_id: jobId,
          checked_by: user.id,
          checked_by_name: profile?.full_name || 'Operador',
          ...state,
          completed_at: allChecked ? new Date().toISOString() : null,
        });
      if (error) throw error;
      toast.success('Checklist salvo com sucesso!');
      onComplete?.();
    } catch (err) {
      toast.error('Erro ao salvar checklist');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (existingChecklist) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/30">
        <CheckCircle2 className="h-4 w-4 text-success" />
        <span className="text-sm text-success">Checklist pré-produção concluído</span>
      </div>
    );
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          Checklist Pré-Produção
          {!allChecked && (
            <Badge variant="outline" className="text-xs border-warning/50 text-warning ml-auto">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Pendente
            </Badge>
          )}
          {allChecked && (
            <Badge className="text-xs bg-success/20 text-success border-success/50 ml-auto">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Pronto
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {checklistItems.map(item => (
          <label
            key={item.key}
            htmlFor={`checklist-${item.key}`}
            className={cn(
              'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all',
              state[item.key]
                ? 'bg-success/5 border-success/30'
                : 'bg-background/50 border-border hover:border-primary/30'
            )}
          >
            <Checkbox
              id={`checklist-${item.key}`}
              checked={state[item.key]}
              onCheckedChange={(checked) => setState(prev => ({ ...prev, [item.key]: !!checked }))}
              className="mt-0.5"
              aria-label={item.label}
            />
            <div>
              <p className={cn('text-sm font-medium', state[item.key] && 'text-success')}>
                {item.label}
              </p>
              <p className="text-xs text-muted-foreground">{item.description}</p>
            </div>
          </label>
        ))}

        <Textarea
          placeholder="Observações (opcional)..."
          value={state.notes}
          onChange={(e) => setState(prev => ({ ...prev, notes: e.target.value }))}
          className="h-16 text-sm"
        />

        <div className="flex gap-2">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 gradient-primary"
          >
            <ClipboardCheck className="h-4 w-4 mr-2" />
            {allChecked ? 'Confirmar Checklist' : 'Salvar Parcial'}
          </Button>
          {onSkip && (
            <Button variant="ghost" onClick={onSkip} className="text-muted-foreground">
              Pular
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
