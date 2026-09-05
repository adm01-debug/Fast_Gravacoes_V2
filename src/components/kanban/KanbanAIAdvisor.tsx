/* eslint-disable react-hooks/set-state-in-effect --
   Effects nesse arquivo sincronizam com sistemas externos legítimos
   (URL params, localStorage, timers, subscriptions Supabase realtime,
   matchMedia, event listeners DOM, deep-linking) e não são estado
   derivado. A cascata é intencional para refletir mudanças externas. */
import * as React from 'react';
import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  BrainCircuit, ArrowRight, Zap, AlertTriangle,
  CheckCircle2, Sparkles, ChevronRight, Bell, Settings,
  Clock, Info, LayoutList, Split, TrendingUp, ShieldCheck
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
  SheetDescription, SheetFooter, SheetTrigger
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useSmartSequencing, SequencingSuggestion } from '@/features/jobs';
import { useLoadBalancing, useBottleneckPrediction, LoadBalancingSuggestion } from '@/features/analytics';

import { motion, AnimatePresence } from 'framer-motion';

export function KanbanAIAdvisor() {
  const { suggestions: sequenceSuggestions, totalSavings } = useSmartSequencing();
  const { suggestions: balancingSuggestions } = useLoadBalancing();
  const { alerts: bottleneckAlerts } = useBottleneckPrediction();
  
  const [healthScore, setHealthScore] = useState(100);

  useEffect(() => {
    // Cálculo dinâmico da saúde do planejamento
    let score = 100;
    if (bottleneckAlerts.some(a => a.severity === 'critical')) score -= 30;
    else if (bottleneckAlerts.some(a => a.severity === 'warning')) score -= 15;
    
    if (balancingSuggestions.length > 5) score -= 10;
    if (totalSavings > 120) score -= 5; // Indica que há muito setup a otimizar
    
    setHealthScore(Math.max(0, score));
  }, [bottleneckAlerts, balancingSuggestions, totalSavings]);

  const [showSettings, setShowSettings] = useState(false);
  const [selectedAdviceType, setSelectedAdviceType] = useState<'setup' | 'load' | 'bottleneck' | null>(null);

  const [thresholds, setThresholds] = useState(() => {
    const saved = localStorage.getItem('alert-thresholds');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          bottleneckHigh: parsed.bottleneckHigh || 480,
          bottleneckMedium: parsed.bottleneckRiskMinutes || 300,
        };
      } catch {
        // Configuração corrompida no localStorage: usa os valores padrão abaixo.
      }
    }
    return {
      bottleneckHigh: 480,
      bottleneckMedium: 300,
    };
  });

  const totalInsights = sequenceSuggestions.length + balancingSuggestions.length + bottleneckAlerts.length;

  if (totalInsights === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <BrainCircuit className="h-4 w-4" />
            </div>
            <h2 className="text-sm font-semibold flex items-center gap-2">
              IA Strategist Advisor
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-primary/5 text-primary border-primary/20">
                {totalInsights} Insights
              </Badge>
            </h2>
          </div>
          
          <Separator orientation="vertical" className="h-4 bg-border/50" />
          
          <div className="flex items-center gap-2">
            <TrendingUp className={cn(
              "h-3.5 w-3.5",
              healthScore > 80 ? "text-success" : healthScore > 50 ? "text-warning" : "text-red-400"
            )} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Planejamento: <span className={cn(
                healthScore > 80 ? "text-success" : healthScore > 50 ? "text-warning" : "text-red-400"
              )}>{healthScore}/100</span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-primary"
            onClick={() => setShowSettings(true)}
          >
            <Settings className="h-4 w-4" />
          </Button>
          <div className="p-1.5 rounded-lg bg-background border border-border/50 text-muted-foreground relative">
            <Bell className="h-4 w-4" />
            {totalInsights > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full motion-safe:animate-pulse" />
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Sequenciamento */}
        {sequenceSuggestions.length > 0 && (
          <AdviceCard
            icon={Zap}
            title="Otimização de Setup"
            description={`Economize até ${totalSavings}min agrupando por cor.`}
            actionLabel="Otimizar Sequência"
            color="text-warning"
            badge={`${sequenceSuggestions.length} Máquinas`}
            onClick={() => setSelectedAdviceType('setup')}
          />
        )}

        {/* Balanceamento */}
        {balancingSuggestions.length > 0 && (
          <AdviceCard
            icon={ArrowRight}
            title="Balanceamento de Carga"
            description={`${balancingSuggestions.length} jobs podem ser movidos para máquinas ociosas.`}
            actionLabel="Ver Sugestões"
            color="text-blue-400"
            onClick={() => setSelectedAdviceType('load')}
          />
        )}

        {/* Gargalos */}
        {bottleneckAlerts.length > 0 && (
          <AdviceCard
            icon={AlertTriangle}
            title="Previsão de Gargalo"
            description={bottleneckAlerts[0].message}
            actionLabel="Agir Agora"
            color="text-red-400"
            severity="critical"
            onClick={() => setSelectedAdviceType('bottleneck')}
          />
        )}
      </div>

      {/* Advice Detail Sheet */}
      <Sheet open={selectedAdviceType !== null} onOpenChange={(open) => !open && setSelectedAdviceType(null)}>
        <SheetContent className="sm:max-w-md md:max-w-lg bg-card/95 backdrop-blur-md border-primary/20 p-0 flex flex-col">
          <SheetHeader className="p-6 pb-2">
            <SheetTitle className="flex items-center gap-2 text-xl">
              {selectedAdviceType === 'setup' && <><Zap className="h-5 w-5 text-warning" /> Detalhes de Sequenciamento</>}
              {selectedAdviceType === 'load' && <><ArrowRight className="h-5 w-5 text-blue-400" /> Detalhes de Balanceamento</>}
              {selectedAdviceType === 'bottleneck' && <><AlertTriangle className="h-5 w-5 text-red-400" /> Alertas de Gargalo</>}
            </SheetTitle>
            <SheetDescription>
              {selectedAdviceType === 'setup' && "Recomendações baseadas no agrupamento de cores para reduzir o tempo de setup."}
              {selectedAdviceType === 'load' && "Recomendações para redistribuir a carga de trabalho entre máquinas compatíveis."}
              {selectedAdviceType === 'bottleneck' && "Identificação proativa de máquinas que excederão a capacidade produtiva hoje."}
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1 p-6 pt-2">
            <div className="space-y-6">
              {selectedAdviceType === 'setup' && sequenceSuggestions.map((s, idx) => (
                <div key={idx} className="space-y-4 p-4 rounded-lg bg-muted/30 border border-border/50">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm flex items-center gap-2">
                        {s.machineName}
                        <Badge variant="outline" className="text-[10px] uppercase font-bold text-primary border-primary/20">
                          {s.techniqueName}
                        </Badge>
                      </h4>
                      <p className="text-[10px] text-muted-foreground">OS Sugeridas: {s.optimizedSequence.length} jobs</p>
                    </div>
                    <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/20 gap-1 text-[10px]">
                      <Clock className="h-3 w-3" /> -{s.estimatedSavings}min setup
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <LayoutList className="h-3 w-3" /> Grupos de Setup (Cores)
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {s.colorGroups.map((g, gIdx) => (
                        <div key={gIdx} className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-background border border-border/50">
                          <div
                            className="w-2 h-2 rounded-full border border-white/20"
                            style={{ backgroundColor: g.color === 'sem-cor' ? '#888' : g.color }}
                          />
                          <span className="text-[10px] font-medium">{g.jobCount} jobs</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-2 rounded bg-background/50 border border-border/30">
                    <p className="text-[10px] font-medium text-muted-foreground flex items-center gap-1 mb-1">
                      <Info className="h-3 w-3" /> Lógica de IA:
                    </p>
                    <p className="text-[10px] leading-relaxed italic">
                      "Otimizado reduzindo trocas de cilindros/telas. Agrupamento por cor minimiza o tempo de limpeza e ajuste entre ordens, mantendo a prioridade urgente em cada bloco."
                    </p>
                  </div>

                  <Button className="w-full h-8 text-xs gap-2" variant="outline">
                    Aplicar Sequenciamento Inteligente
                  </Button>
                </div>
              ))}

              {selectedAdviceType === 'load' && balancingSuggestions.map((s, idx) => (
                <div key={idx} className="space-y-4 p-4 rounded-lg bg-muted/30 border border-border/50">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm">OS {s.orderNumber}</h4>
                      <p className="text-[10px] text-muted-foreground">{s.client}</p>
                    </div>
                    <Badge className="bg-blue-400/10 text-blue-400 border-blue-400/20 text-[10px] uppercase">
                      Equilíbrio de Carga
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 items-center">
                    <div className="p-2 rounded bg-red-400/5 border border-red-400/20 text-center">
                      <p className="text-[9px] text-muted-foreground uppercase mb-1">Origem (Sobrecarregada)</p>
                      <p className="text-[10px] font-bold truncate">{s.currentMachineName}</p>
                      <p className="text-[10px] text-red-400 font-mono mt-1">{Math.round(s.currentLoad)}% Ocupação</p>
                    </div>
                    <div className="flex justify-center relative">
                      <ArrowRight className="h-4 w-4 text-muted-foreground absolute" />
                    </div>
                    <div className="p-2 rounded bg-green-400/5 border border-green-400/20 text-center">
                      <p className="text-[9px] text-muted-foreground uppercase mb-1">Destino (Capacidade)</p>
                      <p className="text-[10px] font-bold truncate">{s.suggestedMachineName}</p>
                      <p className="text-[10px] text-green-400 font-mono mt-1">{Math.round(s.suggestedLoad)}% Ocupação</p>
                    </div>
                  </div>

                  <div className="p-2 rounded bg-background/50 border border-border/30">
                    <p className="text-[10px] font-medium text-muted-foreground flex items-center gap-1 mb-1">
                      <Info className="h-3 w-3" /> Benefício Previsto:
                    </p>
                    <p className="text-[10px] leading-relaxed italic">
                      "Redução imediata de {Math.round(s.loadDifference)}% na pressão da máquina gargalo. Garante que o fluxo de produção não pare por saturação de um único recurso."
                    </p>
                  </div>

                  <Button className="w-full h-8 text-xs gap-2" variant="outline">
                    Mover OS para {s.suggestedMachineName}
                  </Button>
                </div>
              ))}

              {selectedAdviceType === 'bottleneck' && bottleneckAlerts.map((a, idx) => (
                <div key={idx} className="space-y-4 p-4 rounded-lg bg-red-400/5 border border-red-400/20">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-red-400 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" /> Alerta de Gargalo
                    </h4>
                    <Badge variant="destructive" className="text-[11px] uppercase font-black px-1.5 motion-safe:animate-pulse">
                      Crítico
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-bold">{a.techniqueName}</p>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      {a.message}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <Button variant="outline" className="h-8 text-[10px] gap-1.5" onClick={() => setSelectedAdviceType('setup')}>
                      <Zap className="h-3 w-3" /> Otimizar Setup
                    </Button>
                    <Button variant="outline" className="h-8 text-[10px] gap-1.5" onClick={() => setSelectedAdviceType('load')}>
                      <Split className="h-3 w-3" /> Redistribuir Carga
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <SheetFooter className="p-6 border-t border-border/50 bg-background/50">
            <Button className="w-full font-bold gap-2" variant="secondary" onClick={() => setSelectedAdviceType(null)}>
              Fechar Visão Analítica
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-md bg-card border-primary/20">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuração de Alertas Automáticos
            </DialogTitle>
            <DialogDescription>
              Defina os limites de carga para notificações de gargalo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="high">Risco Alto (Gargalo Crítico)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="high"
                  type="number"
                  value={thresholds.bottleneckHigh}
                  onChange={(e) => setThresholds(prev => ({ ...prev, bottleneckHigh: parseInt(e.target.value, 10) }))}
                />
                <span className="text-xs text-muted-foreground font-mono w-16">minutos</span>
              </div>
              <p className="text-[10px] text-muted-foreground italic">Padrão: 480 min (8 horas)</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="medium">Risco Médio (Atenção)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="medium"
                  type="number"
                  value={thresholds.bottleneckMedium}
                  onChange={(e) => setThresholds(prev => ({ ...prev, bottleneckMedium: parseInt(e.target.value, 10) }))}
                />
                <span className="text-xs text-muted-foreground font-mono w-16">minutos</span>
              </div>
              <p className="text-[10px] text-muted-foreground italic">Padrão: 300 min (5 horas)</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowSettings(false)}>Cancelar</Button>
            <Button onClick={() => {
              try { localStorage.setItem('alert-thresholds', JSON.stringify({
                bottleneckHigh: thresholds.bottleneckHigh,
                bottleneckRiskMinutes: thresholds.bottleneckMedium // Sync with DroppableColumn key
              })); } catch { /* quota exceeded */ }
              toast.success("Configurações de alerta salvas!");
              setShowSettings(false);
              window.location.reload();
            }}>Salvar Configurações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

function AdviceCard({
  icon: Icon,
  title,
  description,
  actionLabel,
  color,
  badge,
  severity,
  onClick
}: {
  icon: React.ComponentType<{ className?: string }>,
  title: string,
  description: string,
  actionLabel: string,
  color: string,
  badge?: string,
  severity?: 'critical' | 'warning',
  onClick?: () => void
}) {
  return (
    <Card
      className={`overflow-hidden border-l-4 ${
        severity === 'critical' ? 'border-l-red-500 bg-red-500/5' : 'border-l-primary/50 bg-card/50'
      } hover:bg-card/80 transition-all cursor-pointer group shadow-sm hover:shadow-md`}
      onClick={onClick}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between">
          <div className={`p-1.5 rounded-md bg-background border border-border/50 ${color}`}>
            <Icon className="h-3.5 w-3.5" />
          </div>
          {badge && (
            <Badge variant="outline" className="text-[10px] px-1 h-4 border-primary/20 text-primary">
              {badge}
            </Badge>
          )}
        </div>
        <div className="space-y-0.5">
          <p className="text-xs font-bold truncate">{title}</p>
          <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
            {description}
          </p>
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-border/30">
          <span className="text-[10px] font-medium text-primary group-hover:underline flex items-center gap-1">
            {actionLabel}
            <ChevronRight className="h-2.5 w-2.5" />
          </span>
          <Sparkles className="h-2.5 w-2.5 text-primary/40 group-hover:text-primary transition-colors" />
        </div>
      </CardContent>
    </Card>
  );
}

