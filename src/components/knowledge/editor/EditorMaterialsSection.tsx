import { useState } from 'react';
import { Plus, X, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { TechnicalSheetMaterial } from '@/hooks/useTechnicalSheets';

interface EditorMaterialsSectionProps {
  materials: TechnicalSheetMaterial[];
  sheetId: string;
  onAdd: (m: { technical_sheet_id: string; name: string; specification?: string; quantity?: string; notes?: string }) => Promise<unknown>;
  onDelete: (id: string) => void;
  isAdding: boolean;
}

export function EditorMaterialsSection({ materials, sheetId, onAdd, onDelete, isAdding }: EditorMaterialsSectionProps) {
  const [newMaterial, setNewMaterial] = useState({ name: '', specification: '', quantity: '', notes: '' });

  const handleAdd = async () => {
    if (!newMaterial.name) return;
    await onAdd({
      technical_sheet_id: sheetId,
      name: newMaterial.name,
      specification: newMaterial.specification || undefined,
      quantity: newMaterial.quantity || undefined,
      notes: newMaterial.notes || undefined,
    });
    setNewMaterial({ name: '', specification: '', quantity: '', notes: '' });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Package className="h-4 w-4 text-primary" />
        Materiais e Insumos ({materials.length})
      </h3>

      <div className="flex flex-wrap gap-2">
        {materials.map(m => (
          <Badge key={m.id} variant="secondary" className="gap-1">
            {m.name}
            {m.quantity && <span className="text-muted-foreground">({m.quantity})</span>}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remover material?</AlertDialogTitle>
                  <AlertDialogDescription>O material "{m.name}" será removido da ficha.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(m.id)}>Remover</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </Badge>
        ))}
      </div>

      <div className="p-4 rounded-lg border border-dashed border-border/50 space-y-3">
        <p className="text-xs text-muted-foreground">Adicionar material:</p>
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Nome do material" value={newMaterial.name} onChange={(e) => setNewMaterial({...newMaterial, name: e.target.value})} />
          <Input placeholder="Quantidade" value={newMaterial.quantity} onChange={(e) => setNewMaterial({...newMaterial, quantity: e.target.value})} />
        </div>
        <Button size="sm" onClick={handleAdd} disabled={isAdding}>
          <Plus className="h-4 w-4 mr-1" />Adicionar Material
        </Button>
      </div>
    </div>
  );
}
