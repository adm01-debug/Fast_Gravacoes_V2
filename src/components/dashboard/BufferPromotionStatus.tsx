import { useAutoBufferPromotion } from '@/features/jobs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Layers, CheckCircle2, RefreshCw, Box } from 'lucide-react';
import { useSchedulingData } from '@/features/jobs';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';

export function BufferPromotionStatus() {
  const { bufferTarget, isPromoting, triggerPromotion } = useAutoBufferPromotion();
  const { techniques, jobs } = useSchedulingData();

  if (!techniques.length) return null;

  return (
    <Card className="glass-card mb-6 border-blue-500/20 bg-blue-500/5">
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Box className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm flex items-center gap-2">
                Gestão Automática de Buffer
                <Badge variant="outline" className="text-[10px] h-4 px-1 border-blue-500/30 text-blue-300">
                  IA Ativa
                </Badge>
              </h3>
              <p className="text-xs text-foreground/70 mt-0.5">
                Mantendo alvo de <strong>{bufferTarget} jobs</strong> "No Jeito" por técnica.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {techniques.map(tech => {
              const readyCount = jobs.filter(j => j.technique_id === tech.id && j.status === 'ready').length;
              const isHealthy = readyCount >= bufferTarget;

              return (
                <TooltipProvider key={tech.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className={cn(
                        "flex items-center gap-1.5 px-2 py-1 rounded-full border text-[10px] font-bold transition-all",
                        isHealthy ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-blue-500/10 border-blue-500/20 text-blue-300"
                      )}>
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tech.color }} />
                        {tech.short_name}: {readyCount}/{bufferTarget}
                        {isHealthy ? <CheckCircle2 className="h-2.5 w-2.5" /> : <RefreshCw className={cn("h-2.5 w-2.5", isPromoting && "animate-spin")} />}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">{tech.name}</p>
                      <p className="text-[10px] text-muted-foreground">Status do Buffer: {isHealthy ? 'Saudável' : 'Reabastecendo...'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>

          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-[10px] uppercase font-bold text-blue-300 hover:bg-blue-500/10"
            onClick={() => triggerPromotion()}
            disabled={isPromoting}
          >
            <RefreshCw className={cn("h-3 w-3 mr-1.5", isPromoting && "animate-spin")} />
            Verificar Agora
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

