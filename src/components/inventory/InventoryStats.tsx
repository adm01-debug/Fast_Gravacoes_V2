import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, AlertTriangle, ArrowLeftRight, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InventoryItem } from '@/features/inventory';

interface InventoryStatsProps {
  items: InventoryItem[];
  lowStockItems: InventoryItem[];
  stats?: { movementsCount24h?: number; inventoryValue?: number } | null;
}

export function InventoryStats({ items, lowStockItems, stats }: InventoryStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card className="glass-card hover:shadow-glow-primary transition-all duration-300">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <Badge variant="outline" className="text-[10px]">TOTAL</Badge>
          </div>
          <p className="text-3xl font-bold">{items.length}</p>
          <p className="text-xs text-muted-foreground uppercase font-semibold tracking-tighter">Itens em Catálogo</p>
        </CardContent>
      </Card>

      <Card className={cn("glass-card border-red-500/20", lowStockItems.length > 0 && "bg-red-500/5 shadow-glow-destructive")}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            {lowStockItems.length > 0 && <Badge variant="destructive" className="animate-pulse">CRÍTICO</Badge>}
          </div>
          <p className="text-3xl font-bold text-red-500">{lowStockItems.length}</p>
          <p className="text-xs text-muted-foreground uppercase font-semibold tracking-tighter">Estoque Baixo</p>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <ArrowLeftRight className="h-5 w-5 text-blue-500" />
            </div>
          </div>
          <p className="text-3xl font-bold">{stats?.movementsCount24h || 0}</p>
          <p className="text-xs text-muted-foreground uppercase font-semibold tracking-tighter">Movimentações (24h)</p>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-warning/10 rounded-lg">
              <TrendingDown className="h-5 w-5 text-warning" />
            </div>
          </div>
          <p className="text-3xl font-bold">R$ {((stats?.inventoryValue || 0) / 1000).toFixed(1)}k</p>
          <p className="text-xs text-muted-foreground uppercase font-semibold tracking-tighter">Valor em Estoque</p>
        </CardContent>
      </Card>
    </div>
  );
}
