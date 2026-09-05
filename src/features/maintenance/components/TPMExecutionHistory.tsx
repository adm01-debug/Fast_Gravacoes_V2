import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  History, Search, Filter, FileSpreadsheet, Download,
  Eye, Calendar, Wrench, CheckCircle, Clock, AlertTriangle,
  CheckSquare, XSquare
} from 'lucide-react';
import { useAuth } from '@/features/auth';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { useTPM } from '@/features/maintenance/hooks/useTPM';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ExecutionDetailsModal } from './ExecutionDetailsModal';
import { BatchApprovalPreviewModal } from './BatchApprovalPreviewModal';

export function TPMExecutionHistory() {
  const { records, machines, isLoading, approveBatch } = useTPM();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [machineFilter, setMachineFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      const matchesSearch =
        record.performed_by_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.machine?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesMachine = machineFilter === 'all' || record.machine_id === machineFilter;
      const matchesStatus = statusFilter === 'all' || record.status === statusFilter;

      return matchesSearch && matchesMachine && matchesStatus;
    });
  }, [records, searchTerm, machineFilter, statusFilter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-success gap-1"><CheckCircle className="h-3 w-3" /> Aprovado</Badge>;
      case 'completed':
        return <Badge variant="secondary" className="bg-warning/20 text-warning gap-1"><Clock className="h-3 w-3" /> Revisar</Badge>;
      case 'in_progress':
        return <Badge variant="outline" className="text-blue-500 border-blue-200 gap-1"><Clock className="h-3 w-3" /> Em Andamento</Badge>;
      case 'cancelled':
        return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleExportAllCSV = () => {
    if (filteredRecords.length === 0) return;

    const headers = ['Data', 'Máquina', 'Tipo', 'Técnico', 'Status', 'Downtime (min)', 'Custo'];
    const rows = filteredRecords.map(r => [
      r.completed_at ? format(new Date(r.completed_at), 'dd/MM/yyyy') : format(new Date(r.started_at), 'dd/MM/yyyy'),
      r.machine?.name || 'N/A',
      r.maintenance_type_id,
      r.performed_by_name || 'N/A',
      r.status,
      r.downtime_minutes,
      r.total_cost
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `historico_tpm_${new Date().getTime()}.csv`;
    link.click();
  };

  const handleViewDetails = (id: string) => {
    setSelectedRecordId(id);
    setIsModalOpen(true);
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleApproveBatch = () => {
    if (selectedIds.length === 0) return;
    setIsPreviewModalOpen(true);
  };

  const confirmApproveBatch = async () => {
    if (!user || selectedIds.length === 0) return;
    setIsBatchProcessing(true);
    try {
      await approveBatch.mutateAsync({
        record_ids: selectedIds,
        approver_id: user.id
      });
      setSelectedIds([]);
      setIsPreviewModalOpen(false);
    } catch (error) {
      // Handled by mutation
    } finally {
      setIsBatchProcessing(false);
    }
  };

  return (
    <Card className="card-glass border-primary/10 shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <History className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-2xl text-title">Histórico de Execuções</CardTitle>
              <p className="text-sm text-muted-foreground">Consulte e aprove intervenções realizadas nas máquinas</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.length > 0 && (
              <Button
                variant="default"
                className="bg-success hover:bg-success animate-in fade-in zoom-in-95 gap-2"
                onClick={handleApproveBatch}
                disabled={approveBatch.isPending || isBatchProcessing}
              >
                {approveBatch.isPending || isBatchProcessing ? <Clock className="h-4 w-4 animate-spin" /> : <CheckSquare className="h-4 w-4" />}
                Aprovar Selecionados ({selectedIds.length})
              </Button>
            )}
            <Button variant="outline" onClick={handleExportAllCSV} className="gap-2">
              <FileSpreadsheet className="h-4 w-4" /> Exportar CSV
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por técnico, máquina..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={machineFilter} onValueChange={setMachineFilter}>
            <SelectTrigger>
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Todas as Máquinas" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Máquinas</SelectItem>
              {machines.map(m => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Todos os Status" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="completed">Pendentes</SelectItem>
              <SelectItem value="approved">Aprovados</SelectItem>
              <SelectItem value="in_progress">Em Andamento</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center justify-center p-2 rounded-lg bg-secondary/30 border border-border/50">
            <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
            <span className="text-xs font-medium">{filteredRecords.length} registros encontrados</span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : filteredRecords.length > 0 ? (
          <div className="rounded-xl border border-border/50 overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead className="w-[120px]">Data</TableHead>
                  <TableHead>Máquina</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Técnico</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => (
                  <TableRow key={record.id} className={`hover:bg-muted/30 transition-colors ${selectedIds.includes(record.id) ? 'bg-primary/5' : ''}`}>
                    <TableCell>
                      {record.status === 'completed' && (
                        <Checkbox
                          checked={selectedIds.includes(record.id)}
                          onCheckedChange={() => handleToggleSelect(record.id)}
                        />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {record.completed_at
                        ? format(new Date(record.completed_at), 'dd/MM/yyyy', { locale: ptBR })
                        : format(new Date(record.started_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold">{record.machine?.name}</span>
                        <span className="text-[10px] text-muted-foreground">{record.machine?.code}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">
                        {record.maintenance_type_id.replace('tpm-', '')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                          {(record.performed_by_name || 'N').charAt(0)}
                        </div>
                        {record.performed_by_name || 'Técnico Externo'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-mono">{record.downtime_minutes} min</span>
                    </TableCell>
                    <TableCell>{getStatusBadge(record.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="hover:bg-primary/10 hover:text-primary transition-colors"
                        onClick={() => handleViewDetails(record.id)}
                      >
                        <Eye className="h-4 w-4 mr-1" /> Detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-secondary/10 rounded-xl border border-dashed border-border/50">
            <History className="h-16 w-16 mb-4 opacity-10" />
            <p className="text-lg font-medium">Nenhum registro encontrado</p>
            <p className="text-sm">Ajuste os filtros ou aguarde novas manutenções serem realizadas.</p>
          </div>
        )}

        <ExecutionDetailsModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          recordId={selectedRecordId}
        />

        <BatchApprovalPreviewModal
          isOpen={isPreviewModalOpen}
          onClose={() => setIsPreviewModalOpen(false)}
          recordIds={selectedIds}
          onConfirm={confirmApproveBatch}
          isProcessing={isBatchProcessing}
        />
      </CardContent>
    </Card>
  );
}
