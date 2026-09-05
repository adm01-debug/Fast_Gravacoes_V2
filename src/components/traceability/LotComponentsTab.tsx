import { useState } from 'react';
import { format } from 'date-fns';
import { Plus, Layers } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ProductionLot, useTraceabilityMutations, useProductionLots, type LotComponent } from '@/features/inventory';

interface LotComponentsTabProps {
  lot: ProductionLot;
  components: LotComponent[] | undefined;
}

export function LotComponentsTab({ lot, components }: LotComponentsTabProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [newComponent, setNewComponent] = useState({
    component_name: '', quantity_used: 0, unit: 'un',
    component_lot_id: '', supplier: '', batch_number: '', notes: ''
  });
  const { data: allLots } = useProductionLots();
  const { addComponent } = useTraceabilityMutations();

  const handleAdd = () => {
    addComponent.mutate({
      lot_id: lot.id, component_name: newComponent.component_name,
      quantity_used: newComponent.quantity_used, unit: newComponent.unit,
      component_lot_id: newComponent.component_lot_id || undefined,
      supplier: newComponent.supplier || undefined,
      batch_number: newComponent.batch_number || undefined,
      notes: newComponent.notes || undefined
    }, {
      onSuccess: () => {
        setShowAdd(false);
        setNewComponent({ component_name: '', quantity_used: 0, unit: 'un', component_lot_id: '', supplier: '', batch_number: '', notes: '' });
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-medium">Componentes Utilizados</h4>
        <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 mr-1" />Adicionar</Button>
      </div>
      {showAdd && (
        <Card>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do Componente *</Label>
                <Input value={newComponent.component_name} onChange={(e) => setNewComponent(p => ({ ...p, component_name: e.target.value }))} placeholder="Ex: Tinta Azul" />
              </div>
              <div className="space-y-2">
                <Label>Lote do Componente</Label>
                <Select value={newComponent.component_lot_id} onValueChange={(v) => setNewComponent(p => ({ ...p, component_lot_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    {allLots?.filter(l => l.id !== lot.id).map(l => (<SelectItem key={l.id} value={l.id}>{l.lot_number} - {l.product_name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Quantidade *</Label><Input type="number" value={newComponent.quantity_used} onChange={(e) => setNewComponent(p => ({ ...p, quantity_used: parseFloat(e.target.value) || 0 }))} /></div>
              <div className="space-y-2"><Label>Unidade</Label><Input value={newComponent.unit} onChange={(e) => setNewComponent(p => ({ ...p, unit: e.target.value }))} placeholder="un, kg, L" /></div>
              <div className="space-y-2"><Label>Fornecedor</Label><Input value={newComponent.supplier} onChange={(e) => setNewComponent(p => ({ ...p, supplier: e.target.value }))} /></div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button>
              <Button onClick={handleAdd} disabled={addComponent.isPending}>Adicionar</Button>
            </div>
          </CardContent>
        </Card>
      )}
      {components && components.length > 0 ? (
        <Table>
          <TableHeader><TableRow><TableHead>Componente</TableHead><TableHead>Lote</TableHead><TableHead>Quantidade</TableHead><TableHead>Fornecedor</TableHead><TableHead>Data</TableHead></TableRow></TableHeader>
          <TableBody>
            {components.map((comp) => (
              <TableRow key={comp.id}><TableCell>{comp.component_name}</TableCell><TableCell className="font-mono text-sm">{comp.batch_number || '-'}</TableCell><TableCell>{comp.quantity_used} {comp.unit}</TableCell><TableCell>{comp.supplier || '-'}</TableCell><TableCell>{format(new Date(comp.created_at), 'dd/MM HH:mm')}</TableCell></TableRow>
            ))}
          </TableBody>
        </Table>
      ) : !showAdd && (
        <div className="text-center py-8 text-muted-foreground"><Layers className="h-8 w-8 mx-auto mb-2 opacity-50" /><p>Nenhum componente registrado</p></div>
      )}
    </div>
  );
}
