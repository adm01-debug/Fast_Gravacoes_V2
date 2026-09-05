/* eslint-disable react-hooks/exhaustive-deps --
   Dependências intencionalmente omitidas: incluí-las causaria loops
   infinitos, invalidação excessiva de cache ou recomputação em cada
   render. Callbacks/valores externos são estáveis por contrato. */
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { History, AlertTriangle, CheckCircle, Clock, Zap, Scale, Filter, CalendarIcon, X, TrendingUp, BarChart3 } from "lucide-react";
import { useEfficiencyAlertHistory, EfficiencyAlertHistory } from "@/features/analytics/hooks/useEfficiencyAlertHistory";
import { format, formatDistanceToNow, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { EfficiencyAlertTrendChart } from "./EfficiencyAlertTrendChart";
import { EfficiencyAlertStatsPanel } from "./EfficiencyAlertStatsPanel";

const severityColors = { error: 'bg-primary/20 text-primary border-primary/30', warning: 'bg-warning/20 text-warning border-warning/30', info: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
const typeIcons = { bottleneck: Zap, load_balancing: Scale };
const typeLabels = { bottleneck: 'Gargalo', load_balancing: 'Balanceamento' };
type AlertType = 'all' | 'bottleneck' | 'load_balancing';
type SeverityType = 'all' | 'error' | 'warning' | 'info';

export const EfficiencyAlertHistoryWidget = () => {
  const { activeAlerts, resolvedAlerts, isLoading, resolveAlert } = useEfficiencyAlertHistory();
  const [typeFilter, setTypeFilter] = useState<AlertType>('all');
  const [severityFilter, setSeverityFilter] = useState<SeverityType>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  const filterAlerts = (alerts: EfficiencyAlertHistory[]) => alerts.filter(alert => {
    if (typeFilter !== 'all' && alert.alert_type !== typeFilter) return false;
    if (severityFilter !== 'all' && alert.severity !== severityFilter) return false;
    const d = new Date(alert.detected_at);
    if (dateFrom && isBefore(d, startOfDay(dateFrom))) return false;
    if (dateTo && isAfter(d, endOfDay(dateTo))) return false;
    return true;
  });

  const filteredActive = useMemo(() => filterAlerts(activeAlerts), [activeAlerts, typeFilter, severityFilter, dateFrom, dateTo]);
  const filteredResolved = useMemo(() => filterAlerts(resolvedAlerts), [resolvedAlerts, typeFilter, severityFilter, dateFrom, dateTo]);
  const hasFilters = typeFilter !== 'all' || severityFilter !== 'all' || dateFrom || dateTo;
  const clearFilters = () => { setTypeFilter('all'); setSeverityFilter('all'); setDateFrom(undefined); setDateTo(undefined); };

  const handleResolve = async (id: string) => { try { await resolveAlert.mutateAsync({ alertId: id }); toast.success("Alerta resolvido"); } catch { toast.error("Erro ao resolver"); } };

  const renderCard = (alert: EfficiencyAlertHistory, showBtn = false) => {
    const TypeIcon = typeIcons[alert.alert_type as keyof typeof typeIcons] || AlertTriangle;
    return (
      <div key={alert.id} className="p-4 rounded-lg border border-border/50 bg-card/30 backdrop-blur-sm space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${alert.alert_type === 'bottleneck' ? 'bg-pink-500/20' : 'bg-teal-500/20'}`}><TypeIcon className={`h-4 w-4 ${alert.alert_type === 'bottleneck' ? 'text-pink-400' : 'text-teal-400'}`} /></div>
            <div><h4 className="font-medium text-foreground">{alert.title}</h4><p className="text-sm text-muted-foreground">{alert.description}</p></div>
          </div>
          <Badge className={`${severityColors[alert.severity as keyof typeof severityColors]} border`}>{alert.severity === 'error' ? 'Crítico' : alert.severity === 'warning' ? 'Alerta' : 'Info'}</Badge>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Detectado {formatDistanceToNow(new Date(alert.detected_at), { addSuffix: true, locale: ptBR })}</span>
            <Badge variant="outline" className="text-xs">{typeLabels[alert.alert_type as keyof typeof typeLabels]}</Badge>
          </div>
          {showBtn && <Button size="sm" variant="outline" onClick={() => handleResolve(alert.id)} disabled={resolveAlert.isPending} className="h-7 text-xs"><CheckCircle className="h-3 w-3 mr-1" />Resolver</Button>}
          {alert.resolved_at && <span className="flex items-center gap-1 text-green-400"><CheckCircle className="h-3 w-3" />Resolvido {formatDistanceToNow(new Date(alert.resolved_at), { addSuffix: true, locale: ptBR })}</span>}
        </div>
        {alert.resolution_notes && <p className="text-xs text-muted-foreground italic border-t border-border/50 pt-2">{alert.resolution_notes}</p>}
      </div>
    );
  };

  if (isLoading) return (<Card className="glass-card border-border/50"><CardContent className="p-6"><div className="animate-pulse space-y-3"><div className="h-4 bg-muted rounded w-1/3" /><div className="h-20 bg-muted rounded" /></div></CardContent></Card>);

  return (
    <Card className="glass-card border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg"><div className="p-2 rounded-lg bg-purple-500/20"><History className="h-5 w-5 text-purple-400" /></div>Histórico de Alertas de Eficiência</CardTitle>
          {hasFilters && <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs text-muted-foreground"><X className="h-3 w-3 mr-1" />Limpar filtros</Button>}
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <div className="flex items-center gap-1 text-muted-foreground"><Filter className="h-4 w-4" /><span className="text-sm">Filtros:</span></div>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as AlertType)}><SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os tipos</SelectItem><SelectItem value="bottleneck">Gargalo</SelectItem><SelectItem value="load_balancing">Balanceamento</SelectItem></SelectContent></Select>
          <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as SeverityType)}><SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas severidades</SelectItem><SelectItem value="error">Crítico</SelectItem><SelectItem value="warning">Alerta</SelectItem><SelectItem value="info">Info</SelectItem></SelectContent></Select>
          <Popover><PopoverTrigger asChild><Button variant="outline" size="sm" className={cn("h-8 text-xs", !dateFrom && "text-muted-foreground")}><CalendarIcon className="h-3 w-3 mr-1" />{dateFrom ? format(dateFrom, "dd/MM/yyyy") : "De"}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus locale={ptBR} className="pointer-events-auto" /></PopoverContent></Popover>
          <Popover><PopoverTrigger asChild><Button variant="outline" size="sm" className={cn("h-8 text-xs", !dateTo && "text-muted-foreground")}><CalendarIcon className="h-3 w-3 mr-1" />{dateTo ? format(dateTo, "dd/MM/yyyy") : "Até"}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus locale={ptBR} className="pointer-events-auto" /></PopoverContent></Popover>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="stats" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="stats" className="flex items-center gap-2"><BarChart3 className="h-4 w-4" />Estatísticas</TabsTrigger>
            <TabsTrigger value="trend" className="flex items-center gap-2"><TrendingUp className="h-4 w-4" />Tendência</TabsTrigger>
            <TabsTrigger value="active" className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Ativos ({filteredActive.length})</TabsTrigger>
            <TabsTrigger value="resolved" className="flex items-center gap-2"><CheckCircle className="h-4 w-4" />Resolvidos ({filteredResolved.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="stats"><EfficiencyAlertStatsPanel alerts={[...filteredActive, ...filteredResolved]} resolvedAlerts={filteredResolved} /></TabsContent>
          <TabsContent value="trend"><EfficiencyAlertTrendChart alerts={[...filteredActive, ...filteredResolved]} /></TabsContent>
          <TabsContent value="active"><ScrollArea className="h-[300px] pr-4">{filteredActive.length === 0 ? (<div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8"><CheckCircle className="h-12 w-12 mb-3 text-green-400" /><p>{hasFilters ? 'Nenhum alerta encontrado' : 'Nenhum alerta ativo'}</p></div>) : (<div className="space-y-3">{filteredActive.map(a => renderCard(a, true))}</div>)}</ScrollArea></TabsContent>
          <TabsContent value="resolved"><ScrollArea className="h-[300px] pr-4">{filteredResolved.length === 0 ? (<div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8"><History className="h-12 w-12 mb-3" /><p>{hasFilters ? 'Nenhum alerta encontrado' : 'Nenhum histórico disponível'}</p></div>) : (<div className="space-y-3">{filteredResolved.map(a => renderCard(a, false))}</div>)}</ScrollArea></TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
