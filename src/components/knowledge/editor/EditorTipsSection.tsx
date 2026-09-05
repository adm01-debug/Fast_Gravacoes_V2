import { useState } from 'react';
import { Plus, Trash2, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { TechnicalSheetTip } from '@/hooks/useTechnicalSheets';

interface EditorTipsSectionProps {
  tips: TechnicalSheetTip[];
  sheetId: string;
  onAdd: (tip: { technical_sheet_id: string; tip_type: 'tip' | 'warning' | 'important'; content: string }) => Promise<unknown>;
  onDelete: (id: string) => void;
  isAdding: boolean;
}

export function EditorTipsSection({ tips, sheetId, onAdd, onDelete, isAdding }: EditorTipsSectionProps) {
  const [newTip, setNewTip] = useState({ tip_type: 'tip' as 'tip' | 'warning' | 'important', content: '' });

  const handleAdd = async () => {
    if (!newTip.content) return;
    await onAdd({ technical_sheet_id: sheetId, tip_type: newTip.tip_type, content: newTip.content });
    setNewTip({ tip_type: 'tip', content: '' });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-accent-foreground" />
        Dicas e Observações ({tips.length})
      </h3>

      <div className="space-y-2">
        {tips.map(tip => (
          <div key={tip.id} className="p-2 rounded bg-muted/20 flex items-center justify-between gap-2">
            <Badge variant={tip.tip_type === 'warning' ? 'destructive' : tip.tip_type === 'important' ? 'default' : 'secondary'}>
              {tip.tip_type === 'tip' ? '💡 Dica' : tip.tip_type === 'warning' ? '⚠️ Aviso' : '❗ Importante'}
            </Badge>
            <span className="flex-1 text-sm">{tip.content}</span>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remover dica?</AlertDialogTitle>
                  <AlertDialogDescription>Esta dica será removida permanentemente.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(tip.id)}>Remover</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ))}
      </div>

      <div className="p-4 rounded-lg border border-dashed border-border/50 space-y-3">
        <p className="text-xs text-muted-foreground">Adicionar dica/observação:</p>
        <Select value={newTip.tip_type} onValueChange={(v) => setNewTip({...newTip, tip_type: v as 'tip' | 'warning' | 'important'})}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tip">💡 Dica</SelectItem>
            <SelectItem value="warning">⚠️ Aviso</SelectItem>
            <SelectItem value="important">❗ Importante</SelectItem>
          </SelectContent>
        </Select>
        <Textarea placeholder="Conteúdo da dica..." value={newTip.content} onChange={(e) => setNewTip({...newTip, content: e.target.value})} rows={2} />
        <Button size="sm" onClick={handleAdd} disabled={isAdding}>
          <Plus className="h-4 w-4 mr-1" />Adicionar
        </Button>
      </div>
    </div>
  );
}
