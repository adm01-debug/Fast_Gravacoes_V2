import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Wrench, Calendar, History, Plus, AlertTriangle, CheckCircle2, Clock, Settings, Layout } from 'lucide-react';
import { useTPM } from '@/features/maintenance/hooks/useTPM';
import { useNavigate } from 'react-router-dom';
import { format, isPast, isToday, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TPMSeverityConfigs } from './TPMSeverityConfigs';
import { MachineTPMTimeline } from './MachineTPMTimeline';

interface MachineTPMPanelProps {
  machineId: string;
  onStartMaintenance?: (scheduleId: string) => void;
  onOpenCreateSchedule?: () => void;
}

interface TPMSchedule {
  id: string;
  machine_id: string;
  name: string;
  next_due_at: string;
}

interface TPMRecord {
  id: string;
  machine_id: string;
  started_at: string;
  status: string;
  performed_by_name?: string | null;
}

interface TPMAlert {
  id: string;
  machine_id: string;
  message: string;
  is_resolved: boolean;
}

export function MachineTPMPanel({ machineId, onStartMaintenance, onOpenCreateSchedule }: MachineTPMPanelProps) {
  const { schedules, records, alerts } = useTPM();
  const navigate = useNavigate();

  const machineSchedules = (schedules as TPMSchedule[]).filter((s) => s.machine_id === machineId);
  const machineRecords = (records as TPMRecord[]).filter((r) => r.machine_id === machineId).slice(0, 10);
  const machineAlerts = (alerts as TPMAlert[]).filter((a) => a.machine_id === machineId && !a.is_resolved);

  const getStatusBadge = (schedule: TPMSchedule) => {
    const dueDate = new Date(schedule.next_due_at);
    const daysUntil = differenceInDays(dueDate, new Date());

    if (isPast(dueDate) && !isToday(dueDate)) {
      return <Badge variant="destructive" className="text-[10px] h-5">Atrasado</Badge>;
    }
    if (isToday(dueDate)) {
      return <Badge className="bg-blue-500 text-[10px] h-5">Hoje</Badge>;
    }
    if (daysUntil <= 3) {
      return <Badge variant="secondary" className="bg-warning/20 text-warning text-[10px] h-5">Próximo</Badge>;
    }
    return <Badge variant="outline" className="text-[10px] h-5">Agendado</Badge>;
  };

  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <TabsList className="grid w-full grid-cols-3 max-w-[500px]">
        <TabsTrigger value="overview" className="flex items-center gap-2">
          <Layout className="h-4 w-4" /> Visão Geral
        </TabsTrigger>
        <TabsTrigger value="timeline" className="flex items-center gap-2">
          <History className="h-4 w-4" /> Linha do Tempo
        </TabsTrigger>
        <TabsTrigger value="notifications" className="flex items-center gap-2">
          <Settings className="h-4 w-4" /> Notificações
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Next Schedules */}
        <Card className="glass-card border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-title flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Próximas Manutenções
              </div>
              {onOpenCreateSchedule && (
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onOpenCreateSchedule}>
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {machineSchedules.length > 0 ? (
              <div className="space-y-3">
                {machineSchedules.slice(0, 3).map((schedule: TPMSchedule) => (
                  <div key={schedule.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/20 border border-border/50">
                    <div className="flex-1 min-w-0 mr-2">
                      <p className="text-xs font-medium truncate">{schedule.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {format(new Date(schedule.next_due_at), "dd 'de' MMM", { locale: ptBR })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(schedule)}
                      {onStartMaintenance && (
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onStartMaintenance(schedule.id)}>
                          <Wrench className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhuma manutenção agendada.</p>
            )}
          </CardContent>
        </Card>

        {/* Active Alerts */}
        <Card className={`glass-card ${machineAlerts.length > 0 ? 'border-destructive/30 bg-destructive/5' : ''}`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-title flex items-center gap-2">
              <AlertTriangle className={`h-4 w-4 ${machineAlerts.length > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
              Alertas Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {machineAlerts.length > 0 ? (
              <div className="space-y-2">
                {machineAlerts.map((alert: TPMAlert) => (
                  <div key={alert.id} className="flex items-start gap-2 p-2 rounded-lg bg-destructive/10 border border-destructive/20">
                    <AlertTriangle className="h-3 w-3 text-destructive mt-0.5" />
                    <p className="text-[10px] leading-tight font-medium text-destructive">{alert.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
                <CheckCircle2 className="h-5 w-5 mb-1 opacity-20 text-success" />
                <p className="text-xs">Máquina em conformidade</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* History */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-title flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            Histórico Recente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[150px]">
            <div className="space-y-2 pr-4">
              {machineRecords.length > 0 ? (
                machineRecords.map((record: TPMRecord) => (
                  <div key={record.id} className="flex items-center justify-between p-2 rounded border border-border/30 text-[11px]">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span>{format(new Date(record.started_at), 'dd/MM/yyyy')}</span>
                      <span className="text-muted-foreground mx-1">|</span>
                      <span className="font-medium">{record.status === 'completed' ? 'Concluída' : 'Iniciada'}</span>
                    </div>
                    <div className="text-muted-foreground">
                      {record.performed_by_name}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground text-center py-8">Nenhum histórico disponível.</p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button variant="link" size="sm" className="text-xs gap-1" onClick={() => navigate('/tpm')}>
          Ver Painel TPM Completo <Clock className="h-3 w-3" />
        </Button>
      </div>
    </TabsContent>

    <TabsContent value="timeline" className="animate-fade-in">
      <Card className="glass-card border-none bg-transparent shadow-none">
        <CardHeader className="px-0">
          <CardTitle className="text-lg">Histórico de Intervenções</CardTitle>
          <CardDescription>Rastreabilidade completa de manutenções realizadas.</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <MachineTPMTimeline machineId={machineId} />
        </CardContent>
      </Card>
    </TabsContent>

    <TabsContent value="notifications">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">Regras de Severidade Específicas</CardTitle>
          <CardDescription>Defina regras personalizadas de notificação para esta máquina.</CardDescription>
        </CardHeader>
        <CardContent>
          <TPMSeverityConfigs machineId={machineId} />
        </CardContent>
      </Card>
    </TabsContent>
  </Tabs>
  );
}
