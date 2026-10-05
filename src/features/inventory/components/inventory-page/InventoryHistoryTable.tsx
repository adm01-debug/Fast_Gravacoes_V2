import { useState, useMemo } from 'react';
import { subDays, isAfter, parseISO, format } from 'date-fns';
import { AlertTriangle, FileDown, History } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useInventory, useInventoryMovements } from '@/features/inventory';

export function InventoryHistoryTable() {
  const [dateFilter, setDateFilter] = useState<'all' | '24h' | '7d' | '30d'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const { data: movements, isLoading } = useInventoryMovements();
  const { deleteMovement } = useInventory();
  const [rollbackId, setRollbackId] = useState<string | null>(null);

  const filteredMovements = useMemo(() => {
    if (!movements) return [];
    let result = [...movements];

    if (typeFilter !== 'all') {
      result = result.filter(m => m.type === typeFilter);
    }

    if (dateFilter !== 'all') {
      const now = new Date();
      let cutoff = new Date();
      if (dateFilter === '24h') cutoff = subDays(now, 1);
      if (dateFilter === '7d') cutoff = subDays(now, 7);
      if (dateFilter === '30d') cutoff = subDays(now, 30);
      result = result.filter(m => isAfter(parseISO(m.created_at || ''), cutoff));
    }

    return result;
  }, [movements, typeFilter, dateFilter]);

  const handleExportCSV = () => {
    import('@/hooks/utils/inventoryExport').then(module => {
      module.exportInventoryMovementsToCSV(filteredMovements);
    });
  };

  const confirmRollback = async () => {
    if (!rollbackId) return;
    try {
      await deleteMovement(rollbackId);
      setRollbackId(null);
    } catch (error) {
      // Handled by hook
    }
  };

  if (isLoading) return <div className="p-8 text-center"><Skeleton className="h-20 w-full" /></div>;

  return (
    <div className="space-y-4">
      <div className="p-4 border-b border-border/50 flex flex-col sm:flex-row gap-4 items-end bg-muted/20">
        <div className="space-y-1 flex-1">
          <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Período</Label>
          <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as typeof dateFilter)}>
            <SelectTrigger className="bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo o histórico</SelectItem>
              <SelectItem value="24h">Últimas 24h</SelectItem>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 flex-1">
          <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Operação</Label>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="IN">Entradas</SelectItem>
              <SelectItem value="OUT">Saídas</SelectItem>
              <SelectItem value="TRANSFER">Transferências</SelectItem>
              <SelectItem value="ADJUST">Ajustes</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" className="gap-2 h-10 px-4 font-bold border-success/20 text-success hover:bg-success" onClick={handleExportCSV}>
          <FileDown className="h-4 w-4" /> Exportar CSV
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/30 border-b border-border/50">
              <th className="text-left p-4 font-black uppercase tracking-tighter text-muted-foreground">Data/Hora</th>
              <th className="text-left p-4 font-black uppercase tracking-tighter text-muted-foreground">Item</th>
              <th className="text-left p-4 font-black uppercase tracking-tighter text-muted-foreground">Operação</th>
              <th className="text-center p-4 font-black uppercase tracking-tighter text-muted-foreground">Qtd</th>
              <th className="text-left p-4 font-black uppercase tracking-tighter text-muted-foreground">Motivo/Local</th>
              <th className="text-left p-4 font-black uppercase tracking-tighter text-muted-foreground">Usuário</th>
              <th className="text-right p-4 font-black uppercase tracking-tighter text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {filteredMovements.map((m) => (
              <tr key={m.id} className="hover:bg-muted/10 transition-colors group">
                <td className="p-4 font-mono text-muted-foreground">
                  {m.created_at ? format(parseISO(m.created_at), 'dd/MM/yy HH:mm') : '-'}
                </td>
                <td className="p-4 font-bold text-foreground">
                  {m.inventory_items?.name}
                </td>
                <td className="p-4">
                  <Badge variant="outline" className={cn(
                    "text-[9px] font-black uppercase tracking-tighter",
                    m.type === 'IN' ? "text-success border-success/20 bg-success/5" :
                    m.type === 'OUT' ? "text-red-500 border-red-500/20 bg-red-500/5" :
                    m.type === 'TRANSFER' ? "text-blue-500 border-blue-500/20 bg-blue-500/5" :
                    "text-warning border-warning/20 bg-warning/5"
                  )}>
                    {m.type}
                  </Badge>
                </td>
                <td className="p-4 text-center font-black">
                  {m.quantity}
                </td>
                <td className="p-4 text-muted-foreground max-w-[200px] truncate">
                  {m.type === 'TRANSFER' ? `${m.from_location} → ${m.to_location}` : (m.reason || '-')}
                </td>
                <td className="p-4 font-medium italic">
                  {m.profiles?.full_name || 'Sistema'}
                </td>
                <td className="p-4 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setRollbackId(m.id)}
                  >
                    <History className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!rollbackId} onOpenChange={(o) => !o && setRollbackId(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="h-5 w-5" />
              Confirmar Rollback
            </DialogTitle>
            <DialogDescription>
              Esta ação irá desfazer a movimentação selecionada e reajustar o saldo do estoque automaticamente. Deseja continuar?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setRollbackId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmRollback}>Sim, Desfazer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
