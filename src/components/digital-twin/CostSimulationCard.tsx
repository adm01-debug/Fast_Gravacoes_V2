import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, TrendingUp, TrendingDown, Calculator, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { useKPIs } from '@/features/analytics/hooks/useKPIs';

export function CostSimulationCard() {
  const { data, isLoading } = useKPIs('day');
  const [scenario, setScenario] = useState<'current' | 'optimized'>('current');

  const currentCost = data?.costOfLosses || 0;
  const currentRevenue = data?.estimatedRevenue || 0;

  // Simulation: IA optimization reduces losses by 35% and increases revenue by 10%
  const optimizedCost = currentCost * 0.65;
  const optimizedRevenue = currentRevenue * 1.1;

  const activeCost = scenario === 'current' ? currentCost : optimizedCost;
  const activeRevenue = scenario === 'current' ? currentRevenue : optimizedRevenue;
  const margin = activeRevenue > 0 ? ((activeRevenue - activeCost) / activeRevenue) * 100 : 0;

  return (
    <Card className="glass-card border-primary/20 bg-primary/5 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
        <Calculator className="h-32 w-32 text-primary" />
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-success" />
          What-If Cost Analyzer (IA)
        </CardTitle>
        <CardDescription className="text-[10px] font-bold">Simulação financeira em tempo real</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 rounded-xl bg-background/40 border border-border/50 space-y-3">
           <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-muted-foreground uppercase">Revenue (Estimado)</span>
              <span className="font-black text-foreground">R$ {activeRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
           </div>

           <div className="flex justify-between items-center text-xs">
              <span className={`font-bold uppercase ${scenario === 'optimized' ? 'text-success' : 'text-muted-foreground'}`}>
                Custo de Perda {scenario === 'optimized' && '(IA)'}
              </span>
              <span className={`font-black ${scenario === 'optimized' ? 'text-success' : 'text-foreground'}`}>
                R$ {activeCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
           </div>
           <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <motion.div
                className={`h-full ${scenario === 'optimized' ? 'bg-success' : 'bg-primary'}`}
                initial={false}
                animate={{ width: `${(activeCost / (activeRevenue || 1)) * 100}%` }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
           </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
           <div className="p-3 rounded-lg bg-success/10 border border-success/20 text-center">
              {scenario === 'current' ? <TrendingDown className="h-4 w-4 mx-auto mb-1 text-success" /> : <RefreshCw className="h-4 w-4 mx-auto mb-1 text-success animate-spin-slow" />}
              <p className="text-[10px] font-black uppercase text-success">
                {scenario === 'current' ? `-R$ ${(currentCost - optimizedCost).toFixed(0)}` : 'OTIMIZADO'}
              </p>
              <p className="text-[8px] font-bold text-muted-foreground uppercase">Target IA</p>
           </div>
           <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
              <TrendingUp className="h-4 w-4 mx-auto mb-1 text-blue-600" />
              <p className="text-[10px] font-black uppercase text-blue-600">{margin.toFixed(1)}%</p>
              <p className="text-[8px] font-bold text-muted-foreground uppercase">Margem Op.</p>
           </div>
        </div>

        <Button
          variant={scenario === 'current' ? "outline" : "default"}
          onClick={() => setScenario(prev => prev === 'current' ? 'optimized' : 'current')}
          className="w-full h-9 text-[10px] font-black uppercase tracking-widest border-primary/30"
          disabled={isLoading}
        >
          {scenario === 'current' ? 'Simular Otimização IA' : 'Resetar para Real'}
        </Button>
      </CardContent>
    </Card>
  );
}