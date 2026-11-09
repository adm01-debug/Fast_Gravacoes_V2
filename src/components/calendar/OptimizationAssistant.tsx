import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Zap, AlertTriangle, TrendingDown, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface OptimizationAssistantProps {
  utilizationByMachine: Record<string, number>;
  machineCount: number;
}

export function OptimizationAssistant({ utilizationByMachine, machineCount }: OptimizationAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);

  const averageUtilization = Object.values(utilizationByMachine).length > 0
    ? Object.values(utilizationByMachine).reduce((a, b) => a + b, 0) / machineCount
    : 0;

  const bottlenecks = Object.entries(utilizationByMachine)
    .filter(([_, util]) => util > 0.85)
    .map(([id]) => id);

  const lowUtilization = Object.entries(utilizationByMachine)
    .filter(([_, util]) => util < 0.3)
    .map(([id]) => id);

  if (machineCount === 0) return null;

  return (
    <div className="relative z-10">
      <Button
        variant="outline"
        className={cn(
          "gap-2 border-primary/30 hover:bg-primary/5 transition-all",
          isOpen && "bg-primary/10 border-primary shadow-[0_0_15px_rgba(14,165,233,0.3)]"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Sparkles className={cn("h-4 w-4 text-primary", isOpen && "animate-pulse")} />
        <span className="hidden sm:inline">Assistente de Otimização</span>
        {bottlenecks.length > 0 && (
          <Badge variant="destructive" className="ml-1 h-5 px-1 animate-bounce">
            {bottlenecks.length}
          </Badge>
        )}
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="absolute right-0 top-full mt-2 w-80 md:w-96"
          >
            <Card className="glass-card border-primary/30 shadow-2xl">
              <CardHeader className="pb-2 border-b border-border/40">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  Insights de Eficiência
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {/* Global Efficiency */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-muted-foreground">Ocupação Média do Dia</span>
                    <span className={cn(
                      averageUtilization > 0.8 ? "text-orange-400" :
                      averageUtilization > 0.5 ? "text-green-400" : "text-blue-400"
                    )}>
                      {Math.round(averageUtilization * 100)}%
                    </span>
                  </div>
                  <div className="h-2 w-full bg-muted/30 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${averageUtilization * 100}%` }}
                      className={cn(
                        "h-full rounded-full transition-all duration-1000",
                        averageUtilization > 0.8 ? "bg-orange-400" : "bg-primary"
                      )}
                    />
                  </div>
                </div>

                {/* Bottlenecks */}
                {bottlenecks.length > 0 && (
                  <div className="p-3 rounded-lg bg-red-400/5 border border-red-400/20">
                    <div className="flex items-center gap-2 text-red-400 text-xs font-bold mb-2">
                      <AlertTriangle className="h-4 w-4" />
                      PREVISÃO DE GARGALO
                    </div>
                    <p className="text-[10px] text-muted-foreground mb-2">
                      {bottlenecks.length} máquina(s) operando acima de 85% de capacidade. Risco de atraso em cascata.
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {bottlenecks.map(b => (
                        <Badge key={b} variant="outline" className="text-[9px] border-red-400/30 text-red-400">
                          Máquina {b.slice(-4)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Optimization Tip */}
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-2 text-primary text-xs font-bold mb-1">
                    <Zap className="h-4 w-4" />
                    SUGESTÃO DE IA
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {lowUtilization.length > 0
                      ? "Distribua 15% da carga dos gargalos para as máquinas ociosas para equilibrar o fluxo."
                      : "Sequencie jobs por cor para reduzir o tempo de setup em 25 minutos estimados hoje."}
                  </p>
                  <Button size="sm" variant="ghost" className="h-7 text-[10px] p-0 text-primary hover:bg-transparent mt-1">
                    Ver simulação de rebalanceamento →
                  </Button>
                </div>

                {/* OEE Projection */}
                <div className="flex items-center justify-between pt-2 border-t border-border/30">
                  <div className="flex items-center gap-1.5">
                    <TrendingDown className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Setup Estimado</span>
                  </div>
                  <span className="text-xs font-bold">142 min</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
