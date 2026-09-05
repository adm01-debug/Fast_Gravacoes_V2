import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AlertTriangle, Target, Clock, Percent, ShieldCheck, User, Activity } from 'lucide-react';
import { useDetailedAuditTrail } from '@/features/admin';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { KPIData } from '@/features/analytics/hooks/useKPIs';

interface KPIAlertsTabProps {
  goalAlerts: Array<{
    goalId: string;
    operatorName: string;
    message: string;
    riskLevel: 'critical' | 'warning' | 'on-track';
    progressPercentage: number;
  }>;
  kpis: KPIData;
}

const KPIAlertsTabComponent = ({
  goalAlerts, kpis
}: KPIAlertsTabProps) => {
  const { jobAudits, machineAudits, isLoading: isLoadingAudit } = useDetailedAuditTrail();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Goals Alerts */}
        <div className="space-y-6">
          {goalAlerts.length > 0 && (
            <Card className="glass-card border-warning/20 bg-warning/5">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-warning">
                  <Target className="h-5 w-5" />
                  Alertas de Metas
                </CardTitle>
                <CardDescription>Operadores com metas em risco ou atrasadas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {goalAlerts.map((alert) => (
                  <div key={alert.goalId} className={cn(
                    "p-4 rounded-xl border flex items-center justify-between",
                    alert.riskLevel === 'critical' ? "bg-red-500/10 border-red-500/20" : "bg-warning/10 border-warning/20"
                  )}>
                    <div>
                      <p className="font-bold text-sm">{alert.operatorName}</p>
                      <p className="text-xs text-muted-foreground">{alert.message}</p>
                    </div>
                    <div className="text-right">
                      <span className={cn(
                        "text-lg font-bold",
                        alert.riskLevel === 'critical' ? "text-red-500" : "text-warning"
                      )}>
                        {alert.progressPercentage.toFixed(0)}%
                      </span>
                      <Progress value={alert.progressPercentage} className="h-1 w-16 mt-1" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-primary" />
                Desvios & Anomalias
              </CardTitle>
              <CardDescription>Detecção de gargalos e quedas de performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {kpis.anomalies.map((anomaly) => (
                  <div key={anomaly.id} className={cn(
                    "flex items-start gap-4 p-4 rounded-xl border animate-in fade-in slide-in-from-left-4 duration-300",
                    anomaly.severity === 'high' ? "border-primary/40 bg-primary/10" : "border-warning/20 bg-warning/5"
                  )}>
                    <div className={cn(
                      "p-2 rounded-lg",
                      anomaly.severity === 'high' ? "bg-primary/20" : "bg-warning/20"
                    )}>
                      {anomaly.type === 'loss' ? <Percent className={cn("h-5 w-5", anomaly.severity === 'high' ? "text-primary" : "text-warning")} /> :
                       anomaly.type === 'delay' ? <Clock className={cn("h-5 w-5", anomaly.severity === 'high' ? "text-primary" : "text-warning")} /> :
                       <AlertTriangle className={cn("h-5 w-5", anomaly.severity === 'high' ? "text-primary" : "text-warning")} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm">{anomaly.entityName}</p>
                        {anomaly.severity === 'high' && (
                          <Badge className="bg-primary text-white text-[10px]">CRÍTICO</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{anomaly.message}</p>
                    </div>
                  </div>
                ))}
                {kpis.anomalies.length === 0 && (
                  <div className="text-center py-12">
                    <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                    <p className="text-muted-foreground">Nenhum desvio detectado</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Audit Trail Panel */}
        <div className="space-y-6">
          <Card className="glass-card border-primary/20 bg-primary/5 h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    Auditoria de Mudanças
                  </CardTitle>
                  <CardDescription>Rastreabilidade de status e eventos críticos</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {jobAudits.map((log) => (
                  <div key={log.id} className="p-3 rounded-lg bg-background/50 border border-border/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                          <User className="h-3 w-3 text-muted-foreground" />
                        </div>
                        <span className="text-xs font-medium">{log.profiles?.full_name || 'Operador'}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(log.changed_at), "dd MMM, HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[9px] uppercase font-bold py-0 h-4">
                          Job
                        </Badge>
                        <span className="text-xs font-bold">
                          {log.jobs?.order_number || '—'}
                        </span>
                      </div>
                      <div className="mt-2 text-[11px] text-muted-foreground bg-muted/30 p-2 rounded">
                        <div className="flex justify-between">
                          <span>Status:</span>
                          <span className="font-medium text-foreground">{log.old_status} → {log.new_status}</span>
                        </div>
                        {log.new_produced_quantity !== log.old_produced_quantity && (
                          <div className="flex justify-between">
                            <span>Produzido:</span>
                            <span className="font-medium text-foreground">{log.new_produced_quantity}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {machineAudits.map((log) => (
                  <div key={log.id} className="p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Activity className="h-3 w-3 text-cyan-500" />
                        <span className="text-xs font-medium">{log.profiles?.full_name || 'Sistema'}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(log.performed_at), "dd MMM, HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">{log.machines?.name}</span>
                      <Badge className={cn("text-[8px]", log.event_type === 'activation' ? "bg-green-500" : "bg-red-500")}>
                        {log.event_type === 'activation' ? 'ATIVADA' : 'DESATIVADA'}
                      </Badge>
                    </div>
                  </div>
                ))}

                {jobAudits.length === 0 && machineAudits.length === 0 && (
                  <div className="text-center py-12">
                    <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                    <p className="text-muted-foreground">Nenhuma atividade recente</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export const KPIAlertsTab = memo(KPIAlertsTabComponent);
