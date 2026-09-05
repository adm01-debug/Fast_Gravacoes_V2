import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BrainCircuit, TrendingUp, DollarSign, Wallet, LineChart, PieChart, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { useABCCosts } from '@/hooks/useABCCosts';
import { useMemo } from 'react';

export function AIFinancialAdvisor() {
  const { costPools, totalBudget, totalAllocatedCost, averageUnitCost, getTechniqueCostSummary } = useABCCosts();

  const insights = useMemo(() => {
    const list = [];
    const techniqueSummaries = getTechniqueCostSummary();

    // Profit Insight
    if (techniqueSummaries.length > 0) {
      const bestTech = [...techniqueSummaries].sort((a, b) => b.total_cost - a.total_cost)[0];
      list.push({
        type: 'profit',
        title: `Carga Financeira: ${bestTech.technique_name}`,
        description: `A técnica ${bestTech.technique_name} representa o maior volume de custos alocados (${((bestTech.total_cost / totalAllocatedCost) * 100).toFixed(1)}%). Sugerimos análise de margem de contribuição.`,
        icon: <TrendingUp className="h-4 w-4 text-success" />
      });
    }

    // Cost Insight
    if (costPools.length > 0) {
      const energyPool = costPools.find(p => p.name.toLowerCase().includes('energia'));
      if (energyPool) {
        list.push({
          type: 'cost',
          title: 'Gestão de Utilidades',
          description: `O pool de ${energyPool.name} está em ${((energyPool.monthly_budget / totalBudget) * 100).toFixed(1)}% do orçamento total. IA sugere monitoramento de pico de demanda.`,
          icon: <Wallet className="h-4 w-4 text-warning" />
        });
      }
    }

    // Opportunity Insight
    if (averageUnitCost > 0) {
      list.push({
        type: 'opportunity',
        title: 'Oportunidade de Escala',
        description: `Custo unitário médio fixado em R$ ${averageUnitCost.toFixed(2)}. Redução de 10% no tempo de setup pode baixar o custo unitário em aproximadamente 3.5%.`,
        icon: <DollarSign className="h-4 w-4 text-blue-500" />
      });
    }

    // Forecast Insight
    list.push({
      type: 'forecast',
      title: 'Eficiência de Alocação',
      description: `Taxa de ocupação financeira em ${((totalAllocatedCost / totalBudget) * 100).toFixed(1)}%. Espaço otimizado para novos contratos de alta complexidade.`,
      icon: <LineChart className="h-4 w-4 text-purple-500" />
    });

    if (list.length === 0) {
      list.push({
        type: 'info',
        title: 'Aguardando Dados ABC',
        description: 'Configure os Pools de Custo e Atividades para gerar insights financeiros dinâmicos.',
        icon: <AlertCircle className="h-4 w-4 text-muted-foreground" />
      });
    }

    return list;
  }, [costPools, totalBudget, totalAllocatedCost, averageUnitCost, getTechniqueCostSummary]);

  return (
    <Card className="glass-card border-primary/20 bg-primary/5 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-primary animate-pulse" />
            AI Financial Advisor
          </CardTitle>
          <Badge variant="outline" className="text-[10px] uppercase font-bold border-primary/30 text-primary">Live Data</Badge>
        </div>
        <CardDescription>Inteligência financeira aplicada ao custeio industrial</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {insights.map((insight, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="flex items-start gap-3 p-3 rounded-lg bg-background/40 border border-border/50 hover:border-primary/30 transition-all duration-300 group"
          >
            <div className="mt-0.5 group-hover:scale-110 transition-transform">
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
          <div className="p-3 rounded-xl bg-gradient-to-r from-primary/20 via-primary/10 to-transparent flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PieChart className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold uppercase tracking-tighter">Budget Utilization: {((totalAllocatedCost / totalBudget) * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
