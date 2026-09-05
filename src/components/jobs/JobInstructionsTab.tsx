import { useTechnicalSheets } from '@/hooks/useTechnicalSheets';
import { useDocuments } from '@/hooks/useDocuments';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FileText,
  Settings,
  Layers,
  Lightbulb,
  AlertTriangle,
  ChevronRight,
  BookOpen,
  Wrench,
  CheckCircle2,
  ExternalLink,
  Download
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { TechnicalSheet } from '@/hooks/technical-sheets/technicalSheetsTypes';
import { Button } from '@/components/ui/button';
import { sanitizeUrl } from '@/lib/sanitize';

interface JobInstructionsTabProps {
  techniqueId: string;
  productCategoryId?: string | null;
}

export function JobInstructionsTab({ techniqueId, productCategoryId }: JobInstructionsTabProps) {
  const { sheets, isLoadingSheets } = useTechnicalSheets();
  const [selectedSheetId, setSelectedSheetId] = useState<string | null>(null);

  // Filter sheets relevant to this job
  const relevantSheets = sheets?.filter((s: TechnicalSheet) =>
    s.is_active &&
    (s.technique_id === techniqueId) &&
    (!productCategoryId || !s.product_category_id || s.product_category_id === productCategoryId)
  ) || [];

  const selectedSheet = relevantSheets.find((s: TechnicalSheet) => s.id === selectedSheetId) || relevantSheets[0];

  const { documents, isLoading: isLoadingDocs } = useDocuments(selectedSheet?.id);

  if (isLoadingSheets || (selectedSheet && isLoadingDocs)) {
    return <div className="space-y-4 py-4"><Skeleton className="h-20 w-full" /><Skeleton className="h-40 w-full" /></div>;
  }

  if (relevantSheets.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed rounded-xl space-y-3">
        <BookOpen className="h-12 w-12 text-muted-foreground mx-auto opacity-50" />
        <div className="space-y-1">
          <p className="font-medium">Nenhuma ficha técnica encontrada</p>
          <p className="text-xs text-muted-foreground max-w-[250px] mx-auto">
            Não existem instruções técnicas cadastradas para esta técnica ou categoria de produto.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4">
      {/* Sheet Selection if multiple exist */}
      {relevantSheets.length > 1 && (
        <section className="space-y-2">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">Documentos Disponíveis</h4>
          <div className="flex flex-wrap gap-2">
            {relevantSheets.map(sheet => (
              <Badge
                key={sheet.id}
                variant={selectedSheetId === sheet.id ? "default" : "outline"}
                className="cursor-pointer py-1 px-3"
                onClick={() => setSelectedSheetId(sheet.id)}
              >
                {sheet.title}
              </Badge>
            ))}
          </div>
        </section>
      )}

      {selectedSheet && (
        <div className="space-y-6 animate-fade-in">
          <header className="space-y-1">
            <h3 className="text-lg font-bold">{selectedSheet.title}</h3>
            <p className="text-sm text-muted-foreground">{selectedSheet.description || 'Instruções técnicas de produção.'}</p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Machine Settings */}
            <Card className="bg-secondary/20 border-border/50 shadow-none">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Settings className="h-4 w-4 text-primary" /> Setup da Máquina
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {selectedSheet.setup_instructions ? (
                  <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {selectedSheet.setup_instructions}
                  </p>
                ) : (
                  <p className="text-[10px] italic text-muted-foreground">Instruções de setup não especificadas.</p>
                )}

                {selectedSheet.machine_settings && Object.keys(selectedSheet.machine_settings).length > 0 && (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {Object.entries(selectedSheet.machine_settings).map(([key, value]) => (
                      <div key={key} className="p-2 rounded bg-background border border-border/30">
                        <p className="text-[10px] font-bold uppercase text-muted-foreground">{key}</p>
                        <p className="text-xs font-mono">{String(value)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quality Requirements */}
            <Card className="bg-primary/5 border-primary/20 shadow-none">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" /> Requisitos de Qualidade
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {selectedSheet.quality_requirements ? (
                  <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {selectedSheet.quality_requirements}
                  </p>
                ) : (
                  <p className="text-[10px] italic text-muted-foreground">Requisitos de qualidade não especificados.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {/* Tooling & Materials */}
             <Card className="bg-secondary/20 border-border/50 shadow-none">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-primary" /> Ferramental e Insumos
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-3">
                {selectedSheet.tooling_specifications && (
                   <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground">Ferramental</p>
                      <p className="text-xs">{selectedSheet.tooling_specifications}</p>
                   </div>
                )}
                {selectedSheet.ink_specifications && (
                   <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground">Tintas/Químicos</p>
                      <p className="text-xs">{selectedSheet.ink_specifications}</p>
                   </div>
                )}
              </CardContent>
            </Card>

            {/* Failure Scenarios */}
            <Card className="bg-destructive/5 border-destructive/20 shadow-none">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" /> Pontos de Atenção
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {selectedSheet.failure_scenarios ? (
                  <p className="text-xs text-destructive/80 leading-relaxed whitespace-pre-wrap">
                    {selectedSheet.failure_scenarios}
                  </p>
                ) : (
                  <p className="text-[10px] italic text-muted-foreground">Nenhum cenário de falha mapeado.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Technical Documents Section */}
          {documents && documents.length > 0 && (
            <section className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                <FileText className="h-4 w-4" /> Arquivos e Desenhos Técnicos
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {documents.map(doc => (
                  <div key={doc.id} className="p-3 rounded-lg bg-secondary/30 border border-border/50 flex items-center justify-between group">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="p-2 rounded bg-background border border-border/30">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate">{doc.title}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">{doc.file_type.split('/')[1] || 'PDF'} • {(doc.file_size / 1024 / 1024).toFixed(1)} MB</p>
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => window.open(sanitizeUrl(doc.file_url), '_blank')}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="p-4 rounded-xl bg-warning/5 border border-warning/20 space-y-2">
            <div className="flex items-center gap-2 mb-1 text-warning">
              <Lightbulb className="h-4 w-4" />
              <h5 className="text-xs font-bold uppercase tracking-wider">Desafios e Dicas</h5>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed italic">
              {selectedSheet.challenges_notes || 'Siga as orientações acima para garantir a conformidade do produto.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
