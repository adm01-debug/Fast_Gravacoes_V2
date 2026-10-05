import { AlertTriangle, CheckSquare, Info, Zap, Camera } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { AdjustmentParameters } from '@/features/maintenance/components/execution/AdjustmentParameters';
import type { AdjustmentParams } from '@/features/maintenance/components/execution/AdjustmentParameters';
import { SupplyList } from '@/features/maintenance/components/execution/SupplyList';
import type { TechnicalSheet } from '@/hooks/useTechnicalSheets';
import type { ExecutionAlert } from '@/features/maintenance/components/MaintenanceExecutionModal';

interface QualityResponse {
  approved: boolean;
  justification?: string;
}

interface SupplyEntry {
  quantity: string;
  alternative_used: boolean;
  name: string;
  is_checked: boolean;
}

interface RegulagemSectionProps {
  machineId: string | undefined;
  technicalSheets: TechnicalSheet[];
  selectedSheetId: string | null;
  onSheetChange: (value: string | null) => void;
  adjustmentParams: AdjustmentParams;
  setAdjustmentParams: (fn: (prev: AdjustmentParams) => AdjustmentParams) => void;
  activeAlerts: ExecutionAlert[];
  suppliesUsed: Record<string, SupplyEntry>;
  setSuppliesUsed: (fn: (prev: Record<string, SupplyEntry>) => Record<string, SupplyEntry>) => void;
  qualityResponses: Record<string, QualityResponse>;
  setQualityResponses: (fn: (prev: Record<string, QualityResponse>) => Record<string, QualityResponse>) => void;
  onAlertEvidenceUpload: (alertIndex: number, file: File) => void;
  isUploading: boolean;
}

export function RegulagemSection({
  machineId, technicalSheets, selectedSheetId, onSheetChange,
  adjustmentParams, setAdjustmentParams, activeAlerts,
  suppliesUsed, setSuppliesUsed, qualityResponses, setQualityResponses,
  onAlertEvidenceUpload, isUploading,
}: RegulagemSectionProps) {
  return (
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
                    onValueChange={(value) => onSheetChange(value || null)}
                  >
                    <SelectTrigger className={!selectedSheetId ? "border-destructive/50" : ""}>
                      <SelectValue placeholder="Selecione o Produto/Técnica..." />
                    </SelectTrigger>
                    <SelectContent>
                      {technicalSheets.filter(s => s.recommended_machine_id === machineId).map(sheet => (
                        <SelectItem key={sheet.id} value={sheet.id}>{sheet.title} ({sheet.techniques?.name || 'Técnica'})</SelectItem>
                      ))}
                      {technicalSheets.filter(s => s.recommended_machine_id !== machineId).length > 0 && (
                        <>
                          <Separator className="my-2" />
                          <p className="px-2 py-1 text-[10px] font-bold uppercase text-muted-foreground">Outras Máquinas</p>
                          {technicalSheets.filter(s => s.recommended_machine_id !== machineId).map(sheet => (
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
                                  if (file) onAlertEvidenceUpload(idx, file);
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
  );
}
