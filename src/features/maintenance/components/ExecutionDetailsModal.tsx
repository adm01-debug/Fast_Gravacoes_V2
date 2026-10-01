/* eslint-disable react-hooks/immutability, react-hooks/exhaustive-deps -- Padrões intencionais: sync com sistemas externos, memoização manual por performance, integração com libs (dnd-kit, framer-motion, supabase realtime). */
import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { ClipboardList, Plus, Trash2, Save, FileText, Camera, PenTool, CheckCircle, Download, FileSpreadsheet, File, Archive, Eye, Activity, AlertTriangle, Clock, User, Calendar, CheckCircle2, Wrench, Package, Zap, MoveHorizontal, Thermometer, Info, CheckSquare } from 'lucide-react';
import { MaintenanceRecord } from '@/features/maintenance/hooks/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTPM } from '@/features/maintenance/hooks/useTPM';
import { useAuth } from '@/features/auth';
import { toast } from 'sonner';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { AdjustmentParameters } from './ExecutionAdjustmentParameters';
import { ExecutionSupplies } from './ExecutionSupplies';
import { ExecutionRecordView } from '@/features/maintenance/components/ExecutionRecordView';

interface ExecutionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  recordId: string | null;
}

// The execution record aggregates deeply-nested joins from many tables
// (checklist items, parts, alerts, technical sheets, quality responses).
// A precise schema would need ~40 interlocking types; here we intentionally
// use a permissive alias so consumers can access dynamic keys safely.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ExecutionRecord = Record<string, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ExecutionRow = Record<string, any>;

export function ExecutionDetailsModal({ isOpen, onClose, recordId }: ExecutionDetailsModalProps) {
  const { fetchRecordDetails, approveMaintenance, requestCorrection } = useTPM();
  const { user } = useAuth();
  const [record, setRecord] = useState<ExecutionRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && recordId) {
      loadDetails();
    }
  }, [isOpen, recordId]);

  const loadDetails = async () => {
    if (!recordId) return;
    try {
      setIsLoading(true);
      const data = await fetchRecordDetails(recordId);
      setRecord(data);
    } catch (error) {
      toast.error('Erro ao carregar detalhes da execução');
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const validationErrors = useMemo(() => {
    if (!record) return [];
    const errors: string[] = [];

    record.responses?.forEach((r: ExecutionRow) => {
      if (!r.is_checked && r.item?.is_critical) {
        errors.push(`Item Crítico Incompleto: ${r.item.description}`);
      }
      if (r.item?.requires_photo && !r.photo_url) {
        errors.push(`Foto Obrigatória Ausente: ${r.item.description}`);
      }
      if (r.item?.requires_measurement && (r.measurement_value === null || r.measurement_value === undefined)) {
        errors.push(`Medição Obrigatória Ausente: ${r.item.description}`);
      }
    });

    if (!record.signature_url) {
      errors.push("Assinatura do técnico é obrigatória.");
    }

    return errors;
  }, [record]);

  const handleApprove = async () => {
    if (!recordId || !user) return;

    if (validationErrors.length > 0) {
      toast.error("Não é possível aprovar", {
        description: `Existem ${validationErrors.length} pendências que precisam ser corrigidas.`
      });
      return;
    }

    try {
      await approveMaintenance.mutateAsync({
        record_id: recordId,
        approver_id: user.id
      });
      loadDetails();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleRequestCorrection = async (notes: string) => {
    if (!recordId || !notes) {
      toast.error("Por favor, informe o motivo da correção.");
      return;
    }

    try {
      await requestCorrection.mutateAsync({
        record_id: recordId,
        notes
      });
      loadDetails();
    } catch (error) {
      // Error handled
    }
  };

  const handleExportZIP = async () => {
    if (!record) return;
    try {
      const zip = new JSZip();
      const folder = zip.folder(`execucao_${record.id.substring(0, 8)}`);

      // Photos
      const photosFolder = folder?.folder("fotos");
      const photoResponses = record.responses.filter((r: ExecutionRow) => r.photo_url);

      for (let i = 0; i < photoResponses.length; i++) {
        const resp = photoResponses[i];
        try {
          const response = await fetch(resp.photo_url);
          const blob = await response.blob();
          photosFolder?.file(`item_${i+1}_${resp.item?.description.substring(0, 20)}.jpg`, blob);
        } catch (e) {
          // Foto individual indisponível: pula e continua montando o ZIP.
          logger.warn(`Falha ao buscar foto ${resp.photo_url}`, e, 'ExecutionDetailsModal');
        }
      }

      // Metadata
      folder?.file("detalhes.json", JSON.stringify(record, null, 2));

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `tpm_execucao_${record.id.substring(0, 8)}.zip`);
    } catch (e) {
      toast.error("Erro ao gerar ZIP");
    }
  };

  const handleExportPDF = async () => {
    if (!record) return;
    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke('pdf-generator', {
        body: {
          type: 'maintenance-report',
          data: {
            execution: record,
            machine: record.machine,
            technical_sheet: record.technical_sheet,
            supplies: record.supplies_used,
            alerts: record.execution_alerts
          }
        }
      });

      if (error) throw error;

      const blob = new Blob([data], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `OS_Tecnica_${record.id.substring(0, 8)}.pdf`;
      link.click();
      toast.success("PDF gerado com sucesso via servidor");
    } catch (e) {

      toast.error("Erro ao gerar PDF profissional. Usando impressão padrão...");
      window.print();
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!record) return;

    const rows = [
      ['Campo', 'Valor'],
      ['ID', record.id],
      ['Máquina', `${record.machine?.name} (${record.machine?.code})`],
      ['Tipo', record.maintenance_type?.name],
      ['Técnico', record.performed_by_name || 'N/A'],
      ['Início', record.started_at ? format(new Date(record.started_at), 'dd/MM/yyyy HH:mm') : 'N/A'],
      ['Conclusão', record.completed_at ? format(new Date(record.completed_at), 'dd/MM/yyyy HH:mm') : 'N/A'],
      ['Status', record.status],
      ['Downtime (min)', record.downtime_minutes],
      ['Custo Total', record.total_cost],
      ['Observações', record.notes || ''],
      ['', ''],
      ['CHECKLIST', 'Conforme', 'Observação', 'Foto'],
      ...(record.responses || []).map((r: ExecutionRow) => [
        r.item?.description || 'Item',
        r.is_checked ? 'Sim' : 'Não',
        r.notes || '',
        r.photo_url || ''
      ]),
      ['', ''],
      ['PEÇAS', 'Código', 'Quantidade', 'Custo'],
      ...(record.parts || []).map((p: ExecutionRow) => [
        p.part_name,
        p.part_code || '',
        p.quantity,
        p.cost || ''
      ])
    ];

    const csvContent = rows.map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `execucao_${record.id}.csv`;
    link.click();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-success gap-1"><CheckCircle className="h-3 w-3" /> Aprovado</Badge>;
      case 'completed':
        return <Badge variant="secondary" className="bg-warning/20 text-warning gap-1"><Clock className="h-3 w-3" /> Pendente Aprovação</Badge>;
      case 'in_progress':
        return <Badge variant="outline" className="text-blue-500 border-blue-200 gap-1"><Clock className="h-3 w-3" /> Em Andamento</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <DialogTitle className="flex items-center gap-2 text-2xl text-title">
                <Wrench className="h-6 w-6 text-primary" />
                Detalhes da Execução
              </DialogTitle>
              <DialogDescription>
                Registro de manutenção preventiva e corretiva
              </DialogDescription>
            </div>
            <div className="flex flex-col items-end gap-2">
              {record && getStatusBadge(record.status)}
              {record?.status === 'correction_requested' && (
                <Badge variant="destructive" className="animate-pulse">Aguardando Correção</Badge>
              )}
              {record && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleExportZIP} className="gap-2">
                    <Archive className="h-4 w-4" /> ZIP
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2">
                    <FileSpreadsheet className="h-4 w-4" /> CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-2 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
                    <Download className="h-4 w-4" /> PDF Técnico
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        <Separator className="mt-4" />

        <ScrollArea className="flex-1 p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : record ? (
          <ExecutionRecordView record={record} validationErrors={validationErrors} onApprove={handleApprove} onSendCorrection={handleRequestCorrection} />
          ) : (
            <div className="text-center py-20 text-muted-foreground">
              Nenhum dado encontrado para este registro.
            </div>
          )}
        </ScrollArea>

        <Separator />

        <DialogFooter className="p-4 bg-muted/30">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const Label = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <label className={`block font-medium ${className}`}>{children}</label>
);
