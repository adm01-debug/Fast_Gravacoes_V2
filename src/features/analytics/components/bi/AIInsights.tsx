import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, TrendingUp, TrendingDown, AlertCircle, Lightbulb } from 'lucide-react';
import { BIMetrics } from '@/features/analytics/types';
import { motion } from 'framer-motion';

interface AIInsightsProps {
  metrics: BIMetrics;
}

export function AIInsights({ metrics }: AIInsightsProps) {
  const insights = useMemo(() => {
    const list = [];
    
    // Efficiency/Quality Insight
    if (metrics.periodLossRate > 5) {
      list.push({
        type: 'warning',
        icon: <TrendingDown className="h-4 w-4 text-destructive" />,
        text: `Alerta: Taxa de perda está em ${metrics.periodLossRate.toFixed(1)}%. Recomenda-se revisar o setup das máquinas de maior volume.`,
      });
    } else if (metrics.periodLossRate < 1) {
      list.push({
        type: 'success',
        icon: <TrendingUp className="h-4 w-4 text-success" />,
        text: `Excelente: Taxa de perda de apenas ${metrics.periodLossRate.toFixed(1)}%. O setup atual está altamente otimizado.`,
      });
    }

    // Volume Insight
    if (metrics.productionTrend === 'up') {
      list.push({
        type: 'info',
        icon: <Sparkles className="h-4 w-4 text-primary" />,
        text: `Crescimento: Volume de produção subiu ${metrics.trendPercentage}% em relação ao período anterior.`,
      });
    }

    // Technique Performance
    const topTech = metrics.techniquePerformance[0];
    if (topTech) {
      list.push({
        type: 'info',
        icon: <Lightbulb className="h-4 w-4 text-warning" />,
        text: `Destaque: A técnica ${topTech.name} é a mais produtiva, representando grande parte do output.`,
      });
    }

    // Machine Utilization
    const lowUtilized = metrics.machineUtilization.find(m => m.utilization < 30);
    if (lowUtilized) {
      list.push({
        type: 'warning',
        icon: <AlertCircle className="h-4 w-4 text-warning" />,
        text: `Ociosidade: Máquina ${lowUtilized.name} apresenta baixa utilização (${lowUtilized.utilization.toFixed(0)}%). Avaliar distribuição de jobs.`,
      });
    }

    return list;
  }, [metrics]);

  if (insights.length === 0) return null;

  return (
    <Card className="glass-card border-primary/20 bg-primary/5 overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary animate-pulse" />
          Insights Gerados por IA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((insight, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="flex items-start gap-3 p-2 rounded-lg bg-background/50 border border-border/50 text-xs"
          >
            <div className="mt-0.5">{insight.icon}</div>
            <p className="leading-tight text-muted-foreground">
              <span className="font-semibold text-foreground mr-1">
                {insight.type === 'warning' ? 'Ação sugerida:' : insight.type === 'success' ? 'Sucesso:' : 'Observação:'}
              </span>
              {insight.text}
            </p>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
}
