import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle2, Clock, Copy, Edit, FileDown, QrCode, Star, TrendingUp, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CardHeader, CardTitle } from '@/components/ui/card';
import { KnowledgeStatusBadge } from '@/components/knowledge/KnowledgeStatusBadge';
import type { TechnicalSheet, TechnicalSheetStep } from '@/hooks/technical-sheets/technicalSheetsTypes';

interface TechnicalSheetHeaderProps {
  sheet: TechnicalSheet;
  steps: TechnicalSheetStep[];
  isFavorite: boolean;
  onToggleFavorite: () => void;
  checklistMode: boolean;
  onChecklistModeChange: (value: boolean) => void;
  progress: number;
  completedCount: number;
  onShowQR: () => void;
  onExportPDF: () => void;
  onEdit?: () => void;
  onDuplicate?: () => void;
}

export function TechnicalSheetHeader({ sheet, steps, isFavorite, onToggleFavorite, checklistMode, onChecklistModeChange, progress, completedCount, onShowQR, onExportPDF, onEdit, onDuplicate }: TechnicalSheetHeaderProps) {
  return (
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
                onClick={() => onToggleFavorite()}
                className={isFavorite ? "text-warning fill-amber-500" : "text-muted-foreground"}
                title={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
              >
                <Star className="h-4 w-4" />
              </Button>
              {onDuplicate && (
                <Button variant="ghost" size="icon" onClick={onDuplicate} title="Duplicar ficha">
                  <Copy className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={onShowQR} title="QR Code">
                <QrCode className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={onExportPDF} className="gap-1.5">
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
                onClick={() => onChecklistModeChange(!checklistMode)}
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
                {completedCount} de {steps.length} passos concluídos
              </p>
            </div>
          )}
        </CardHeader>

  );
}
