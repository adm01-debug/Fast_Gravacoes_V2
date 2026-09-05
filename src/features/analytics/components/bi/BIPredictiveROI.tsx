import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Sparkles, DollarSign, Target, ArrowRight, BrainCircuit } from 'lucide-react';
import { motion } from 'framer-motion';
import { BIMetrics } from '@/features/analytics/types';

interface BIPredictiveROIProps {
  biMetrics: BIMetrics;
}

export function BIPredictiveROI({ biMetrics }: BIPredictiveROIProps) {
  const calculations = useMemo(() => {
    const totalLost = biMetrics.periodLostPieces || 0;
    const avgPieceValue = 15.5; // Custom business logic value
    const currentLossCost = totalLost * avgPieceValue;

    // Target reduction: 50% reduction in losses
    const potentialSaving = currentLossCost * 0.5;

    // OEE improvement projection
    const currentOEE = 100 - biMetrics.periodLossRate;
    const targetOEE = Math.min(98, currentOEE + 2);

    return {
      currentLossCost,
      potentialSaving,
      currentOEE,
      targetOEE,
      gainPercentage: ((potentialSaving / (currentLossCost || 1)) * 100).toFixed(0)
    };
  }, [biMetrics]);

  return (
    <Card className="bg-black/40 border-primary/20 backdrop-blur-xl group hover:border-primary/40 transition-all duration-500 overflow-hidden relative h-full">
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all" />

      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <BrainCircuit className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-title tracking-wider uppercase text-lg">Projeção ROI IA</span>
            <span className="text-[10px] text-muted-foreground font-sans uppercase tracking-widest">Simulação de Ganhos Preditivos</span>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6 pt-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Custo de Perda Atual</p>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-rose-500">R$ {calculations.currentLossCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
            <p className="text-[10px] text-primary uppercase font-bold mb-1">Economia Potencial</p>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-success">R$ {calculations.potentialSaving.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-[10px]">
                +{calculations.gainPercentage}%
              </Badge>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground uppercase font-bold tracking-tighter">Otimização de OEE</span>
              <div className="flex items-center gap-2">
                <span className="font-mono">{calculations.currentOEE.toFixed(1)}%</span>
                <ArrowRight className="h-3 w-3 text-primary" />
                <span className="font-mono text-primary font-bold">{calculations.targetOEE.toFixed(1)}%</span>
              </div>
            </div>
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-emerald-500 shadow-[0_0_10px_rgba(14,165,233,0.5)]"
                initial={{ width: 0 }}
                animate={{ width: `${calculations.targetOEE}%` }}
                transition={{ duration: 2, ease: "easeOut" }}
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 relative overflow-hidden group/insight">
            <div className="absolute top-0 right-0 p-2 opacity-20">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <Target className="h-4 w-4 text-primary" />
              </div>
              <div className="space-y-1">
                <h4 className="text-[11px] font-black uppercase text-primary">Insight de Performance</h4>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Reduzindo a variabilidade térmica na técnica <strong>Laser</strong> e otimizando o setup em 8%, o sistema prevê um retorno de capital em <strong>42 dias</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


