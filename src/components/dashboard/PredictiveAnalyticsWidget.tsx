import { useMLPredictions } from '@/features/analytics/hooks/useMLPredictions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BrainCircuit, AlertCircle, CheckCircle2, ChevronRight, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

export function PredictiveAnalyticsWidget() {
  const { predictions, stats, isLoading, getRiskLevel, getPredictionTypeLabel } = useMLPredictions();

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  const highRiskPredictions = predictions.filter(p => p.risk_score >= 50).slice(0, 3);

  return (
    <Card className="glass-card card-interactive animate-fade-in-up opacity-0 [animation-fill-mode:forwards] [animation-delay:0.3s]">
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="text-sm text-title flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/20">
              <BrainCircuit className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="gradient-text">Análise Preditiva (ML)</span>
          </div>
          {stats.highRisk > 0 && (
            <Badge variant="destructive" className="h-5 px-1.5 text-[9px] animate-pulse">
              {stats.highRisk} RISCO ALTO
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-2">
        {predictions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center space-y-2">
            <CheckCircle2 className="h-8 w-8 text-success/30" />
            <p className="text-[11px] text-muted-foreground">Modelos de IA não detectaram riscos imediatos</p>
          </div>
        ) : (
          <div className="space-y-2">
            {highRiskPredictions.map((prediction) => {
              const risk = getRiskLevel(prediction.risk_score);
              const health = 100 - prediction.risk_score;

              return (
                <div
                  key={prediction.id}
                  className="p-2 rounded-lg bg-secondary/30 border border-border/20 space-y-2 group cursor-pointer hover:bg-secondary/50 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] font-mono border-primary/30">
                        {prediction.machine?.code}
                      </Badge>
                      <span className="text-[11px] font-bold truncate max-w-[120px]">
                        {getPredictionTypeLabel(prediction.prediction_type)}
                      </span>
                    </div>
                    <Badge className={cn("text-[9px] h-4 px-1",
                      risk.color === 'destructive' ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-warning/20 text-warning-foreground border-warning/30"
                    )}>
                      {risk.label}
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] text-muted-foreground uppercase font-bold tracking-tighter">
                      <span>Saúde Estimada</span>
                      <span className={cn(health < 40 ? "text-red-400" : "text-primary")}>{health}%</span>
                    </div>
                    <Progress value={health} className="h-1 bg-primary/10" />
                  </div>

                  <p className="text-[10px] text-muted-foreground italic line-clamp-1">
                    Rec: {prediction.recommendations[0]}
                  </p>
                </div>
              );
            })}

            {predictions.length > 3 && (
              <Button variant="ghost" size="sm" className="w-full h-6 text-[10px] text-muted-foreground hover:text-primary">
                Ver todas as {predictions.length} previsões <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            )}
          </div>
        )}

        <div className="pt-2 border-t border-border/20 flex items-center justify-between">
           <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
              <Activity className="h-3 w-3" />
              <span>Confiança Média: {stats.avgConfidence}%</span>
           </div>
           <Badge variant="outline" className="text-[8px] h-4 opacity-50 uppercase tracking-widest">Model V2.4</Badge>
        </div>
      </CardContent>
    </Card>
  );
}
