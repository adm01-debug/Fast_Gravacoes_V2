import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BrainCircuit, Leaf, Zap, AlertTriangle, TrendingDown, Lightbulb, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { useEnergy } from '@/features/analytics/hooks/useEnergy';
import { useMemo } from 'react';

export function AIEnergyAdvisor() {
  const { stats } = useEnergy();

  const insights = useMemo(() => {
    const list = [];

    // Success Insight
    if (stats.energyScore >= 80) {
      list.push({
        type: 'success',
        title: 'Eficiência Energética Excelente',
        description: `Sua fábrica opera com score ${stats.energyScore}/100. O fator de potência médio (${stats.avgPowerFactor.toFixed(2)}) está acima do limite regulatório.`,
        icon: <Leaf className="h-4 w-4 text-success" />
      });
    }

    // Cost/Warning Insight
    if (stats.costTrend > 0) {
      list.push({
        type: 'warning',
        title: 'Tendência de Custo em Alta',
        description: `Consumo subiu ${stats.costTrend.toFixed(1)}% em relação ao mês anterior. IA recomenda auditar máquinas com maior ociosidade ligada.`,
        icon: <AlertTriangle className="h-4 w-4 text-warning" />
      });
    }

    // Tip Insight
    if (stats.totalConsumption > 0) {
      list.push({
        type: 'tip',
        title: 'Potencial de Economia',
        description: `Ajustar a demanda de pico para abaixo de ${(stats.peakDemand * 0.9).toFixed(1)} kW pode reduzir a fatura em aproximadamente 4%.`,
        icon: <Zap className="h-4 w-4 text-blue-500" />
      });
    }

    // Eco/Impact Insight
    if (stats.carbonFootprintKg > 0) {
      list.push({
        type: 'eco',
        title: 'Pegada de Carbono',
        description: `Sua operação gerou ${stats.carbonFootprintKg.toFixed(1)} kg de CO2 este mês. Equivale ao plantio de ${Math.ceil(stats.carbonFootprintKg / 15)} árvores para compensação.`,
        icon: <Lightbulb className="h-4 w-4 text-purple-500" />
      });
    }

    if (list.length === 0) {
      list.push({
        type: 'info',
        title: 'Aguardando Telemetria',
        description: 'Registre as primeiras leituras de consumo para ativar a análise preditiva de sustentabilidade.',
        icon: <Info className="h-4 w-4 text-muted-foreground" />
      });
    }

    return list;
  }, [stats]);

  return (
    <Card className="glass-card border-success/20 bg-success/5 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-success animate-pulse" />
            AI Sustainable Advisor
          </CardTitle>
          <Badge variant="outline" className="text-[10px] uppercase font-bold border-success/30 text-success">Green Factor</Badge>
        </div>
        <CardDescription>Inteligência artificial focada em eficiência energética e ESG</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {insights.map((insight, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
            className="flex items-start gap-3 p-3 rounded-lg bg-background/40 border border-border/50 hover:border-success/30 transition-all duration-300 group"
          >
            <div className="mt-0.5 group-hover:rotate-12 transition-transform">
              {insight.icon}
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold leading-none">{insight.title}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {insight.description}
              </p>
            </div>
          </motion.div>
        ))}
        <div className="pt-2">
          <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-500/20 via-emerald-500/10 to-transparent flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-success" />
              <span className="text-xs font-bold uppercase tracking-tighter">Sustentabilidade: {stats.energyScore}%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
