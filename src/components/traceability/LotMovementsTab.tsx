import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProductionLot, useTraceabilityMutations, type LotMovement } from '@/features/inventory';
import { LotMovementTimeline } from './LotMovementTimeline';

const MOVEMENT_TYPES: Record<string, string> = {
  production: 'Produção', transfer: 'Transferência', consumption: 'Consumo', adjustment: 'Ajuste', return: 'Devolução',
};

interface LotMovementsTabProps {
  lot: ProductionLot;
  movements: LotMovement[] | undefined;
}

export function LotMovementsTab({ lot, movements }: LotMovementsTabProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [newMovement, setNewMovement] = useState({ movement_type: 'production', quantity: 0, from_location: '', to_location: '', reason: '' });
  const { addMovement } = useTraceabilityMutations();

  const handleAdd = () => {
    addMovement.mutate({
      lot_id: lot.id, movement_type: newMovement.movement_type, quantity: newMovement.quantity,
      from_location: newMovement.from_location || undefined, to_location: newMovement.to_location || undefined, reason: newMovement.reason || undefined
    }, { onSuccess: () => { setShowAdd(false); setNewMovement({ movement_type: 'production', quantity: 0, from_location: '', to_location: '', reason: '' }); } });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-medium">Histórico de Movimentações</h4>
        <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 mr-1" />Registrar</Button>
      </div>
      {showAdd && (
        <Card>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select value={newMovement.movement_type} onValueChange={(v) => setNewMovement(p => ({ ...p, movement_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(MOVEMENT_TYPES).map(([key, label]) => (<SelectItem key={key} value={key}>{label}</SelectItem>))}</SelectContent></Select>
              </div>
              <div className="space-y-2"><Label>Quantidade *</Label><Input type="number" value={newMovement.quantity} onChange={(e) => setNewMovement(p => ({ ...p, quantity: parseInt(e.target.value, 10) || 0 }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Origem</Label><Input value={newMovement.from_location} onChange={(e) => setNewMovement(p => ({ ...p, from_location: e.target.value }))} placeholder="Local de origem" /></div>
              <div className="space-y-2"><Label>Destino</Label><Input value={newMovement.to_location} onChange={(e) => setNewMovement(p => ({ ...p, to_location: e.target.value }))} placeholder="Local de destino" /></div>
            </div>
            <div className="space-y-2"><Label>Motivo</Label><Textarea value={newMovement.reason} onChange={(e) => setNewMovement(p => ({ ...p, reason: e.target.value }))} rows={2} /></div>
            <div className="flex gap-2"><Button variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button><Button onClick={handleAdd} disabled={addMovement.isPending}>Registrar</Button></div>
          </CardContent>
        </Card>
      )}
      <LotMovementTimeline movements={movements || []} />
    </div>
  );
}
