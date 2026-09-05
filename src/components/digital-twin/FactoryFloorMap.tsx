import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTPM } from '@/features/maintenance/hooks/useTPM';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Activity, Zap, Thermometer, Box, Layers, MousePointer2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { clickableProps } from '@/lib/a11y';
import { logger } from '@/lib/logger';

interface MachineLive {
  load: number;
  temp: number;
  efficiency: number;
  isWorking: boolean;
}

interface JobRow {
  id: string;
  machine_id: string | null;
  [key: string]: unknown;
}

interface MachineRow {
  id: string;
  name: string;
  code?: string;
  [key: string]: unknown;
}

export function FactoryFloorMap() {
  const { machines } = useTPM();
  const [liveData, setLiveData] = useState<Record<string, MachineLive>>({});
  const [activeJobs, setActiveJobs] = useState<Record<string, JobRow>>({});
  const [heatmapType, setHeatmapType] = useState<'none' | 'load' | 'temp'>('none');
  const [selectedMachine, setSelectedMachine] = useState<string | null>(null);

  // Refs let the interval callback always read the latest state without being
  // included in effect deps (which would cause infinite re-fetch loops).
  const machinesRef = useRef(machines);
  const activeJobsRef = useRef(activeJobs);
  useEffect(() => { machinesRef.current = machines; }, [machines]);
  useEffect(() => { activeJobsRef.current = activeJobs; }, [activeJobs]);

  // Fetch active jobs on mount and poll every 30 s so the map doesn't go stale
  // when operators start/finish jobs without a full page reload.
  useEffect(() => {
    let mounted = true;
    const fetchActiveJobs = async () => {
      try {
        const { data, error } = await supabase
          .from('jobs')
          .select('*, machines(id, name)')
          .eq('status', 'production');
        if (error) throw error;
        if (!mounted) return;

        const jobsByMachine: Record<string, JobRow> = {};
        data?.forEach((job: JobRow) => {
          if (job.machine_id) {
            jobsByMachine[job.machine_id] = job;
          }
        });
        setActiveJobs(jobsByMachine);
      } catch (err) {
        logger.error('Failed to fetch active jobs for factory floor map', err, 'FactoryFloorMap');
      }
    };

    fetchActiveJobs();
    const pollInterval = setInterval(fetchActiveJobs, 30_000);

    return () => {
      mounted = false;
      clearInterval(pollInterval);
    };
  }, [machines]);

  // Simulated live telemetry tick (independent of fetch cycle). Reads
  // machines/activeJobs through refs so this effect never needs to depend on
  // either — depending on `machines` directly would re-create the interval
  // on every reference change (e.g. while the TPM query is still loading).
  useEffect(() => {
    const interval = setInterval(() => {
      const newData: Record<string, MachineLive> = {};
      machinesRef.current.forEach((m: MachineRow) => {
        const hasJob = !!activeJobsRef.current[m.id];
        newData[m.id] = {
          load: hasJob ? Math.floor(Math.random() * 20) + 80 : 0,
          temp: hasJob ? Math.floor(Math.random() * 20) + 45 : 30,
          efficiency: hasJob ? Math.floor(Math.random() * 10) + 90 : 0,
          isWorking: hasJob
        };
      });
      setLiveData(newData);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between bg-black/40 border border-border/40 p-3 rounded-xl backdrop-blur-xl gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
            <Layers className="h-4 w-4 text-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest">Modos de Visualização</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch id="heatmap-load" checked={heatmapType === 'load'} onCheckedChange={(val) => setHeatmapType(val ? 'load' : 'none')} />
              <Label htmlFor="heatmap-load" className="text-[9px] font-bold uppercase cursor-pointer">Carga Nominal</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="heatmap-temp" checked={heatmapType === 'temp'} onCheckedChange={(val) => setHeatmapType(val ? 'temp' : 'none')} />
              <Label htmlFor="heatmap-temp" className="text-[9px] font-bold uppercase cursor-pointer">Stress Térmico</Label>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="gap-2 bg-success/10 text-success border-success/20 text-[9px] font-bold">
            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            MOTOR DE SINCRO V2.4 ATIVO
          </Badge>
        </div>
      </div>

      <div className="relative w-full aspect-[2.2/1] bg-secondary/10 rounded-xl border border-border/50 overflow-hidden p-8 group/map shadow-inner">
        {/* Factory Grid Background */}
        <div className="absolute inset-0 opacity-10 pointer-events-none"
             style={{ backgroundImage: 'radial-gradient(circle, hsl(var(--primary)) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

        {/* Logistics Flow Animation */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
          <div className="absolute top-1/2 left-0 w-full h-[2px] bg-primary animate-[shimmer_2s_infinite]" />
          <div className="absolute top-0 left-1/2 w-[2px] h-full bg-primary animate-[shimmer_3s_infinite]" />

          <div className="absolute top-[20%] left-0 w-2 h-2 bg-primary rounded-full animate-[ping_1.5s_infinite] shadow-glow-primary" style={{ left: '25%' }} />
          <div className="absolute top-[40%] left-0 w-2 h-2 bg-success rounded-full animate-[ping_2s_infinite] shadow-glow-success" style={{ left: '65%' }} />
          <div className="absolute top-[80%] left-0 w-2 h-2 bg-warning rounded-full animate-[ping_2.5s_infinite] shadow-[0_0_10px_rgba(245,158,11,0.5)]" style={{ left: '45%' }} />
        </div>

        {/* Walls/Areas */}
        <div className="absolute top-1/4 left-0 w-full h-0.5 bg-primary/20" />
        <div className="absolute top-0 left-1/3 w-0.5 h-full bg-primary/20" />

        <div className="absolute top-4 left-4 text-[10px] font-black uppercase text-primary/60 tracking-widest flex items-center gap-2">
          <div className="w-1 h-1 bg-primary rounded-full animate-pulse" />
          Área de Impressão (Serigrafia)
        </div>
        <div className="absolute top-4 left-[35%] text-[10px] font-black uppercase text-primary/60 tracking-widest flex items-center gap-2">
          <div className="w-1 h-1 bg-primary rounded-full animate-pulse" />
          Área de Acabamento
        </div>

        {/* Machines Placement */}
        <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 h-full overflow-y-auto pr-2 custom-scrollbar">
          {machines.map((machine: MachineRow) => {
            const status = liveData[machine.id] || { load: 0, temp: 0, efficiency: 0, isWorking: false };
            const isWorking = status.isWorking;

            return (
              <div key={machine.id} className="relative group">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        {...clickableProps(() => setSelectedMachine(selectedMachine === machine.id ? null : machine.id), { label: `Selecionar máquina ${machine.id}` })}
                        className={cn(
                          "w-full aspect-square rounded-lg border-2 flex flex-col items-center justify-center p-4 transition-all duration-500 cursor-pointer relative overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                          isWorking ? "bg-primary/5 border-primary/40 shadow-glow-primary" : "bg-muted/20 border-border/30 grayscale opacity-70",
                          heatmapType === 'load' && isWorking && status.load > 90 ? "bg-warning/20 border-warning/60 shadow-[0_0_20px_rgba(245,158,11,0.4)] scale-[1.02]" :
                          heatmapType === 'temp' && isWorking && status.temp > 60 ? "bg-rose-500/20 border-rose-500/60 shadow-[0_0_20px_rgba(244,63,94,0.4)] scale-[1.02]" :
                          selectedMachine === machine.id ? "border-primary ring-2 ring-primary ring-offset-2 ring-offset-background scale-[1.05] z-50 bg-primary/10" : ""
                        )}>
                        {selectedMachine === machine.id && (
                          <div className="absolute top-1 right-1">
                            <MousePointer2 className="h-3 w-3 text-primary animate-bounce" />
                          </div>
                        )}
                        <Zap className={cn(
                          "h-6 w-6 mb-2 transition-transform",
                          isWorking ? "text-primary animate-pulse" : "text-muted-foreground"
                        )} />
                        <span className="text-[10px] font-black uppercase text-center truncate w-full">
                          {machine.name}
                        </span>
                        <Badge variant={isWorking ? "default" : "secondary"} className="mt-2 text-[7px] h-3 px-1">
                          {isWorking ? 'ATIVO' : 'IDLE'}
                        </Badge>

                        {isWorking && (
                          <div className="mt-2 w-full space-y-1">
                            <div className="h-1 w-full bg-background/50 rounded-full overflow-hidden">
                              <div className={cn("h-full transition-all duration-1000", status.load > 90 ? 'bg-warning' : 'bg-primary')}
                                   style={{ width: `${status.load}%` }} />
                            </div>
                          </div>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-2 p-1 max-w-[200px]">
                        <p className="font-bold text-xs uppercase border-b pb-1 mb-1">{machine.name}</p>
                        {isWorking ? (
                          <div className="space-y-2">
                             <div className="p-1.5 rounded bg-primary/10 border border-primary/20">
                                <p className="text-[10px] font-black text-primary uppercase">OP em Andamento</p>
                                <p className="text-[10px] font-bold truncate">{String(activeJobs[machine.id]?.order_number ?? 'S/N')}</p>
                             </div>
                             <div className="flex items-center gap-4 text-[10px] font-bold">
                              <div className="flex items-center gap-1">
                                <Activity className="h-3 w-3 text-primary" /> {status.efficiency}%
                              </div>
                              <div className="flex items-center gap-1">
                                <Thermometer className="h-3 w-3 text-warning" /> {status.temp}°C
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="text-[10px] italic text-muted-foreground">Equipamento em Standby</p>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
