import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { useAuth } from '@/features/auth';
import { Globe, Truck, Package, TrendingDown, Clock } from 'lucide-react';

type InventoryItemRow = Database['public']['Tables']['inventory_items']['Row'];

export function SupplyChainPanel() {
  const { user } = useAuth();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['supply-chain-critical-items'],
    queryFn: async (): Promise<InventoryItemRow[]> => {
      const { data } = await supabase
        .from('inventory_items')
        .select('*')
        .order('current_stock', { ascending: true })
        .limit(3);

      return data || [];
    },
    enabled: Boolean(user?.id),
  });

  // Simulated provider logic based on inventory
  const providers = useMemo(() => items.map(item => ({
    name: `Provedor ${item.name}`,
    status: item.current_stock < item.min_stock_level ? 'reordering' : 'stocked',
    eta: item.current_stock < item.min_stock_level ? '4h' : 'Scheduled',
    location: item.location || 'Central Hub',
    alert: item.current_stock < item.min_stock_level,
    itemName: item.name,
    stock: item.current_stock,
    unit: item.unit
  })), [items]);

  return (
    <Card className="glass-card border-primary/20 bg-primary/5 overflow-hidden">
      <CardHeader className="py-3 border-b border-primary/20 bg-primary/10">
        <CardTitle className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
          <Globe className="h-4 w-4 animate-spin-slow" />
          Logística Real-Time (SCM IA)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-primary/10">
          {isLoading ? (
            <div className="p-4 text-center text-[10px] text-muted-foreground animate-pulse font-bold uppercase">
              Sincronizando Cadeia Global...
            </div>
          ) : providers.map((provider) => (
            <div key={provider.itemName} className="p-3 flex items-start gap-3 hover:bg-primary/5 transition-colors">
              <div className={`mt-1 p-1.5 rounded-lg border text-primary ${provider.alert ? 'bg-warning/10 border-warning/30' : 'bg-background border-primary/10'}`}>
                <Truck className={`h-3 w-3 ${provider.alert ? 'animate-bounce' : ''}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-black uppercase truncate">{provider.itemName}</span>
                  <Badge variant={provider.alert ? "destructive" : "outline"} className="text-[8px] h-4 py-0 border-primary/30">
                    {provider.alert ? `RECOMPRA IA: ${provider.eta}` : 'ESTOQUE OK'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                  <span className="flex items-center gap-1 font-bold">
                    <Package className="h-2.5 w-2.5" /> {provider.stock} {provider.unit}
                  </span>
                  {provider.alert && (
                    <span className="flex items-center gap-1 text-warning font-black animate-pulse">
                      <Clock className="h-2.5 w-2.5" /> EM TRÂNSITO
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="p-3 bg-success/10 border-t border-primary/10">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                 <div className="h-2 w-2 rounded-full bg-success animate-ping" />
                 <span className="text-[9px] font-black text-success uppercase">Resiliência Operacional: 98%</span>
              </div>
              <span className="text-[9px] font-bold text-muted-foreground">
                <TrendingDown className="h-3 w-3 inline mr-1" />
                Otimização Ativa
              </span>
           </div>
        </div>
      </CardContent>
    </Card>
  );
}