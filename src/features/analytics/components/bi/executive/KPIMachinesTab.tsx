import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { AlertTriangle, Cpu, Search, CheckCircle2 } from 'lucide-react';
import { KPIData } from '@/features/analytics/hooks/useKPIs';

interface KPIMachinesTabProps {
  kpis: KPIData;
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  setSelectedMachine: (machine: KPIData['productivityByMachine'][0]) => void;
}

const KPIMachinesTabComponent = ({
  kpis, searchTerm, setSearchTerm, setSelectedMachine
}: KPIMachinesTabProps) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="glass-card lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-primary" />
              Anomalias por Máquina
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {kpis.anomalies.filter((a) => a.id.startsWith('loss-m-') || a.id.startsWith('occ-m-')).length > 0 ? (
                kpis.anomalies
                  .filter((a) => a.id.startsWith('loss-m-') || a.id.startsWith('occ-m-'))
                  .map((anomaly) => (
                    <div key={anomaly.id} className="p-3 rounded-lg border border-primary/20 bg-primary/5">
                      <p className="text-xs font-bold">{anomaly.entityName}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{anomaly.message}</p>
                    </div>
                  ))
              ) : (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2 opacity-20" />
                  <p className="text-xs text-muted-foreground">Máquinas operando normalmente</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-cyan-400" />
                  Produtividade por Máquina
                </CardTitle>
                <CardDescription>Comparativo de performance e ocupação entre equipamentos</CardDescription>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filtrar máquinas..."
                  className="pl-8 h-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-4 px-4 text-sm font-medium text-muted-foreground">Máquina</th>
                    <th className="text-center py-4 px-4 text-sm font-medium text-muted-foreground">Jobs</th>
                    <th className="text-center py-4 px-4 text-sm font-medium text-muted-foreground">Peças</th>
                    <th className="text-center py-4 px-4 text-sm font-medium text-muted-foreground">Perdas</th>
                    <th className="text-center py-4 px-4 text-sm font-medium text-muted-foreground">OEE Estimado</th>
                    <th className="text-right py-4 px-4 text-sm font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                   {kpis.productivityByMachine
                    .filter((m) => m.machineName.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((machine) => (
                    <tr
                      key={machine.machineId}
                      className="border-b border-border/30 hover:bg-muted/10 transition-colors cursor-pointer group"
                      onClick={() => setSelectedMachine(machine)}
                    >
                      <td className="py-4 px-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{machine.machineName}</span>
                          <span className="text-xs text-muted-foreground uppercase">{machine.machineId.split('-')[0]}</span>
                        </div>
                      </td>
                      <td className="text-center py-4 px-4">
                        <Badge variant="secondary" className="bg-muted/30">{machine.jobCount}</Badge>
                      </td>
                      <td className="text-center py-4 px-4 text-sm">{machine.totalPieces.toLocaleString()}</td>
                      <td className="text-center py-4 px-4">
                        <span className={cn(
                          "text-sm font-medium",
                          machine.lossRate > 5 ? "text-primary" : machine.lossRate > 0 ? "text-warning" : "text-green-400"
                        )}>
                          {machine.lossRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <Progress value={85 - (machine.lossRate * 2)} className="w-20 h-2" />
                          <span className="text-xs font-medium">{(85 - (machine.lossRate * 2)).toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="text-right py-4 px-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                          <span className="text-xs font-medium text-green-400">Ativa</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export const KPIMachinesTab = memo(KPIMachinesTabComponent);
