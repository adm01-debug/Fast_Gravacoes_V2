import { AlertTriangle, CheckCircle2, CheckSquare, Droplets, Info, Lightbulb, ListOrdered, MoveHorizontal, Package, Thermometer, Wrench, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { MaterialCalculator } from '@/components/knowledge/TechnicalSheetMaterialCalculator';
import { VisualReference } from '@/components/knowledge/TechnicalSheetVisualReference';
import type { TechnicalSheet, TechnicalSheetMaterial, TechnicalSheetStep, TechnicalSheetTip } from '@/hooks/technical-sheets/technicalSheetsTypes';
import type { useInventory } from '@/features/inventory/hooks/useInventory';

type InventoryItems = ReturnType<typeof useInventory>['items'];

interface TechnicalSheetTabProps {
  sheet: TechnicalSheet;
  steps: TechnicalSheetStep[];
  sheetMaterials: TechnicalSheetMaterial[];
  tips: TechnicalSheetTip[];
  inventoryItems: InventoryItems;
  checklistMode: boolean;
  completedSteps: Set<string>;
  onToggleStep: (stepId: string) => void;
  productionQuantity: number;
  onProductionQuantityChange: (qty: number) => void;
  onEdit?: () => void;
}

function getTipIcon(type: string) {
  switch (type) {
    case 'warning': return <AlertTriangle className="h-4 w-4 text-destructive" />;
    case 'important': return <Info className="h-4 w-4 text-primary" />;
    default: return <Lightbulb className="h-4 w-4 text-accent-foreground" />;
  }
}

function getTipBgColor(type: string) {
  switch (type) {
    case 'warning': return 'bg-destructive/10 border-destructive/30';
    case 'important': return 'bg-primary/10 border-primary/30';
    default: return 'bg-accent/30 border-accent/50';
  }
}

export function TechnicalSheetTab({ sheet, steps, sheetMaterials, tips, inventoryItems, checklistMode, completedSteps, onToggleStep, productionQuantity, onProductionQuantityChange, onEdit }: TechnicalSheetTabProps) {
  return (
                  <ScrollArea className="h-full">
                <div className="p-6 space-y-8">
                  {/* Visual Reference Section (Etapa 3) */}
                  <VisualReference
                    goldStandardUrl={sheet.gold_standard_image_url || undefined}
                    failureStandardUrl={sheet.failure_standard_image_url || undefined}
                  />

                  {/* Technical Settings Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {(sheet.ink_specifications || sheet.tooling_specifications || sheet.materials?.name) && (
                      <div className="space-y-4">
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-primary">
                          <Droplets className="h-4 w-4" />
                          Insumos e Personalização Premium
                        </h3>
                        <div className="space-y-3">
                          {sheet.materials?.name && (
                            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 animate-in fade-in slide-in-from-left-2">
                              <Label className="text-[10px] text-primary uppercase font-black flex items-center gap-1">
                                <Package className="h-3 w-3" /> Recomendação por Material
                              </Label>
                              <p className="text-sm font-bold mt-1">
                                {sheet.materials.name.toLowerCase().includes('metal') ? 'Aderência Crítica: Use Primer ou Tinta Epóxi' : 
                                 sheet.materials.name.toLowerCase().includes('tecido') ? 'Elasticidade: Use Tinta Elástica / Sericryl' :
                                 'Aderência Padrão: Verifique compatibilidade de solvente'}
                              </p>
                            </div>
                          )}
                          {sheet.ink_specifications && (
                            <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                              <Label className="text-[10px] text-muted-foreground uppercase">Tinta / Solventes / Pigmentos</Label>
                              <p className="text-sm font-medium">{sheet.ink_specifications}</p>
                            </div>
                          )}
                          {sheet.tooling_specifications && (
                            <div className="p-3 rounded-lg bg-secondary/20 border border-border/30">
                              <Label className="text-[10px] text-muted-foreground uppercase">Ferramental (Rodo/Lâmina/Tela)</Label>
                              <p className="text-sm font-medium">{sheet.tooling_specifications}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {sheet.machine_settings && Object.values(sheet.machine_settings).some(v => v) && (
                      <div className="space-y-4">
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-warning">
                          <Zap className="h-4 w-4" />
                          Regulagem da Máquina
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                          {['squeegee_passes', 'pressure', 'speed', 'temperature'].map((param) => {
                            const labels: Record<string, string> = {
                              squeegee_passes: 'Passadas',
                              pressure: 'Pressão',
                              speed: 'Velocidade',
                              temperature: 'Temperatura'
                            };
                            const machineSettings = sheet.machine_settings as Record<string, unknown> | null;
                            const settingsRanges = sheet.settings_ranges as Record<string, { min?: number; max?: number }> | null;
                            const value = machineSettings?.[param];
                            const range = settingsRanges?.[param];

                            if (!value && (!range || (!range.min && !range.max))) return null;

                            return (
                              <div key={param} className="p-3 rounded-lg bg-warning/5 border border-warning/10">
                                <Label className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                                  {param === 'temperature' ? <Thermometer className="h-3 w-3" /> : param === 'squeegee_passes' ? <MoveHorizontal className="h-3 w-3" /> : <Zap className="h-3 w-3" />} {labels[param]}
                                </Label>
                                <p className="text-sm font-bold">{String(value ?? '-') || '-'}</p>
                                {range && (range.min || range.max) && (
                                  <p className="text-[10px] text-muted-foreground mt-1 border-t border-warning/10 pt-1">
                                    Faixa: {range.min || '-'} a {range.max || '-'}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {sheet.machines && (
                    <Card className="bg-primary/5 border-primary/10 overflow-hidden">
                      <div className="p-3 bg-primary/10 border-b border-primary/10 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Wrench className="h-4 w-4 text-primary" />
                          <span className="text-xs font-bold text-primary uppercase tracking-tight">Suporte Técnico: {sheet.machines.name}</span>
                        </div>
                        <Button variant="link" size="sm" className="h-auto p-0 text-[10px] text-primary" onClick={() => window.open('/machines', '_self')}>
                          Ver Máquina
                        </Button>
                      </div>
                      <div className="p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <Info className="h-3 w-3 text-primary/60" />
                          <span className="text-[10px] text-muted-foreground">Em caso de falha mecânica, acione a manutenção via canal de TPM ou WhatsApp corporativo.</span>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="outline" className="text-[9px] bg-background">MANUAL PDF</Badge>
                          <Badge variant="outline" className="text-[9px] bg-background">CHECKLIST TPM</Badge>
                        </div>
                      </div>
                    </Card>
                  )}

                  {sheet.setup_instructions && (
                    <div className="space-y-4">
                      <h3 className="flex items-center gap-2 text-sm font-semibold text-blue-600">
                        <Info className="h-4 w-4" />
                        Setup e Preparação da Máquina
                      </h3>
                      <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/10">
                        <p className="text-sm whitespace-pre-wrap">{sheet.setup_instructions}</p>
                      </div>
                    </div>
                  )}

                  {sheet.quality_checklist && sheet.quality_checklist.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="flex items-center gap-2 text-sm font-semibold text-success">
                        <CheckSquare className="h-4 w-4" />
                        Critérios de Qualidade
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {sheet.quality_checklist.map((item) => (
                          <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg bg-success/5 border border-success/10">
                            <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                            <span className="text-sm font-medium">{item.description}</span>
                            {item.required && <Badge variant="outline" className="ml-auto text-[8px] h-4">REQ</Badge>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(sheet.gap_specifications || sheet.quality_requirements || sheet.challenges_notes || sheet.failure_scenarios) && (
                    <>
                      <Separator />
                      <div className="space-y-6">
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-blue-600">
                          <Info className="h-4 w-4" />
                          Produção e Qualidade
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {sheet.gap_specifications && (
                            <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                              <Label className="text-[10px] text-muted-foreground uppercase font-bold">GAP / Distanciamento</Label>
                              <p className="text-sm">{sheet.gap_specifications}</p>
                            </div>
                          )}
                          {sheet.quality_requirements && (
                            <div className="p-3 rounded-lg bg-success/5 border border-success/10">
                              <Label className="text-[10px] text-muted-foreground uppercase font-bold text-success">Requisitos de Qualidade</Label>
                              <p className="text-sm font-medium">{sheet.quality_requirements}</p>
                            </div>
                          )}
                        </div>

                        {sheet.challenges_notes && (
                          <div className="p-3 rounded-lg bg-warning/5 border border-warning/10">
                            <Label className="text-[10px] text-warning uppercase font-bold flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" /> Desafios Técnicos
                            </Label>
                            <p className="text-sm mt-1 whitespace-pre-wrap">{sheet.challenges_notes}</p>
                          </div>
                        )}

                        {sheet.failure_scenarios && (
                          <div className="p-3 rounded-lg bg-rose-500/5 border border-rose-500/10">
                            <Label className="text-[10px] text-rose-700 uppercase font-bold flex items-center gap-1">
                              <Info className="h-3 w-3" /> Cenários de Falha (Evitar Perdas)
                            </Label>
                            <p className="text-sm mt-1 text-rose-800 whitespace-pre-wrap">{sheet.failure_scenarios}</p>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  <Separator />

                  {/* Input Calculator Section (Etapa 4) */}
                  <MaterialCalculator
                    productionQuantity={productionQuantity}
                    setProductionQuantity={onProductionQuantityChange}
                    sheetMaterials={sheetMaterials}
                    inventoryItems={inventoryItems}
                  />

                  {steps.length > 0 && (
                    <div>
                      <h3 className="flex items-center gap-2 text-sm font-semibold mb-3">
                        <ListOrdered className="h-4 w-4 text-primary" />
                        Passo a Passo
                      </h3>
                      <div className="space-y-3">
                        {steps.map(step => (
                          <div
                            key={step.id}
                            className={`relative pl-8 pb-4 border-l-2 last:border-l-0 transition-opacity ${
                              checklistMode && completedSteps.has(step.id)
                                ? 'border-primary/50 opacity-60'
                                : 'border-primary/30'
                            }`}
                          >
                            {checklistMode ? (
                              <div className="absolute -left-3 top-0">
                                <Checkbox
                                  checked={completedSteps.has(step.id)}
                                  onCheckedChange={() => onToggleStep(step.id)}
                                  className="h-6 w-6 rounded-full"
                                />
                              </div>
                            ) : (
                              <div className="absolute -left-3 top-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                                {step.step_number}
                              </div>
                            )}
                            <div className={`p-4 rounded-lg bg-muted/20 border border-border/30 ${
                              checklistMode && completedSteps.has(step.id) ? 'line-through decoration-muted-foreground/50' : ''
                            }`}>
                              <h4 className="font-medium text-sm">{step.title}</h4>
                              <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{step.description}</p>
                              {step.tips && (
                                <div className="mt-3 p-2 rounded bg-accent/30 border border-accent/50 flex items-start gap-2">
                                  <Lightbulb className="h-4 w-4 text-accent-foreground flex-shrink-0 mt-0.5" />
                                  <span className="text-xs text-accent-foreground">{step.tips}</span>
                                </div>
                              )}
                              {step.warnings && (
                                <div className="mt-2 p-2 rounded bg-destructive/10 border border-destructive/30 flex items-start gap-2">
                                  <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                                  <span className="text-xs text-destructive">{step.warnings}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {tips.length > 0 && (
                    <div>
                      <h3 className="flex items-center gap-2 text-sm font-semibold mb-3">
                        <Lightbulb className="h-4 w-4 text-accent-foreground" />
                        Dicas e Observações
                      </h3>
                      <div className="space-y-2">
                        {tips.map(tip => (
                          <div
                            key={tip.id}
                            className={`p-3 rounded-lg border flex items-start gap-2 ${getTipBgColor(tip.tip_type)}`}
                          >
                            {getTipIcon(tip.tip_type)}
                            <span className="text-sm">{tip.content}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {steps.length === 0 && sheetMaterials.length === 0 && tips.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Esta ficha técnica ainda não possui conteúdo detalhado.</p>
                      {onEdit && (
                        <Button variant="link" onClick={onEdit} className="mt-2">
                          Adicionar conteúdo
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </ScrollArea>
  );
}
