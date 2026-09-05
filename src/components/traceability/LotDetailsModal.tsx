import { format } from 'date-fns';
import { parseDateOnly } from '@/lib/dateUtils';
import { Package, ArrowRightLeft } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Layers, ClipboardCheck } from 'lucide-react';
import { ProductionLot, useLotComponents, useLotMovements, useLotInspections, useTraceabilityMutations } from '@/features/inventory';
import { QualityDashboardCards } from './QualityDashboardCards';
import { LotComponentsTab } from './LotComponentsTab';
import { LotMovementsTab } from './LotMovementsTab';
import { LotInspectionsTab } from './LotInspectionsTab';
import { toast } from 'sonner';
import { ProductionPhotos } from '@/components/production/ProductionPhotos';
import { useJobs } from '@/features/jobs';

interface LotDetailsModalProps {
  lot: ProductionLot;
  open: boolean;
  onClose: () => void;
}

const STATUS_OPTIONS: Record<string, { label: string; targets: string[] }> = {
  active: { label: 'Ativo', targets: ['consumed', 'quarantine', 'blocked'] },
  quarantine: { label: 'Quarentena', targets: ['active', 'blocked'] },
  blocked: { label: 'Bloqueado', targets: ['quarantine', 'active'] },
  consumed: { label: 'Consumido', targets: [] },
  expired: { label: 'Expirado', targets: ['blocked'] },
};

export default function LotDetailsModal({ lot, open, onClose }: LotDetailsModalProps) {
  const { data: components } = useLotComponents(lot.id);
  const { data: movements } = useLotMovements(lot.id);
  const { data: inspections } = useLotInspections(lot.id);
  const { updateLot } = useTraceabilityMutations();
  const { data: jobs } = useJobs();

  const job = jobs?.find(j => j.id === lot.job_id);
  const allPhotos = [
    ...(job?.production_photos || []),
    ...(inspections?.flatMap(i => i.photos || []) || [])
  ];

  const progressPct = lot.quantity > 0 ? (lot.produced_quantity / lot.quantity * 100) : 0;
  const statusConfig = STATUS_OPTIONS[lot.status];
  const canTransition = statusConfig?.targets?.length > 0;

  const handleStatusChange = (newStatus: string) => {
    updateLot.mutate({ id: lot.id, status: newStatus }, {
      onSuccess: () => toast.success(`Status alterado para ${STATUS_OPTIONS[newStatus]?.label || newStatus}`),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" aria-describedby="lot-details-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Package className="h-5 w-5" />Lote: {lot.lot_number}</DialogTitle>
          <DialogDescription id="lot-details-description">{lot.product_name} — {lot.produced_quantity}/{lot.quantity} unidades</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">Status</p><div className="flex items-center gap-2 mt-1"><Badge>{STATUS_OPTIONS[lot.status]?.label || lot.status}</Badge>{canTransition && (<Select onValueChange={handleStatusChange}><SelectTrigger className="h-6 w-6 p-0 border-0"><ArrowRightLeft className="h-3.5 w-3.5 text-muted-foreground" /></SelectTrigger><SelectContent>{statusConfig.targets.map(s => (<SelectItem key={s} value={s}>{STATUS_OPTIONS[s]?.label || s}</SelectItem>))}</SelectContent></Select>)}</div></CardContent></Card>
          <Card><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">Progresso</p><div className="mt-1"><span className="text-sm font-medium">{progressPct.toFixed(0)}%</span><Progress value={progressPct} className="h-1.5 mt-1" /></div></CardContent></Card>
          <Card><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">Data Produção</p><p className="font-medium text-sm mt-1">{format(parseDateOnly(lot.production_date) ?? new Date(), 'dd/MM/yyyy')}</p></CardContent></Card>
          <Card><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">Validade</p><p className="font-medium text-sm mt-1">{lot.expiration_date ? format(parseDateOnly(lot.expiration_date) ?? new Date(), 'dd/MM/yyyy') : 'N/A'}</p></CardContent></Card>
        </div>

        {inspections && inspections.length > 0 && <QualityDashboardCards inspections={inspections} />}

        <Tabs defaultValue="components">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="components"><Layers className="h-3.5 w-3.5 mr-1" />Componentes ({components?.length || 0})</TabsTrigger>
            <TabsTrigger value="movements"><ArrowRightLeft className="h-3.5 w-3.5 mr-1" />Movimentações ({movements?.length || 0})</TabsTrigger>
            <TabsTrigger value="inspections"><ClipboardCheck className="h-3.5 w-3.5 mr-1" />Inspeções ({inspections?.length || 0})</TabsTrigger>
            <TabsTrigger value="photos">Evidências</TabsTrigger>
          </TabsList>
          <TabsContent value="components"><LotComponentsTab lot={lot} components={components} /></TabsContent>
          <TabsContent value="movements"><LotMovementsTab lot={lot} movements={movements} /></TabsContent>
          <TabsContent value="inspections"><LotInspectionsTab lot={lot} inspections={inspections} /></TabsContent>
          <TabsContent value="photos">
            <div className="p-4">
              <ProductionPhotos photos={allPhotos} jobId={lot.job_id || undefined} />
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
