import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2 } from 'lucide-react';

interface ReplacementPartsProps {
  parts: Array<{ _key: string; name: string; code: string; quantity: number }>;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, field: keyof { name: string; code: string; quantity: number }, value: string | number) => void;
}

export function ReplacementParts({
  parts,
  onAdd,
  onRemove,
  onUpdate
}: ReplacementPartsProps) {
  return (
    <div className="space-y-4 pt-4 border-t border-border/50">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Plus className="h-5 w-5 text-primary" />
          Peças Trocadas
        </h3>
        <Button variant="outline" size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4 mr-1" /> Adicionar Peça
        </Button>
      </div>
      <div className="space-y-3">
        {parts.map((part, index) => (
          <div key={part._key} className="grid grid-cols-1 sm:grid-cols-4 gap-2 p-3 border rounded-lg bg-secondary/10">
            <Input
              placeholder="Nome da Peça"
              value={part.name}
              onChange={(e) => onUpdate(index, 'name', e.target.value)}
              className="sm:col-span-2"
            />
            <Input
              type="number"
              placeholder="Qtd"
              value={part.quantity}
              onChange={(e) => onUpdate(index, 'quantity', parseFloat(e.target.value) || 1)}
            />
            <Button variant="ghost" size="icon" className="text-destructive self-end" onClick={() => onRemove(index)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {parts.length === 0 && (
          <p className="text-sm text-muted-foreground italic">Nenhuma peça registrada.</p>
        )}
      </div>
    </div>
  );
}
