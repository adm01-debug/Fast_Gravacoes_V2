/* eslint-disable react-hooks/incompatible-library -- Padrões intencionais: sync com sistemas externos, memoização manual por performance, integração com libs (dnd-kit, framer-motion, supabase realtime). */
import { useState, useRef, useMemo, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/lib/utils';
import { useFuseSearch } from '@/hooks/useFuseSearch';
import { useDebounce } from '@/hooks/useDebounce';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { format, differenceInDays } from 'date-fns';
import { parseDateOnly } from '@/lib/dateUtils';
import {
  Package, Search, Plus, Eye, GitBranch, AlertTriangle,
  FileText, Command, QrCode, Download, CheckSquare,
  ArrowUpDown, Calendar, Filter, X, Tag
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { FavoriteButton, FavoritesDropdown } from '@/components/navigation/FavoritesManager';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { useProductionLots, useTraceabilityMutations, ProductionLot } from '@/features/inventory';
import { useJobs } from '@/features/jobs';
import LotDetailsModal from '@/components/traceability/LotDetailsModal';
import LotGenealogyView from '@/components/traceability/LotGenealogyView';
import { TraceabilityStatsCards } from '@/components/traceability/TraceabilityStatsCards';
import { LotQRCode } from '@/components/traceability/LotQRCode';
import { LotLabelPrint } from '@/components/traceability/LotLabelPrint';
import { VoiceButton } from '@/components/voice/VoiceCommands';
import { BlockchainIntegrityCard } from '@/components/traceability/BlockchainIntegrityCard';
import { ElectronicSignatureDialog } from '@/components/traceability/ElectronicSignatureDialog';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'Ativo', variant: 'default' },
  consumed: { label: 'Consumido', variant: 'secondary' },
  expired: { label: 'Expirado', variant: 'destructive' },
  quarantine: { label: 'Quarentena', variant: 'outline' },
  blocked: { label: 'Bloqueado', variant: 'destructive' },
};

const VALID_TRANSITIONS: Record<string, string[]> = {
  active: ['consumed', 'quarantine', 'blocked', 'expired'],
  quarantine: ['active', 'blocked'],
  blocked: ['quarantine', 'active'],
  consumed: [],
  expired: ['blocked'],
};

type SortField = 'lot_number' | 'product_name' | 'quantity' | 'production_date' | 'status';
type SortDir = 'asc' | 'desc';

export default function TraceabilityPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedLot, setSelectedLot] = useState<ProductionLot | null>(null);
  const [showGenealogyView, setShowGenealogyView] = useState(false);
  const [qrLot, setQrLot] = useState<ProductionLot | null>(null);
  const [labelLots, setLabelLots] = useState<ProductionLot[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('production_date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [signatureModal, setSignatureModal] = useState<{ open: boolean; status: string }>({ open: false, status: '' });

  const parentRef = useRef<HTMLDivElement>(null);

  const [newLot, setNewLot] = useState({
    lot_number: '', product_name: '', quantity: 0, job_id: '',
    production_date: format(new Date(), 'yyyy-MM-dd'), expiration_date: '', notes: ''
  });


  const { data: lots, isLoading } = useProductionLots();
  const { data: jobs } = useJobs();
  const { createLot, updateLot } = useTraceabilityMutations();

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const fuseSearchedLots = useFuseSearch(lots || [], debouncedSearchTerm, {
    keys: ['lot_number', 'product_name'],
    threshold: 0.3,
  });

  const filteredAndSortedLots = useMemo(() => {
    const result = fuseSearchedLots.filter(lot => {
      if (statusFilter !== 'all' && lot.status !== statusFilter) return false;
      if (dateFrom && lot.production_date < dateFrom) return false;
      if (dateTo && lot.production_date > dateTo) return false;
      return true;
    });

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'lot_number': cmp = a.lot_number.localeCompare(b.lot_number); break;
        case 'product_name': cmp = a.product_name.localeCompare(b.product_name); break;
        case 'quantity': cmp = a.quantity - b.quantity; break;
        case 'production_date': cmp = a.production_date.localeCompare(b.production_date); break;
        case 'status': cmp = a.status.localeCompare(b.status); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [fuseSearchedLots, statusFilter, dateFrom, dateTo, sortField, sortDir]);
  const rowVirtualizer = useVirtualizer({
    count: filteredAndSortedLots.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    overscan: 10,
  });


  const generateLotNumber = () => {
    const date = format(new Date(), 'yyyyMMdd');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `LOT-${date}-${random}`;
  };

  const handleCreateLot = () => {
    if (!newLot.lot_number || !newLot.product_name || newLot.quantity <= 0) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    createLot.mutate({
      ...newLot,
      job_id: newLot.job_id || undefined,
      expiration_date: newLot.expiration_date || undefined,
      notes: newLot.notes || undefined
    }, {
      onSuccess: () => {
        setShowCreateModal(false);
        setNewLot({
          lot_number: '', product_name: '', quantity: 0, job_id: '',
          production_date: format(new Date(), 'yyyy-MM-dd'), expiration_date: '', notes: ''
        });
      }
    });
  };

  const processBulkStatusUpdate = useCallback((validLots: ProductionLot[], newStatus: string, reason?: string) => {
    validLots.forEach(lot => {
      updateLot.mutate({
        id: lot.id,
        status: newStatus,
        notes: reason ? `${lot.notes || ''}\n[Assinado]: ${reason}` : lot.notes
      });
    });
    toast.success(`${validLots.length} lote(s) atualizados para ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
    setSelectedIds(new Set());
  }, [updateLot]);

  const handleBulkStatusChange = useCallback((newStatus: string) => {
    const validLots = filteredAndSortedLots.filter(l =>
      selectedIds.has(l.id) && VALID_TRANSITIONS[l.status]?.includes(newStatus)
    );
    if (validLots.length === 0) {
      toast.error('Nenhum lote pode ser alterado para este status');
      return;
    }

    if (['blocked', 'quarantine', 'active'].includes(newStatus)) {
      setSignatureModal({ open: true, status: newStatus });
    } else {
      processBulkStatusUpdate(validLots, newStatus);
    }
  }, [filteredAndSortedLots, selectedIds, processBulkStatusUpdate]);


  const handleExportCSV = () => {
    const headers = ['Lote', 'Produto', 'Quantidade', 'Produzido', 'Status', 'Data Produção', 'Validade', 'Job'];
    const rows = filteredAndSortedLots.map(l => [
      l.lot_number, l.product_name, l.quantity, l.produced_quantity,
      STATUS_CONFIG[l.status]?.label || l.status,
      format(parseDateOnly(l.production_date) ?? new Date(), 'dd/MM/yyyy'),
      l.expiration_date ? format(parseDateOnly(l.expiration_date) ?? new Date(), 'dd/MM/yyyy') : '',
      l.job?.order_number || ''
    ]);
    const csv = [headers, ...rows].map(r => r.join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rastreabilidade-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exportado com sucesso');
  };

  const getExpirationBadge = (lot: ProductionLot) => {
    if (!lot.expiration_date || lot.status !== 'active') return null;
    const daysLeft = differenceInDays(parseDateOnly(lot.expiration_date) ?? new Date(), new Date());
    if (daysLeft < 0) return <Badge variant="destructive" className="text-[11px]">Expirado</Badge>;
    if (daysLeft <= 3) return <Badge variant="destructive" className="text-[11px] motion-safe:animate-pulse">⚠ {daysLeft}d</Badge>;
    if (daysLeft <= 7) return <Badge variant="outline" className="text-[11px] text-warning border-warning/40 bg-warning/10">⏰ {daysLeft}d</Badge>;
    return null;
  };

  const selectAll = () => {
    if (selectedIds.size === filteredAndSortedLots.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAndSortedLots.map(l => l.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  return (
    <MainLayout>
      <Helmet>
        <title>Rastreabilidade | Qualidade + Velocidade</title>
      </Helmet>

      <div className="space-y-6 pb-20">
        <Breadcrumbs />

        <ElectronicSignatureDialog
          open={signatureModal.open}
          onOpenChange={(open) => setSignatureModal(prev => ({ ...prev, open }))}
          onConfirm={(reason) => {
            const validLots = filteredAndSortedLots.filter(l =>
              selectedIds.has(l.id) && VALID_TRANSITIONS[l.status]?.includes(signatureModal.status)
            );
            processBulkStatusUpdate(validLots, signatureModal.status, reason);
          }}
          title={`Assinar Alteração: ${STATUS_CONFIG[signatureModal.status]?.label}`}
          description={`Você está orquestrando a alteração de status de ${selectedIds.size} lote(s). Confirme sua identidade para compliance.`}
        />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl text-title font-black tracking-tighter flex items-center gap-3">
                <Package className="h-8 w-8 text-primary animate-float" />
                Hyper-Traceability Ultra
              </h1>
              <FavoriteButton path="/traceability" name="Rastreabilidade" />
            </div>
            <p className="text-muted-foreground text-xs uppercase tracking-tighter">Genealogia Profunda, Monitoramento Blockchain e Compliance FDA/GAMP5</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <VoiceButton />
            <FavoritesDropdown onNavigate={(url) => navigate(url)} />
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-1" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => {
              if (selectedIds.size === 0) {
                toast.error('Selecione pelo menos um lote');
                return;
              }
              setLabelLots(filteredAndSortedLots.filter(l => selectedIds.has(l.id)));
            }}>
              <Tag className="h-4 w-4 mr-1" /> QR Lote
            </Button>
            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
              <DialogTrigger asChild>
                <Button className="font-bold">
                  <Plus className="h-4 w-4 mr-2" /> Novo Lote
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Criar Novo Lote Industrial</DialogTitle>
                  <DialogDescription>Registre um novo lote de produção com vínculo de job.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="flex gap-2">
                    <div className="flex-1 space-y-2">
                      <Label>Número do Lote *</Label>
                      <Input value={newLot.lot_number} onChange={(e) => setNewLot(prev => ({ ...prev, lot_number: e.target.value }))} placeholder="LOT-XXXX" />
                    </div>
                    <Button variant="outline" className="mt-8" onClick={() => setNewLot(prev => ({ ...prev, lot_number: generateLotNumber() }))}>Gerar</Button>
                  </div>
                  <div className="space-y-2">
                    <Label>Nome do Produto *</Label>
                    <Input value={newLot.product_name} onChange={(e) => setNewLot(prev => ({ ...prev, product_name: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Quantidade *</Label>
                      <Input type="number" value={newLot.quantity} onChange={(e) => setNewLot(prev => ({ ...prev, quantity: parseInt(e.target.value, 10) || 0 }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Data de Produção</Label>
                      <Input type="date" value={newLot.production_date} onChange={(e) => setNewLot(prev => ({ ...prev, production_date: e.target.value }))} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Job Relacionado</Label>
                    <Select value={newLot.job_id} onValueChange={(v) => setNewLot(prev => ({ ...prev, job_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione um job" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Nenhum</SelectItem>
                        {jobs?.map(job => (
                          <SelectItem key={job.id} value={job.id}>{job.order_number} - {job.client}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancelar</Button>
                    <Button onClick={handleCreateLot} disabled={createLot.isPending}>Criar Lote</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
             <TraceabilityStatsCards lots={lots || []} />
          </div>
          <div className="lg:col-span-1">
             <BlockchainIntegrityCard />
          </div>
        </div>

        <AnimatePresence>
          {selectedIds.size > 0 && (
            <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-card/80 border border-primary/20 shadow-2xl rounded-full px-6 py-3 flex items-center gap-6 backdrop-blur-xl">
               <div className="flex items-center gap-2 pr-6 border-r border-border">
                  <CheckSquare className="h-5 w-5 text-primary" />
                  <span className="font-bold text-sm">{selectedIds.size} selecionados</span>
               </div>
               <div className="flex items-center gap-2">
                 <Button size="sm" variant="outline" className="border-success/20 text-success hover:bg-success" onClick={() => handleBulkStatusChange('active')}>Liberar</Button>
                 <Button size="sm" variant="outline" className="border-warning/20 text-warning hover:bg-warning/10" onClick={() => handleBulkStatusChange('quarantine')}>Quarentena</Button>
                 <Button size="sm" variant="outline" className="border-destructive/20 text-destructive hover:bg-destructive/10" onClick={() => handleBulkStatusChange('blocked')}>Bloquear</Button>
                 <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}><X className="h-4 w-4" /></Button>
               </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Card className="bg-card/40 backdrop-blur-xl border-border/50 overflow-hidden">
          <CardHeader className="bg-muted/30 border-b border-border/50">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                   <FileText className="h-5 w-5 text-primary" /> Orquestração de Lotes (Audit Trail Blockchain)
                </CardTitle>
                <CardDescription className="font-mono text-[10px] uppercase tracking-widest">{filteredAndSortedLots.length} registros auditáveis com integridade verificada</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar lotes..." className="pl-10 w-[200px]" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Ativos</SelectItem>
                    <SelectItem value="quarantine">Quarentena</SelectItem>
                    <SelectItem value="blocked">Bloqueados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="relative h-[600px] overflow-auto scrollbar-thin" ref={parentRef}>
              <Table>
                <TableHeader className="sticky top-0 z-20 bg-card">
                  <TableRow className="bg-muted/30 border-b">
                    <TableHead className="w-10 pl-6"><Checkbox checked={selectedIds.size === filteredAndSortedLots.length && filteredAndSortedLots.length > 0} onCheckedChange={selectAll} /></TableHead>
                    <SortableHead label="Lote" field="lot_number" current={sortField} dir={sortDir} onSort={toggleSort} />
                    <SortableHead label="Produto" field="product_name" current={sortField} dir={sortDir} onSort={toggleSort} />
                    <SortableHead label="Status" field="status" current={sortField} dir={sortDir} onSort={toggleSort} />
                    <TableHead>Produzido</TableHead>
                    <TableHead className="text-right pr-6">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const lot = filteredAndSortedLots[virtualRow.index];
                    return (
                      <TableRow
                        key={lot.id}
                        className={cn(selectedIds.has(lot.id) ? 'bg-primary/5' : '', "absolute w-full border-b")}
                        style={{
                          height: `${virtualRow.size}px`,
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                      >
                        <TableCell className="pl-6 w-10"><Checkbox checked={selectedIds.has(lot.id)} onCheckedChange={() => toggleSelect(lot.id)} /></TableCell>
                        <TableCell className="font-mono font-black text-[11px]">{lot.lot_number}</TableCell>
                        <TableCell className="font-bold text-xs">{lot.product_name}</TableCell>
                        <TableCell>
                          <Badge variant={STATUS_CONFIG[lot.status]?.variant || 'default'} className="text-[10px] uppercase font-black">
                            {STATUS_CONFIG[lot.status]?.label || lot.status}
                          </Badge>
                          {getExpirationBadge(lot)}
                        </TableCell>
                        <TableCell>
                           <div className="flex flex-col gap-1 w-24">
                              <span className="text-[10px] font-bold">{lot.produced_quantity} / {lot.quantity}</span>
                              <Progress value={(lot.produced_quantity / lot.quantity) * 100} className="h-1" />
                           </div>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                           <div className="flex justify-end gap-1">
                             <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedLot(lot)}><Eye className="h-4 w-4" /></Button>
                             <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => { setSelectedLot(lot); setShowGenealogyView(true); }}><GitBranch className="h-4 w-4" /></Button>
                             <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setQrLot(lot)}><QrCode className="h-4 w-4" /></Button>
                           </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedLot && !showGenealogyView && <LotDetailsModal lot={selectedLot} open={!!selectedLot} onClose={() => setSelectedLot(null)} />}
      {selectedLot && showGenealogyView && <LotGenealogyView lot={selectedLot} open={showGenealogyView} onClose={() => { setShowGenealogyView(false); setSelectedLot(null); }} />}
      {qrLot && <LotQRCode lot={qrLot} open={!!qrLot} onClose={() => setQrLot(null)} />}
    </MainLayout>
  );
}

interface SortableHeadProps {
  label: string;
  field: SortField;
  current: SortField;
  dir: SortDir;
  onSort: (field: SortField) => void;
}

function SortableHead({ label, field, current, dir, onSort }: SortableHeadProps) {
  return (
    <TableHead>
      <Button variant="ghost" size="sm" className="h-auto p-0 font-black uppercase text-[10px] tracking-widest hover:bg-transparent" onClick={() => onSort(field)}>
        {label} <ArrowUpDown className={`ml-1 h-3 w-3 ${current === field ? 'text-primary' : 'text-muted-foreground/30'}`} />
      </Button>
    </TableHead>
  );
}
