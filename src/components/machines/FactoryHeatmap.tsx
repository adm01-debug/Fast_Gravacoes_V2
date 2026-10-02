import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Map as MapIcon } from 'lucide-react';
import { useSchedulingData, type DbMachine, type DbTechnique } from '@/features/jobs';

export function FactoryHeatmap({ machines, techniques }: { machines: DbMachine[]; techniques: DbTechnique[] }) {
  const { jobs } = useSchedulingData();

  const getHeatColor = (machine: DbMachine) => {
    if (!machine.is_active) return 'bg-slate-200 dark:bg-slate-800 opacity-40';

    // Count jobs in production for this machine
    const productionJobs = jobs.filter(j => j.machine_id === machine.id && j.status === 'production').length;

    if (productionJobs > 0) return 'bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.5)]';

    // Check if machine is scheduled for today
    const today = new Date().toISOString().split('T')[0];
    const scheduledToday = jobs.filter(j => j.machine_id === machine.id && j.scheduled_date === today).length;

    if (scheduledToday > 0) return 'bg-warning shadow-[0_0_10px_rgba(251,191,36,0.3)]';

    return 'bg-success shadow-[0_0_10px_rgba(16,185,129,0.2)]';
  };

  const getMachineStats = (machine: DbMachine) => {

    const machineJobs = jobs.filter(j => j.machine_id === machine.id);
    const productionCount = machineJobs.filter(j => j.status === 'production').length;
    const today = new Date().toISOString().split('T')[0];
    const todayCount = machineJobs.filter(j => j.scheduled_date === today).length;
    const completedCount = machineJobs.filter(j => j.status === 'finished').length;

    return {
      productionCount,
      todayCount,
      completedCount,
      occupancy: machineJobs.length > 0 ? Math.min(100, (todayCount / 5) * 100) : 0
    };
  };

  return (
    <div className="space-y-6">
      <Card className="glass-card overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-amber-500/10 to-transparent">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapIcon className="h-5 w-5 text-warning" />
                Layout Térmico da Fábrica
              </CardTitle>
              <CardDescription>Visualização em tempo real de pontos de calor e ociosidade</CardDescription>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-tighter shrink-0">
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-orange-500" /> Carga Alta</div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-success" /> Normal</div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-slate-400" /> Inativo</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8 overflow-auto">
          <div className="min-w-[800px] relative aspect-[21/9] bg-muted/20 rounded-2xl border-4 border-dashed border-border/40 p-12 overflow-hidden">
             {/* Grid background */}
             <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

             <div className="relative z-10 grid grid-cols-8 gap-4 h-full">
               {machines.slice(0, 48).map((machine, i) => (
                 <TooltipProvider key={machine.id}>
                   <Tooltip>
                     <TooltipTrigger asChild>
                       <motion.div
                         initial={{ scale: 0 }}
                         animate={{ scale: 1 }}
                         transition={{ delay: i * 0.01 }}
                         className={cn(
                           "w-full aspect-square rounded-lg flex items-center justify-center transition-all cursor-help",
                           getHeatColor(machine)
                         )}
                       >
                         <span className="text-[8px] font-mono font-bold text-white/80">{machine.code}</span>
                       </motion.div>
                     </TooltipTrigger>
                      <TooltipContent>
                         <p className="font-bold">{machine.code}</p>
                         <p className="text-xs">{machine.name}</p>
                         <div className="mt-2 space-y-1 pt-1 border-t border-border/50">
                            <p className="text-[10px] uppercase font-bold flex justify-between gap-4">
                               <span>Em Produção:</span>
                               <span className="text-primary">{getMachineStats(machine).productionCount}</span>
                            </p>
                            <p className="text-[10px] uppercase font-bold flex justify-between gap-4">
                               <span>Agendados Hoje:</span>
                               <span>{getMachineStats(machine).todayCount}</span>
                            </p>
                            <p className="text-[10px] uppercase font-bold flex justify-between gap-4">
                               <span>Ocupação:</span>
                               <span className="text-warning">{Math.round(getMachineStats(machine).occupancy)}%</span>
                            </p>
                         </div>
                      </TooltipContent>
                   </Tooltip>
                 </TooltipProvider>
               ))}
             </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

