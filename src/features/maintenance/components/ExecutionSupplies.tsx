import { Badge } from '@/components/ui/badge';

interface SupplyUsed {
  name: string;
  quantity: string | number;
  alternative_used?: boolean;
  original_recommended_id?: string;
}

interface TechnicalSheetConsumable {
  id: string;
  name: string;
  quantity: string | number;
}

interface ExecutionSuppliesProps {
  suppliesUsed?: SupplyUsed[];
  technicalSheet?: { consumables?: TechnicalSheetConsumable[] } | null;
}

export function ExecutionSupplies({ suppliesUsed, technicalSheet }: ExecutionSuppliesProps) {
  const hasSupplies = (technicalSheet?.consumables && technicalSheet.consumables.length > 0) || (suppliesUsed && suppliesUsed.length > 0);

  if (!hasSupplies) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {suppliesUsed && suppliesUsed.length > 0 ? (
        suppliesUsed.map((s, idx: number) => (
          <div key={idx} className="flex justify-between items-center p-3 rounded-lg bg-success/5 border border-success/10">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase text-success">Utilizado {s.alternative_used ? '(Alternativo)' : ''}</span>
              <span className="text-sm font-medium">{s.name}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Quantidade</span>
              <span className="text-sm font-bold">{s.quantity}</span>
            </div>
          </div>
        ))
      ) : (
        technicalSheet?.consumables?.map((c) => (
          <div key={c.id} className="flex justify-between items-center p-3 rounded-lg bg-primary/5 border border-primary/10">
            <div className="flex flex-col">
              <span className="text-xs font-bold uppercase text-primary">Insumo Sugerido</span>
              <span className="text-sm font-medium">{c.name}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xs font-bold uppercase text-muted-foreground">Qtd Sugerida</span>
              <span className="text-sm">{c.quantity}</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
