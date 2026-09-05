/* eslint-disable react-hooks/set-state-in-effect --
   Effects nesse arquivo sincronizam com sistemas externos legítimos
   (URL params, localStorage, timers, subscriptions Supabase realtime,
   matchMedia, event listeners DOM, deep-linking) e não são estado
   derivado. A cascata é intencional para refletir mudanças externas. */
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useOperatorDashboardData } from '@/features/production';
import { useUpdateJobStatus, DbJob } from '@/features/jobs';
import { notifyStatusChange } from '@/features/notifications';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useAuth } from '@/features/auth';
import { JobDetailsModal } from '@/components/jobs/JobDetailsModal';
import { ProductionRegistrationModal } from '@/components/operator/ProductionRegistrationModal';
import { PreProductionChecklistModal } from '@/components/operator/PreProductionChecklistModal';
import { ShiftSummaryCard } from '@/components/operator/ShiftSummaryCard';
import { OperatorQuickHistory } from '@/components/operator/OperatorQuickHistory';
import { OperatorProductionCard } from '@/components/operator/OperatorProductionCard';
import { OperatorReadyJobCard } from '@/components/operator/OperatorReadyJobCard';
import { OfflineSyncIndicator } from '@/components/offline/OfflineSyncIndicator';
import { SwipeActions } from '@/components/mobile/SwipeActions';
import { EmptyState } from '@/components/ui/empty-state';
import { SoundFeedback } from '@/lib/soundFeedback';
import { User, Play, Pause, Package, Maximize, Eye, EyeOff, Timer, ArrowRightLeft, Gauge } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { VoiceButton } from '@/components/voice/VoiceCommands';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AnimatePresence, motion } from 'framer-motion';

export default function OperatorView() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedMachine, setSelectedMachine] = useState<string>('_default');
  const [selectedJob, setSelectedJob] = useState<DbJob | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [productionJob, setProductionJob] = useState<DbJob | null>(null);
  const [isProductionModalOpen, setIsProductionModalOpen] = useState(false);
  const [checklistJobId, setChecklistJobId] = useState<string | null>(null);
  const [isChecklistOpen, setIsChecklistOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);

  const { jobs, techniques, machines, isLoading, getTechniqueById, getMachineById, refetchAll, assignedMachineIds } = useOperatorDashboardData();
  const updateStatus = useUpdateJobStatus();
  const { isOnline, cacheData } = useOfflineSync();

  useEffect(() => {
    if (selectedMachine === '_default' && assignedMachineIds && assignedMachineIds.length > 0) {
      setSelectedMachine(assignedMachineIds[0]);
    } else if (selectedMachine === '_default') {
      setSelectedMachine('all');
    }
  }, [assignedMachineIds, selectedMachine]);

  useEffect(() => { cacheData(); }, [cacheData]);

  const effectiveMachineFilter = selectedMachine === '_default' ? 'all' : selectedMachine;

  const filteredJobs = useMemo(() => {
    if (!jobs) return [];
    let filtered = jobs.filter(job => ['ready', 'scheduled', 'production', 'paused'].includes(job.status));
    if (effectiveMachineFilter !== 'all') filtered = filtered.filter(job => job.machine_id === effectiveMachineFilter);
    return filtered;
  }, [jobs, effectiveMachineFilter]);

  const handleStartProduction = useCallback((job: DbJob) => { setChecklistJobId(job.id); setIsChecklistOpen(true); }, []);

  const handleChecklistComplete = useCallback(async (jobId: string) => {
    setChecklistJobId(null); setIsChecklistOpen(false);
    const job = jobs?.find(j => j.id === jobId);
    if (!job) return;
    try { await updateStatus.mutateAsync({ jobId: job.id, status: 'production' }); SoundFeedback.success(); notifyStatusChange(job.client, job.status, 'production'); }
    catch { SoundFeedback.error(); }
  }, [jobs, updateStatus]);

  const handlePauseProduction = useCallback(async (job: DbJob) => {
    try { await updateStatus.mutateAsync({ jobId: job.id, status: 'paused' }); SoundFeedback.warning(); notifyStatusChange(job.client, job.status, 'paused'); }
    catch { SoundFeedback.error(); }
  }, [updateStatus]);

  const handleFinishProduction = useCallback((job: DbJob) => { setProductionJob(job); setIsProductionModalOpen(true); }, []);
  const handleJobClick = useCallback((job: DbJob) => { setSelectedJob(job); setIsModalOpen(true); }, []);

  if (isLoading || selectedMachine === '_default') {
    return (<MainLayout><div className="p-8 space-y-6"><Skeleton className="h-10 w-64" /><Skeleton className="h-24 w-full" /><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-48" />)}</div></div></MainLayout>);
  }

  const inProductionJobs = filteredJobs.filter(j => j.status === 'production');
  const readyJobs = filteredJobs.filter(j => ['ready', 'scheduled'].includes(j.status));
  const pausedJobs = filteredJobs.filter(j => j.status === 'paused');

  return (
    <MainLayout>
      <JobDetailsModal job={selectedJob} open={isModalOpen} onOpenChange={setIsModalOpen} />
      <ProductionRegistrationModal job={productionJob} open={isProductionModalOpen} onOpenChange={setIsProductionModalOpen} />
      <PreProductionChecklistModal jobId={checklistJobId} open={isChecklistOpen} onOpenChange={setIsChecklistOpen} onComplete={handleChecklistComplete} />

      <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 animate-fade-in-up">
        {/* Breadcrumbs e BackButton agora centralizados no MainLayout */}
        <OfflineSyncIndicator variant="full" />

        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-display"><span className="gradient-text">Visão do Operador</span></h1>
            <p className="text-muted-foreground text-sm">Gerencie suas produções {!isOnline && '(Modo Offline)'}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={effectiveMachineFilter} onValueChange={setSelectedMachine}>
              <SelectTrigger className="w-full sm:w-[220px] bg-card/50 border-border/50"><User className="h-4 w-4 mr-2" /><SelectValue placeholder="Selecionar máquina" /></SelectTrigger>
              <SelectContent className="bg-card border-border"><SelectItem value="all">Todas as máquinas</SelectItem>{machines?.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
            </Select>
            <Tooltip><TooltipTrigger asChild><Button variant={focusMode ? 'default' : 'outline'} size="icon" onClick={() => setFocusMode(!focusMode)} className="shrink-0 transition-all active:scale-95">{focusMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button></TooltipTrigger><TooltipContent>{focusMode ? 'Sair do modo foco' : 'Modo foco'}</TooltipContent></Tooltip>
            <VoiceButton onCommand={(cmd) => { if (cmd.startsWith('navigate:') && cmd.includes('kiosk')) navigate('/kiosk'); }} />
            <Button variant="outline" size="sm" onClick={() => navigate('/kiosk')} className="gap-2 shadow-sm hover:shadow-md transition-all active:scale-95 border-primary/30"><Maximize className="h-4 w-4" /><span className="hidden sm:inline">Modo Kiosk</span></Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/shift-handover')} className="gap-2 shadow-sm hover:shadow-md transition-all active:scale-95 border-warning/30"><ArrowRightLeft className="h-4 w-4 text-warning" /><span className="hidden sm:inline">Passagem de Turno</span></Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/oee')} className="gap-2 shadow-sm hover:shadow-md transition-all active:scale-95 border-success/30"><Gauge className="h-4 w-4 text-success" /><span className="hidden sm:inline">Meu OEE</span></Button>
          </div>
        </div>

        {!focusMode && jobs && <ShiftSummaryCard jobs={jobs} />}

        {inProductionJobs.length > 0 && (
          <div className="space-y-3 sm:space-y-4">
            <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2"><Play className="h-5 w-5 text-status-production" />Em Produção<Badge variant="secondary" className="ml-1">{inProductionJobs.length}</Badge></h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <AnimatePresence>
                {inProductionJobs.map(job => (
                  <OperatorProductionCard key={job.id} job={job} technique={getTechniqueById(job.technique_id)} machine={getMachineById(job.machine_id)} onPause={handlePauseProduction} onFinish={handleFinishProduction} onClick={handleJobClick} />
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {!focusMode && pausedJobs.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2"><Pause className="h-5 w-5 text-warning" />Pausados<Badge variant="secondary" className="ml-1">{pausedJobs.length}</Badge></h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <AnimatePresence>
                {pausedJobs.map(job => {
                  const technique = getTechniqueById(job.technique_id);
                  return (
                    <motion.div key={job.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                      <SwipeActions rightActions={[{ id: 'resume', icon: <Play className="h-5 w-5" />, label: 'Retomar', color: 'hsl(0, 0%, 100%)', bgColor: 'hsl(var(--primary))', onAction: () => handleStartProduction(job) }]}>
                        <Card className="glass-card border-warning/30 cursor-pointer hover:border-warning/50 transition-colors" onClick={() => handleJobClick(job)}>
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between mb-2"><p className="font-medium">{job.client}</p><Badge variant="outline" className="border-warning/50 text-warning">Pausado</Badge></div>
                            <p className="text-sm text-muted-foreground mb-1">{job.product}</p>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3"><Timer className="h-3 w-3" />Estimado: {job.estimated_duration}min • {job.quantity.toLocaleString()} pçs</div>
                            <Button size="sm" className="w-full" onClick={(e) => { e.stopPropagation(); handleStartProduction(job); }}><Play className="h-4 w-4 mr-1" />Retomar Produção</Button>
                          </CardContent>
                        </Card>
                      </SwipeActions>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        )}

        {!focusMode && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2"><Package className="h-5 w-5 text-status-ready" />Próximos Jobs<Badge variant="secondary" className="ml-1">{readyJobs.length}</Badge></h2>
            {readyJobs.length === 0 ? (
              <EmptyState variant="no-events" title="Nenhum job aguardando" description="Não há jobs prontos para produção no momento." size="sm" />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence>
                  {readyJobs.map((job, index) => (
                    <OperatorReadyJobCard key={job.id} job={job} index={index} technique={getTechniqueById(job.technique_id)} machine={getMachineById(job.machine_id)} onStart={handleStartProduction} onClick={handleJobClick} />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}

        {!focusMode && jobs && <OperatorQuickHistory jobs={jobs} getTechniqueName={(id) => getTechniqueById(id)?.name} />}
      </div>
    </MainLayout>
  );
}
