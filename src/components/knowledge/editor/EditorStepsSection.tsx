import { useState } from 'react';
import { Plus, Trash2, ListOrdered } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { TechnicalSheetStep } from '@/hooks/useTechnicalSheets';

interface EditorStepsSectionProps {
  steps: TechnicalSheetStep[];
  sheetId: string;
  onAddStep: (step: { technical_sheet_id: string; step_number: number; title: string; description: string; tips?: string; warnings?: string }) => Promise<unknown>;
  onDeleteStep: (id: string) => void;
  isAdding: boolean;
}

export function EditorStepsSection({ steps, sheetId, onAddStep, onDeleteStep, isAdding }: EditorStepsSectionProps) {
  const [newStep, setNewStep] = useState({ title: '', description: '', tips: '', warnings: '' });

  const handleAdd = async () => {
    if (!newStep.title || !newStep.description) return;
    await onAddStep({
      technical_sheet_id: sheetId,
      step_number: steps.length + 1,
      title: newStep.title,
      description: newStep.description,
      tips: newStep.tips || undefined,
      warnings: newStep.warnings || undefined,
    });
    setNewStep({ title: '', description: '', tips: '', warnings: '' });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <ListOrdered className="h-4 w-4 text-primary" />
        Passos do Processo ({steps.length})
      </h3>

      {steps.map((step) => (
        <div key={step.id} className="p-3 rounded-lg bg-muted/20 border border-border/30 flex items-start gap-2">
          <Badge className="mt-1">{step.step_number}</Badge>
          <div className="flex-1">
            <p className="font-medium text-sm">{step.title}</p>
            <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remover passo?</AlertDialogTitle>
                <AlertDialogDescription>O passo "{step.title}" será removido permanentemente.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDeleteStep(step.id)}>Remover</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ))}

      <div className="p-4 rounded-lg border border-dashed border-border/50 space-y-3">
        <p className="text-xs text-muted-foreground">Adicionar novo passo:</p>
        <Input placeholder="Título do passo" value={newStep.title} onChange={(e) => setNewStep({...newStep, title: e.target.value})} />
        <Textarea placeholder="Descrição detalhada..." value={newStep.description} onChange={(e) => setNewStep({...newStep, description: e.target.value})} rows={2} />
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Dica (opcional)" value={newStep.tips} onChange={(e) => setNewStep({...newStep, tips: e.target.value})} />
          <Input placeholder="Aviso (opcional)" value={newStep.warnings} onChange={(e) => setNewStep({...newStep, warnings: e.target.value})} />
        </div>
        <Button size="sm" onClick={handleAdd} disabled={isAdding}>
          <Plus className="h-4 w-4 mr-1" />Adicionar Passo
        </Button>
      </div>
    </div>
  );
}
