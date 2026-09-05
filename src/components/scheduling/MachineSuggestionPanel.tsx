import { useMachineSuggestion } from '@/hooks/useMachineSuggestion';
import { useOEE } from '@/features/production';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Cpu, Info, Sparkles, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface MachineSuggestionPanelProps {
  techniqueId: string | null;
  onSelectMachine?: (machineId: string) => void;
}

export function MachineSuggestionPanel({ techniqueId, onSelectMachine }: MachineSuggestionPanelProps) {
  const { suggestions, bestMachine } = useMachineSuggestion(techniqueId);
  const { data: oeeData } = useOEE(7); // Last 7 days for historical efficiency context

  const machineOEE = (machineId: string) => {
    return oeeData?.byMachine.find(m => m.machineId === machineId)?.oee || 0;
  };

  if (!techniqueId) return null;

  return (
    <Card className="glass-card border-violet-500/20 bg-violet-500/5">
      <CardHeader className="pb-3 pt-4 px-4">
        <CardTitle className="text-sm text-title flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-violet-500/20">
            <Sparkles className="h-4 w-4 text-violet-400" />
          </div>
          <span className="gradient-text">Sugestão de Alocação</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {suggestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center space-y-2">
            <AlertTriangle className="h-8 w-8 text-muted-foreground opacity-50" />
            <p className="text-xs text-muted-foreground">Nenhuma máquina ativa para esta técnica</p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="wait">
              {bestMachine && (
                <motion.div
                  key={bestMachine.machineId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/30 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-background/50 text-violet-400 border-violet-500/50">
                        {bestMachine.machineCode}
                      </Badge>
                      <span className="text-sm font-medium">{bestMachine.machineName}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] uppercase font-bold text-violet-400 tracking-wider">Score</span>
                      <Badge className="bg-violet-500 text-white border-none h-5 px-1.5">
                        {Math.round(bestMachine.score)}%
                      </Badge>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1 space-y-1.5 p-2 rounded-lg bg-background/40">
                      <div className="flex items-center justify-between text-[9px] font-bold text-muted-foreground uppercase">
                        <span>Carga Atual</span>
                        <span>{bestMachine.totalLoad} min</span>
                      </div>
                      <Progress value={(bestMachine.totalLoad / 480) * 100} className="h-1 bg-violet-500/20" />
                    </div>
                    <div className="flex-1 space-y-1.5 p-2 rounded-lg bg-background/40">
                      <div className="flex items-center justify-between text-[9px] font-bold text-muted-foreground uppercase">
                        <span>OEE Histórico</span>
                        <span>{machineOEE(bestMachine.machineId)}%</span>
                      </div>
                      <Progress value={machineOEE(bestMachine.machineId)} className="h-1 bg-success/20" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-1.5 text-xs text-violet-300">
                      <Info className="h-3 w-3" />
                      {bestMachine.reason}
                    </div>
                    {onSelectMachine && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-[10px] uppercase font-bold hover:bg-violet-500/20 hover:text-violet-300 gap-1"
                        onClick={() => onSelectMachine(bestMachine.machineId)}
                      >
                        Selecionar <CheckCircle2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {suggestions.length > 1 && (
              <div className="space-y-2">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest px-1">Alternativas</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {suggestions.slice(1, 3).map((s) => (
                    <div
                      key={s.machineId}
                      role="button"
                      tabIndex={0}
                      aria-label={`Selecionar máquina ${s.machineCode}`}
                      className="p-2 rounded-lg bg-secondary/30 border border-border/50 hover:bg-secondary/50 transition-colors cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      onClick={() => onSelectMachine?.(s.machineId)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectMachine?.(s.machineId); } }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium group-hover:text-primary transition-colors">{s.machineCode}</span>
                        <span className="text-[10px] text-muted-foreground">{Math.round(s.score)}%</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">{s.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
