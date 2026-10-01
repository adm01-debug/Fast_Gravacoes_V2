import { useState, useMemo } from 'react';
import { addDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowUpRight, ArrowDownRight, Map, QrCode, Timer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PermissionGate } from '@/features/auth';
import { QRLabelModal } from '@/components/inventory/QRLabelModal';
import { InventoryItem, InventoryMovement } from '@/features/inventory';

export function InventoryCard({
  item,
  onMovement,
  isSelected,
  onSelect
}: {
  item: InventoryItem,
  onMovement: (data: Omit<InventoryMovement, 'id' | 'created_at' | 'user_id'>) => Promise<unknown>,
  isSelected: boolean,
  onSelect: (id: string, checked: boolean) => void
}) {
  const isLowStock = item.current_stock <= item.min_stock_level;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [movementType, setMovementType] = useState<'IN' | 'OUT'>('IN');

  const [quantity, setQuantity] = useState('1');

  const handleRecord = async () => {
    if (movementType === 'OUT' && Number(quantity) > item.current_stock) {
      toast.error('Saldo insuficiente para realizar a saída');
      return;
    }

    await onMovement({
      item_id: item.id,
      type: movementType,
      quantity: Number(quantity),
      reason: movementType === 'IN' ? 'Reposição' : 'Saída para produção',
      from_location: null,
      to_location: null,
      job_id: null,
    });
    setIsModalOpen(false);
  };

  const depletionDate = useMemo(() => {
    if (!item.days_of_supply) return null;
    return addDays(new Date(), item.days_of_supply);
  }, [item.days_of_supply]);

  return (
    <Card className={cn(
      "glass-card hover:border-primary/30 transition-all overflow-hidden hover:shadow-glow-primary group",
      isLowStock && "border-red-500/30"
    )}>
      <CardHeader className="pb-3 border-b border-border/50 bg-muted/20 relative">
        <div className="absolute top-3 left-3 z-10" role="presentation" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelect(item.id, !!checked)}
            className="h-4 w-4 bg-background data-[state=checked]:bg-primary"
          />
        </div>
        <div className="flex justify-between items-start pl-7">

          <Badge variant="outline" className="text-[9px] uppercase font-black border-primary/20">
            {item.category}
          </Badge>
          <div className="flex gap-1">
            {item.location && (
              <Badge variant="secondary" className="text-[9px] font-black h-5 flex items-center gap-1">
                <Map className="h-2 w-2" /> {item.location}
              </Badge>
            )}
            {isLowStock && (
              <Badge variant="destructive" className="text-[9px] font-black h-5 animate-pulse">ESTOQUE BAIXO</Badge>
            )}
          </div>
        </div>
        <div className="flex justify-between items-center mt-2">
          <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors">{item.name}</CardTitle>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => setIsQRModalOpen(true)}>
            <QrCode className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-1">{item.specification || 'Sem especificação'}</p>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Saldo Atual</p>
            <p className="text-3xl font-black text-foreground">
              {item.current_stock} <span className="text-sm font-bold text-muted-foreground uppercase">{item.unit}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Previsão AI</p>
            {item.days_of_supply !== undefined ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={cn(
                      "flex items-center gap-1 text-xs font-bold",
                      item.days_of_supply < 7 ? "text-primary" : "text-success"
                    )}>
                      <Timer className="h-3 w-3" />
                      {item.days_of_supply} dias
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-[10px]">Esgotamento previsto para:</p>
                    <p className="font-bold">{depletionDate ? format(depletionDate, "dd 'de' MMMM", { locale: ptBR }) : '---'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <p className="text-xs font-bold text-muted-foreground">Calculando...</p>
            )}
          </div>
        </div>

        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-all",
              isLowStock ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" : "bg-primary shadow-glow-primary"
            )}
            style={{ width: `${Math.min(100, (item.current_stock / (item.min_stock_level * 3)) * 100)}%` }}
          />
        </div>

        <div className="flex gap-2">
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="flex-1 text-xs gap-1.5 hover:bg-success/10 hover:text-success hover:border-success/50" onClick={() => setMovementType('IN')}>
                <ArrowUpRight className="h-3 w-3" /> Entrada
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Registrar Movimentação: {item.name}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={movementType} onValueChange={(v: 'IN' | 'OUT') => setMovementType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IN">Entrada (Reposição)</SelectItem>
                      <SelectItem value="OUT">Saída (Consumo)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Quantidade ({item.unit})</Label>
                  <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                </div>
              </div>
              <Button onClick={handleRecord} className="w-full">Confirmar Movimentação</Button>
            </DialogContent>
          </Dialog>

          <PermissionGate permission="inventory:adjust">
            <Button variant="outline" size="sm" className="flex-1 text-xs gap-1.5 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/50" onClick={() => { setMovementType('OUT'); setIsModalOpen(true); }}>
              <ArrowDownRight className="h-3 w-3" /> Saída
            </Button>
          </PermissionGate>
        </div>
      </CardContent>

      <QRLabelModal
        open={isQRModalOpen}
        onOpenChange={setIsQRModalOpen}
        item={item}
      />
    </Card>
  );
}

// Extracted to @/components/inventory/QRLabelModal
