import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from '@/lib/recharts';
import { Activity, Thermometer, Gauge, Zap, TrendingUp, AlertTriangle, CheckCircle2, Cpu, Database, Network } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { clickableProps } from '@/lib/a11y';
import { motion } from 'framer-motion';

const generateMockData = () => {
  return Array.from({ length: 20 }, (_, i) => ({
    time: `${10 + Math.floor(i / 12)}:${(i * 5) % 60}`,
    temp: 180 + Math.random() * 10,
    pressure: 5.0 + Math.random() * 0.8,
    speed: 40 + Math.random() * 15,
    efficiency: 90 + Math.random() * 8,
  }));
};

export function TechnicalTelemetryPanel() {
  const [data, setData] = useState(generateMockData());
  const [activeMetric, setActiveMetric] = useState<'temp' | 'pressure' | 'efficiency'>('temp');

  useEffect(() => {
    const interval = setInterval(() => {
      setData(prev => {
        const newData = [...prev.slice(1), {
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          temp: 180 + Math.random() * 10,
          pressure: 5.0 + Math.random() * 0.8,
          speed: 40 + Math.random() * 15,
          efficiency: 90 + Math.random() * 8,
        }];
        return newData;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="h-full border-l rounded-none border-y-0 border-r-0 glass-card bg-background/30 backdrop-blur-xl flex flex-col">
      <CardHeader className="py-4 border-b border-border/50 shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-black uppercase tracking-tighter flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary animate-pulse" />
            Telemetria Industrial
          </CardTitle>
          <Badge variant="outline" className="text-[8px] bg-success/10 text-success border-success/20 animate-pulse">
            SISTEMA NOMINAL
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 flex-1 overflow-y-auto space-y-6 custom-scrollbar">
        {/* Core KPIs Grid */}
        <div className="grid grid-cols-2 gap-2">
          <div
            {...clickableProps(() => setActiveMetric('temp'), { label: 'Selecionar métrica temperatura' })}
            className={cn(
              "p-3 rounded-xl border transition-all cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              activeMetric === 'temp' ? "bg-orange-500/10 border-orange-500/50 shadow-lg shadow-orange-500/10" : "bg-muted/30 border-border/50 hover:bg-muted/50"
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <Thermometer className={cn("h-3 w-3", activeMetric === 'temp' ? "text-orange-500" : "text-muted-foreground")} />
              <TrendingUp className="h-2.5 w-2.5 text-success" />
            </div>
            <p className="text-[9px] font-bold uppercase text-muted-foreground group-hover:text-foreground transition-colors">Temp</p>
            <p className="text-lg font-black tracking-tight">{data[data.length - 1].temp.toFixed(1)}°C</p>
          </div>

          <div
            {...clickableProps(() => setActiveMetric('pressure'), { label: 'Selecionar métrica pressão' })}
            className={cn(
              "p-3 rounded-xl border transition-all cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              activeMetric === 'pressure' ? "bg-blue-500/10 border-blue-500/50 shadow-lg shadow-blue-500/10" : "bg-muted/30 border-border/50 hover:bg-muted/50"
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <Gauge className={cn("h-3 w-3", activeMetric === 'pressure' ? "text-blue-500" : "text-muted-foreground")} />
              <CheckCircle2 className="h-2.5 w-2.5 text-success" />
            </div>
            <p className="text-[9px] font-bold uppercase text-muted-foreground group-hover:text-foreground transition-colors">Pressão</p>
            <p className="text-lg font-black tracking-tight">{data[data.length - 1].pressure.toFixed(2)} bar</p>
          </div>
        </div>

        {/* Main Dynamic Chart */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Monitoramento SPC</span>
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            </div>
          </div>
          
          <div className="h-48 w-full p-2 rounded-2xl bg-black/20 border border-white/5 shadow-inner">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={activeMetric === 'temp' ? "#f97316" : activeMetric === 'pressure' ? "#3b82f6" : "#8b5cf6"} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={activeMetric === 'temp' ? "#f97316" : activeMetric === 'pressure' ? "#3b82f6" : "#8b5cf6"} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                <XAxis dataKey="time" hide />
                <YAxis hide domain={['dataMin - 5', 'dataMax + 5']} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '10px', backdropFilter: 'blur(8px)' }}
                  itemStyle={{ color: '#fff' }}
                  labelStyle={{ color: '#888', marginBottom: '4px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey={activeMetric} 
                  stroke={activeMetric === 'temp' ? "#f97316" : activeMetric === 'pressure' ? "#3b82f6" : "#8b5cf6"} 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorMetric)"
                  animationDuration={1000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* System Health Status */}
        <div className="space-y-3">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-transparent border border-primary/20">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Cpu className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-primary">Status do Processador</p>
                <p className="text-[9px] text-muted-foreground">Otimização AI Ativa</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[9px] font-bold uppercase">
                <span>Carga de Trabalho</span>
                <span>{data[data.length-1].efficiency.toFixed(1)}%</span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${data[data.length-1].efficiency}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          </div>

          {/* Critical Infrastructure Nodes */}
          <div className="grid grid-cols-1 gap-2">
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/30 hover:border-primary/30 transition-all group cursor-pointer">
              <div className="flex items-center gap-2">
                <Database className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-[10px] font-black uppercase tracking-tighter">Knowledge Base</span>
              </div>
              <Badge variant="outline" className="text-[8px] h-4 border-success/20 text-success bg-success/5">SYNCED</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/30 hover:border-primary/30 transition-all group cursor-pointer">
              <div className="flex items-center gap-2">
                <Network className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-[10px] font-black uppercase tracking-tighter">API Latency</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1 h-1 rounded-full bg-success" />
                <span className="text-[10px] font-black text-success">12ms</span>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/30 hover:border-primary/30 transition-all group cursor-pointer">
              <div className="flex items-center gap-2">
                <Cpu className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-[10px] font-black uppercase tracking-tighter">GPU Clusters</span>
              </div>
              <span className="text-[10px] font-black text-primary">4 active</span>
            </div>
          </div>
        </div>

        {/* Actionable Alerts */}
        <div className="p-3 rounded-xl bg-orange-500/5 border border-orange-500/20 flex gap-3 items-start">
          <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase text-orange-500">Alerta de Manutenção</p>
            <p className="text-[9px] text-muted-foreground leading-relaxed">
              Vibração anômala detectada no eixo Z. Sugerimos revisão preventiva em 48h.
            </p>
          </div>
        </div>
      </CardContent>

      <div className="p-4 border-t border-border/50 bg-muted/20 shrink-0">
        <Button variant="outline" size="sm" className="w-full text-[9px] font-black uppercase tracking-widest h-8 border-primary/20 hover:bg-primary/10">
          Visualizar Logs Completos
        </Button>
      </div>
    </Card>
  );
}
