import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Box, MapPin, Move, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useInventory, type InventoryItem } from '@/features/inventory';

interface WarehouseMapProps {
  items: InventoryItem[];
}

export function WarehouseMap({ items }: WarehouseMapProps) {
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [newLocation, setNewLocation] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const { transferItems, isTransferring: isApiProcessing } = useInventory();

  // Group items by location prefix (e.g., A1, A2 -> Area A)
  const areas = ['A', 'B', 'C', 'D'];
  const levels = [1, 2, 3, 4];

  const getItemsAt = (area: string, level: number) => {
    return items.filter(item => item.location === `${area}${level}`);
  };

  const handleTransferInit = (location: string) => {
    const locationItems = items.filter(item => item.location === location);
    if (locationItems.length === 0) {
      toast.error('Não existem itens nesta posição para transferir');
      return;
    }
    setSelectedLocation(location);
    setIsTransferring(true);
  };

  const validateLocation = (loc: string) => {
    const pattern = /^[A-D][1-4]$/;
    return pattern.test(loc);
  };

  const handleTransferExecute = async () => {
    if (!validateLocation(newLocation)) {
      toast.error('Localização inválida. Use o formato Corredor (A-D) + Nível (1-4). Ex: A2');
      return;
    }

    if (newLocation === selectedLocation) {
      toast.error('O destino não pode ser igual à origem');
      return;
    }

    setIsConfirming(true);
  };

  const confirmTransfer = async () => {
    const locationItems = items.filter(item => item.location === selectedLocation);
    const itemIds = locationItems.map(i => i.id);

    try {
      await transferItems({
        fromLocation: selectedLocation ?? '',
        toLocation: newLocation,
        itemIds
      });
      setIsTransferring(false);
      setIsConfirming(false);
      setNewLocation('');
      setSelectedLocation(null);
    } catch (error) {
      // Error handled by hook
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-sm text-title flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          Mapa do Almoxarifado (WMS)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-4">
          {areas.map(area => (
            <div key={area} className="space-y-4">
              <div className="text-center font-black text-xs text-muted-foreground uppercase border-b border-border/50 pb-1">
                Corredor {area}
              </div>
              <div className="grid grid-rows-4 gap-2">
                {levels.map(level => {
                  const locationItems = getItemsAt(area, level);
                  const isLow = locationItems.some(item => item.current_stock <= item.min_stock_level);

                  return (
                    <TooltipProvider key={`${area}${level}`}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            role="button"
                            tabIndex={0}
                            aria-label={`Localização ${area}${level}`}
                            onClick={() => handleTransferInit(`${area}${level}`)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleTransferInit(`${area}${level}`); } }}
                            className={cn(
                            "h-12 border rounded-md flex items-center justify-center transition-all cursor-pointer relative group active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                            locationItems.length > 0 ? "bg-primary/5 border-primary/20" : "bg-muted/10 border-border/30 opacity-50",
                            isLow && "bg-destructive/10 border-destructive/30"
                          )}>
                            <span className="text-[10px] font-black opacity-20 group-hover:opacity-100 transition-opacity">
                              {area}{level}
                            </span>
                            {locationItems.length > 0 && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Box className={cn(
                                  "h-4 w-4",
                                  isLow ? "text-destructive animate-pulse" : "text-primary/60"
                                )} />
                                <Badge className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-[8px]">
                                  {locationItems.length}
                                </Badge>
                              </div>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <div className="space-y-1">
                            <p className="font-bold text-[10px] uppercase">Posição {area}{level}</p>
                            {locationItems.length > 0 ? (
                              locationItems.map(item => (
                                <div key={item.id} className="flex items-center justify-between gap-4 text-[10px]">
                                  <span>{item.name}</span>
                                  <span className={cn("font-bold", item.current_stock <= item.min_stock_level ? "text-destructive" : "text-success")}>
                                    {item.current_stock} {item.unit}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <p className="text-[10px] italic text-muted-foreground">Vazio</p>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-center gap-6 text-[10px] font-medium uppercase text-muted-foreground">
          <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded bg-primary/10 border border-primary/20" /> Ocupado</div>
          <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded bg-destructive/10 border border-destructive/30" /> Estoque Baixo</div>
          <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded bg-muted/10 border border-border/30" /> Vazio</div>
        </div>
      </CardContent>

      <Dialog open={isTransferring} onOpenChange={(open) => !isApiProcessing && setIsTransferring(open)}>
        <DialogContent className="sm:max-w-[425px] glass-card border-primary/20">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Move className="h-5 w-5 text-primary" />
              Transferência de Localização
            </DialogTitle>
            <DialogDescription>
              Mover itens da posição <Badge variant="outline" className="font-mono">{selectedLocation}</Badge> para uma nova área.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
              <p className="text-[10px] font-black uppercase text-muted-foreground mb-2 tracking-widest">Conteúdo da Posição:</p>
              <div className="space-y-1 max-h-[120px] overflow-y-auto pr-1">
                {items.filter(i => i.location === selectedLocation).map(i => (
                  <div key={i.id} className="text-[11px] flex justify-between py-1 border-b border-border/10 last:border-0">
                    <span className="font-medium truncate mr-2">{i.name}</span>
                    <span className="font-black text-primary flex-shrink-0">{i.current_stock} {i.unit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] uppercase font-black text-muted-foreground">Nova Localização (Ex: A2, B4)</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/50" />
                <Input
                  placeholder="Ex: A2"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value.toUpperCase())}
                  maxLength={2}
                  className="pl-10 font-black tracking-widest text-lg"
                  disabled={isApiProcessing}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              className="w-full gap-2 font-black uppercase text-xs h-11"
              onClick={handleTransferExecute}
              disabled={isApiProcessing || !newLocation}
            >
              {isApiProcessing ? "Processando..." : (
                <>
                  <Move className="h-4 w-4" />
                  Solicitar Transferência
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isConfirming} onOpenChange={setIsConfirming}>
        <DialogContent className="sm:max-w-[350px] border-warning/50 bg-warning/5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-warning">
              <AlertCircle className="h-5 w-5" />
              Confirmar Operação
            </DialogTitle>
            <DialogDescription className="text-foreground">
              Você confirma a transferência de todos os itens da posição <strong>{selectedLocation}</strong> para <strong>{newLocation}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setIsConfirming(false)} disabled={isApiProcessing}>
              Cancelar
            </Button>
            <Button className="flex-1 bg-warning hover:bg-warning text-white" onClick={confirmTransfer} disabled={isApiProcessing}>
              {isApiProcessing ? "Transferindo..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
