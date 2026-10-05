import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { KioskMode } from "@/components/kiosk/KioskMode";
import { useSchedulingData } from "@/features/jobs";
import { useUpdateJobStatus } from "@/features/jobs";
import { notifyStatusChange } from "@/features/notifications";
import { logger } from "@/lib/logger";
import { useAuth } from "@/features/auth";
import { ProductionRegistrationModal } from "@/components/operator/ProductionRegistrationModal";
import { useOfflineSyncContext } from "@/contexts/OfflineSyncContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw, CloudOff } from "lucide-react";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

export default function KioskPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { jobs, refetchAll, isLoading, getTechniqueById, getMachineById } = useSchedulingData();
  const { isOnline, isSyncing, updateJobOffline, cacheData } = useOfflineSyncContext();

  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);
  const [productionJobId, setProductionJobId] = useState<string | null>(null);
  const [isProductionModalOpen, setIsProductionModalOpen] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (isSyncing || !isOnline) return;
    try {
      await refetchAll();
      await cacheData();
    } catch (err) {
      logger.error("KioskPage refresh failed", err, "KioskPage");
      toast.error("Falha ao atualizar dados do kiosk");
    }
  }, [isSyncing, isOnline, refetchAll, cacheData]);

  const handleRefreshRef = useRef(handleRefresh);
  useEffect(() => {
    handleRefreshRef.current = handleRefresh;
  }, [handleRefresh]);

  useEffect(() => {
    const autoRefresh = setInterval(() => {
      if (isOnline) handleRefreshRef.current();
    }, 120000);
    cacheData();
    return () => clearInterval(autoRefresh);
  }, [isOnline, cacheData]);

  const kioskJobs = useMemo(() => {
    if (!jobs) return [];
    const statusMap: Record<string, "ready" | "production" | "paused" | "completed"> = {
      ready: "ready",
      scheduled: "ready",
      production: "production",
      paused: "paused",
      finished: "completed",
    };
    const priorityMap: Record<string, "normal" | "high" | "urgent"> = {
      low: "normal",
      medium: "normal",
      high: "high",
      urgent: "urgent",
    };
    return jobs
      .filter(job => statusMap[job.status] !== undefined)
      .filter(job => !selectedMachineId || job.machine_id === selectedMachineId)
      .map(job => {
        const technique = getTechniqueById(job.technique_id);
        const machine = getMachineById(job.machine_id);
        return {
          id: job.id,
          client: job.client,
          product: job.product,
          orderNumber: job.order_number,
          quantity: job.quantity,
          produced: job.produced_quantity || undefined,
          status: statusMap[job.status],
          priority: priorityMap[job.priority] ?? "normal",
          technique: technique?.name,
          techniqueColor: technique?.color,
          machine: machine?.name,
        };
      });
  }, [jobs, selectedMachineId, getTechniqueById, getMachineById]);

  const selectedMachine = selectedMachineId ? getMachineById(selectedMachineId) : null;

  const handleStartProduction = async (jobId: string) => {
    const job = jobs?.find(j => j.id === jobId);
    if (!job) return;
    try {
      await updateJobOffline(jobId, { status: "production", actual_start_time: new Date().toISOString(), operator_id: profile?.id });
      notifyStatusChange(job.client, job.status, "production");
    } catch (error) {
      logger.error('Falha ao iniciar produção no quiosque', error, 'KioskPage');
      toast.error('Não foi possível iniciar a produção');
    }
  };

  const handlePauseProduction = async (jobId: string) => {
    const job = jobs?.find(j => j.id === jobId);
    if (!job) return;
    try {
      await updateJobOffline(jobId, { status: "paused", operator_id: profile?.id });
      notifyStatusChange(job.client, job.status, "paused");
    } catch (error) {
      logger.error('Falha ao pausar produção no quiosque', error, 'KioskPage');
      toast.error('Não foi possível pausar a produção');
    }
  };

  const handleCompleteProduction = (jobId: string) => {
    setProductionJobId(jobId);
    setIsProductionModalOpen(true);
  };

  const productionJob = productionJobId ? jobs?.find(j => j.id === productionJobId) : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <ProductionRegistrationModal job={productionJob || null} open={isProductionModalOpen} onOpenChange={setIsProductionModalOpen} />
      <div className="fixed top-4 left-4 z-50">
        <Button variant="ghost" size="sm" onClick={() => navigate("/operator")} className="opacity-50 hover:opacity-100 transition-opacity">
          <ArrowLeft className="h-4 w-4 mr-2" /> Sair do Kiosk
        </Button>
      </div>
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 items-end pointer-events-none">
        <AnimatePresence>
          {!isOnline && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <Badge variant="destructive" className="gap-2 px-3 py-1.5 shadow-lg border-2 border-white/20 animate-pulse">
                <CloudOff className="h-4 w-4" /> MODO RESILIÊNCIA ATIVO (OFFLINE)
              </Badge>
            </motion.div>
          )}
          {isSyncing && (
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
              <div className="bg-primary/90 text-white px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2 text-xs font-black">
                <RefreshCw className="h-3 w-3 animate-spin" /> SINCRONIZANDO...
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <KioskMode
        jobs={kioskJobs}
        machineName={selectedMachine?.name || "Todas as Máquinas"}
        operatorName={profile?.full_name || undefined}
        onStartProduction={handleStartProduction}
        onPauseProduction={handlePauseProduction}
        onCompleteProduction={handleCompleteProduction}
        onRefresh={handleRefresh}
        isOnline={isOnline}
      />
    </>
  );
}
