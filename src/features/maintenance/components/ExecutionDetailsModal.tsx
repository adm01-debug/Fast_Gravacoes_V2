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
type ExecutionRecord = Record<string, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExecutionRow = Record<string, any>;

export function ExecutionDetailsModal({ isOpen, onClose, recordId }: ExecutionDetailsModalProps) {
  const { fetchRecordDetails, approveMaintenance, requestCorrection } = useTPM();
  const { user } = useAuth();
  const [record, setRecord] = useState<ExecutionRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRequestingCorrection, setIsRequestingCorrection] = useState(false);
  const [correctionNotes, setCorrectionNotes] = useState('');

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

  const handleRequestCorrection = async () => {
    if (!recordId || !correctionNotes) {
      toast.error("Por favor, informe o motivo da correção.");
      return;
    }

    try {
      await requestCorrection.mutateAsync({
        record_id: recordId,
        notes: correctionNotes
      });
      setIsRequestingCorrection(false);
      setCorrectionNotes('');
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
          <div className="space-y-8 print:space-y-4 print:p-0">
              {/* Validation Feedback */}
              {record.status === 'completed' && validationErrors.length > 0 && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl space-y-2 animate-in fade-in slide-in-from-top-2">
                  <h4 className="text-sm font-bold text-destructive flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> Pendências Encontradas ({validationErrors.length})
                  </h4>
                  <ul className="text-xs space-y-1 text-destructive/80 pl-6 list-disc">
                    {validationErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Correction requested info */}
              {record.status === 'correction_requested' && (
                <div className="p-4 bg-warning/10 border border-warning/20 rounded-xl space-y-2">
                  <h4 className="text-sm font-bold text-warning flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Correção em Andamento
                  </h4>
                  <p className="text-xs text-warning/80 pl-6">Motivo: {record.correction_notes}</p>
                </div>
              )}

              {/* Technical Sheet & Checklist Info */}
              <div className="flex flex-col sm:flex-row gap-4">
                {record.checklist_snapshot && (
                  <div className="flex-1 flex items-center gap-4 bg-secondary/10 px-3 py-2 rounded-lg border border-border/50">
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase font-semibold">
                      <ClipboardList className="h-3.5 w-3.5 text-primary" />
                      Checklist v{record.checklist_version || record.checklist_snapshot.version || '1'}
                    </div>
                  </div>
                )}
                {record.technical_sheet_id && (
                  <div className="flex-1 flex items-center gap-4 bg-primary/5 px-3 py-2 rounded-lg border border-primary/10">
                    <div className="flex items-center gap-2 text-[10px] text-primary uppercase font-semibold">
                      <Zap className="h-3.5 w-3.5" />
                      Ficha Técnica v{record.technical_sheet_version || '1'}
                    </div>
                  </div>
                )}
              </div>
              {/* Header for print only */}
              <div className="hidden print:block text-center border-b pb-4 mb-8">
                <div className="flex justify-between items-center mb-4">
                  <div className="text-left">
                    <h1 className="text-2xl font-bold uppercase">Ordem de Serviço Técnica</h1>
                    <p className="text-sm font-semibold">TPM - Total Productive Maintenance</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs">Documento nº: {record.id.substring(0, 8)}</p>
                    <p className="text-xs">Emissão: {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-left border p-4 rounded-lg mb-4">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Operador/Técnico</p>
                    <p className="text-sm">{record.performed_by_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Data de Execução</p>
                    <p className="text-sm">{record.completed_at ? format(new Date(record.completed_at), 'dd/MM/yyyy HH:mm') : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Máquina / Equipamento</p>
                    <p className="text-sm font-bold">{record.machine?.name} ({record.machine?.code})</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Produto / Técnica</p>
                    <p className="text-sm font-bold text-primary">{record.technical_sheet?.title || 'Não Vinculado'}</p>
                  </div>
                </div>
              </div>

              {/* Basic Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Datas
                  </Label>
                  <p className="text-sm font-medium">Início: {record.started_at ? format(new Date(record.started_at), "dd/MM 'às' HH:mm", { locale: ptBR }) : '-'}</p>
                  <p className="text-sm font-medium">Fim: {record.completed_at ? format(new Date(record.completed_at), "dd/MM 'às' HH:mm", { locale: ptBR }) : '-'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase flex items-center gap-1">
                    <User className="h-3 w-3" /> Responsáveis
                  </Label>
                  <p className="text-sm font-medium">Técnico: {record.performed_by_name || 'N/A'}</p>
                  {record.approver_id && (
                    <p className="text-sm text-success font-medium">Aprovado por: {record.approver_id.substring(0, 8)}...</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase flex items-center gap-1">
                    <Wrench className="h-3 w-3" /> Ativo
                  </Label>
                  <p className="text-sm font-medium">{record.machine?.name}</p>
                  <p className="text-xs text-muted-foreground">{record.machine?.code}</p>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-secondary/20 rounded-xl border border-border/50">
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Downtime</p>
                  <p className="text-lg font-bold">{record.downtime_minutes} min</p>
                </div>
                <div className="text-center border-l border-border/50">
                  <p className="text-[10px] text-muted-foreground uppercase">Custo Peças</p>
                  <p className="text-lg font-bold">R$ {record.total_cost.toFixed(2)}</p>
                </div>
                <div className="text-center border-l border-border/50">
                  <p className="text-[10px] text-muted-foreground uppercase">Itens Checklist</p>
                  <p className="text-lg font-bold">{record.responses?.length || 0}</p>
                </div>
                <div className="text-center border-l border-border/50">
                  <p className="text-[10px] text-muted-foreground uppercase">Status</p>
                  <p className="text-sm font-semibold text-primary">{record.status.toUpperCase()}</p>
                </div>
              </div>

              {/* Regulagem Técnica */}
              {record.adjustment_parameters && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <PenTool className="h-5 w-5 text-warning" />
                    Regulagem Técnica Aplicada
                  </h3>
                  <AdjustmentParameters adjustmentParameters={record.adjustment_parameters} />
                </div>
              )}

              {/* Insumos e Consumíveis na OS */}
              {((record.technical_sheet?.consumables && record.technical_sheet.consumables.length > 0) || (record.supplies_used && record.supplies_used.length > 0)) && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    Insumos e Consumíveis (OS)
                  </h3>
                  <ExecutionSupplies
                    suppliesUsed={record.supplies_used}
                    technicalSheet={record.technical_sheet}
                  />
                </div>
              )}

              {/* Alertas de Risco e Cenários de Falha */}
              {record.execution_alerts && record.execution_alerts.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    Alertas de Risco e Falha
                  </h3>
                  <div className="space-y-3">
                    {record.execution_alerts.map((alert: ExecutionRow, idx: number) => (
                      <div key={idx} className="p-4 rounded-xl bg-destructive/5 border border-destructive/20 space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <p className="text-sm font-bold text-destructive">{alert.description}</p>
                            <p className="text-xs text-muted-foreground">Parâmetro: {alert.parameter_name} | Range: {alert.expected_range} | Valor: {alert.actual_value}</p>
                          </div>
                          <Badge variant="destructive" className="uppercase text-[10px]">{alert.severity}</Badge>
                        </div>
                        {alert.evidence_urls && alert.evidence_urls.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-2">
                            {alert.evidence_urls.map((url: string, i: number) => (
                              <a key={i} href={url} target="_blank" rel="noreferrer" className="block relative group">
                                <img src={url} alt="Evidência" className="h-20 w-20 object-cover rounded-lg border border-destructive/20 transition-transform group-hover:scale-105" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                                  <Eye className="h-4 w-4 text-white" />
                                </div>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Checklist de Qualidade Aplicado */}
              {record.quality_responses && record.quality_responses.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <CheckSquare className="h-5 w-5 text-success" />
                    Conformidade de Qualidade
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {record.quality_responses.map((resp: ExecutionRow) => {
                      const sheet = record.technical_sheet_id ? record.technical_sheet : null;
                      const crit = record.adjustment_parameters?.quality_checklist?.find((c: ExecutionRow) => c.id === resp.id) ||
                                   (record.technical_sheet?.quality_checklist?.find((c: ExecutionRow) => c.id === resp.id));

                      return (
                        <div key={resp.id} className={`p-3 rounded-lg border ${resp.confirmed ? 'bg-success/5 border-success/10' : 'bg-rose-500/5 border-rose-500/10'}`}>
                          <div className="flex items-center gap-3">
                            {resp.confirmed ? (
                              <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-rose-600 flex-shrink-0" />
                            )}
                            <span className="text-sm font-medium">{crit?.description || 'Critério de Qualidade'}</span>
                            <Badge variant={resp.confirmed ? 'outline' : 'destructive'} className="ml-auto text-[10px]">
                              {resp.confirmed ? 'APROVADO' : 'REPROVADO'}
                            </Badge>
                          </div>
                          {resp.justification && (
                            <p className="mt-2 text-[10px] italic text-muted-foreground pl-7 bg-muted/30 p-1.5 rounded">
                              Obs: {resp.justification}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Checklist */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  Resultados do Checklist
                </h3>
                <div className="border border-border/50 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border/50">
                        <th className="px-4 py-2 text-left font-medium">Item</th>
                        <th className="px-4 py-2 text-center font-medium">Conforme</th>
                        <th className="px-4 py-2 text-left font-medium">Observação / Medição</th>
                        <th className="px-4 py-2 text-center font-medium">Foto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {record.responses?.map((r: ExecutionRow) => (
                        <tr key={r.id} className="hover:bg-muted/30">
                          <td className="px-4 py-3">{r.item?.description || 'Item de Manutenção'}</td>
                          <td className="px-4 py-3 text-center">
                            {r.is_checked ? (
                              <Badge className="bg-success/10 text-success border-success">SIM</Badge>
                            ) : (
                              <Badge variant="destructive" className="bg-rose-500/10 text-rose-600 border-rose-200">NÃO</Badge>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {r.measurement_value !== null && (
                              <span className="font-mono text-primary font-bold mr-2">
                                [{r.measurement_value} {r.item?.measurement_unit}]
                              </span>
                            )}
                            {r.notes || <span className="text-muted-foreground italic text-xs">Sem observações</span>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {r.photo_url ? (
                              <a href={r.photo_url} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center justify-center gap-1">
                                <Camera className="h-4 w-4" /> Ver
                              </a>
                            ) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Adjustment Parameters Summary */}
              {record.adjustment_parameters && Object.values(record.adjustment_parameters).some(v => v && typeof v === 'string') && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Zap className="h-5 w-5 text-warning" />
                    Regulagem Técnica Aplicada
                  </h3>
                  <AdjustmentParameters adjustmentParameters={record.adjustment_parameters} />

                  {/* Print-only Observations Block */}
                  <div className="hidden print:block mt-6 border p-4 rounded-lg">
                    <h4 className="text-xs font-bold uppercase mb-2">Observações e Notas Técnicas</h4>
                    <p className="text-sm min-h-[60px]">{record.notes || 'Sem observações adicionais.'}</p>

                    <div className="grid grid-cols-2 gap-8 mt-12">
                      <div className="border-t pt-2 text-center">
                        <p className="text-[10px] uppercase">Assinatura do Técnico</p>
                        <p className="text-sm font-serif italic mt-2">{record.signature_url}</p>
                      </div>
                      <div className="border-t pt-2 text-center">
                        <p className="text-[10px] uppercase">Aprovação (Supervisor)</p>
                        <p className="text-sm mt-2">{record.approver_id ? '✓ Verificado Digitalmente' : '_______________________'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Parts */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Package className="h-5 w-5 text-warning" />
                  Peças e Componentes Substituídos
                </h3>
                {record.parts?.length > 0 ? (
                  <div className="border border-border/50 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50 border-b border-border/50">
                          <th className="px-4 py-2 text-left font-medium">Peça</th>
                          <th className="px-4 py-2 text-left font-medium">Código</th>
                          <th className="px-4 py-2 text-center font-medium">Qtd</th>
                          <th className="px-4 py-2 text-right font-medium">Custo Unit.</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {record.parts.map((p: ExecutionRow) => (
                          <tr key={p.id} className="hover:bg-muted/30">
                            <td className="px-4 py-3 font-medium">{p.part_name}</td>
                            <td className="px-4 py-3 text-muted-foreground font-mono">{p.part_code || '-'}</td>
                            <td className="px-4 py-3 text-center">{p.quantity}</td>
                            <td className="px-4 py-3 text-right">R$ {(p.cost || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-secondary/10 border border-dashed border-border/50 text-center text-sm text-muted-foreground">
                    Nenhuma peça registrada nesta intervenção.
                  </div>
                )}
              </div>

              {/* Notes */}
              {record.notes && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase flex items-center gap-2">
                    <FileText className="h-4 w-4" /> Observações do Técnico
                  </h3>
                  <div className="p-4 rounded-lg bg-secondary/10 border border-border/50 text-sm italic">
                    {record.notes}
                  </div>
                </div>
              )}

              {/* Signature */}
              <div className="space-y-4 border-t border-border/50 pt-6">
                <div className="flex flex-col md:flex-row justify-between gap-8">
                  <div className="space-y-2 text-center md:text-left">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase">Responsável pela Execução</h3>
                    <div className="py-4 px-8 border-b border-border w-fit mx-auto md:mx-0">
                      <p className="font-serif italic text-xl text-primary">{record.signature_url || record.performed_by_name}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Assinado em: {record.completed_at ? format(new Date(record.completed_at), "dd/MM/yyyy 'às' HH:mm") : '-'}</p>
                  </div>

                  {record.status === 'approved' ? (
                    <div className="space-y-2 text-center md:text-right">
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase">Aprovação / Auditoria</h3>
                      <div className="py-4 px-8 border-b border-success w-fit mx-auto md:ml-auto">
                        <p className="text-success font-bold uppercase tracking-widest flex items-center gap-2">
                          <CheckCircle className="h-5 w-5" /> APROVADO
                        </p>
                      </div>
                      <p className="text-[10px] text-muted-foreground">Em: {record.approved_at ? format(new Date(record.approved_at), "dd/MM/yyyy 'às' HH:mm") : '-'}</p>
                    </div>
                  ) : record.status === 'completed' ? (
                    <div className="flex flex-col items-center md:items-end gap-3">
                      {isRequestingCorrection ? (
                        <div className="w-full max-w-sm space-y-3 animate-in fade-in zoom-in-95">
                          <Textarea
                            placeholder="Descreva o que precisa ser corrigido..."
                            value={correctionNotes}
                            onChange={(e) => setCorrectionNotes(e.target.value)}
                            className="text-xs min-h-[80px]"
                          />
                          <div className="flex gap-2 justify-end">
                            <Button variant="ghost" size="sm" onClick={() => setIsRequestingCorrection(false)}>Cancelar</Button>
                            <Button size="sm" variant="destructive" onClick={handleRequestCorrection}>Enviar Solicitação</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <Button variant="outline" onClick={() => setIsRequestingCorrection(true)} className="text-destructive hover:bg-destructive/5 gap-2">
                            <AlertTriangle className="h-4 w-4" /> Solicitar Correção
                          </Button>
                          <Button
                            onClick={handleApprove}
                            disabled={validationErrors.length > 0}
                            className="bg-success hover:bg-success gap-2 shadow-glow-success"
                          >
                            <CheckCircle className="h-4 w-4" /> Aprovar Execução
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
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
