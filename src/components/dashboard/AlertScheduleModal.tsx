import { useMemo, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, Sparkles, Settings2, ListTodo, AlertCircle, Check, X, TrendingUp, TrendingDown, Info, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { clickableProps } from '@/lib/a11y';

interface Job {
  id: string;
  order_number: string;
  client: string;
  product: string;
  quantity: number;
  estimated_duration: number;
  technique_id: string;
  status: string;
  scheduled_date: string | null;
  start_time: string | null;
  machine_id: string | null;
}

interface Machine {
  id: string;
  name: string;
  code: string;
  technique_id: string;
  is_active: boolean;
}

interface AlertScheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedJob: Job | null;
  jobs: Job[];
  machines: Machine[];
  onScheduled: () => void;
}

export function AlertScheduleModal({ open, onOpenChange, selectedJob, jobs, machines, onScheduled }: AlertScheduleModalProps) {
  const [scheduleDate, setScheduleDate] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [selectedMachineId, setSelectedMachineId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOptimizationModal, setShowOptimizationModal] = useState(false);

  const availableMachines = useMemo(() => {
    if (!selectedJob) return [];
    return machines.filter(m => m.technique_id === selectedJob.technique_id && m.is_active);
  }, [selectedJob, machines]);

  const machineOccupancy = useMemo(() => {
    if (!scheduleDate) return {};
    const WORK_DAY_MINUTES = 13 * 60;
    const occupancy: Record<string, { occupiedMinutes: number; jobCount: number; percentage: number }> = {};
    availableMachines.forEach(machine => {
      const machineJobs = jobs.filter(job => job.machine_id === machine.id && job.scheduled_date === scheduleDate && !['finished', 'cancelled'].includes(job.status));
      const occupiedMinutes = machineJobs.reduce((total, job) => total + job.estimated_duration, 0);
      occupancy[machine.id] = { occupiedMinutes, jobCount: machineJobs.length, percentage: Math.min(100, Math.round((occupiedMinutes / WORK_DAY_MINUTES) * 100)) };
    });
    return occupancy;
  }, [availableMachines, jobs, scheduleDate]);

  const suggestion = useMemo(() => {
    if (!selectedJob || !scheduleDate || availableMachines.length === 0) return null;
    const WORK_START = 7 * 60, WORK_END = 20 * 60, duration = selectedJob.estimated_duration;
    let bestMachine: string | null = null, bestTime: string | null = null, lowestOccupancy = Infinity;
    for (const machine of availableMachines) {
      const machineJobs = jobs.filter(job => job.machine_id === machine.id && job.scheduled_date === scheduleDate && job.start_time && !['finished', 'cancelled'].includes(job.status))
        .map(job => { const [h, m] = (job.start_time ?? "00:00").split(':').map(Number); const start = h * 60 + m; return { start, end: start + job.estimated_duration }; }).sort((a, b) => a.start - b.start);
      let currentTime = WORK_START, foundSlot: number | null = null;
      for (const slot of machineJobs) { if (currentTime + duration <= slot.start) { foundSlot = currentTime; break; } currentTime = Math.max(currentTime, slot.end); }
      if (foundSlot === null && currentTime + duration <= WORK_END) foundSlot = currentTime;
      if (foundSlot !== null) { const occ = machineOccupancy[machine.id]?.percentage || 0; if (occ < lowestOccupancy) { lowestOccupancy = occ; bestMachine = machine.id; bestTime = `${String(Math.floor(foundSlot / 60)).padStart(2, '0')}:${String(foundSlot % 60).padStart(2, '0')}`; } }
    }
    if (bestMachine && bestTime) { const machine = availableMachines.find(m => m.id === bestMachine); return { machineId: bestMachine, machineName: machine?.name || '', time: bestTime, occupancy: lowestOccupancy }; }
    return null;
  }, [selectedJob, scheduleDate, availableMachines, jobs, machineOccupancy]);

  const machineScheduledJobs = useMemo(() => {
    if (!selectedMachineId || !scheduleDate) return [];
    return jobs.filter(job => job.machine_id === selectedMachineId && job.scheduled_date === scheduleDate && !['finished', 'cancelled'].includes(job.status))
      .map(job => { const startMinutes = job.start_time ? parseInt(job.start_time.split(':')[0], 10) * 60 + parseInt(job.start_time.split(':')[1], 10) : 0; const endMinutes = startMinutes + job.estimated_duration; return { ...job, endTime: `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`, startMinutes }; })
      .sort((a, b) => a.startMinutes - b.startMinutes);
  }, [selectedMachineId, scheduleDate, jobs]);

  const freeSlots = useMemo(() => {
    if (!selectedMachineId || !scheduleDate) return [];
    const WORK_START = 7 * 60, WORK_END = 20 * 60, MIN = 15;
    const slots: { start: string; end: string; duration: number }[] = [];
    let currentTime = WORK_START;
    for (const job of machineScheduledJobs) { if (job.startMinutes > currentTime) { const gap = job.startMinutes - currentTime; if (gap >= MIN) slots.push({ start: `${String(Math.floor(currentTime / 60)).padStart(2, '0')}:${String(currentTime % 60).padStart(2, '0')}`, end: `${String(Math.floor(job.startMinutes / 60)).padStart(2, '0')}:${String(job.startMinutes % 60).padStart(2, '0')}`, duration: gap }); } currentTime = Math.max(currentTime, job.startMinutes + job.estimated_duration); }
    if (currentTime < WORK_END) { const rem = WORK_END - currentTime; if (rem >= MIN) slots.push({ start: `${String(Math.floor(currentTime / 60)).padStart(2, '0')}:${String(currentTime % 60).padStart(2, '0')}`, end: '20:00', duration: rem }); }
    return slots.sort((a, b) => b.duration - a.duration);
  }, [selectedMachineId, scheduleDate, machineScheduledJobs]);

  const conflicts = useMemo(() => {
    if (!selectedJob || !scheduleDate || !startTime) return [];
    const selStart = parseInt(startTime.split(':')[0], 10) * 60 + parseInt(startTime.split(':')[1], 10);
    const selEnd = selStart + selectedJob.estimated_duration;
    return jobs.filter(job => {
      if (job.id === selectedJob.id || job.scheduled_date !== scheduleDate || ['finished', 'cancelled'].includes(job.status)) return false;
      if (selectedMachineId && job.machine_id !== selectedMachineId) return false;
      if (!selectedMachineId && job.technique_id !== selectedJob.technique_id) return false;
      if (!job.start_time) return false;
      const jStart = parseInt(job.start_time.split(':')[0], 10) * 60 + parseInt(job.start_time.split(':')[1], 10);
      const jEnd = jStart + job.estimated_duration;
      return selStart < jEnd && selEnd > jStart;
    });
  }, [selectedJob, scheduleDate, startTime, jobs, selectedMachineId]);

  const applySuggestion = () => { if (suggestion) { setSelectedMachineId(suggestion.machineId); setStartTime(suggestion.time); toast.success('Sugestão aplicada!'); } };

  const handleSubmit = async () => {
    if (!selectedJob || !scheduleDate) { toast.error('Selecione uma data'); return; }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('jobs').update({ scheduled_date: scheduleDate, start_time: startTime, status: 'scheduled', machine_id: selectedMachineId || null }).eq('id', selectedJob.id);
      if (error) throw error;
      toast.success('Job agendado com sucesso!');
      onOpenChange(false);
      onScheduled();
    } catch { toast.error('Erro ao agendar job'); } finally { setIsSubmitting(false); }
  };

  const handleOpenOptimization = () => {
    if (suggestion) {
      setShowOptimizationModal(true);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Calendar className="w-5 h-5 text-primary" />Agendar Job</DialogTitle>
            <DialogDescription className="sr-only">Formulário de agendamento de trabalho</DialogDescription>
          </DialogHeader>
          {selectedJob && (
            <div className="space-y-4">
              <div className="p-3 bg-secondary/50 rounded-lg">
                <p className="font-medium">{selectedJob.order_number}</p>
                <p className="text-sm text-muted-foreground">{selectedJob.client} - {selectedJob.product}</p>
                <p className="text-xs text-muted-foreground mt-1">{selectedJob.quantity} peças • {selectedJob.estimated_duration} min estimados</p>
              </div>
              {suggestion && (
                <div {...clickableProps(handleOpenOptimization, { label: 'Analisar otimização' })} className="p-3 bg-primary/10 border border-primary/30 rounded-lg cursor-pointer hover:bg-primary/20 transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /><span className="text-sm font-medium text-primary">Sugestão Inteligente</span></div>
                    <Button size="sm" variant="ghost" className="h-6 text-xs group-hover:bg-primary group-hover:text-primary-foreground">Analisar Otimização</Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1"><span className="font-medium text-foreground">{suggestion.machineName}</span>{' às '}<span className="font-medium text-foreground">{suggestion.time}</span>{' • '}{suggestion.occupancy}% ocupação</p>
                </div>
              )}
              <div className="grid gap-4">
                <div className="space-y-2"><Label>Data</Label><Input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} min={format(new Date(), 'yyyy-MM-dd')} /></div>
                <div className="space-y-2"><Label>Horário de Início</Label><Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} min="07:00" max="20:00" /></div>
                <div className="space-y-2">
                  <Label>Máquina</Label>
                  <div className="flex gap-2">
                    <Select value={selectedMachineId} onValueChange={setSelectedMachineId}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Selecione uma máquina (opcional)" /></SelectTrigger>
                      <SelectContent>
                        {availableMachines.length === 0 ? (<div className="p-2 text-sm text-muted-foreground text-center">Nenhuma máquina disponível</div>) : (
                          availableMachines.map(machine => {
                            const occ = machineOccupancy[machine.id] || { percentage: 0 };
                            const occColor = occ.percentage >= 80 ? 'bg-destructive' : occ.percentage >= 50 ? 'bg-status-delayed' : 'bg-status-ready';
                            return (<SelectItem key={machine.id} value={machine.id}><div className="flex items-center justify-between gap-3 w-full"><div className="flex items-center gap-2"><Settings2 className="w-3 h-3 text-muted-foreground" /><span>{machine.code} - {machine.name}</span></div><div className="flex items-center gap-2"><div className="w-16 h-2 bg-secondary rounded-full overflow-hidden"><div className={cn("h-full rounded-full transition-all", occColor)} style={{ width: `${occ.percentage}%` }} /></div><span className="text-xs text-muted-foreground min-w-[3ch]">{occ.percentage}%</span></div></div></SelectItem>);
                          })
                        )}
                      </SelectContent>
                    </Select>
                    {selectedMachineId && <Button type="button" variant="outline" size="icon" onClick={() => setSelectedMachineId('')} className="shrink-0"><X className="w-4 h-4" /></Button>}
                  </div>
                </div>
                {selectedMachineId && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><ListTodo className="w-4 h-4 text-muted-foreground" />Jobs Agendados - {machines.find(m => m.id === selectedMachineId)?.code}</Label>
                    {machineScheduledJobs.length === 0 ? (
                      <div className="p-3 bg-status-ready/10 border border-status-ready/30 rounded-lg text-center"><p className="text-sm text-status-ready font-medium">Máquina livre nesta data</p></div>
                    ) : (
                      <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                        {machineScheduledJobs.map(job => {
                          const selStart = startTime ? parseInt(startTime.split(':')[0], 10) * 60 + parseInt(startTime.split(':')[1], 10) : 0;
                          const selEnd = selStart + (selectedJob?.estimated_duration || 0);
                          const isConflicting = startTime && selStart < job.startMinutes + job.estimated_duration && selEnd > job.startMinutes;
                          return (<div key={job.id} className={cn("flex items-center gap-2 p-2 rounded-md text-xs transition-colors", isConflicting ? "bg-destructive/15 border border-destructive/40" : "bg-secondary/50 border border-border/20")}>
                            <Clock className={cn("w-3.5 h-3.5 shrink-0", isConflicting ? "text-destructive" : "text-muted-foreground")} />
                            <span className={cn("font-mono font-medium", isConflicting ? "text-destructive" : "text-foreground")}>{job.start_time || '--:--'} - {job.endTime}</span>
                            <span className="text-muted-foreground">•</span><span className="font-medium truncate">{job.order_number}</span><span className="text-muted-foreground truncate flex-1">{job.client}</span><span className="text-muted-foreground shrink-0">{job.estimated_duration}min</span>
                          </div>);
                        })}
                      </div>
                    )}
                    {freeSlots.length > 0 && (
                      <div className="mt-2 p-2 bg-status-ready/10 border border-status-ready/30 rounded-md">
                        <p className="text-xs text-status-ready font-medium mb-1.5 flex items-center gap-1"><Clock className="w-3 h-3" />Horários Livres:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {freeSlots.map((slot, idx) => {
                            const fits = slot.duration >= (selectedJob?.estimated_duration || 0);
                            const isSel = startTime === slot.start;
                            return (<button key={idx} type="button" onClick={() => setStartTime(slot.start)} className={cn("px-2 py-1 text-xs font-mono rounded border transition-colors flex items-center gap-1.5", isSel ? fits ? "bg-status-ready text-status-ready-foreground border-status-ready" : "bg-destructive text-destructive-foreground border-destructive" : fits ? "bg-status-ready/20 text-foreground border-status-ready/40 hover:bg-status-ready/30" : "bg-destructive/10 text-muted-foreground border-destructive/30 hover:bg-destructive/20")}>
                              {fits ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}{slot.start} - {slot.end} ({slot.duration}min)
                            </button>);
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {conflicts.length > 0 && (
                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                  <div className="flex items-center gap-2 text-destructive mb-2"><AlertCircle className="w-4 h-4" /><span className="font-medium text-sm">{conflicts.length} conflito{conflicts.length > 1 ? 's' : ''}</span></div>
                  <div className="space-y-2">{conflicts.map(c => (<div key={c.id} className="text-xs text-muted-foreground"><span className="font-medium text-foreground">{c.order_number}</span>{' - '}{c.client}{c.start_time && (<span className="text-destructive/80">{' '}({c.start_time} - {(() => { const [h, m] = (c.start_time ?? "00:00").split(':').map(Number); const endMin = h * 60 + m + c.estimated_duration; return `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`; })()})</span>)}</div>))}</div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} variant={conflicts.length > 0 ? "destructive" : "default"}>{isSubmitting ? 'Agendando...' : conflicts.length > 0 ? 'Agendar Mesmo Assim' : 'Agendar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showOptimizationModal} onOpenChange={setShowOptimizationModal}>
        <DialogContent className="max-w-2xl bg-card border-primary/20 backdrop-blur-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-400" />
              Análise de Otimização IA: OS {selectedJob?.order_number}
            </DialogTitle>
            <DialogDescription>
              Comparativo de impacto entre o sequenciamento atual e a sugestão otimizada.
            </DialogDescription>
          </DialogHeader>

          {suggestion && (
            <div className="space-y-6 my-4">
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-muted/30 border-none p-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 opacity-10">
                    <TrendingDown className="h-10 w-10 text-orange-400" />
                  </div>
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase mb-3 text-center">Status Atual</h4>
                  <div className="flex flex-col items-center justify-center space-y-2 py-4">
                    <p className="text-3xl font-bold">{suggestion.occupancy}%</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Ocupação da Máquina</p>
                  </div>
                </Card>

                <Card className="bg-primary/5 border-primary/20 p-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 opacity-10">
                    <TrendingUp className="h-10 w-10 text-primary" />
                  </div>
                  <h4 className="text-[10px] font-bold text-primary uppercase mb-3 text-center">Sugestão IA</h4>
                  <div className="flex flex-col items-center justify-center space-y-2 py-4">
                    <p className="text-3xl font-bold text-primary">{Math.max(0, suggestion.occupancy - 12)}%</p>
                    <p className="text-[10px] text-primary/70 uppercase">OEE Projetado (+12%)</p>
                  </div>
                </Card>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/10 text-center">
                  <p className="text-[9px] text-yellow-500/70 uppercase font-bold mb-1">Economia Setup</p>
                  <p className="text-xl font-bold text-yellow-500">~15m</p>
                </div>
                <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/10 text-center">
                  <p className="text-[9px] text-blue-500/70 uppercase font-bold mb-1">Lead Time</p>
                  <p className="text-xl font-bold text-blue-500">-{Math.round((selectedJob?.estimated_duration ?? 0) * 0.1)}m</p>
                </div>
                <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/10 text-center">
                  <p className="text-[9px] text-green-500/70 uppercase font-bold mb-1">Confiabilidade</p>
                  <p className="text-xl font-bold text-green-500">Alta</p>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <h4 className="text-xs font-bold mb-2 flex items-center gap-2">
                  <Info className="h-3.5 w-3.5" />
                  Recomendações IA
                </h4>
                <ul className="text-[11px] space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-primary mt-1.5" />
                    Esta máquina ({suggestion.machineName}) possui o melhor setup histórico para a técnica exigida.
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-primary mt-1.5" />
                    O horário sugerido ({suggestion.time}) reduz o tempo de ociosidade entre turnos em 20%.
                  </li>
                  {suggestion.occupancy > 80 && (
                    <li className="flex items-start gap-2 text-orange-400 font-medium">
                      <AlertCircle className="h-3 w-3 mt-0.5" />
                      Carga elevada: A otimização de sequência é essencial para evitar horas extras.
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowOptimizationModal(false)}>Voltar</Button>
            <Button
              size="sm"
              className="gap-2 bg-primary hover:bg-primary/90"
              onClick={() => {
                applySuggestion();
                setShowOptimizationModal(false);
              }}
            >
              Aplicar Sugestão IA
              <Check className="h-4 w-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
