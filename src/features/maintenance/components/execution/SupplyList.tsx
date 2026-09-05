import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Package } from 'lucide-react';

interface SupplyItem {
  name: string;
  quantity: string;
  is_checked?: boolean;
  alternative_used?: boolean;
}

interface SupplyListProps {
  supplies: Record<string, SupplyItem>;
  onUpdate: (id: string, updates: Partial<SupplyItem>) => void;
}

export function SupplyList({ supplies, onUpdate }: SupplyListProps) {
  const supplyEntries = Object.entries(supplies);
  if (supplyEntries.length === 0) return null;

  return (
    <div className="p-4 rounded-lg bg-primary/5 border border-primary/10 space-y-3">
      <Label className="text-xs text-primary font-bold uppercase flex items-center gap-1">
        <Package className="h-3 w-3" /> Insumos e Consumíveis Utilizados
      </Label>
      <div className="grid grid-cols-1 gap-2">
        {supplyEntries.map(([id, data]) => (
          <div key={id} className="p-3 bg-background rounded border border-border/50 space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`supply-${id}`}
                  checked={data.is_checked}
                  onCheckedChange={(checked) => onUpdate(id, { is_checked: !!checked })}
                />
                <Label htmlFor={`supply-${id}`} className="text-xs font-medium cursor-pointer">
                  {data.name}
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label className="text-[10px] text-muted-foreground">Qtd:</Label>
                  <Input
                    className="h-7 w-16 text-xs"
                    value={data.quantity}
                    onChange={(e) => onUpdate(id, { quantity: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 pl-6">
              <Checkbox
                id={`alt-${id}`}
                checked={data.alternative_used}
                onCheckedChange={(checked) => onUpdate(id, { alternative_used: !!checked })}
              />
              <Label htmlFor={`alt-${id}`} className="text-[10px] text-muted-foreground cursor-pointer">
                Utilizado Insumo Alternativo
              </Label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
