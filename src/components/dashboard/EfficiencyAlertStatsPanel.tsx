import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Zap, Scale, BarChart3, Timer } from "lucide-react";
import { EfficiencyAlertHistory } from "@/features/analytics/hooks/useEfficiencyAlertHistory";
import { differenceInMinutes } from "date-fns";

const severityColors = {
  error: 'bg-primary/20 text-primary border-primary/30',
  warning: 'bg-warning/20 text-warning border-warning/30',
  info: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
};

export function EfficiencyAlertStatsPanel({ alerts, resolvedAlerts }: { alerts: EfficiencyAlertHistory[]; resolvedAlerts: EfficiencyAlertHistory[] }) {
  const stats = useMemo(() => {
    let totalResolutionMinutes = 0, resolvedWithTime = 0;
    resolvedAlerts.forEach(a => { if (a.resolved_at && a.detected_at) { const m = differenceInMinutes(new Date(a.resolved_at), new Date(a.detected_at)); if (m >= 0) { totalResolutionMinutes += m; resolvedWithTime++; } } });
    const avgResolutionMinutes = resolvedWithTime > 0 ? Math.round(totalResolutionMinutes / resolvedWithTime) : null;
    const bottleneckCount = alerts.filter(a => a.alert_type === 'bottleneck').length;
    const loadBalancingCount = alerts.filter(a => a.alert_type === 'load_balancing').length;
    const mostFrequentType = bottleneckCount > loadBalancingCount ? 'bottleneck' : loadBalancingCount > bottleneckCount ? 'load_balancing' : alerts.length > 0 ? 'bottleneck' : null;
    const errorCount = alerts.filter(a => a.severity === 'error').length;
    const warningCount = alerts.filter(a => a.severity === 'warning').length;
    const infoCount = alerts.filter(a => a.severity === 'info').length;
    const mostFrequentSeverity = errorCount >= warningCount && errorCount >= infoCount ? 'error' : warningCount >= infoCount ? 'warning' : infoCount > 0 ? 'info' : null;
    const resolutionRate = alerts.length > 0 ? Math.round((resolvedAlerts.length / alerts.length) * 100) : 0;
    return { totalAlerts: alerts.length, resolvedCount: resolvedAlerts.length, avgResolutionMinutes, mostFrequentType, mostFrequentSeverity, criticalCount: errorCount, resolutionRate };
  }, [alerts, resolvedAlerts]);

  const formatTime = (m: number | null) => { if (m === null) return 'N/A'; if (m < 60) return `${m} min`; const h = Math.floor(m / 60); if (h < 24) return `${h}h ${m % 60}m`; return `${Math.floor(h / 24)}d ${h % 24}h`; };

  const formatSeverity = (s: string) => { const m: Record<string, string> = { error: 'Crítico', warning: 'Alerta', info: 'Info' }; return m[s] || s; };
  const getSeverityColor = (s: string) => { const m: Record<string, string> = { error: severityColors.error, warning: severityColors.warning, info: severityColors.info }; return m[s] || ''; };

  if (stats.totalAlerts === 0) return (<div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground"><BarChart3 className="h-12 w-12 mb-3" /><p>Sem estatísticas disponíveis</p></div>);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[{ icon: AlertTriangle, color: 'bg-blue-500/20', iconColor: 'text-blue-400', value: stats.totalAlerts, label: 'Total de Alertas' },
          { icon: CheckCircle, color: 'bg-green-500/20', iconColor: 'text-green-400', value: `${stats.resolutionRate}%`, label: 'Taxa de Resolução' },
          { icon: Timer, color: 'bg-warning/20', iconColor: 'text-warning', value: formatTime(stats.avgResolutionMinutes), label: 'Tempo Médio Resolução' },
          { icon: AlertTriangle, color: 'bg-primary/20', iconColor: 'text-primary', value: stats.criticalCount, label: 'Alertas Críticos' }
        ].map((s, i) => (
          <div key={i} className="p-4 rounded-lg border border-border/50 bg-card/30 backdrop-blur-sm text-center">
            <div className="flex items-center justify-center gap-2 mb-2"><div className={`p-1.5 rounded-lg ${s.color}`}><s.icon className={`h-4 w-4 ${s.iconColor}`} /></div></div>
            <p className="text-2xl font-bold text-foreground">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="p-4 rounded-lg border border-border/50 bg-card/30 backdrop-blur-sm">
          <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2"><Zap className="h-4 w-4 text-pink-400" />Tipo Mais Frequente</h4>
          {stats.mostFrequentType ? (<div className="flex items-center gap-3"><div className={`p-2 rounded-lg ${stats.mostFrequentType === 'bottleneck' ? 'bg-pink-500/20' : 'bg-teal-500/20'}`}>{stats.mostFrequentType === 'bottleneck' ? <Zap className="h-5 w-5 text-pink-400" /> : <Scale className="h-5 w-5 text-teal-400" />}</div><div><p className="font-medium text-foreground">{stats.mostFrequentType === 'bottleneck' ? 'Gargalo' : 'Balanceamento'}</p><p className="text-xs text-muted-foreground">{alerts.filter(a => a.alert_type === stats.mostFrequentType).length} ocorrências</p></div></div>) : <p className="text-sm text-muted-foreground">Sem dados</p>}
        </div>
        <div className="p-4 rounded-lg border border-border/50 bg-card/30 backdrop-blur-sm">
          <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-warning" />Severidade Mais Comum</h4>
          {stats.mostFrequentSeverity ? (<div className="flex items-center gap-3"><Badge className={`${getSeverityColor(stats.mostFrequentSeverity)} border`}>{formatSeverity(stats.mostFrequentSeverity)}</Badge><p className="text-xs text-muted-foreground">{alerts.filter(a => a.severity === stats.mostFrequentSeverity).length} ocorrências</p></div>) : <p className="text-sm text-muted-foreground">Sem dados</p>}
        </div>
      </div>
      <div className="p-4 rounded-lg border border-border/50 bg-card/30 backdrop-blur-sm">
        <h4 className="text-sm font-medium text-foreground mb-3">Resumo de Resolução</h4>
        <div className="flex items-center gap-4"><div className="flex-1"><div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-500" style={{ width: `${stats.resolutionRate}%` }} /></div></div><div className="text-sm text-muted-foreground whitespace-nowrap">{stats.resolvedCount} de {stats.totalAlerts} resolvidos</div></div>
      </div>
    </div>
  );
}
