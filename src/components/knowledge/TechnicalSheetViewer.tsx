import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Edit, Clock, Wrench, ListOrdered, Package, Lightbulb,
  AlertTriangle, Info, CheckCircle2, FileDown, Copy, Star, TrendingUp,
  QrCode, Maximize2, Zap, Droplets, MoveHorizontal, Thermometer,
  CheckSquare, History, ArrowLeftRight
} from 'lucide-react';
import {
  useTechnicalSheetDetails,
  useTechnicalSheetAudit,
  useTechnicalSheetFavorites,
  useTechnicalSheetMutations
} from '@/hooks/useTechnicalSheets';
import { useInventory } from '@/features/inventory';
import { KnowledgeSheetQRCode } from './KnowledgeSheetQRCode';
import { KnowledgeStatusBadge } from './KnowledgeStatusBadge';
import { VisualReference } from './TechnicalSheetVisualReference';
import { MaterialCalculator } from './TechnicalSheetMaterialCalculator';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TechnicalSheetViewerProps {
  sheetId: string;
  onEdit?: () => void;
  onDuplicate?: () => void;
}

export const TechnicalSheetViewer = ({ sheetId, onEdit, onDuplicate }: TechnicalSheetViewerProps) => {
  const { sheet, steps, sheetMaterials, tips, isLoading } = useTechnicalSheetDetails(sheetId);
  const { data: auditLogs = [], isLoading: isLoadingAudit } = useTechnicalSheetAudit(sheetId);
  const { data: favorites = [] } = useTechnicalSheetFavorites();
  const { items: inventoryItems } = useInventory();
  const { toggleFavorite } = useTechnicalSheetMutations();
  const [checklistMode, setChecklistMode] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [showQR, setShowQR] = useState(false);
  const [productionQuantity, setProductionQuantity] = useState(100);

  const toggleStep = (stepId: string) => {
    setCompletedSteps(prev => {
      const next = new Set(prev);
      if (next.has(stepId)) next.delete(stepId);
      else next.add(stepId);
      return next;
    });
  };

  const handleExportPDF = async () => {
    if (!sheet) return;
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      let y = 20;

      doc.setFontSize(18);
      doc.text(sheet.title, 14, y);
      y += 10;

      if (sheet.description) {
        doc.setFontSize(10);
        const descLines = doc.splitTextToSize(sheet.description, 180);
        doc.text(descLines, 14, y);
        y += descLines.length * 5 + 5;
      }

      if (sheet.techniques) {
        doc.setFontSize(9);
        doc.text(`Técnica: ${sheet.techniques.name}`, 14, y);
        y += 6;
      }
      if (sheet.machines) {
        doc.text(`Máquina: ${sheet.machines.name} (${sheet.machines.code})`, 14, y);
        y += 6;
      }
      if (sheet.estimated_time_minutes) {
        doc.text(`Tempo estimado: ${sheet.estimated_time_minutes} minutos`, 14, y);
        y += 10;
      }

      if (sheetMaterials.length > 0) {
        doc.setFontSize(12);
        doc.text('Materiais e Insumos', 14, y);
        y += 7;
        doc.setFontSize(9);
        sheetMaterials.forEach(m => {
          doc.text(`• ${m.name}${m.quantity ? ` (${m.quantity})` : ''}${m.specification ? ` - ${m.specification}` : ''}`, 18, y);
          y += 5;
          if (y > 270) { doc.addPage(); y = 20; }
        });
        y += 5;
      }

      if (sheet.quality_checklist && sheet.quality_checklist.length > 0) {
        doc.setFontSize(12);
        doc.text('Critérios de Qualidade', 14, y);
        y += 7;
        doc.setFontSize(9);
        sheet.quality_checklist.forEach(item => {
          doc.text(`[ ] ${item.description}${item.required ? ' (OBRIGATÓRIO)' : ''}`, 18, y);
          y += 5;
          if (y > 270) { doc.addPage(); y = 20; }
        });
        y += 5;
      }

      if (steps.length > 0) {
        doc.setFontSize(12);
        doc.text('Passo a Passo', 14, y);
        y += 7;
        steps.forEach(step => {
          if (y > 250) { doc.addPage(); y = 20; }
          doc.setFontSize(10);
          doc.text(`${step.step_number}. ${step.title}`, 14, y);
          y += 6;
          doc.setFontSize(9);
          const stepLines = doc.splitTextToSize(step.description, 170);
          doc.text(stepLines, 18, y);
          y += stepLines.length * 5 + 3;
          if (step.tips) {
            doc.text(`💡 ${step.tips}`, 18, y);
            y += 5;
          }
          if (step.warnings) {
            doc.text(`⚠️ ${step.warnings}`, 18, y);
            y += 5;
          }
          y += 3;
        });
      }

      if (tips.length > 0) {
        if (y > 250) { doc.addPage(); y = 20; }
        doc.setFontSize(12);
        doc.text('Dicas e Observações', 14, y);
        y += 7;
        doc.setFontSize(9);
        tips.forEach(tip => {
          const prefix = tip.tip_type === 'warning' ? '⚠️' : tip.tip_type === 'important' ? 'ℹ️' : '💡';
          const tipLines = doc.splitTextToSize(`${prefix} ${tip.content}`, 175);
          doc.text(tipLines, 18, y);
          y += tipLines.length * 5 + 3;
          if (y > 270) { doc.addPage(); y = 20; }
        });
      }

      doc.save(`ficha-${sheet.title.replace(/\s+/g, '-').toLowerCase()}.pdf`);
      toast.success('PDF exportado com sucesso!');
    } catch {
      toast.error('Erro ao gerar PDF');
    }
  };

  if (isLoading) {
    return (
      <Card className="glass-card border-border/50 h-full flex items-center justify-center">
        <div className="text-muted-foreground">Carregando...</div>
      </Card>
    );
  }

  if (!sheet) {
    return (
      <Card className="glass-card border-border/50 h-full flex items-center justify-center">
        <div className="text-muted-foreground">Ficha não encontrada</div>
      </Card>
    );
  }

  const getTipIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'important': return <Info className="h-4 w-4 text-primary" />;
      default: return <Lightbulb className="h-4 w-4 text-accent-foreground" />;
    }
  };

  const getTipBgColor = (type: string) => {
    switch (type) {
      case 'warning': return 'bg-destructive/10 border-destructive/30';
      case 'important': return 'bg-primary/10 border-primary/30';
      default: return 'bg-accent/30 border-accent/50';
    }
  };

  const progress = steps.length > 0 ? Math.round((completedSteps.size / steps.length) * 100) : 0;

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full overflow-hidden">
      <Card className="glass-card border-border/50 flex-1 flex flex-col overflow-hidden">
        <CardHeader className="pb-4 shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {sheet.techniques && (
                  <Badge
                    style={{ backgroundColor: `${sheet.techniques.color}20`, color: sheet.techniques.color, borderColor: `${sheet.techniques.color}50` }}
                    className="border"
                  >
                    {sheet.techniques.short_name}
                  </Badge>
                )}
                {sheet.product_categories && (
                  <Badge variant="outline">{sheet.product_categories.name}</Badge>
                )}
                {sheet.materials && (
                  <Badge variant="secondary">{sheet.materials.name}</Badge>
                )}
              </div>
              <div className="flex items-center gap-3">
                <CardTitle className="text-xl truncate">{sheet.title}</CardTitle>
                <KnowledgeStatusBadge status={sheet.status} />
                <Badge variant="outline" className="text-[10px] font-bold">v{sheet.version || '1'}</Badge>
              </div>
              <div className="flex items-center gap-4 mt-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">Última atualização:</span>
                  <span className="text-[10px] text-muted-foreground">{format(new Date(sheet.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="h-3 w-3 text-success" />
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase">{sheet.view_count || 0} ACESSOS</span>
                </div>
              </div>
              {sheet.description && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{sheet.description}</p>
              )}
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggleFavorite.mutate({ sheetId, isFavorite: favorites.includes(sheetId) })}
                className={favorites.includes(sheetId) ? "text-warning fill-amber-500" : "text-muted-foreground"}
                title={favorites.includes(sheetId) ? "Remover dos favoritos" : "Adicionar aos favoritos"}
              >
                <Star className="h-4 w-4" />
              </Button>
              {onDuplicate && (
                <Button variant="ghost" size="icon" onClick={onDuplicate} title="Duplicar ficha">
                  <Copy className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => setShowQR(!showQR)} title="QR Code">
                <QrCode className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-1.5">
                <FileDown className="h-4 w-4" />
                <span className="hidden sm:inline">PDF</span>
              </Button>
              {onEdit && (
                <Button variant="outline" size="sm" onClick={onEdit} className="gap-1.5">
                  <Edit className="h-4 w-4" />
                  <span className="hidden sm:inline">Editar</span>
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 mt-4 flex-wrap">
            {sheet.estimated_time_minutes && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{sheet.estimated_time_minutes} minutos</span>
              </div>
            )}
            {sheet.machines && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Wrench className="h-4 w-4" />
                <span>{sheet.machines.name} ({sheet.machines.code})</span>
              </div>
            )}
            {steps.length > 0 && (
              <Button
                variant={checklistMode ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setChecklistMode(!checklistMode);
                  if (checklistMode) setCompletedSteps(new Set());
                }}
                className="gap-1.5 ml-auto"
              >
                <CheckCircle2 className="h-4 w-4" />
                {checklistMode ? `${progress}%` : 'Checklist'}
              </Button>
            )}
          </div>

          {checklistMode && steps.length > 0 && (
            <div className="mt-3">
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {completedSteps.size} de {steps.length} passos concluídos
              </p>
            </div>
          )}
        </CardHeader>

        <Separator />

        <CardContent className="flex-1 overflow-hidden p-0">
          <Tabs defaultValue="sheet" className="h-full flex flex-col">
            <div className="px-6 pt-2">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="sheet" className="gap-2">
                  <FileDown className="h-4 w-4" />
                  Ficha Técnica
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-2">
                  <History className="h-4 w-4" />
                  Histórico de Auditoria
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="sheet" className="flex-1 overflow-hidden m-0 border-none p-0">
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
                    setProductionQuantity={setProductionQuantity}
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
                                  onCheckedChange={() => toggleStep(step.id)}
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
            </TabsContent>

            <TabsContent value="history" className="flex-1 overflow-hidden m-0 border-none p-0">
              <ScrollArea className="h-full">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-semibold">Log de Alterações</h3>
                      <p className="text-sm text-muted-foreground">Rastreabilidade completa de edições e homologações</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {isLoadingAudit ? (
                      <div className="text-center py-4 text-xs text-muted-foreground">Carregando histórico...</div>
                    ) : auditLogs.length > 0 ? (
                      auditLogs.map((log) => {
                        const profiles = (log.profiles ?? null) as { avatar_url?: string | null; display_name?: string | null } | null;
                        return (
                        <div key={log.id} className="relative pl-8 pb-8 border-l last:border-l-0">
                          <div className={`absolute -left-1.5 top-0 w-3 h-3 rounded-full ${
                            log.action === 'CREATE' ? 'bg-success' :
                            log.action === 'DELETE' ? 'bg-rose-500' : 'bg-primary'
                          } shadow-sm`} />
                          <div className="bg-muted/30 p-4 rounded-lg border border-border/50">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold uppercase tracking-wider">
                                {log.action === 'CREATE' ? 'Criação' :
                                 log.action === 'UPDATE' ? 'Atualização' :
                                 log.action === 'VERSION_BUMP' ? 'Nova Versão' : log.action}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {log.created_at ? format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm") : '-'}
                              </span>
                            </div>
                            <p className="text-sm">
                              {log.change_summary || (log.action === 'CREATE' ? 'Ficha técnica criada.' : 'Alterações realizadas nos parâmetros.')}
                            </p>
                            <div className="flex items-center gap-2 mt-3">
                              {profiles?.avatar_url ? (
                                <img src={profiles.avatar_url} alt={profiles.display_name ?? ''} className="h-6 w-6 rounded-full" />
                              ) : (
                                <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold">
                                  {profiles?.display_name?.substring(0, 2).toUpperCase() || '??'}
                                </div>
                              )}
                              <span className="text-xs font-medium">{profiles?.display_name || 'Sistema'}</span>
                            </div>
                          </div>
                        </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <History className="h-8 w-8 mx-auto mb-2 opacity-20" />
                        <p className="text-xs">Nenhum registro de auditoria encontrado.</p>
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {showQR && (
        <div className="w-full lg:w-56 flex-shrink-0">
          <KnowledgeSheetQRCode sheetId={sheetId} title={sheet.title} />
        </div>
      )}
    </div>
  );
};
