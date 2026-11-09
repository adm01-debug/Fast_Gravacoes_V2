import { useInventory } from '@/features/inventory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function InventoryAlertsWidget() {
  const { items, isLoading } = useInventory();
  const navigate = useNavigate();

  const lowStockItems = items.filter(item => item.current_stock <= item.min_stock_level);

  if (isLoading) return null;
  if (lowStockItems.length === 0) return null;

  return (
    <Card className="glass-card border-red-500/20 overflow-hidden">
      <CardHeader className="pb-3 bg-red-500/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-red-700">Atenção ao Estoque</CardTitle>
          </div>
          <Badge variant="destructive" className="animate-pulse h-5 text-[10px]">
            {lowStockItems.length} ALERTAS
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border/30">
          {lowStockItems.slice(0, 3).map((item) => (
            <div key={item.id} className="p-3 flex items-center justify-between hover:bg-muted/10 transition-colors">
              <div className="min-w-0">
                <p className="text-xs font-bold truncate">{item.name}</p>
                <p className="text-[10px] text-muted-foreground uppercase">{item.category}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-black text-red-500">{item.current_stock} {item.unit}</p>
                <p className="text-[9px] text-muted-foreground">Mín: {item.min_stock_level}</p>
              </div>
            </div>
          ))}
        </div>
        <Button
          variant="ghost"
          className="w-full h-9 text-[10px] uppercase font-bold text-muted-foreground hover:text-primary rounded-none border-t border-border/30"
          onClick={() => navigate('/inventory')}
        >
          Gerenciar Estoque <ArrowRight className="ml-1 h-3 w-3" />
        </Button>
      </CardContent>
    </Card>
  );
}
