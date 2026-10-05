import { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Scale,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Play,
  Loader2
} from "lucide-react";
import { useLoadBalancingWithActions, TechniqueLoadSummary, LoadBalancingSuggestion, MachineLoad } from "@/features/analytics";


interface TechniqueLoadCardProps {
  summary: TechniqueLoadSummary;
  onApplySuggestion: (suggestion: LoadBalancingSuggestion) => void;
  onApplyAll: () => void;
  isApplying: boolean;
}

const TechniqueLoadCard = memo(function TechniqueLoadCard({
  summary,
  onApplySuggestion,
  onApplyAll,
  isApplying
}: TechniqueLoadCardProps) {
  return (
    <div className="p-4 rounded-lg bg-muted/30 border border-border/30 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            style={{
              backgroundColor: `${summary.technique.color}20`,
              borderColor: `${summary.technique.color}50`,
              color: summary.technique.color
            }}
          >
            {summary.technique.short_name}
          </Badge>
          <span className="text-sm text-muted-foreground">{summary.technique.name}</span>
        </div>
        {summary.isUnbalanced ? (
          <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 border">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Desbalanceado
          </Badge>
        ) : (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 border">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Equilibrado
          </Badge>
        )}
      </div>

      <div className="space-y-2">
        {summary.machines.slice(0, 4).map((load) => (
          <div key={load.machine.id} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <Cpu className="h-3 w-3" />
                {load.machine.code}
              </span>
              <span className={`font-medium ${load.occupancyRate >= 90 ? 'text-primary' : load.occupancyRate >= 75 ? 'text-primary/70' : 'text-foreground'}`}>
                {Math.round(load.occupancyRate)}%
              </span>
            </div>
            <Progress
              value={load.occupancyRate}
              className="h-1.5"
            />
          </div>
        ))}
        {summary.machines.length > 4 && (
          <p className="text-xs text-muted-foreground text-center pt-1">
            +{summary.machines.length - 4} máquinas
          </p>
        )}
      </div>

      {summary.suggestions.length > 0 && (
        <div className="pt-2 border-t border-border/30 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Sugestões de redistribuição:</p>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-xs text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
              onClick={onApplyAll}
              disabled={isApplying}
            >
              {isApplying ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Play className="h-3 w-3 mr-1" />
              )}
              Aplicar Todas
            </Button>
          </div>
          {summary.suggestions.slice(0, 2).map((suggestion) => (
            <div
              key={suggestion.id}
              className="text-xs flex items-center justify-between gap-1 text-muted-foreground group"
            >
              <div className="flex items-center gap-1">
                <span className="font-medium text-foreground">{suggestion.orderNumber}</span>
                <ArrowRight className="h-3 w-3" />
                <span className="text-cyan-400">{suggestion.suggestedMachineName}</span>
                <span className="text-green-400">(-{Math.round(suggestion.loadDifference)}%)</span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                aria-label={`Aplicar sugestão para ${suggestion.orderNumber} em ${suggestion.suggestedMachineName}`}
                className="h-6 px-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                onClick={() => onApplySuggestion(suggestion)}
                disabled={isApplying}
              >
                <Play className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
TechniqueLoadCard.displayName = 'TechniqueLoadCard';

function LoadBalancingWidgetComponent() {
  const {
    byTechnique,
    suggestions,
    isLoading,
    applySuggestion,
    applyAllForTechnique,
    applyAllSuggestions,
    isApplying
  } = useLoadBalancingWithActions();

  const unbalancedCount = useMemo(() =>
    byTechnique.filter(t => t.isUnbalanced).length,
    [byTechnique]
  );

  const filteredTechniques = useMemo(() =>
    byTechnique.filter(t => t.machines.some(m => m.jobCount > 0)).slice(0, 6),
    [byTechnique]
  );

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card card-interactive animate-fade-in-up opacity-0 [animation-fill-mode:forwards] [animation-delay:0.2s] dark:hover:shadow-[0_8px_32px_-8px_hsl(180,100%,50%,0.25)]">
      <CardHeader className="pb-3">
        <CardTitle className="text-base sm:text-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 sm:p-2 rounded-lg bg-[hsl(180,100%,45%)]/20 dark:shadow-[0_0_20px_-5px_hsl(180,100%,50%,0.4)]">
              <Scale className="h-4 w-4 sm:h-5 sm:w-5 text-[hsl(180,100%,50%)]" />
            </div>
            <span className="gradient-text text-sm sm:text-base">Balanceamento de Carga</span>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {suggestions.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
                onClick={() => applyAllSuggestions()}
                disabled={isApplying}
              >
                {isApplying ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Play className="h-3 w-3 mr-1" />
                )}
                Aplicar Tudo
              </Button>
            )}
            <Badge
              className={`border text-xs ${unbalancedCount > 0
                ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                : 'bg-green-500/20 text-green-400 border-green-500/30'}`}
            >
              {unbalancedCount > 0
                ? `${unbalancedCount} desbal.`
                : 'Equilibrado'}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {byTechnique.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Scale className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum dado de carga disponível</p>
          </div>
        ) : (
          <ScrollArea className="h-[320px] pr-2">
            <div className="space-y-3">
              {filteredTechniques.map((summary) => (
                <TechniqueLoadCard
                  key={summary.technique.id}
                  summary={summary}
                  onApplySuggestion={applySuggestion}
                  onApplyAll={() => applyAllForTechnique(summary.technique.id)}
                  isApplying={isApplying}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

export const LoadBalancingWidget = memo(LoadBalancingWidgetComponent);
LoadBalancingWidget.displayName = 'LoadBalancingWidget';
