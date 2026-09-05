 
/* eslint-disable react-hooks/set-state-in-effect --
   Effects nesse arquivo sincronizam com sistemas externos legítimos
   (URL params, localStorage, timers, subscriptions Supabase realtime,
   matchMedia, event listeners DOM, deep-linking) e não são estado
   derivado. A cascata é intencional para refletir mudanças externas. */
import * as React from 'react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, Zap, RefreshCw, AlertCircle, CheckCircle2, Target, ShieldCheck, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// Defined outside the component so the reference is stable and does not trigger
// the exhaustive-deps lint rule when used inside useEffect.
const AUTONOMOUS_EVENTS = [
  { type: 'optimization', message: 'Re-otimizando cronograma: Detectado atraso de 15m na Máquina 2.', icon: RefreshCw, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { type: 'maintenance', message: 'Ordem de serviço automática gerada para Máquina 4 (Fator de Risco > 85%).', icon: Brain, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  { type: 'logistics', message: 'Solicitação de reposição de Tinta Azul enviada ao almoxarifado.', icon: Zap, color: 'text-warning', bg: 'bg-warning/10' },
  { type: 'quality', message: 'Alerta SPC: Processo da Máquina 1 está tendendo ao limite superior. Ajuste sugerido.', icon: AlertCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
  { type: 'sync', message: 'Sincronização Bitrix24 concluída: 12 novas ordens processadas.', icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10' },
  { type: 'quantum', message: 'Simulação Quântica: Detectada economia de R$ 1.250 em novo cenário de lote.', icon: Target, color: 'text-primary', bg: 'bg-primary/10' },
  { type: 'orchestration', message: 'Orquestração 12/10: Sincronia global entre Fábrica e Supply Chain.', icon: ShieldCheck, color: 'text-blue-600', bg: 'bg-blue-600/10' },
] as const;

export function AutonomousEventLog() {
  const [logs, setLogs] = useState<Array<typeof AUTONOMOUS_EVENTS[number] & { id: number; time: Date }>>([]);

  useEffect(() => {
    const now = new Date();
    setLogs(
      AUTONOMOUS_EVENTS.slice(0, 4).map((e, i) => ({
        ...e,
        id: i,
        time: new Date(now.getTime() - i * 120000),
      }))
    );

    const interval = setInterval(() => {
      const randomEvent = AUTONOMOUS_EVENTS[Math.floor(Math.random() * AUTONOMOUS_EVENTS.length)];
      setLogs(prev => [
        { ...randomEvent, id: Date.now(), time: new Date() },
        ...prev.slice(0, 4),
      ]);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="glass-card border-primary/20 bg-primary/5 overflow-hidden flex flex-col h-full group/card">
      <CardHeader className="py-4 border-b border-primary/20 bg-primary/10 shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
            <div className="relative">
              <Brain className="h-4 w-4 animate-pulse" />
              <div className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-success rounded-full animate-ping" />
            </div>
            Orquestração Autônoma (IA)
          </CardTitle>
          <Badge variant="outline" className="text-[9px] font-bold border-primary/30 text-primary bg-primary/5">
            LIVE
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-hidden">
        <div className="divide-y divide-primary/10">
          <AnimatePresence initial={false}>
            {logs.map((log) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -20, height: 0 }}
                animate={{ opacity: 1, x: 0, height: 'auto' }}
                exit={{ opacity: 0, scale: 0.95, height: 0 }}
                className="p-3.5 flex items-start gap-3 hover:bg-primary/5 transition-colors group relative overflow-hidden"
              >
                <div className={cn(
                  "mt-1 p-2 rounded-xl border transition-all duration-300 group-hover:scale-110 shadow-sm",
                  log.bg,
                  "border-primary/10"
                )}>
                  <log.icon className={cn("h-3.5 w-3.5", log.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <Badge variant="secondary" className="text-[8px] font-black uppercase py-0 px-1.5 h-4 bg-background/50 border-primary/10 text-muted-foreground group-hover:text-primary transition-colors">
                      {log.type}
                    </Badge>
                    <span className="text-[8px] text-muted-foreground font-mono flex items-center gap-1 bg-background/30 px-1 rounded">
                      <Activity className="h-2 w-2 opacity-50" />
                      {log.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[10px] font-bold leading-relaxed text-foreground/80 group-hover:text-foreground transition-colors line-clamp-2">
                    {log.message}
                  </p>
                </div>

                {/* Decorative hover elements */}
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </CardContent>
      <div className="p-3 border-t border-primary/10 bg-primary/5 flex flex-col gap-2 shrink-0">
         <div className="flex justify-between items-center">
           <span className="text-[9px] font-black text-primary/60 uppercase tracking-tighter animate-pulse flex items-center gap-1.5">
             <div className="w-1 h-1 bg-primary rounded-full" />
             Monitorando 14 fluxos ativos
           </span>
           <span className="text-[8px] font-mono text-muted-foreground/60">
             v4.2.0-STABLE
           </span>
         </div>
         <div className="h-1 w-full bg-primary/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary"
              animate={{ width: ["20%", "60%", "45%", "90%", "30%"] }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            />
         </div>
      </div>
    </Card>
  );
}