import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export interface NewLotState {
  lot_number: string;
  product_name: string;
  quantity: number;
  job_id: string;
  production_date: string;
  expiration_date: string;
  notes: string;
}

interface CreateLotModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newLot: NewLotState;
  setNewLot: React.Dispatch<React.SetStateAction<NewLotState>>;
  jobs: Array<{ id: string; order_number: string; client: string }> | undefined;
  onCreateLot: () => void;
  isPending: boolean;
}

export function CreateLotModal({ open, onOpenChange, newLot, setNewLot, jobs, onCreateLot, isPending }: CreateLotModalProps) {
  const generateLotNumber = () => {
    const date = format(new Date(), 'yyyyMMdd');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `LOT-${date}-${random}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Criar Novo Lote</DialogTitle>
          <DialogDescription>Registre um novo lote de produção</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 space-y-2">
              <Label>Número do Lote *</Label>
              <Input value={newLot.lot_number} onChange={(e) => setNewLot((prev: NewLotState) => ({ ...prev, lot_number: e.target.value }))} placeholder="LOT-20251220-XXXX" />
            </div>
            <Button type="button" variant="outline" className="mt-8" onClick={() => setNewLot((prev: NewLotState) => ({ ...prev, lot_number: generateLotNumber() }))}>Gerar</Button>
          </div>
          <div className="space-y-2">
            <Label>Nome do Produto *</Label>
            <Input value={newLot.product_name} onChange={(e) => setNewLot((prev: NewLotState) => ({ ...prev, product_name: e.target.value }))} placeholder="Nome do produto" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Quantidade *</Label>
              <Input type="number" value={newLot.quantity} onChange={(e) => setNewLot((prev: NewLotState) => ({ ...prev, quantity: parseInt(e.target.value, 10) || 0 }))} />
            </div>
            <div className="space-y-2">
              <Label>Data de Produção</Label>
              <Input type="date" value={newLot.production_date} onChange={(e) => setNewLot((prev: NewLotState) => ({ ...prev, production_date: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Job Relacionado (opcional)</Label>
            <Select value={newLot.job_id} onValueChange={(v) => setNewLot((prev: NewLotState) => ({ ...prev, job_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Selecione um job" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Nenhum</SelectItem>
                {jobs?.map(job => (<SelectItem key={job.id} value={job.id}>{job.order_number} - {job.client}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Data de Validade (opcional)</Label>
            <Input type="date" value={newLot.expiration_date} onChange={(e) => setNewLot((prev: NewLotState) => ({ ...prev, expiration_date: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea value={newLot.notes} onChange={(e) => setNewLot((prev: NewLotState) => ({ ...prev, notes: e.target.value }))} placeholder="Observações sobre o lote..." rows={2} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={onCreateLot} disabled={isPending}>Criar Lote</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
