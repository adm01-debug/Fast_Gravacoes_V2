import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Brain, AlertTriangle, ShieldCheck, TrendingUp, Info } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PredictiveHealthCardProps {
  machineId: string;
}

export function PredictiveHealthCard({ machineId }: PredictiveHealthCardProps) {
  const { data: prediction, isLoading } = useQuery({
    queryKey: ['machine-prediction', machineId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('machine_predictions')
        .select('*')
        .eq('machine_id', machineId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <Card className="glass-card animate-pulse">
        <CardContent className="h-48" />
      </Card>
    );
  }

  // No fabricated fallback: a machine without a real prediction row shows an
  // explicit "no data" state instead of invented risk/confidence numbers
  // presented as if they were AI output.
  if (!prediction) {
    return (
      <Card className="glass-card overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base text-title">Saúde Preditiva IA</CardTitle>
              <CardDescription className="text-xs">Motor de inferência TPM 4.0</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground text-center py-6">
            Sem predição disponível para esta máquina ainda.
          </p>
        </CardContent>
      </Card>
    );
  }

  const displayData = prediction;
  const recommendation = Array.isArray(displayData.recommendations) && displayData.recommendations.length > 0
    ? String(displayData.recommendations[0])
    : 'Sem recomendação disponível';

  const riskColor = displayData.risk_score > 70 ? 'text-destructive' : displayData.risk_score > 40 ? 'text-warning' : 'text-success';
  const riskBg = displayData.risk_score > 70 ? 'bg-destructive/10' : displayData.risk_score > 40 ? 'bg-warning/10' : 'bg-success/10';

  return (
    <Card className="glass-card overflow-hidden hover:shadow-glow-primary transition-all duration-500">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base text-title">Saúde Preditiva IA</CardTitle>
              <CardDescription className="text-xs">Motor de inferência TPM 4.0</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] gap-1 px-2 border-primary/20 bg-primary/5">
            <ShieldCheck className="h-3 w-3" /> Confiabilidade: {(displayData.confidence * 100).toFixed(0)}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col items-center justify-center py-2">
          <div className={`relative w-24 h-24 flex items-center justify-center rounded-full ${riskBg} border-2 border-dashed border-primary/20 mb-2`}>
            <span className={`text-3xl font-bold text-title ${riskColor}`}>
              {100 - displayData.risk_score}%
            </span>
            <div className="absolute -bottom-1 -right-1 bg-background p-1 rounded-full shadow-sm border border-border">
              <TrendingUp className="h-4 w-4 text-success" />
            </div>
          </div>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Índice de Saúde</span>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Risco de Falha</span>
            <span className={`font-bold ${riskColor}`}>{displayData.risk_score}%</span>
          </div>
          <Progress value={displayData.risk_score} className="h-1.5" />
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="p-2 rounded-lg bg-secondary/30 border border-border/50">
            <p className="text-[10px] text-muted-foreground uppercase">Falha Estimada</p>
            <p className="text-xs font-bold">
              {displayData.predicted_failure_date
                ? format(new Date(displayData.predicted_failure_date), 'dd/MM/yyyy', { locale: ptBR })
                : 'N/A'}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-secondary/30 border border-border/50">
            <p className="text-[10px] text-muted-foreground uppercase">Recomendação</p>
            <div className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-warning" />
              <p className="text-[10px] font-medium truncate" title={recommendation}>{recommendation}</p>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-border/50">
          <TooltipProvider>
            <div className="flex items-center gap-2 flex-wrap">
              {displayData.factors && typeof displayData.factors === 'object' && Object.entries(displayData.factors as Record<string, unknown>).map(([key, value]) => (
                <Tooltip key={key}>
                  <TooltipTrigger asChild>
                    <Badge variant="secondary" className="text-[10px] bg-secondary/50 capitalize">
                      {key}: {String(value)}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs flex items-center gap-1">
                      <Info className="h-3 w-3" /> Fator de impacto na análise preditiva
                    </p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
}
