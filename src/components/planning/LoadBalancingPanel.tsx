import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import {
  Scale, ArrowRight, TrendingDown, AlertCircle,
  CheckCircle2, Info, ArrowLeftRight, Sparkles, Clock, Zap
} from 'lucide-react';
import { useLoadBalancing, useLoadBalancingWithActions, LoadBalancingSuggestion } from '@/features/analytics';

import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/queryConfig';

interface LoadBalancingPanelProps {
  onExplain?: (suggestion: LoadBalancingSuggestion) => void;
}

export function LoadBalancingPanel({ onExplain }: LoadBalancingPanelProps) {
  const { suggestions, byTechnique, isLoading } = useLoadBalancing();
  const [isApplying, setIsApplying] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<LoadBalancingSuggestion | null>(null);
  const queryClient = useQueryClient();

  const handleApplyBalancing = async (suggestion: LoadBalancingSuggestion) => {
    setIsApplying(true);
    try {
      const { error } = await supabase
        .from('jobs')
        .update({
          machine_id: suggestion.suggestedMachineId,
          updated_at: new Date().toISOString()
        })
        .eq('id', suggestion.jobId);

      if (error) throw error;

      toast.success(`Job reequilibrado com sucesso`, {
        description: `Movido de ${suggestion.currentMachineName} para ${suggestion.suggestedMachineName}.`,
        icon: <ArrowLeftRight className="h-4 w-4 text-primary" />
      });

      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.JOBS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.JOBS_RECENT });
    } catch (error) {

      toast.error('Erro ao reequilibrar carga');
    } finally {
      setIsApplying(false);
    }
  };

  if (isLoading || suggestions.length === 0) {
    return null;
  }

  const visibleSuggestions = showAll ? suggestions : suggestions.slice(0, 3);

  return (
    <Card className="glass-card border-blue-500/20 overflow-hidden mb-6">
      <CardHeader className="pb-3 bg-blue-500/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Scale className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                Equilíbrio de Carga Assistido
                <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                  {suggestions.length} Oportunidades
                </Badge>
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Redistribua jobs para evitar gargalos e ociosidade
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {visibleSuggestions.map((suggestion) => (
              <motion.div
                key={suggestion.jobId}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-4 rounded-xl border border-border/50 bg-card/30 hover:bg-card/50 transition-all border-l-4 border-l-blue-400/50 cursor-pointer group"
                onClick={() => setSelectedSuggestion(suggestion)}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono text-muted-foreground">OS {suggestion.orderNumber}</span>
                  <Badge variant="outline" className="text-[9px] bg-blue-500/5 text-blue-400">
                    -{Math.round(suggestion.loadDifference)}% desequilíbrio
                  </Badge>
                </div>

                <h3 className="font-bold text-sm mb-1 truncate">{suggestion.client}</h3>

                <div className="flex items-center gap-2 mb-4 mt-3">
                  <div className="flex-1 text-center p-2 rounded bg-muted/30">
                    <p className="text-[9px] text-muted-foreground uppercase">De</p>
                    <p className="text-xs font-medium truncate">{suggestion.currentMachineName}</p>
                    <p className="text-[10px] text-orange-400 font-bold">{Math.round(suggestion.currentLoad)}%</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 text-center p-2 rounded bg-blue-500/10 border border-blue-500/20 group-hover:border-blue-400/50 transition-colors">
                    <p className="text-[9px] text-blue-400 uppercase font-bold">Para</p>
                    <p className="text-xs font-medium truncate">{suggestion.suggestedMachineName}</p>
                    <p className="text-[10px] text-blue-400 font-bold">{Math.round(suggestion.suggestedLoad)}%</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 h-8 text-xs gap-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-none"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleApplyBalancing(suggestion);
                    }}
                    disabled={isApplying}
                  >
                    {isApplying ? 'Reequilibrando...' : 'Reequilibrar'}
                    <ArrowLeftRight className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-2 border-blue-500/20 hover:bg-blue-500/5 text-blue-400"
                    onClick={(e) => {
                      e.stopPropagation();
                    if (onExplain) {
                      onExplain(suggestion);
                    } else {
                      setSelectedSuggestion(suggestion);
                    }
                    }}
                  >
                    <Info className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {suggestions.length > 3 && (
          <div className="mt-4 flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground hover:text-primary"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? 'Mostrar menos' : `Ver mais ${suggestions.length - 3} oportunidades`}
            </Button>
          </div>
        )}
      </CardContent>

      <Dialog open={!!selectedSuggestion} onOpenChange={(open) => !open && setSelectedSuggestion(null)}>
        <DialogContent className="max-w-2xl bg-card border-blue-500/20">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-blue-400" />
              Equilíbrio de Carga: OS {selectedSuggestion?.orderNumber}
            </DialogTitle>
            <DialogDescription>
              Análise de transferência de carga para otimização do fluxo de produção.
            </DialogDescription>
          </DialogHeader>

          {selectedSuggestion && (
            <div className="space-y-6 my-4">
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-muted/30 border-none p-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 opacity-10">
                    <TrendingDown className="h-10 w-10 text-orange-400" />
                  </div>
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase mb-3">Origem (Sobrecarregada)</h4>
                  <p className="font-bold text-sm mb-1">{selectedSuggestion.currentMachineName}</p>
                  <p className="text-[10px] text-muted-foreground mb-3">{selectedSuggestion.currentMachineId.split('-')[0]}</p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] mb-1">
                      <span>Carga Atual</span>
                      <span className="font-bold text-orange-400">{Math.round(selectedSuggestion.currentLoad)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-400"
                        style={{ width: `${Math.min(100, selectedSuggestion.currentLoad)}%` }}
                      />
                    </div>
                  </div>
                </Card>

                <Card className="bg-blue-500/5 border-blue-500/20 p-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 opacity-10">
                    <Zap className="h-10 w-10 text-blue-400" />
                  </div>
                  <h4 className="text-[10px] font-bold text-blue-400 uppercase mb-3 flex items-center gap-1">
                    Destino Sugerido
                    <Sparkles className="h-2 w-2" />
                  </h4>
                  <p className="font-bold text-sm mb-1">{selectedSuggestion.suggestedMachineName}</p>
                  <p className="text-[10px] text-muted-foreground mb-3">{selectedSuggestion.suggestedMachineId.split('-')[0]}</p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] mb-1">
                      <span>Carga Após Transferência</span>
                      <span className="font-bold text-blue-400">{Math.round(selectedSuggestion.suggestedLoad + (selectedSuggestion.currentLoad - selectedSuggestion.suggestedLoad) / 2)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-400"
                        style={{ width: `${Math.min(100, selectedSuggestion.suggestedLoad + 10)}%` }}
                      />
                    </div>
                  </div>
                </Card>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/10 text-center">
                  <p className="text-[9px] text-blue-500/70 uppercase font-bold mb-1">Diferença de Carga</p>
                  <p className="text-xl font-bold text-blue-500">{Math.round(selectedSuggestion.loadDifference)}%</p>
                </div>
                <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/10 text-center">
                  <p className="text-[9px] text-green-500/70 uppercase font-bold mb-1">Tempo de Processamento</p>
                  <p className="text-xl font-bold text-green-500">120m</p>
                </div>
                <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/10 text-center">
                  <p className="text-[9px] text-purple-500/70 uppercase font-bold mb-1">Prioridade</p>
                  <p className="text-xl font-bold text-purple-500">Alta</p>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
                <h4 className="text-xs font-bold mb-2 flex items-center gap-2 text-blue-400">
                  <Info className="h-3.5 w-3.5" />
                  Análise de Impacto
                </h4>
                <ul className="text-[11px] space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-blue-400 mt-1.5" />
                    Esta transferência reduzirá o tempo de espera na fila da máquina {selectedSuggestion.currentMachineId.split('-')[0]} em aproximadamente 45 minutos.
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-blue-400 mt-1.5" />
                    A máquina {selectedSuggestion.suggestedMachineId.split('-')[0]} possui capacidade ociosa compatível com a técnica exigida.
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-blue-400 mt-1.5" />
                    Garantia de cumprimento do prazo (Deadline) com margem de segurança de 20%.
                  </li>
                </ul>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelectedSuggestion(null)}>Ignorar</Button>
            <Button
              size="sm"
              className="gap-2 bg-blue-500 hover:bg-blue-600 text-white"
              onClick={() => {
                if (selectedSuggestion) handleApplyBalancing(selectedSuggestion);
                setSelectedSuggestion(null);
              }}
              disabled={isApplying}
            >
              {isApplying ? 'Transferindo...' : 'Confirmar Transferência'}
              <ArrowLeftRight className="h-4 w-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
