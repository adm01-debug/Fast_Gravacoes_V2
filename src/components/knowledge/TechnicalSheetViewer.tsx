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
import { TechnicalSheetHeader } from '@/components/knowledge/TechnicalSheetHeader';
import { TechnicalSheetTab } from '@/components/knowledge/TechnicalSheetTab';
import { TechnicalSheetHistoryTab } from '@/components/knowledge/TechnicalSheetHistoryTab';

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



  const progress = steps.length > 0 ? Math.round((completedSteps.size / steps.length) * 100) : 0;

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full overflow-hidden">
      <Card className="glass-card border-border/50 flex-1 flex flex-col overflow-hidden">
        <TechnicalSheetHeader
          sheet={sheet}
          steps={steps}
          isFavorite={favorites.includes(sheetId)}
          onToggleFavorite={() => toggleFavorite.mutate({ sheetId, isFavorite: favorites.includes(sheetId) })}
          checklistMode={checklistMode}
          onChecklistModeChange={(v) => { setChecklistMode(v); if (!v) setCompletedSteps(new Set()); }}
          progress={progress}
          completedCount={completedSteps.size}
          onShowQR={() => setShowQR(!showQR)}
          onExportPDF={handleExportPDF}
          onEdit={onEdit}
          onDuplicate={onDuplicate}
        />
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
              <TechnicalSheetTab
                sheet={sheet}
                steps={steps}
                sheetMaterials={sheetMaterials}
                tips={tips}
                inventoryItems={inventoryItems}
                checklistMode={checklistMode}
                completedSteps={completedSteps}
                onToggleStep={toggleStep}
                productionQuantity={productionQuantity}
                onProductionQuantityChange={setProductionQuantity}
                onEdit={onEdit}
              />
            </TabsContent>

            <TabsContent value="history" className="flex-1 overflow-hidden m-0 border-none p-0">
              <TechnicalSheetHistoryTab
                auditLogs={auditLogs}
                isLoading={isLoadingAudit}
              />
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
