import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Wrench, Brain, Calendar, Search, Filter, RefreshCw, Wifi, WifiOff, CheckCircle2, Server } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseDateOnly } from '@/lib/dateUtils';
import { useDailySummaryNotifications } from '@/features/notifications';
import { usePushNotifications } from '@/features/notifications';
import { useNotificationSounds } from '@/features/notifications';
import { useNotifications } from '@/features/notifications';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { NotificationStatsCards } from '@/features/notifications/components/NotificationStatsCards';
import { NotificationsList } from '@/features/notifications/components/NotificationsList';

interface MaintenanceAlert {
  id: string; alert_type: string; message: string; is_resolved: boolean; is_read: boolean;
  created_at: string; resolved_at: string | null; machine_id: string;
  machines?: { name: string; code: string };
}

interface MachinePrediction {
  id: string; prediction_type: string; risk_score: number; predicted_failure_date: string | null;
  is_active: boolean; created_at: string; machine_id: string;
  acknowledged_at: string | null;
  machines?: { name: string; code: string };
}

interface DailySummaryRecord {
  id: string; date: string; summary_type: string; created_at: string;
  data: { maintenance: { overdue: { count: number }; due_today: { count: number }; upcoming_7_days: { count: number } }; predictions: { critical: { count: number }; high_risk: { count: number } }; alerts: { has_critical: boolean; total_attention_items: number } };
}

type NotificationItem = {
  id: string; type: 'maintenance' | 'prediction' | 'summary' | 'personal' | 'alert'; title: string; message: string;
  severity: 'critical' | 'warning' | 'info' | 'success'; timestamp: string;
  isRead?: boolean; isResolved?: boolean; metadata?: Record<string, unknown>;
};

// `cron_email_sent` e marcador de dedupe do servidor (impede reenvio do e-mail),
// nao aviso ao usuario: conta-lo no sino deixava um badge que nunca aparecia aqui.
const MARCADOR_INTERNO = 'cron_email_sent';

// Alertas de rotina carregam o tipo `cron_*` em `data.type`: sao dispensados
// (mantendo o registro de dedupe) e aparecem na Central como "Sistema".
const ALERTA_DE_ROTINA = /^cron_/;

const NotificationsPage = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [dateRange, setDateRange] = useState('7');
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [newNotificationsCount, setNewNotificationsCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { permission, requestPermission } = usePushNotifications();
  const { manualRefresh, isLoading: isSummaryLoading } = useDailySummaryNotifications();
  const { playSound, isEnabled: isSoundEnabled } = useNotificationSounds();
  const {
    notifications: personalNotifications,
    isLoading: isLoadingPersonal,
    markAllAsRead,
  } = useNotifications({ limit: 100 });

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => { if (mounted) setUserId(data.user?.id ?? null); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (mounted) setUserId(session?.user?.id ?? null);
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  const handleNewNotification = useCallback((type: 'maintenance' | 'prediction' | 'summary' | 'personal') => {
    setNewNotificationsCount(prev => prev + 1);
    if (isSoundEnabled()) playSound('alert');
    const label = type === 'maintenance' ? 'manutenção' : type === 'prediction' ? 'predição' : type === 'summary' ? 'resumo' : 'aviso';
    toast.info('Nova notificação', { description: `Uma nova ${label} foi adicionada.` });
    const key = type === 'maintenance' ? 'maintenance-alerts-history' : type === 'prediction' ? 'ml-predictions-history' : type === 'summary' ? 'daily-summaries-history' : 'notifications';
    queryClient.invalidateQueries({ queryKey: [key] });
  }, [queryClient, playSound, isSoundEnabled]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel(`notifications-page-realtime-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'maintenance_alerts' }, () => handleNewNotification('maintenance'))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'machine_predictions' }, () => handleNewNotification('prediction'))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'daily_summaries' }, () => handleNewNotification('summary'))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'push_notifications', filter: `user_id=eq.${userId}` }, () => handleNewNotification('personal'))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'maintenance_alerts' }, () => queryClient.invalidateQueries({ queryKey: ['maintenance-alerts-history'] }))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'machine_predictions' }, () => queryClient.invalidateQueries({ queryKey: ['ml-predictions-history'] }))
      .subscribe((status) => setIsRealtimeConnected(status === 'SUBSCRIBED'));
    return () => { supabase.removeChannel(channel); };
  }, [handleNewNotification, queryClient, userId]);

  const { data: maintenanceAlerts, isLoading: isLoadingAlerts, refetch: refetchAlerts } = useQuery({
    queryKey: ['maintenance-alerts-history', dateRange],
    queryFn: async () => { const { data, error } = await supabase.from('maintenance_alerts').select('*, machines(name, code)').gte('created_at', subDays(new Date(), parseInt(dateRange, 10)).toISOString()).order('created_at', { ascending: false }).limit(100); if (error) throw error; return data as MaintenanceAlert[]; },
  });

  const { data: predictions, isLoading: isLoadingPredictions, refetch: refetchPredictions } = useQuery({
    queryKey: ['ml-predictions-history', dateRange],
    queryFn: async () => { const { data, error } = await supabase.from('machine_predictions').select('*, machines(name, code)').gte('created_at', subDays(new Date(), parseInt(dateRange, 10)).toISOString()).order('created_at', { ascending: false }).limit(100); if (error) throw error; return data as MachinePrediction[]; },
  });

  const { data: summaries, isLoading: isLoadingSummaries, refetch: refetchSummaries } = useQuery({
    queryKey: ['daily-summaries-history', dateRange],
    queryFn: async () => { const { data, error } = await supabase.from('daily_summaries').select('*').gte('created_at', subDays(new Date(), parseInt(dateRange, 10)).toISOString()).order('created_at', { ascending: false }).limit(30); if (error) throw error; return data as DailySummaryRecord[]; },
  });

  const notifications = useMemo((): NotificationItem[] => {
    const items: NotificationItem[] = [];
    (maintenanceAlerts || []).forEach(a => items.push({ id: `m-${a.id}`, type: 'maintenance', title: `Manutenção ${a.alert_type === 'critical' ? 'Crítica' : a.alert_type === 'overdue' ? 'Atrasada' : 'Pendente'}`, message: `${a.machines?.name || 'Máquina'}: ${a.message}`, severity: a.alert_type === 'critical' ? 'critical' : a.alert_type === 'overdue' ? 'warning' : 'info', timestamp: a.created_at, isRead: a.is_read, isResolved: a.is_resolved }));
    (predictions || []).forEach(p => items.push({ id: `p-${p.id}`, type: 'prediction', title: `Predição ${p.prediction_type === 'failure' ? 'de Falha' : 'de Manutenção'}`, message: `${p.machines?.name || 'Máquina'}: Risco ${p.risk_score}%${p.predicted_failure_date ? ` - Previsão: ${format(parseDateOnly(p.predicted_failure_date) ?? new Date(), 'dd/MM/yyyy')}` : ''}`, severity: p.risk_score >= 85 ? 'critical' : p.risk_score >= 70 ? 'warning' : 'info', timestamp: p.created_at, isRead: !!p.acknowledged_at, isResolved: !p.is_active }));
    (summaries || []).forEach(s => items.push({ id: `s-${s.id}`, type: 'summary', title: `Resumo Diário - ${format(parseDateOnly(s.date) ?? new Date(), "dd 'de' MMMM", { locale: ptBR })}`, message: s.data?.alerts?.has_critical ? `${s.data.alerts.total_attention_items} itens requerem atenção` : 'Nenhum item crítico', severity: s.data?.alerts?.has_critical ? 'warning' : 'success', timestamp: s.created_at }));
    // Avisos pessoais (push_notifications): a fonte do sino e do contador.
    // Sem entrarem aqui, o usuario via o contador subir e abria a Central sem
    // encontrar o aviso (nem pelo botao Atualizar).
    const since = subDays(new Date(), parseInt(dateRange, 10)).getTime();
    (personalNotifications || []).forEach(n => {
          const meta = (n.metadata ?? {}) as Record<string, unknown>;
          // O marcador interno da coleta de saude nao e aviso para o usuario.
          if (String(meta.type ?? '') === MARCADOR_INTERNO) return;
          // Aviso dispensado pelo usuario: a linha fica no banco (registro de
          // dedupe da coleta) mas nao volta para a lista.
          if (meta.dismissed_at) return;
          items.push({
            id: n.id,
            // Alerta de rotina aparece como "Sistema" e e dispensado em vez de
            // apagado; os demais sao avisos pessoais.
            type: ALERTA_DE_ROTINA.test(String(meta.type ?? '')) ? 'alert' : 'personal',
            title: n.title,
            message: n.message,
            severity: n.type === 'urgent' || n.type === 'error' ? 'critical' : n.type === 'warning' ? 'warning' : n.type === 'success' ? 'success' : 'info',
            timestamp: n.created_at,
            isRead: n.is_read,
            metadata: { ...meta, action_url: n.action_url, action_label: n.action_label, source_system: n.source_system },
          });
        });
    return items
      .filter(item => new Date(item.timestamp).getTime() >= since)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [maintenanceAlerts, predictions, summaries, personalNotifications, dateRange]);

  const filteredNotifications = useMemo(() => {
    let filtered = notifications;
    if (activeTab !== 'all') filtered = filtered.filter(n => n.type === activeTab);
    if (severityFilter !== 'all') filtered = filtered.filter(n => n.severity === severityFilter);
    if (searchQuery) { const q = searchQuery.toLowerCase(); filtered = filtered.filter(n => n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q)); }
    return filtered;
  }, [notifications, activeTab, severityFilter, searchQuery]);

  const stats = useMemo(() => ({ total: notifications.length, critical: notifications.filter(n => n.severity === 'critical').length, warning: notifications.filter(n => n.severity === 'warning').length, unresolved: notifications.filter(n => !n.isResolved).length, maintenance: notifications.filter(n => n.type === 'maintenance').length, predictions: notifications.filter(n => n.type === 'prediction').length, summaries: notifications.filter(n => n.type === 'summary').length, personal: notifications.filter(n => n.type === 'personal').length, alerts: notifications.filter(n => n.type === 'alert').length }), [notifications]);

  const isLoading = isLoadingAlerts || isLoadingPredictions || isLoadingSummaries || isLoadingPersonal;
  const handleRefreshAll = async () => { await Promise.all([refetchAlerts(), refetchPredictions(), refetchSummaries(), manualRefresh(), queryClient.invalidateQueries({ queryKey: ['notifications'] })]); };

  return (
    <MainLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <Breadcrumbs />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl text-title font-bold"><span className="gradient-text">Central de Notificações</span></h1>
            <div className="flex items-center gap-2">
              <p className="text-muted-foreground">Histórico unificado de alertas, predições e resumos</p>
              <Badge variant={isRealtimeConnected ? "secondary" : "outline"} className={cn("gap-1 text-xs", isRealtimeConnected ? "bg-green-500/20 text-green-600 border-green-500/30" : "text-muted-foreground")}>
                {isRealtimeConnected ? <><Wifi className="h-3 w-3" />Ao vivo</> : <><WifiOff className="h-3 w-3" />Offline</>}
              </Badge>
              {newNotificationsCount > 0 && <Badge variant="destructive" className="animate-pulse">{newNotificationsCount} nova{newNotificationsCount > 1 ? 's' : ''}</Badge>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => markAllAsRead()} className="gap-2">
              <CheckCircle2 className="h-4 w-4" /> Marcar lidas
            </Button>
            {permission !== 'granted' && <Button variant="outline" size="sm" onClick={requestPermission} className="gap-2"><Bell className="h-4 w-4" />Ativar Push</Button>}
            <Button variant="outline" size="sm" onClick={() => { setNewNotificationsCount(0); handleRefreshAll(); }} disabled={isLoading || isSummaryLoading} className="gap-2">
              <RefreshCw className={cn("h-4 w-4", (isLoading || isSummaryLoading) && "animate-spin")} />Atualizar
            </Button>
          </div>
        </div>

        <NotificationStatsCards stats={stats} />

        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar notificações..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" /></div>
              <Select value={severityFilter} onValueChange={setSeverityFilter}><SelectTrigger className="w-full sm:w-40"><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="Severidade" /></SelectTrigger><SelectContent><SelectItem value="all">Todas</SelectItem><SelectItem value="critical">Crítico</SelectItem><SelectItem value="warning">Atenção</SelectItem><SelectItem value="info">Informativo</SelectItem><SelectItem value="success">Sucesso</SelectItem></SelectContent></Select>
              <Select value={dateRange} onValueChange={setDateRange}><SelectTrigger className="w-full sm:w-40"><Calendar className="h-4 w-4 mr-2" /><SelectValue placeholder="Período" /></SelectTrigger><SelectContent><SelectItem value="1">Último dia</SelectItem><SelectItem value="7">Últimos 7 dias</SelectItem><SelectItem value="30">Últimos 30 dias</SelectItem><SelectItem value="90">Últimos 90 dias</SelectItem></SelectContent></Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6">
                <TabsTrigger value="all" className="gap-2"><Bell className="h-4 w-4" /><span className="hidden sm:inline">Todas</span><Badge variant="secondary" className="ml-1">{stats.total}</Badge></TabsTrigger>
                <TabsTrigger value="personal" className="gap-2"><Bell className="h-4 w-4" /><span className="hidden sm:inline">Avisos</span><Badge variant="secondary" className="ml-1">{stats.personal}</Badge></TabsTrigger>
                <TabsTrigger value="maintenance" className="gap-2"><Wrench className="h-4 w-4" /><span className="hidden sm:inline">Manutenção</span><Badge variant="secondary" className="ml-1">{stats.maintenance}</Badge></TabsTrigger>
                <TabsTrigger value="prediction" className="gap-2"><Brain className="h-4 w-4" /><span className="hidden sm:inline">Predições</span><Badge variant="secondary" className="ml-1">{stats.predictions}</Badge></TabsTrigger>
                <TabsTrigger value="summary" className="gap-2"><Calendar className="h-4 w-4" /><span className="hidden sm:inline">Resumos</span><Badge variant="secondary" className="ml-1">{stats.summaries}</Badge></TabsTrigger>
                <TabsTrigger value="alert" className="gap-2"><Server className="h-4 w-4" /><span className="hidden sm:inline">Sistema</span><Badge variant="secondary" className="ml-1">{stats.alerts}</Badge></TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            <NotificationsList notifications={filteredNotifications} isLoading={isLoading} />
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default NotificationsPage;
