import { Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ExecutiveGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tempGoal: string;
  onTempGoalChange: (value: string) => void;
  onSave: () => void;
}

export function ExecutiveGoalDialog({ open, onOpenChange, tempGoal, onTempGoalChange, onSave }: ExecutiveGoalDialogProps) {
  return (
    <>
<Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Configuração de Metas Executivas
              </DialogTitle>
              <CardDescription>Defina as metas estratégicas para o dashboard consolidado.</CardDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="goal" className="text-right">Meta OEE (%)</Label>
                <Input
                  id="goal"
                  value={tempGoal}
                  onChange={(e) => onTempGoalChange(e.target.value)}
                  className="col-span-3"
                  type="number"
                  min="0"
                  max="100"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={onSave}>Salvar Alterações</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </>
  );
}
