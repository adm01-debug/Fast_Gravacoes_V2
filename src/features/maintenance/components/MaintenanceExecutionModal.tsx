/* eslint-disable react-hooks/purity -- Padrões intencionais: sync com sistemas externos, memoização manual por performance, integração com libs (dnd-kit, framer-motion, supabase realtime). */
/* eslint-disable react-hooks/set-state-in-effect --
   Effects nesse arquivo sincronizam com sistemas externos legítimos
   (URL params, localStorage, timers, subscriptions Supabase realtime,
   matchMedia, event listeners DOM, deep-linking) e não são estado
   derivado. A cascata é intencional para refletir mudanças externas. */
import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Wrench, CheckCircle2, AlertTriangle, Clock, Plus, Trash2, PenTool, Zap, MoveHorizontal, Thermometer, Info, CheckSquare, Package, Camera } from 'lucide-react';
import { MaintenanceSchedule, MaintenanceChecklist, MaintenanceChecklistItem, ChecklistSnapshot, AdjustmentParameters as IAdjustmentParameters, QualityChecklistResult } from '@/features/maintenance/hooks/types';
import { useTPM } from '@/features/maintenance/hooks/useTPM';
import { useTechnicalSheets } from '@/hooks/useTechnicalSheets';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ChecklistItem } from './execution/ChecklistItem';
import { AlertRiskPanel } from './execution/AlertRiskPanel';
import { SupplyList } from './execution/SupplyList';
import { AdjustmentParameters } from './execution/AdjustmentParameters';
import { ReplacementParts } from './execution/ReplacementParts';

interface ExecutionAlert {
  alert_type: string;
  parameter_name?: string;
  expected_range?: string;
  actual_value?: string;
  severity: 'info' | 'warning' | 'critical';
  description: string;
  evidence_urls: string[];
  is_critical_risk: boolean;
}

interface MaintenanceExecutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: MaintenanceSchedule | null;
  recordId: string | null;
  onComplete: (data: {
    notes: string;
    total_cost: number;
    downtime_minutes: number;
    responses: Array<{
      checklist_item_id: string;
      is_checked: boolean;
      measurement_value?: number;
      notes?: string;
      photo_url?: string;
    }>;
    parts: Array<{
      name: string;
      code: string;
      quantity: number;
    }>;
    signature?: string;
    checklist_version?: number;
    checklist_snapshot?: ChecklistSnapshot;
    technical_sheet_id?: string;
    technical_sheet_version?: number;
    quality_responses?: Array<{
      item: string;
      status: 'pass' | 'fail' | 'na';
      notes?: string;
    }>;
    adjustment_parameters?: IAdjustmentParameters;
    supplies_used?: Array<{
      name: string;
      quantity: string;
      alternative_used?: boolean;
    }>;
    execution_alerts?: ExecutionAlert[];
    failure_risk_detected?: boolean;
  }) => void;
  /** True while the parent's completeMaintenance mutation is in flight — disables the confirm button to prevent duplicate submissions on rapid clicks. */
  isSubmitting?: boolean;
}

export function MaintenanceExecutionModal({
  isOpen,
  onClose,
  schedule,
  recordId,
  onComplete,
  isSubmitting = false,
}: MaintenanceExecutionModalProps) {
  const { checklists } = useTPM();
  const { sheets: technicalSheets } = useTechnicalSheets();
  const [selectedSheetId, setSelectedSheetId] = useState<string | null>(null);
  const [adjustmentParams, setAdjustmentParams] = useState({
    squeegee_passes: '',
    pressure: '',
    speed: '',
    temperature: ''
  });
  const [qualityResponses, setQualityResponses] = useState<Record<string, { approved: boolean; justification?: string }>>({});
  const [activeAlerts, setActiveAlerts] = useState<Array<{
    alert_type: string;
    parameter_name?: string;
    expected_range?: string;
    actual_value?: string;
    severity: 'info' | 'warning' | 'critical';
    description: string;
    evidence_urls: string[];
    is_critical_risk: boolean;
  }>>([]);

  const [suppliesUsed, setSuppliesUsed] = useState<Record<string, {
    quantity: string;
    alternative_used: boolean;
    name: string;
    is_checked: boolean;
  }>>({});

  const [notes, setNotes] = useState('');
  const [totalCost, setTotalCost] = useState(0);
  const [downtime, setDowntime] = useState(0);
  const [responses, setResponses] = useState<Record<string, {
    is_checked: boolean;
    measurement_value?: number;
    notes?: string;
    photo_url?: string;
  }>>({});
  const [parts, setParts] = useState<Array<{ _key: string; name: string; code: string; quantity: number }>>([]);
  const [signature, setSignature] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const checklist = useMemo(() => {
    if (!schedule) return null;
    // Tenta encontrar checklist específico para a técnica/tipo da máquina
    const techChecklist = checklists.find(c =>
      c.maintenance_type_id === schedule.maintenance_type_id &&
      c.technique_id === schedule.machine?.technique_id &&
      c.is_active
    );
    if (techChecklist) return techChecklist;

    // Fallback para checklist global do tipo de manutenção
    return checklists.find(c =>
      c.maintenance_type_id === schedule.maintenance_type_id &&
      !c.technique_id &&
      c.is_active
    );
  }, [schedule, checklists]);

  useEffect(() => {
    if (selectedSheetId) {
      const sheet = technicalSheets.find(s => s.id === selectedSheetId);
      if (sheet?.machine_settings) {
        const settings = sheet.machine_settings;
        setAdjustmentParams({
          squeegee_passes: settings.squeegee_passes || '',
          pressure: settings.pressure || '',
          speed: settings.speed || '',
          temperature: settings.temperature || ''
        });
      }

      if (sheet?.consumables) {
        const initialSupplies: Record<string, {
          quantity: string;
          alternative_used: boolean;
          name: string;
          is_checked: boolean;
        }> = {};
        sheet.consumables.forEach((c) => {
          initialSupplies[c.id] = {
            name: c.name,
            quantity: c.quantity,
            alternative_used: false,
            is_checked: true,
          };
        });
        setSuppliesUsed(initialSupplies);
      }
    }
  }, [selectedSheetId, technicalSheets]);

  // Real-time parameter validation
  useEffect(() => {
    if (!selectedSheetId) return;

    const sheet = technicalSheets.find(s => s.id === selectedSheetId);
    if (!sheet) return;

    const ranges = sheet?.settings_ranges || {};

    // Use functional update so we read the *current* activeAlerts (not a stale
    // closure capture) when preserving evidence_urls on existing alerts.
    setActiveAlerts(prevAlerts => {
      const newAlerts: typeof prevAlerts = [];

      const checkRange = (name: string, value: string, range: { min?: string; max?: string } | undefined) => {
        if (!range || (!range.min && !range.max)) return;
        const val = parseFloat(value.replace(/[^0-9.]/g, ''));
        if (isNaN(val) && value !== '') return;

        const min = range.min ? parseFloat(range.min.replace(/[^0-9.]/g, '')) : -Infinity;
        const max = range.max ? parseFloat(range.max.replace(/[^0-9.]/g, '')) : Infinity;

        if (!isNaN(val) && (val < min || val > max)) {
          const existingAlert = prevAlerts.find(a => a.parameter_name === name);
          newAlerts.push({
            alert_type: 'out_of_range',
            parameter_name: name,
            expected_range: `Mín: ${range.min || '-'} / Máx: ${range.max || '-'}`,
            actual_value: value,
            severity: 'critical',
            description: `Risco de Perda: ${name} fora do intervalo recomendado (${value}).`,
            evidence_urls: existingAlert?.evidence_urls || [],
            is_critical_risk: true
          });
        }
      };

      checkRange('Passadas de Rodo', adjustmentParams.squeegee_passes, ranges.squeegee_passes);
      checkRange('Pressão', adjustmentParams.pressure, ranges.pressure);
      checkRange('Velocidade', adjustmentParams.speed, ranges.speed);
      checkRange('Temperatura', adjustmentParams.temperature, ranges.temperature);

      return newAlerts;
    });
  }, [adjustmentParams, selectedSheetId, technicalSheets]);

  useEffect(() => {
    if (checklist?.items) {
      const initialResponses: Record<string, {
        is_checked: boolean;
        measurement_value?: number;
        notes?: string;
        photo_url?: string;
      }> = {};
      checklist.items.forEach(item => {
        initialResponses[item.id] = {
          is_checked: false,
          measurement_value: undefined,
          notes: '',
        };
      });
      setResponses(initialResponses);
    }
  }, [checklist]);

  const handleResponseUpdate = (itemId: string, updates: Partial<{
    is_checked: boolean;
    measurement_value: number;
    notes: string;
    photo_url: string;
  }>) => {
    setResponses(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], ...updates }
    }));
  };

  const handleAddPart = () => {
    setParts([...parts, { _key: crypto.randomUUID(), name: '', code: '', quantity: 1 }]);
  };

  const handleRemovePart = (index: number) => {
    setParts(parts.filter((_, i) => i !== index));
  };

  const handleUpdatePart = (index: number, field: keyof typeof parts[0], value: string | number) => {
    const newParts = [...parts];
    newParts[index] = { ...newParts[index], [field]: value } as typeof parts[0];
    setParts(newParts);
  };

  const handleFileUpload = async (itemId: string, file: File) => {
    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `execution-evidences/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('tpm-evidences')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('tpm-evidences')
        .getPublicUrl(filePath);

      handleResponseUpdate(itemId, { photo_url: publicUrl });
      toast.success('Foto enviada com sucesso');
    } catch (error) {
      toast.error('Erro ao enviar foto');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAlertEvidenceUpload = async (alertIndex: number, file: File) => {
    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `execution-alerts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('execution-evidence')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('execution-evidence')
        .getPublicUrl(filePath);

      const newAlerts = [...activeAlerts];
      newAlerts[alertIndex].evidence_urls = [...newAlerts[alertIndex].evidence_urls, publicUrl];
      setActiveAlerts(newAlerts);

      toast.success('Evidência anexada com sucesso');
    } catch (error) {

      toast.error('Erro ao enviar evidência');
    } finally {
      setIsUploading(false);
    }
  };

  const handleComplete = () => {
    // Validação obrigatória de Produto/Técnica (Ficha Técnica)
    if (!selectedSheetId) {
      toast.error("Seleção de Ficha Técnica (Produto/Técnica) é obrigatória para esta execução.");
      return;
    }

    if (checklist?.items) {
      const missingCritical = checklist.items.filter(item =>
        item.is_critical && !responses[item.id]?.is_checked
      );

      if (missingCritical.length > 0) {
        toast.error(`Existem itens críticos não marcados: ${missingCritical.map(i => i.description).join(', ')}`);
        return;
      }
    }

    // Validação de Requisitos de Qualidade da Ficha Técnica
    if (selectedSheetId) {
      const sheet = technicalSheets.find(s => s.id === selectedSheetId);
      if (sheet?.quality_checklist && sheet.quality_checklist.length > 0) {
        const missingQuality = sheet.quality_checklist.filter(item =>
          item.required && (!qualityResponses[item.id] || !qualityResponses[item.id].approved)
        );

        if (missingQuality.length > 0) {
          toast.error(`Existem requisitos de qualidade obrigatórios não atendidos ou reprovados.`);
          return;
        }
      }
    }

    // Validação de riscos críticos (Alertas de parâmetros)
    const criticalAlerts = activeAlerts.filter(a => a.is_critical_risk);
    const criticalWithoutEvidence = criticalAlerts.filter(a => a.evidence_urls.length === 0);

    if (criticalWithoutEvidence.length > 0) {
      toast.error(`Atenção: Existem riscos críticos (parâmetros fora do range) que exigem o anexo de evidências (fotos) antes de prosseguir.`, {
        description: `Parâmetros: ${criticalWithoutEvidence.map(a => a.parameter_name).join(', ')}`
      });
      return;
    }

    // Se houver riscos críticos mas com evidências, solicitar justificativa final
    if (criticalAlerts.length > 0 && !notes) {
      toast.warning("Riscos críticos detectados. Por favor, preencha as Observações/Justificativa final antes de concluir.", {
        description: "Você anexou as evidências, mas uma explicação textual é necessária para o override."
      });
      return;
    }

    onComplete({
      notes,
      total_cost: totalCost,
      downtime_minutes: downtime,
      responses: Object.entries(responses).map(([itemId, resp]) => ({
        checklist_item_id: itemId,
        ...resp
      })),
      parts,
      signature,
      checklist_version: checklist?.version,
      checklist_snapshot: checklist ? {
        id: checklist.id,
        name: checklist.name,
        items: checklist.items?.map(i => ({
          id: i.id,
          description: i.description,
          is_critical: i.is_critical,
          requires_photo: i.requires_photo,
          requires_measurement: i.requires_measurement,
          measurement_unit: i.measurement_unit
        })) || []
      } : undefined,
      technical_sheet_id: selectedSheetId || undefined,
      technical_sheet_version: selectedSheetId ? (technicalSheets.find(s => s.id === selectedSheetId)?.version) : undefined,
      quality_responses: Object.entries(qualityResponses).map(([id, data]) => ({
        item: id,
        status: data.approved ? 'pass' : 'fail',
        notes: data.justification
      })),
      adjustment_parameters: {
        ...adjustmentParams,
        recommended: selectedSheetId ? (technicalSheets.find(s => s.id === selectedSheetId)?.machine_settings || undefined) : undefined,
        ranges: selectedSheetId ? (technicalSheets.find(s => s.id === selectedSheetId)?.settings_ranges || undefined) : undefined
      },
      supplies_used: Object.entries(suppliesUsed)
        .filter(([_, data]) => data.is_checked)
        .map(([id, data]) => ({
          original_recommended_id: id,
          name: data.name,
          quantity: data.quantity,
          alternative_used: data.alternative_used
        })),
      execution_alerts: activeAlerts,
      failure_risk_detected: activeAlerts.length > 0
    });
  };

  if (!schedule) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Wrench className="h-6 w-6 text-primary" />
            Executar Manutenção: {schedule.name}
          </DialogTitle>
          <DialogDescription>
            Máquina: {schedule.machine?.name} ({schedule.machine?.code})
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4 -mr-4">
          <div className="space-y-6 py-4">
            {/* Checklist Items */}
            {checklist ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  Checklist Obrigatório
                </h3>
                <div className="space-y-3">
                  {checklist.items?.map((item) => (
                    <ChecklistItem
                      key={item.id}
                      item={item}
                      response={responses[item.id]}
                      onUpdate={(updates) => handleResponseUpdate(item.id, updates)}
                      onFileUpload={(file) => handleFileUpload(item.id, file)}
                      isUploading={isUploading}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-warning/10 border border-warning/20 text-warning">
                <AlertTriangle className="h-5 w-5" />
                <p className="text-sm">Nenhum checklist configurado para este tipo de manutenção.</p>
              </div>
            )}

            {/* Alert/Risk Monitoring */}
            <AlertRiskPanel
              alerts={activeAlerts}
              onEvidenceUpload={handleAlertEvidenceUpload}
              isUploading={isUploading}
            />

            {/* Technical Sheet & Adjustments */}
            <div className="space-y-4 pt-4 border-t border-border/50">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Zap className="h-5 w-5 text-warning" />
                Regulagem Técnica
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Vincular Ficha Técnica (Obrigatório) *</Label>
                  <Select
                    value={selectedSheetId || ""}
                    onValueChange={(value) => setSelectedSheetId(value || null)}
                  >
                    <SelectTrigger className={!selectedSheetId ? "border-destructive/50" : ""}>
                      <SelectValue placeholder="Selecione o Produto/Técnica..." />
                    </SelectTrigger>
                    <SelectContent>
                      {technicalSheets.filter(s => s.recommended_machine_id === schedule.machine_id).map(sheet => (
                        <SelectItem key={sheet.id} value={sheet.id}>{sheet.title} ({sheet.techniques?.name || 'Técnica'})</SelectItem>
                      ))}
                      {technicalSheets.filter(s => s.recommended_machine_id !== schedule.machine_id).length > 0 && (
                        <>
                          <Separator className="my-2" />
                          <p className="px-2 py-1 text-[10px] font-bold uppercase text-muted-foreground">Outras Máquinas</p>
                          {technicalSheets.filter(s => s.recommended_machine_id !== schedule.machine_id).map(sheet => (
                            <SelectItem key={sheet.id} value={sheet.id}>{sheet.title} (Outra Máquina)</SelectItem>
                          ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <AdjustmentParameters
                  adjustmentParams={adjustmentParams}
                  setAdjustmentParams={setAdjustmentParams}
                  activeAlerts={activeAlerts}
                  selectedSheetId={selectedSheetId}
                  technicalSheets={technicalSheets}
                />

                {/* Real-time Alerts Panel */}
                {activeAlerts.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-xs font-bold text-destructive uppercase flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Alertas de Risco Identificados
                    </Label>
                    <div className="space-y-2">
                      {activeAlerts.map((alert, idx) => (
                        <div key={idx} className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 flex items-start justify-between gap-3">
                          <div className="flex-1 space-y-1">
                            <p className="text-sm font-semibold text-destructive">{alert.description}</p>
                            <p className="text-[10px] text-muted-foreground">Range: {alert.expected_range}</p>
                            {alert.evidence_urls.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {alert.evidence_urls.map((url, i) => (
                                  <img key={i} src={url} alt="Evidência" className="h-10 w-10 object-cover rounded border" />
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <div className="relative">
                              <Input
                                type="file"
                                className="hidden"
                                id={`evidence-${idx}`}
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleAlertEvidenceUpload(idx, file);
                                }}
                                disabled={isUploading}
                              />
                              <Label
                                htmlFor={`evidence-${idx}`}
                                className="inline-flex items-center justify-center rounded-md text-[10px] font-medium border border-destructive/20 bg-background hover:bg-destructive/5 h-7 px-2 cursor-pointer gap-1 text-destructive"
                              >
                                <Camera className="h-3 w-3" /> Anexar Evidência
                              </Label>
                            </div>
                            {alert.is_critical_risk && alert.evidence_urls.length === 0 && (
                              <Badge variant="outline" className="text-[8px] bg-destructive/10 text-destructive border-destructive/20 uppercase">
                                Bloqueante
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedSheetId && technicalSheets.find(s => s.id === selectedSheetId)?.setup_instructions && (
                  <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/10 space-y-2">
                    <Label className="text-xs text-blue-700 font-bold uppercase flex items-center gap-1">
                      <Info className="h-3 w-3" /> Setup e Preparação
                    </Label>
                    <p className="text-xs text-blue-800 whitespace-pre-wrap">
                      {technicalSheets.find(s => s.id === selectedSheetId)?.setup_instructions}
                    </p>
                  </div>
                )}

                {/* Supplies Used Tracking */}
                {selectedSheetId && Object.keys(suppliesUsed).length > 0 && (
                  <SupplyList
                    supplies={suppliesUsed}
                    onUpdate={(id, updates) => setSuppliesUsed(prev => ({
                      ...prev,
                      [id]: { ...prev[id], ...updates }
                    }))}
                  />
                )}

                {selectedSheetId && technicalSheets.find(s => s.id === selectedSheetId)?.quality_checklist && (technicalSheets.find(s => s.id === selectedSheetId)?.quality_checklist?.length || 0) > 0 && (
                  <div className="space-y-3 pt-2">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <CheckSquare className="h-4 w-4 text-success" />
                      Checklist de Qualidade (Obrigatório)
                    </Label>
                    <div className="grid grid-cols-1 gap-3">
                      {technicalSheets.find(s => s.id === selectedSheetId)?.quality_checklist?.map((item) => (
                        <div key={item.id} className="space-y-2 p-3 rounded-lg bg-success/5 border border-success/10">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              id={`quality-${item.id}`}
                              checked={qualityResponses[item.id]?.approved || false}
                              onCheckedChange={(checked) => setQualityResponses(prev => ({
                                ...prev,
                                [item.id]: { ...prev[item.id], approved: !!checked }
                              }))}
                            />
                            <Label htmlFor={`quality-${item.id}`} className="text-sm cursor-pointer flex-1">
                              {item.description}
                              {item.required && <span className="text-destructive ml-1">*</span>}
                            </Label>
                          </div>
                          {!qualityResponses[item.id]?.approved && (
                            <div className="pl-7">
                              <Input
                                placeholder="Justificativa da reprovação/pendência..."
                                className="h-8 text-xs bg-background"
                                value={qualityResponses[item.id]?.justification || ""}
                                onChange={(e) => setQualityResponses(prev => ({
                                  ...prev,
                                  [item.id]: { ...prev[item.id], justification: e.target.value }
                                }))}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* General Info */}
            <div className="space-y-4 pt-4 border-t border-border/50">
              <h3 className="text-lg font-semibold">Informações Gerais</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Tempo de Máquina Parada (min)
                  </Label>
                  <Input
                    type="number"
                    value={downtime}
                    onChange={(e) => setDowntime(parseInt(e.target.value, 10) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Custo Total (Opcional)</Label>
                  <Input
                    type="number"
                    placeholder="R$ 0,00"
                    value={totalCost}
                    onChange={(e) => setTotalCost(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Observações Adicionais</Label>
                <Textarea
                  placeholder="Relate problemas encontrados, peças trocadas, etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>

              {/* Parts Replacement */}
              <ReplacementParts
                parts={parts}
                onAdd={handleAddPart}
                onRemove={handleRemovePart}
                onUpdate={handleUpdatePart}
              />

              {/* Signature */}
              <div className="space-y-4 pt-4 border-t border-border/50">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <PenTool className="h-5 w-5 text-primary" />
                  Assinatura Digital
                </h3>
                <div className="p-4 border border-dashed rounded-lg bg-muted/20 text-center">
                  <Input
                    placeholder="Assine aqui (Nome Completo)"
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    className="max-w-md mx-auto text-center font-serif italic text-lg"
                  />
                  <p className="text-[10px] text-muted-foreground mt-2">Esta assinatura declara a veracidade dos dados informados.</p>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
          <Button onClick={handleComplete} disabled={isSubmitting} className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {isSubmitting ? 'Salvando...' : 'Concluir Manutenção'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
