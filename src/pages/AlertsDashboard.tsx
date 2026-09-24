import { useState, useMemo } from "react";
import { parseDateOnly } from "@/lib/dateUtils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MainLayout } from "@/components/layout/MainLayout";
import { JobDetailsModal } from "@/components/jobs/JobDetailsModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, Clock, AlertCircle, RotateCcw, Zap, Bell, RefreshCw } from "lucide-react";
import { useSchedulingData, DbJob, StuckJob } from "@/features/jobs";
import { Job } from "@/types/scheduling";
import { useBottleneckPrediction, useLoadBalancing, BottleneckAlert, LoadBalancingSuggestion } from "@/features/analytics";

import { useEfficiencyNotifications } from "@/features/notifications";
import { EfficiencyAlertHistoryWidget } from "@/components/dashboard/EfficiencyAlertHistoryWidget";
import { useStuckJobsDetection } from "@/features/jobs";

import { useOrphanedDataDetection } from "@/features/admin";
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { AlertJobCard } from "@/components/alerts/AlertJobCard";
import { AlertStatsGrid } from "@/components/alerts/AlertStatsGrid";
import { JobsViewAll, BottleneckViewAll, LoadBalancingViewAll, StuckJobsViewAll } from "@/components/alerts/AlertViewAllModals";
import { StuckJobsCard, DataIntegrityCard, BottleneckCard, LoadBalancingCard, CriticalSummaryCard } from "@/components/alerts/AlertSpecialCards";

type ViewAllModalType = 'jobs' | 'bottleneck' | 'loadBalancing' | 'stuckJobs' | null;

interface ViewAllModalData {
  type: ViewAllModalType;
  title: string;
  jobs?: DbJob[];
  bottleneckAlerts?: BottleneckAlert[];
  loadBalancingSuggestions?: LoadBalancingSuggestion[];
  stuckJobs?: StuckJob[];
}

export default function AlertsDashboard() {
  const [selectedJob, setSelectedJob] = useState<DbJob | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewAllModal, setViewAllModal] = useState<ViewAllModalData | null>(null);

  const { jobs, getTechniqueById } = useSchedulingData();

  const alertData = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const delayed = jobs.filter(job => job.status === 'delayed');
    const rework = jobs.filter(job => job.status === 'rework');
    const urgent = jobs.filter(job => job.priority === 'urgent' && !['finished', 'cancelled'].includes(job.status));
    const atRisk = jobs.filter(job => {
      const jobDate = parseDateOnly(job.scheduled_date);
      return !!jobDate && jobDate.getTime() === today.getTime() && ['queue', 'ready', 'scheduled'].includes(job.status);
    });
    const overdue = jobs.filter(job => {
      const jobDate = parseDateOnly(job.scheduled_date);
      return !!jobDate && jobDate < today && !['finished', 'cancelled'].includes(job.status);
    });
    return { delayed, rework, urgent, atRisk, overdue };
  }, [jobs]);

  const handleJobClick = (dbJob: DbJob) => { setSelectedJob(dbJob); setIsModalOpen(true); };

  const { alerts: bottleneckAlerts, criticalCount, warningCount } = useBottleneckPrediction();
  const { suggestions: loadBalancingSuggestions } = useLoadBalancing();
  const { checkBottleneckAlerts, checkLoadBalancingAlerts } = useEfficiencyNotifications();
  const { stuckJobs, criticalCount: stuckCritical } = useStuckJobsDetection();
  const { issues: dataIssues, orphanedTechniques } = useOrphanedDataDetection();

  const totalJobAlerts = alertData.delayed.length + alertData.rework.length + alertData.urgent.length + alertData.atRisk.length + alertData.overdue.length;
  const totalEfficiencyAlerts = (criticalCount ?? 0) + (warningCount ?? 0) + loadBalancingSuggestions.length;
  const totalSystemAlerts = stuckJobs.length + dataIssues.length;
  const totalAlerts = totalJobAlerts + totalEfficiencyAlerts + totalSystemAlerts;

  const alertCards = [
    { title: "Jobs Atrasados", icon: AlertTriangle, iconColor: "text-red-400", bgColor: "bg-red-500/20", jobs: alertData.delayed, emptyMessage: "Nenhum job atrasado no momento", isCritical: true },
    { title: "Jobs Vencidos", icon: Clock, iconColor: "text-orange-400", bgColor: "bg-orange-500/20", jobs: alertData.overdue, emptyMessage: "Nenhum job vencido no momento", isCritical: true },
    { title: "Prioridade Urgente", icon: Zap, iconColor: "text-yellow-400", bgColor: "bg-yellow-500/20", jobs: alertData.urgent, emptyMessage: "Nenhum job urgente pendente" },
    { title: "Produções em Risco", icon: AlertCircle, iconColor: "text-cyan-400", bgColor: "bg-cyan-500/20", jobs: alertData.atRisk, emptyMessage: "Nenhuma produção em risco hoje" },
    { title: "Aguardando Retrabalho", icon: RotateCcw, iconColor: "text-purple-400", bgColor: "bg-purple-500/20", jobs: alertData.rework, emptyMessage: "Nenhum job aguardando retrabalho" },
  ];

  return (
    <MainLayout>
    <div className="min-h-screen bg-background p-4 sm:p-6 space-y-4 sm:space-y-6">
      <Breadcrumbs />
      <JobDetailsModal job={selectedJob} open={isModalOpen} onOpenChange={setIsModalOpen} />

      <Dialog open={viewAllModal !== null} onOpenChange={(open) => !open && setViewAllModal(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {viewAllModal?.title}
              <Badge variant="outline" className="ml-2">
                {viewAllModal?.type === 'jobs' && viewAllModal.jobs?.length}
                {viewAllModal?.type === 'bottleneck' && viewAllModal.bottleneckAlerts?.length}
                {viewAllModal?.type === 'loadBalancing' && viewAllModal.loadBalancingSuggestions?.length}
                {viewAllModal?.type === 'stuckJobs' && viewAllModal.stuckJobs?.length}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          {viewAllModal?.type === 'jobs' && viewAllModal.jobs && (
            <JobsViewAll jobs={viewAllModal.jobs} onJobClick={(j) => { setViewAllModal(null); handleJobClick(j); }} getTechniqueById={getTechniqueById} />
          )}
          {viewAllModal?.type === 'bottleneck' && viewAllModal.bottleneckAlerts && <BottleneckViewAll alerts={viewAllModal.bottleneckAlerts} />}
          {viewAllModal?.type === 'loadBalancing' && viewAllModal.loadBalancingSuggestions && <LoadBalancingViewAll suggestions={viewAllModal.loadBalancingSuggestions} />}
          {viewAllModal?.type === 'stuckJobs' && viewAllModal.stuckJobs && (
            <StuckJobsViewAll stuckJobs={viewAllModal.stuckJobs} onJobClick={(j) => { setViewAllModal(null); handleJobClick(j); }} getTechniqueById={getTechniqueById} />
          )}
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-xl bg-red-500/20"><Bell className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 text-red-400" /></div>
            Dashboard de Alertas
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">Monitoramento de jobs atrasados e produções em risco</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Button variant="outline" size="sm" onClick={checkBottleneckAlerts} className="border-pink-500/30 text-pink-400 hover:bg-pink-500/10 text-xs sm:text-sm">
            <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" /><span className="hidden xs:inline">Verificar</span> Gargalos
          </Button>
          <Button variant="outline" size="sm" onClick={checkLoadBalancingAlerts} className="border-teal-500/30 text-teal-400 hover:bg-teal-500/10 text-xs sm:text-sm">
            <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" /><span className="hidden xs:inline">Verificar</span> Balanc.
          </Button>
          <Badge className={`${totalAlerts > 0 ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-green-500/20 text-green-400 border-green-500/30'} border px-2 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm`}>
            <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />{totalAlerts} alertas
          </Badge>
        </div>
      </div>

      <AlertStatsGrid
        delayed={alertData.delayed.length} overdue={alertData.overdue.length}
        urgent={alertData.urgent.length} atRisk={alertData.atRisk.length}
        rework={alertData.rework.length} bottlenecks={(criticalCount ?? 0) + (warningCount ?? 0)}
        loadBalancing={loadBalancingSuggestions.length} stuckJobs={stuckJobs.length}
        stuckCritical={stuckCritical} dataIssues={dataIssues.length}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {alertCards.map((card) => (
          <AlertJobCard
            key={card.title} {...card}
            onJobClick={handleJobClick}
            onViewAll={() => setViewAllModal({ type: 'jobs', title: card.title, jobs: card.jobs })}
            getTechniqueById={getTechniqueById}
          />
        ))}
        <StuckJobsCard stuckJobs={stuckJobs} stuckCritical={stuckCritical} onJobClick={handleJobClick} onViewAll={() => setViewAllModal({ type: 'stuckJobs', title: 'Jobs Travados', stuckJobs })} getTechniqueById={getTechniqueById} />
        <DataIntegrityCard dataIssues={dataIssues} orphanedTechniques={orphanedTechniques} />
        <BottleneckCard alerts={bottleneckAlerts} onViewAll={() => setViewAllModal({ type: 'bottleneck', title: 'Previsão de Gargalos', bottleneckAlerts })} />
        <LoadBalancingCard suggestions={loadBalancingSuggestions} onViewAll={() => setViewAllModal({ type: 'loadBalancing', title: 'Desbalanceamento de Carga', loadBalancingSuggestions })} />
        <CriticalSummaryCard totalAlerts={totalAlerts} criticalJobs={alertData.delayed.length + alertData.overdue.length} criticalBottlenecks={criticalCount ?? 0} stuckCriticalCount={stuckCritical} />
      </div>
    </div>
    </MainLayout>
  );
}
