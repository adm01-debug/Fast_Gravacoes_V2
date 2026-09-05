import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { Wrench, AlertTriangle, CheckCircle, Clock, CalendarCheck, RefreshCw, Settings, Command, Zap, BrainCircuit, Activity } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useTPM } from '@/features/maintenance/hooks/useTPM';
import type { MaintenanceSchedule } from '@/features/maintenance/hooks/types';
import { useTPMNotifications } from '@/features/notifications';
import { useAuth } from '@/features/auth';
import { TPMAlertsPanel } from '@/features/maintenance/components/TPMAlertsPanel';
import { TPMParameterAlerts } from '@/features/maintenance/components/TPMParameterAlerts';
import { TPMCalendar } from '@/features/maintenance/components/TPMCalendar';
import { TPMScheduleList } from '@/features/maintenance/components/TPMScheduleList';
import { CreateScheduleModal } from '@/features/maintenance/components/CreateScheduleModal';
import { TPMNotificationSettings } from '@/features/maintenance/components/TPMNotificationSettings';
import { ChecklistManager } from '@/features/maintenance/components/ChecklistManager';
import { MTBFMTTRWidget } from '@/features/maintenance/components/MTBFMTTRWidget';
import { MaintenanceExecutionModal } from '@/features/maintenance/components/MaintenanceExecutionModal';
import { TPMReports } from '@/features/maintenance/components/TPMReports';
import { TPMExecutionHistory } from '@/features/maintenance/components/TPMExecutionHistory';
import { MainLayout } from '@/components/layout/MainLayout';
import { FavoriteButton, FavoritesDropdown } from '@/components/navigation/FavoritesManager';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { VoiceButton } from '@/components/voice/VoiceCommands';
import { PredictiveHealthCard } from '@/features/maintenance/components/PredictiveHealthCard';
import { VirtualSensorPanel } from '@/features/maintenance/components/VirtualSensorPanel';
import { HolographicReliabilityWidget } from '@/features/maintenance/components/HolographicReliabilityWidget';

export default function TPMDashboard() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const {
    maintenanceTypes,
    schedules,
    alerts,
    machines,
    stats,
    isLoading,
    createSchedule,
    startMaintenance,
    completeMaintenance,
    checkAndGenerateAlerts,
    resolveAlert,
  } = useTPM();

  const [executionModalOpen, setExecutionModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<MaintenanceSchedule | null>(null);
  const [currentRecordId, setCurrentRecordId] = useState<string | null>(null);

  // Initialize TPM notifications listener
  useTPMNotifications();

  const handleStartMaintenance = (scheduleId: string) => {
    if (!user || !profile) {
      toast.error('Você precisa estar logado para iniciar uma manutenção');
      return;
    }

    const schedule = schedules.find((s) => s.id === scheduleId);
    setSelectedSchedule(schedule ?? null);

    startMaintenance.mutate({
      schedule_id: scheduleId,
      performed_by: user.id,
      performed_by_name: profile.full_name || 'Usuário',
    }, {
      onSuccess: (record) => {
        setCurrentRecordId(record.id);
        setExecutionModalOpen(true);
      }
    });
  };

  const handleCompleteMaintenance: NonNullable<React.ComponentProps<typeof MaintenanceExecutionModal>['onComplete']> = (data) => {
    if (!currentRecordId) return;

    completeMaintenance.mutate({
      record_id: currentRecordId,
      ...data
    }, {
      onSuccess: () => {
        setExecutionModalOpen(false);
        setSelectedSchedule(null);
        setCurrentRecordId(null);
      }
    });
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 animate-pulse">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i: number) => <Skeleton key={i} className="h-28" />)}
          </div>
          <Skeleton className="h-[400px]" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Helmet>
        <title>FAST GRAVAÇÕES | TPM - Manutenção</title>
      </Helmet>

      <div className="p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8">
        <Breadcrumbs />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl text-title font-black tracking-tighter uppercase">
                <span className="gradient-text motion-safe:animate-pulse-glow">FAST GRAVAÇÕES - GESTÃO DE GRAVAÇÃO</span>
              </h1>
              <FavoriteButton
                path="/tpm"
                name="TPM"
              />
            </div>
            <p className="text-muted-foreground font-black uppercase tracking-widest text-xs opacity-70">
              QUALIDADE + VELOCIDADE
            </p>
          </div>
          <div className="flex items-center gap-3">
            <VoiceButton />
            <FavoritesDropdown onNavigate={(url) => navigate(url)} />
            <Badge variant="outline" className="gap-1 text-xs hidden sm:flex">
              <Command className="h-3 w-3" />K para buscar
            </Badge>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="hover:shadow-glow-primary hover:border-primary/50 transition-all duration-300">
                  <Settings className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                <TPMNotificationSettings />
              </SheetContent>
            </Sheet>
            <Button
              variant="outline"
              onClick={() => checkAndGenerateAlerts.mutate()}
              disabled={checkAndGenerateAlerts.isPending}
              className="hover:shadow-glow-primary hover:border-primary/50 transition-all duration-300"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${checkAndGenerateAlerts.isPending ? 'animate-spin' : ''}`} />
              Verificar Alertas
            </Button>
            <CreateScheduleModal
              machines={machines}
              maintenanceTypes={maintenanceTypes}
              onSubmit={(data) => createSchedule.mutate(data)}
              isSubmitting={createSchedule.isPending}
            />
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="glass-card hover-lift stagger-1 hover:shadow-glow-primary hover:border-primary/30 transition-all duration-300 group">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 group-hover:shadow-glow-primary transition-all duration-300">
                  <CalendarCheck className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Agendadas</p>
                  <p className="text-2xl font-bold text-title gradient-text">{stats.totalScheduled}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card hover-lift stagger-2 hover:shadow-[0_0_20px_hsl(210_90%_50%/0.3)] hover:border-blue-500/30 transition-all duration-300 group">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-blue-500/10 group-hover:bg-blue-500/20 group-hover:shadow-[0_0_15px_hsl(210_90%_50%/0.4)] transition-all duration-300">
                  <Wrench className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vence Hoje</p>
                  <p className="text-2xl font-bold text-title text-blue-500">{stats.dueToday}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card hover-lift stagger-3 hover:shadow-[0_0_20px_hsl(38_92%_50%/0.3)] hover:border-warning/30 transition-all duration-300 group">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-warning/10 group-hover:bg-warning/20 group-hover:shadow-[0_0_15px_hsl(38_92%_50%/0.4)] transition-all duration-300">
                  <Clock className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Próximos 7 dias</p>
                  <p className="text-2xl font-bold text-title text-warning">{stats.upcoming7Days}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card hover-lift stagger-4 hover:shadow-glow-primary hover:border-primary/30 transition-all duration-300 group">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 group-hover:shadow-glow-primary transition-all duration-300">
                  <AlertTriangle className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Atrasadas</p>
                  <p className="text-2xl font-bold text-title text-primary">{stats.overdue}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card hover-lift stagger-5 hover:shadow-glow-success hover:border-success/30 transition-all duration-300 group">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-success/10 group-hover:bg-success/20 group-hover:shadow-glow-success transition-all duration-300">
                  <CheckCircle className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Concluídas/Mês</p>
                  <p className="text-2xl font-bold text-title text-success">{stats.completedThisMonth}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* MTBF/MTTR Widget */}

        {/* Main Content */}
        <Tabs defaultValue="calendar" className="space-y-6">
          <TabsList className="glass-card p-1 flex-wrap h-auto">
            <TabsTrigger value="calendar" className="data-[state=active]:shadow-glow-primary data-[state=active]:bg-primary/10 transition-all duration-300">
              Calendário
            </TabsTrigger>
            <TabsTrigger value="predictive" className="data-[state=active]:shadow-glow-primary data-[state=active]:bg-primary/10 transition-all duration-300">
              <BrainCircuit className="h-4 w-4 mr-2" />
              Preditiva IA
            </TabsTrigger>
            <TabsTrigger value="reliability" className="data-[state=active]:shadow-glow-primary data-[state=active]:bg-primary/10 transition-all duration-300">
              <Activity className="h-4 w-4 mr-2" />
              Confiabilidade
            </TabsTrigger>
            <TabsTrigger value="list" className="data-[state=active]:shadow-glow-primary data-[state=active]:bg-primary/10 transition-all duration-300">
              Lista
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:shadow-glow-primary data-[state=active]:bg-primary/10 transition-all duration-300">
              Histórico
            </TabsTrigger>
            <TabsTrigger value="alerts" className="data-[state=active]:shadow-glow-primary data-[state=active]:bg-primary/10 transition-all duration-300">
              Alertas
              {stats.activeAlerts > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-destructive text-destructive-foreground animate-pulse">
                  {stats.activeAlerts}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="reports" className="data-[state=active]:shadow-glow-primary data-[state=active]:bg-primary/10 transition-all duration-300">
              Relatórios
            </TabsTrigger>
            <TabsTrigger value="config" className="data-[state=active]:shadow-glow-primary data-[state=active]:bg-primary/10 transition-all duration-300">
              Configurações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reliability" className="space-y-6 animate-fade-in">
             <MTBFMTTRWidget />
          </TabsContent>

          <TabsContent value="calendar" className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <TPMCalendar
                  schedules={schedules}
                  onSelectSchedule={(schedule: MaintenanceSchedule) => handleStartMaintenance(schedule.id)}
                />
              </div>
              <div className="space-y-6">
                <TPMAlertsPanel
                  alerts={alerts}
                  onResolve={(id) => resolveAlert.mutate(id)}
                  onStartMaintenance={handleStartMaintenance}
                />
                <TPMParameterAlerts />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="predictive" className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-1 space-y-6">
                <HolographicReliabilityWidget />
                <PredictiveHealthCard machineId={machines[0]?.id} />
                <Card className="glass-card">
                  <CardContent className="pt-6">
                    <h3 className="text-sm font-bold mb-2">Monitoramento Ativo</h3>
                    <p className="text-xs text-muted-foreground mb-4">
                      Sensores virtuais processando telemetria em tempo real para detecção de anomalias.
                    </p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span>Análise Vibracional</span>
                        <span className="text-success">OK</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Perfil Térmico</span>
                        <span className="text-success">OK</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Consumo Energético</span>
                        <span className="text-warning">Nominal</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div className="lg:col-span-3">
                <VirtualSensorPanel machineId={machines[0]?.id} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="list" className="animate-fade-in">
            <TPMScheduleList
              schedules={schedules}
              onStartMaintenance={handleStartMaintenance}
            />
          </TabsContent>

          <TabsContent value="history" className="animate-fade-in">
            <TPMExecutionHistory />
          </TabsContent>

          <TabsContent value="alerts" className="animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TPMAlertsPanel
                alerts={alerts}
                onResolve={(id) => resolveAlert.mutate(id)}
                onStartMaintenance={handleStartMaintenance}
              />
              <TPMParameterAlerts />
            </div>
          </TabsContent>

          <TabsContent value="reports" className="animate-fade-in">
            <TPMReports />
          </TabsContent>

          <TabsContent value="config" className="animate-fade-in">
            <ChecklistManager />
          </TabsContent>
        </Tabs>

        <MaintenanceExecutionModal
          isOpen={executionModalOpen}
          onClose={() => setExecutionModalOpen(false)}
          schedule={selectedSchedule}
          recordId={currentRecordId}
          onComplete={handleCompleteMaintenance}
          isSubmitting={completeMaintenance.isPending}
        />
      </div>
    </MainLayout>
  );
}
