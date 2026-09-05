import { Badge } from '@/components/ui/badge';
import { Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Material {
  name: string;
  quantity?: string | null;
  notes?: string | null;
}

interface InventoryItem {
  name: string;
  current_stock: number;
  min_stock_level: number;
  unit: string;
}

interface MaterialCalculatorProps {
  productionQuantity: number;
  setProductionQuantity: (qty: number) => void;
  sheetMaterials: Material[];
  inventoryItems: InventoryItem[];
}

export function MaterialCalculator({
  productionQuantity,
  setProductionQuantity,
  sheetMaterials,
  inventoryItems
}: MaterialCalculatorProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary uppercase tracking-wider">
          <Package className="h-4 w-4" />
          Insumos Necessários
        </div>
        <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
          <span className="text-[10px] font-bold text-primary">CALCULAR PARA:</span>
          <input
            type="number"
            value={productionQuantity}
            onChange={(e) => setProductionQuantity(Number(e.target.value))}
            className="w-16 bg-transparent border-none text-[10px] font-bold text-primary focus:ring-0 p-0 text-center"
          />
          <span className="text-[10px] font-bold text-primary">UNIDADES</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {sheetMaterials.map((mat, idx) => {
          const baseQuantityMatch = mat.quantity?.match(/^(\d+)(\D.*)$/);
          let scaledQuantity = mat.quantity;

          if (baseQuantityMatch) {
            const num = parseFloat(baseQuantityMatch[1]);
            const unit = baseQuantityMatch[2];
            scaledQuantity = `${((num * productionQuantity) / 100).toFixed(2)}${unit}`;
          }

          const inventoryItem = inventoryItems.find(i => i.name.toLowerCase().includes(mat.name.toLowerCase()));
          const isOutOfStock = inventoryItem ? inventoryItem.current_stock <= 0 : false;
          const isLowStock = inventoryItem ? inventoryItem.current_stock <= inventoryItem.min_stock_level : false;

          return (
            <div key={idx} className={cn(
              "flex flex-col p-3 bg-muted/30 rounded-lg border border-border/50 group hover:border-primary/30 transition-colors",
              isOutOfStock && "border-red-500/30 bg-red-500/5",
              isLowStock && !isOutOfStock && "border-warning/30 bg-warning/5"
            )}>
              <div className="flex items-start justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-bold">{mat.name}</span>
                  {mat.notes && (
                    <span className="text-[10px] text-muted-foreground">{mat.notes}</span>
                  )}
                </div>
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-mono text-[10px]">
                  {scaledQuantity}
                </Badge>
              </div>

              {inventoryItem && (
                <div className="mt-2 pt-2 border-t border-border/30 flex items-center justify-between">
                  <span className={cn(
                    "text-[9px] font-black uppercase tracking-tighter",
                    isOutOfStock ? "text-red-500" : isLowStock ? "text-warning" : "text-success"
                  )}>
                    {isOutOfStock ? "SEM ESTOQUE" : isLowStock ? "ESTOQUE CRÍTICO" : "DISPONÍVEL"}
                  </span>
                  <span className="text-[10px] font-bold text-muted-foreground">
                    Saldo: {inventoryItem.current_stock} {inventoryItem.unit}
                  </span>
                </div>
              )}
            </div>
          );
        })}
        {sheetMaterials.length === 0 && (
          <div className="col-span-full py-4 text-center text-xs text-muted-foreground">
            Nenhum insumo cadastrado para esta ficha.
          </div>
        )}
      </div>
    </div>
  );
}
