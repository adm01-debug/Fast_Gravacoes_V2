import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { BrainCircuit, Filter, Package, Zap, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { SequencingSuggestion } from '@/features/jobs';
import type { LoadBalancingSuggestion } from '@/features/analytics/types';

interface AISuggestionDetailsProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  suggestion:
    | { type: 'setup'; data: SequencingSuggestion }
    | { type: 'balancing'; data: LoadBalancingSuggestion }
    | null;
}

export function AISuggestionDetails({ isOpen, onOpenChange, suggestion }: AISuggestionDetailsProps) {
  if (!suggestion) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-primary" />
            Explicação Técnica da IA
          </SheetTitle>
          <SheetDescription>
            Transparência total sobre as regras e inputs utilizados para esta recomendação.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-8">
          {/* Rules Section */}
          <section>
            <h3 className="text-sm font-bold flex items-center gap-2 mb-4">
              <Filter className="h-4 w-4 text-primary" />
              Regras e Lógica Aplicada
            </h3>
            <div className="space-y-3">
              {suggestion.type === 'setup' ? (
                <>
                  <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                    <p className="text-xs font-bold mb-1">Agrupamento por Afinidade de Cor</p>
                    <p className="text-[11px] text-muted-foreground">Jobs com o mesmo valor no campo 'gravure_color' são agrupados para minimizar trocas de tinta e limpeza de clichê.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                    <p className="text-xs font-bold mb-1">Ordenação por Prioridade Interna</p>
                    <p className="text-[11px] text-muted-foreground">Dentro de cada grupo de cor, jobs 'Urgentes' e de 'Alta Prioridade' são posicionados no início para garantir o SLA.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                    <p className="text-xs font-bold mb-1">Cálculo de Setup Dinâmico</p>
                    <p className="text-[11px] text-muted-foreground">Utiliza o 'setup_time' definido para a técnica {suggestion.data.techniqueName} ({suggestion.data.estimatedSavings / (Math.max(1, suggestion.data.currentChanges - suggestion.data.optimizedChanges))}min por troca).</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                    <p className="text-xs font-bold mb-1">Diferencial de Carga (Ocupação)</p>
                    <p className="text-[11px] text-muted-foreground">Detectado desvio de {Math.round(suggestion.data.loadDifference)}% entre máquinas da mesma técnica. O gatilho de IA dispara quando o desvio ultrapassa 30%.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                    <p className="text-xs font-bold mb-1">Compatibilidade de Técnica</p>
                    <p className="text-[11px] text-muted-foreground">Apenas máquinas certificadas para a técnica original são consideradas como destino para garantir qualidade.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                    <p className="text-xs font-bold mb-1">Proteção de Urgências</p>
                    <p className="text-[11px] text-muted-foreground">Jobs com status 'production' ou prioridade 'urgent' são bloqueados para remanejamento automático para evitar riscos operacionais.</p>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Inputs Section */}
          <section>
            <h3 className="text-sm font-bold flex items-center gap-2 mb-4">
              <Package className="h-4 w-4 text-primary" />
              Inputs Utilizados
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-2 rounded bg-card border border-border text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Técnica</p>
                <p className="text-xs font-bold">{suggestion.type === 'setup' ? suggestion.data.techniqueName : (suggestion.data.suggestedMachineName || 'Digital')}</p>
              </div>
              <div className="p-2 rounded bg-card border border-border text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Carga Total</p>
                <p className="text-xs font-bold">
                  {suggestion.type === 'setup'
                    ? suggestion.data.totalMinutes
                    : suggestion.data.estimatedDuration ?? 0}m
                </p>
              </div>
              <div className="p-2 rounded bg-card border border-border text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Trocas (Setup)</p>
                <p className="text-xs font-bold">
                  {suggestion.type === 'setup'
                    ? `${suggestion.data.currentChanges} → ${suggestion.data.optimizedChanges}`
                    : '—'}
                </p>
              </div>
              <div className="p-2 rounded bg-card border border-border text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Capacidade</p>
                <p className="text-xs font-bold">11h/dia</p>
              </div>
            </div>
          </section>

          {/* Savings Section */}
          <section className="p-4 rounded-xl bg-primary/5 border border-primary/20 relative overflow-hidden">
            <div className="absolute -bottom-4 -right-4 opacity-10">
              <TrendingDown className="h-20 w-20 text-primary" />
            </div>
            <h3 className="text-sm font-bold flex items-center gap-2 mb-4 text-primary">
              <Zap className="h-4 w-4" />
              Previsão de Economia
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground">Redução de Ociosidade / Setup</span>
                  <span className="font-bold text-primary">-{suggestion.type === 'setup' ? suggestion.data.estimatedSavings : 45} min</span>
                </div>
                <Progress value={75} className="h-1.5" />
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Impacto no OEE</p>
                  <p className="text-lg font-bold text-success">+{suggestion.type === 'setup' ? '8.5' : '12'}%</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">ROI Estimado</p>
                  <p className="text-lg font-bold text-blue-500">Imediato</p>
                </div>
              </div>
            </div>
          </section>

          <div className="pt-6">
            <Button
              className="w-full gap-2"
              onClick={() => onOpenChange(false)}
            >
              Entendido, Fechar Explicação
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
