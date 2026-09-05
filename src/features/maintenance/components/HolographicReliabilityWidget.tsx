import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Activity, Cpu, Sparkles, Brain, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export function HolographicReliabilityWidget() {
  return (
    <Card className="glass-card border-primary/20 bg-primary/5 relative overflow-hidden group">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none animate-pulse" />

      <CardHeader className="relative z-10">
        <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary animate-pulse" />
          Holographic Reliability 13/10
        </CardTitle>
        <CardDescription>Monitoramento de integridade molecular das máquinas</CardDescription>
      </CardHeader>

      <CardContent className="relative z-10 space-y-6">
        <div className="flex justify-center py-4">
           <div className="relative w-48 h-48 flex items-center justify-center">
              {/* Spinning Rings */}
              <motion.div
                className="absolute inset-0 border-2 border-primary/20 rounded-full border-dashed"
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              />
              <motion.div
                className="absolute inset-4 border-2 border-primary/30 rounded-full border-dashed"
                animate={{ rotate: -360 }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
              />

              <div className="text-center">
                 <Cpu className="h-10 w-10 mx-auto mb-2 text-primary animate-bounce-slow" />
                 <p className="text-4xl font-black tracking-tighter">99.98<span className="text-sm font-bold text-muted-foreground">%</span></p>
                 <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">Uptime Score</p>
              </div>
           </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
           <div className="p-3 rounded-xl bg-background/60 border border-border/50 backdrop-blur-md">
              <div className="flex items-center gap-2 mb-2">
                 <Brain className="h-3.5 w-3.5 text-primary" />
                 <span className="text-[10px] font-black uppercase">Self-Healing</span>
              </div>
              <p className="text-[9px] text-muted-foreground">Auto-ajuste de torque e temperatura ativo em 8 máquinas.</p>
              <Badge variant="outline" className="mt-2 text-[8px] h-4 border-primary/20 text-primary">AUTO-FIX ON</Badge>
           </div>

           <div className="p-3 rounded-xl bg-background/60 border border-border/50 backdrop-blur-md">
              <div className="flex items-center gap-2 mb-2">
                 <Zap className="h-3.5 w-3.5 text-warning" />
                 <span className="text-[10px] font-black uppercase">Predictive Peak</span>
              </div>
              <p className="text-[9px] text-muted-foreground">Zero paradas não planejadas detectadas nas últimas 480h.</p>
              <Badge variant="outline" className="mt-2 text-[8px] h-4 border-warning/20 text-warning">ZERO DOWNTIME</Badge>
           </div>
        </div>
      </CardContent>
    </Card>
  );
}