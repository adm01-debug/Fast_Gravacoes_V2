import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { History, CheckCircle2, AlertCircle, AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Webhook, Filter, BarChart3, Clock, TrendingUp, Activity } from 'lucide-react';
import { formatDistanceToNow, format, subDays, parseISO, startOfDay, differenceInSeconds } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from '@/lib/recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { edgeFunctionFetch } from '@/lib/edgeFunctionFetch';

interface SyncDetails {
  synced_ids?: string[];
  failed_ids?: string[];
  [key: string]: unknown;
}

interface SyncHistoryItem {
  id: string;
  sync_type: 'pull' | 'push' | 'webhook';
  status: 'success' | 'partial' | 'error';
  jobs_synced: number;
  jobs_failed: number;
  error_message: string | null;
  details: SyncDetails | null;
  started_at: string;
  completed_at: string | null;
  triggered_by: string;
}

type TypeFilter = 'all' | 'pull' | 'push' | 'webhook';
type StatusFilter = 'all' | 'success' | 'partial' | 'error';

export const Bitrix24SyncHistory = () => {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const { data: history, isLoading } = useQuery({
    queryKey: ['bitrix24-sync-history'],
    queryFn: async () => {
      const response = await edgeFunctionFetch('bitrix24-sync?action=history&limit=50');
      const data = await response.json();
      return data.history as SyncHistoryItem[];
    },
    refetchInterval: 30000
  });

  const filteredHistory = history?.filter(item => {
    const matchesType = typeFilter === 'all' || item.sync_type === typeFilter;
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesType && matchesStatus;
  });

  const dailyChartData = useMemo(() => {
    if (!history || history.length === 0) return [];

    const last14Days = Array.from({ length: 14 }, (_, i) => {
      const date = startOfDay(subDays(new Date(), 13 - i));
      return {
        date,
        dateKey: format(date, 'yyyy-MM-dd'),
        label: format(date, 'dd/MM', { locale: ptBR }),
        success: 0,
        partial: 0,
        error: 0,
        total: 0
      };
    });

    history.forEach(item => {
      const itemDate = format(startOfDay(parseISO(item.started_at)), 'yyyy-MM-dd');
      const dayData = last14Days.find(d => d.dateKey === itemDate);
      if (dayData) {
        dayData.total++;
        if (item.status === 'success') dayData.success++;
        else if (item.status === 'partial') dayData.partial++;
        else if (item.status === 'error') dayData.error++;
      }
    });

    return last14Days;
  }, [history]);

  const chartConfig = {
    success: { label: 'Sucesso', color: 'hsl(142, 76%, 36%)' },
    partial: { label: 'Parcial', color: 'hsl(48, 96%, 53%)' },
    error: { label: 'Erro', color: 'hsl(0, 84%, 60%)' }
  };

  const stats = useMemo(() => {
    if (!history || history.length === 0) return null;

    const total = history.length;
    const successCount = history.filter(h => h.status === 'success').length;
    const partialCount = history.filter(h => h.status === 'partial').length;
    const errorCount = history.filter(h => h.status === 'error').length;
    const successRate = total > 0 ? Math.round((successCount / total) * 100) : 0;

    const completedSyncs = history.filter(h => h.completed_at && h.started_at);
    let avgTimeSeconds = 0;
    if (completedSyncs.length > 0) {
      const totalSeconds = completedSyncs.reduce((acc, item) => {
        const diff = differenceInSeconds(parseISO(item.completed_at ?? item.started_at), parseISO(item.started_at));
        return acc + Math.max(0, diff);
      }, 0);
      avgTimeSeconds = Math.round(totalSeconds / completedSyncs.length);
    }

    const totalJobsSynced = history.reduce((acc, h) => acc + (h.jobs_synced || 0), 0);
    const totalJobsFailed = history.reduce((acc, h) => acc + (h.jobs_failed || 0), 0);

    return {
      total,
      successCount,
      partialCount,
      errorCount,
      successRate,
      avgTimeSeconds,
      totalJobsSynced,
      totalJobsFailed
    };
  }, [history]);

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-400" />;
      case 'partial':
        return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-400" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Sucesso</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Parcial</Badge>;
      case 'error':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Erro</Badge>;
      default:
        return null;
    }
  };

  const getSyncTypeIcon = (type: string) => {
    switch (type) {
      case 'pull':
        return <ArrowDownToLine className="h-4 w-4 text-blue-400" />;
      case 'push':
        return <ArrowUpFromLine className="h-4 w-4 text-purple-400" />;
      case 'webhook':
        return <Webhook className="h-4 w-4 text-cyan-400" />;
      default:
        return null;
    }
  };

  const getSyncTypeLabel = (type: string) => {
    switch (type) {
      case 'pull':
        return 'Importação';
      case 'push':
        return 'Exportação';
      case 'webhook':
        return 'Webhook';
      default:
        return type;
    }
  };

  const getTriggeredByLabel = (triggeredBy: string) => {
    switch (triggeredBy) {
      case 'manual':
        return 'Manual';
      case 'auto':
        return 'Automático';
      case 'cron':
        return 'Agendado';
      case 'bitrix24':
        return 'Bitrix24';
      default:
        return triggeredBy;
    }
  };

  return (
    <Card className="glass-card border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Histórico de Sincronização
          </CardTitle>
          {filteredHistory && (
            <Badge variant="outline" className="text-xs">
              {filteredHistory.length} registros
            </Badge>
          )}
        </div>

        {/* Stats Summary */}
        {stats && (
          <div className="grid grid-cols-4 gap-2 mb-4">
            <div className="p-2 rounded-lg bg-muted/20 border border-border/30 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Activity className="h-3 w-3 text-primary" />
              </div>
              <div className="text-lg font-bold">{stats.total}</div>
              <div className="text-[10px] text-muted-foreground">Total</div>
            </div>
            <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingUp className="h-3 w-3 text-green-400" />
              </div>
              <div className="text-lg font-bold text-green-400">{stats.successRate}%</div>
              <div className="text-[10px] text-muted-foreground">Taxa Sucesso</div>
            </div>
            <div className="p-2 rounded-lg bg-muted/20 border border-border/30 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Clock className="h-3 w-3 text-cyan-400" />
              </div>
              <div className="text-lg font-bold text-cyan-400">{formatDuration(stats.avgTimeSeconds)}</div>
              <div className="text-[10px] text-muted-foreground">Tempo Médio</div>
            </div>
            <div className="p-2 rounded-lg bg-muted/20 border border-border/30 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <CheckCircle2 className="h-3 w-3 text-blue-400" />
              </div>
              <div className="text-lg font-bold text-blue-400">{stats.totalJobsSynced}</div>
              <div className="text-[10px] text-muted-foreground">Jobs Sync</div>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex gap-3">
          <div className="flex-1">
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
              <SelectTrigger className="h-9 text-xs">
                <Filter className="h-3 w-3 mr-2" />
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="pull">Importação</SelectItem>
                <SelectItem value="push">Exportação</SelectItem>
                <SelectItem value="webhook">Webhook</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="success">Sucesso</SelectItem>
                <SelectItem value="partial">Parcial</SelectItem>
                <SelectItem value="error">Erro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Daily Evolution Chart */}
        {dailyChartData.length > 0 && dailyChartData.some(d => d.total > 0) && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Evolução Diária (14 dias)</span>
            </div>
            <ChartContainer config={chartConfig} className="h-[160px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyChartData} barSize={16}>
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Legend
                    wrapperStyle={{ fontSize: '11px' }}
                    formatter={(value) => chartConfig[value as keyof typeof chartConfig]?.label || value}
                  />
                  <Bar dataKey="success" stackId="a" fill="hsl(142, 76%, 36%)" radius={[0, 0, 0, 0]} name="success" />
                  <Bar dataKey="partial" stackId="a" fill="hsl(48, 96%, 53%)" radius={[0, 0, 0, 0]} name="partial" />
                  <Bar dataKey="error" stackId="a" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} name="error" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">Carregando...</div>
        ) : !filteredHistory || filteredHistory.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            {history && history.length > 0
              ? 'Nenhum registro encontrado com os filtros selecionados.'
              : 'Nenhuma sincronização registrada ainda.'
            }
          </div>
        ) : (
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {filteredHistory.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-lg bg-muted/20 border border-border/30 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getSyncTypeIcon(item.sync_type)}
                      <span className="text-sm font-medium">{getSyncTypeLabel(item.sync_type)}</span>
                      {getStatusBadge(item.status)}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(item.started_at), { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-400" />
                      {item.jobs_synced} sincronizados
                    </span>
                    {item.jobs_failed > 0 && (
                      <span className="flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 text-red-400" />
                        {item.jobs_failed} falhas
                      </span>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {getTriggeredByLabel(item.triggered_by)}
                    </Badge>
                  </div>

                  {item.error_message && (
                    <div className="mt-2 text-xs text-red-400 bg-red-500/10 p-2 rounded">
                      {item.error_message}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
