import { clickableProps } from '@/lib/a11y';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Timer, Database, Activity, Scale, Calendar, TrendingDown } from "lucide-react";
import { DbJob, StuckJob } from "@/features/jobs";
import { BottleneckAlert, LoadBalancingSuggestion } from "@/features/analytics";


interface StuckJobsCardProps {
  stuckJobs: StuckJob[];
  stuckCritical: number;
  onJobClick: (job: DbJob) => void;
  onViewAll: () => void;
  getTechniqueById: (id: string) => { color: string; short_name: string } | undefined;
}

export function StuckJobsCard({ stuckJobs, stuckCritical, onJobClick, onViewAll, getTechniqueById }: StuckJobsCardProps) {
  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${stuckCritical > 0 ? 'bg-red-500/20 animate-pulse' : 'bg-indigo-500/20'}`}>
              <Timer className={`h-5 w-5 ${stuckCritical > 0 ? 'text-red-400' : 'text-indigo-400'}`} />
            </div>
            Jobs Travados
          </div>
          <Badge variant="outline" className={`${stuckCritical > 0 ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-muted/50 text-foreground border-border'}`}>
            {stuckJobs.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {stuckJobs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum job travado em produção</p>
        ) : (
          <>
            {stuckJobs.slice(0, 5).map((stuck) => {
              const technique = getTechniqueById(stuck.job.technique_id);
              return (
                <div
                  key={stuck.job.id}
                  {...clickableProps(() => onJobClick(stuck.job), { label: `Abrir job travado ${stuck.job.order_number}` })}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    stuck.severity === 'critical'
                      ? 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20'
                      : 'bg-warning/10 border-warning/30 hover:bg-warning/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{stuck.job.order_number}</span>
                        <Badge variant={stuck.severity === 'critical' ? 'destructive' : 'outline'} className="text-xs">
                          {Math.round(stuck.hoursInProduction)}h em produção
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{stuck.job.client}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-xs"
                      style={{
                        backgroundColor: `${technique?.color}20`,
                        borderColor: `${technique?.color}50`,
                        color: technique?.color
                      }}
                    >
                      {technique?.short_name}
                    </Badge>
                  </div>
                </div>
              );
            })}
            {stuckJobs.length > 5 && (
              <Button variant="ghost" className="w-full text-muted-foreground hover:text-foreground" onClick={onViewAll}>
                Ver todos ({stuckJobs.length})
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface DataIntegrityCardProps {
  dataIssues: { message: string; severity: string }[];
  orphanedTechniques: { technique: { id: string; name: string; color: string }; issue: string }[];
}

export function DataIntegrityCard({ dataIssues, orphanedTechniques }: DataIntegrityCardProps) {
  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${dataIssues.length > 0 ? 'bg-warning/20' : 'bg-slate-500/20'}`}>
              <Database className={`h-5 w-5 ${dataIssues.length > 0 ? 'text-warning' : 'text-slate-400'}`} />
            </div>
            Integridade de Dados
          </div>
          <Badge variant="outline" className={`${dataIssues.length > 0 ? 'bg-warning/20 text-warning border-warning/30' : 'bg-muted/50 text-foreground border-border'}`}>
            {dataIssues.length + orphanedTechniques.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {dataIssues.length === 0 && orphanedTechniques.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum problema de integridade detectado</p>
        ) : (
          <>
            {orphanedTechniques.map((item) => (
              <div key={item.technique.id} className="p-3 rounded-lg bg-warning/10 border border-warning/30">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.technique.color }} />
                  <span className="font-medium text-warning">{item.technique.name}</span>
                </div>
                <p className="text-sm text-muted-foreground">{item.issue}</p>
                <p className="text-xs text-warning mt-1">Cadastre máquinas para esta técnica para resolver.</p>
              </div>
            ))}
            {dataIssues.map((issue, index) => (
              <div key={index} className={`p-3 rounded-lg border ${issue.severity === 'error' ? 'bg-red-500/10 border-red-500/30' : 'bg-warning/10 border-warning/30'}`}>
                <p className={`text-sm ${issue.severity === 'error' ? 'text-red-400' : 'text-warning'}`}>{issue.message}</p>
              </div>
            ))}
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface BottleneckCardProps {
  alerts: BottleneckAlert[];
  onViewAll: () => void;
}

export function BottleneckCard({ alerts, onViewAll }: BottleneckCardProps) {
  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-pink-500/20">
              <Activity className="h-5 w-5 text-pink-400" />
            </div>
            Previsão de Gargalos
          </div>
          <Badge variant="outline" className="bg-muted/50 text-foreground border-border">{alerts.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum gargalo previsto</p>
        ) : (
          <>
            {alerts.slice(0, 5).map((alert, index) => (
              <div key={index} className="p-3 rounded-lg bg-muted/30 border border-border/30">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{alert.techniqueName}</span>
                  <Badge className={`${alert.severity === 'critical' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'} border text-xs`}>
                    {alert.severity === 'critical' ? 'Crítico' : 'Atenção'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(alert.date).toLocaleDateString('pt-BR')}</span>
                  <span>Ocupação: {alert.currentCapacity.toFixed(0)}%</span>
                </div>
              </div>
            ))}
            {alerts.length > 5 && (
              <Button variant="ghost" className="w-full text-muted-foreground hover:text-foreground" onClick={onViewAll}>
                Ver todos ({alerts.length})
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface LoadBalancingCardProps {
  suggestions: LoadBalancingSuggestion[];
  onViewAll: () => void;
}

export function LoadBalancingCard({ suggestions, onViewAll }: LoadBalancingCardProps) {
  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-teal-500/20">
              <Scale className="h-5 w-5 text-teal-400" />
            </div>
            Desbalanceamento de Carga
          </div>
          <Badge variant="outline" className="bg-muted/50 text-foreground border-border">{suggestions.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {suggestions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Carga balanceada entre máquinas</p>
        ) : (
          <>
            {suggestions.slice(0, 5).map((suggestion, index) => (
              <div key={index} className="p-3 rounded-lg bg-muted/30 border border-border/30">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{suggestion.currentMachineName} → {suggestion.suggestedMachineName}</span>
                  <Badge className="bg-teal-500/20 text-teal-400 border-teal-500/30 border text-xs">Redistribuir</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">Mover job {suggestion.orderNumber} ({suggestion.client})</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span>Diferença: {suggestion.loadDifference.toFixed(0)}%</span>
                  <span>Carga atual: {suggestion.currentLoad.toFixed(0)}%</span>
                </div>
              </div>
            ))}
            {suggestions.length > 5 && (
              <Button variant="ghost" className="w-full text-muted-foreground hover:text-foreground" onClick={onViewAll}>
                Ver todos ({suggestions.length})
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface CriticalSummaryCardProps {
  totalAlerts: number;
  criticalJobs: number;
  criticalBottlenecks: number;
  stuckCriticalCount: number;
}

export function CriticalSummaryCard({ totalAlerts, criticalJobs, criticalBottlenecks, stuckCriticalCount }: CriticalSummaryCardProps) {
  return (
    <Card className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border-red-500/30 lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-red-400" />
          Resumo Crítico
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total de Alertas', value: totalAlerts, color: 'text-foreground' },
            { label: 'Jobs Críticos', value: criticalJobs, color: 'text-red-400' },
            { label: 'Gargalos Críticos', value: criticalBottlenecks, color: 'text-pink-400' },
            { label: 'Jobs Críticos Travados', value: stuckCriticalCount, color: 'text-orange-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="p-3 rounded-lg bg-background/50 border border-border/30">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
