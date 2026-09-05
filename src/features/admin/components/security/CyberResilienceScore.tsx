import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Zap, Activity, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

export function CyberResilienceScore() {
  return (
    <Card className="glass-card border-primary/20 bg-primary/5 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
        <ShieldCheck className="h-32 w-32 text-primary" />
      </div>
      <CardHeader>
        <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
          <Lock className="h-4 w-4 text-primary" />
          Cyber-Resilience Index (Evo 11/10)
        </CardTitle>
        <CardDescription>Métrica consolidada de integridade e defesa industrial</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center py-6">
        <div className="relative w-40 h-40">
           <svg className="w-full h-full" viewBox="0 0 100 100">
             <circle className="text-muted/20 stroke-current" strokeWidth="6" fill="transparent" r="42" cx="50" cy="50" />
             <motion.circle
               className="text-primary stroke-current"
               strokeWidth="6"
               strokeLinecap="round"
               fill="transparent"
               r="42"
               cx="50"
               cy="50"
               initial={{ strokeDasharray: "0, 264" }}
               animate={{ strokeDasharray: "258, 264" }} // 98%
               transition={{ duration: 2, ease: "easeOut" }}
               transform="rotate(-90 50 50)"
             />
           </svg>
           <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
             <span className="text-4xl font-black tracking-tighter">98.5</span>
             <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Resilience Score</span>
           </div>
        </div>

        <div className="grid grid-cols-3 gap-4 w-full mt-8">
           <div className="text-center p-2 rounded-xl bg-background/40 border border-border/50">
             <Activity className="h-4 w-4 mx-auto mb-1 text-success" />
             <p className="text-[10px] font-black uppercase">Audit</p>
             <p className="text-sm font-bold">100%</p>
           </div>
           <div className="text-center p-2 rounded-xl bg-background/40 border border-border/50">
             <Zap className="h-4 w-4 mx-auto mb-1 text-warning" />
             <p className="text-[10px] font-black uppercase">Defense</p>
             <p className="text-sm font-bold">Active</p>
           </div>
           <div className="text-center p-2 rounded-xl bg-background/40 border border-border/50">
             <ShieldCheck className="h-4 w-4 mx-auto mb-1 text-blue-500" />
             <p className="text-[10px] font-black uppercase">SLA</p>
             <p className="text-sm font-bold">99.9%</p>
           </div>
        </div>
      </CardContent>
    </Card>
  );
}