import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, XCircle, Clock, Eye, FileSpreadsheet, Download } from 'lucide-react';
import { MaintenanceRecord } from '@/features/maintenance/hooks/types';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTPM } from '@/features/maintenance/hooks/useTPM';
import { ExecutionDetailsModal } from './ExecutionDetailsModal';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BatchApprovalPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  recordIds: string[];
  onConfirm: () => void;
  isProcessing: boolean;
}

export function BatchApprovalPreviewModal({
  isOpen,
  onClose,
  recordIds,
  onConfirm,
  isProcessing
}: BatchApprovalPreviewModalProps) {
  const { records } = useTPM();
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const selectedRecords = useMemo(() => {
    return records.filter((r: MaintenanceRecord) => recordIds.includes(r.id));
  }, [records, recordIds]);

  // The maintenance-records list query doesn't include checklist responses,
  // so "foto obrigatória ausente" (the same rule approveBatch enforces
  // server-side) couldn't be checked here before — this preview showed
  // "Pronto" for records the server would then reject. Fetch responses
  // (with the checklist item's requires_photo) scoped to just the selected
  // records so the preview matches what approveBatch will actually enforce.
  const { data: photoRequirementByRecord, isLoading: isCheckingPhotoRequirement } = useQuery({
    queryKey: ['batch-approval-photo-check', recordIds],
    queryFn: async () => {
      if (recordIds.length === 0) return {} as Record<string, boolean>;
      const { data, error } = await supabase
        .from('maintenance_item_responses')
        .select('record_id, photo_url, checklist_item:maintenance_checklist_items(requires_photo)')
        .in('record_id', recordIds);
      if (error) throw error;

      const byRecord = new Map<string, { requiresPhoto: boolean; hasPhoto: boolean }>();
      for (const row of data as Array<{ record_id: string; photo_url: string | null; checklist_item: { requires_photo: boolean | null } | null }>) {
        const entry = byRecord.get(row.record_id) ?? { requiresPhoto: false, hasPhoto: false };
        if (row.checklist_item?.requires_photo) entry.requiresPhoto = true;
        if (row.photo_url) entry.hasPhoto = true;
        byRecord.set(row.record_id, entry);
      }

      const result: Record<string, boolean> = {};
      for (const [recordId, { requiresPhoto, hasPhoto }] of byRecord) {
        result[recordId] = requiresPhoto && !hasPhoto;
      }
      return result;
    },
    enabled: recordIds.length > 0,
  });

  const validationResults = useMemo(() => {
    return selectedRecords.map((record: MaintenanceRecord) => {
      const issues = [];
      if (!record.signature_url) issues.push('Assinatura ausente');
      if (photoRequirementByRecord?.[record.id]) issues.push('Foto obrigatória ausente');

      return {
        ...record,
        isValid: issues.length === 0,
        issues
      };
    });
  }, [selectedRecords, photoRequirementByRecord]);

  const allValid = validationResults.every((v) => v.isValid);

  const handleViewDetails = (id: string) => {
    setSelectedRecordId(id);
    setIsDetailsOpen(true);
  };

  const handleExportCSV = () => {
    if (validationResults.length === 0) return;
    const headers = ['Máquina', 'Código', 'Data', 'Status Validação', 'Pendências'];
    const rows = validationResults.map((v) => [
      v.machine?.name || '',
      v.machine?.code || '',
      v.completed_at ? new Date(v.completed_at).toLocaleDateString() : 'N/A',
      v.isValid ? 'Pronto' : 'Incompleto',
      v.issues.join('; ')
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `previa_aprovacao_lote_${new Date().getTime()}.csv`;
    link.click();
    toast.success('Relatório de prévia exportado com sucesso');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-primary" />
            Pré-validação de Aprovação em Lote
          </DialogTitle>
          <DialogDescription>
            Revise as manutenções selecionadas antes de confirmar a aprovação em massa.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between px-1 mb-2">
          <Badge variant="outline" className="text-[10px] text-muted-foreground">
            {recordIds.length} manutenções selecionadas
          </Badge>
          <Button variant="ghost" size="sm" onClick={handleExportCSV} className="h-7 text-xs gap-1.5">
            <FileSpreadsheet className="h-3.5 w-3.5" /> Exportar Prévia
          </Button>
        </div>

        <div className="flex-1 overflow-auto py-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Máquina</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status Validação</TableHead>
                <TableHead>Problemas</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {validationResults.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">
                    {v.machine?.name}
                    <div className="text-[10px] text-muted-foreground">{v.machine?.code}</div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {v.completed_at ? new Date(v.completed_at).toLocaleDateString() : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {v.isValid ? (
                      <Badge className="bg-success gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Pronto
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="gap-1">
                        <XCircle className="h-3 w-3" /> Incompleto
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-destructive">
                    {v.issues.join(', ') || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewDetails(v.id)}
                      className="h-8 w-8 p-0"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <ExecutionDetailsModal
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
          recordId={selectedRecordId}
        />

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            disabled={!allValid || isProcessing || isCheckingPhotoRequirement || recordIds.length === 0}
            className="gap-2"
          >
            {isProcessing || isCheckingPhotoRequirement ? <Clock className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {isCheckingPhotoRequirement ? 'Verificando...' : `Confirmar Aprovação (${recordIds.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
