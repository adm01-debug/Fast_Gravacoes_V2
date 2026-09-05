import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Settings,
  Activity,
  History,
  ShieldAlert,
  Zap,
  Info,
  Clock,
  Gauge
} from "lucide-react";
import { useState, useCallback } from "react";
import { useEntityAuditTrail } from "@/features/admin";
import { useDataExport } from "@/features/admin";
import { AuditEntryCard } from "@/features/admin/components/audit/AuditEntryCard";
import { HistoryPeriodFilter, type HistoryPeriodValue } from "@/features/admin/components/audit/HistoryPeriodFilter";
import { MachineReliabilityTab } from "./MachineReliabilityTab";
import { Badge } from "@/components/ui/badge";
import { calculateRealOEE } from "@/features/production";
import { useSchedulingData } from "@/features/jobs";

interface MachineSummary {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
  technique_id?: string | null;
}

interface MachineDetailsModalProps {
  machine: MachineSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MachineDetailsModal({ machine, open, onOpenChange }: MachineDetailsModalProps) {
  const { getTechniqueById } = useSchedulingData();

  if (!machine) return null;

  const technique = machine.technique_id ? getTechniqueById(machine.technique_id) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card border-border/50 backdrop-blur-sm">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              {machine.code} - {machine.name}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={machine.is_active ? 'text-green-400 border-green-500/30' : 'text-red-400 border-red-500/30'}>
                {machine.is_active ? 'Operacional' : 'Inativa'}
              </Badge>
            </div>
          </div>
          <DialogDescription>
            Informações detalhadas, confiabilidade e histórico da máquina.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="mt-4">
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="details" className="text-xs">
              <Info className="h-3 w-3 mr-1.5" />
              Detalhes
            </TabsTrigger>
            <TabsTrigger value="reliability" className="text-xs">
              <ShieldAlert className="h-3 w-3 mr-1.5" />
              Confiabilidade
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs">
              <History className="h-3 w-3 mr-1.5" />
              Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-muted/20 border border-border/30">
                <p className="text-[10px] text-muted-foreground uppercase font-bold mb-2">Capacidade e Performance</p>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Zap className="h-3 w-3" /> Setup Médio
                    </span>
                    <span className="text-sm font-medium">{technique?.setup_time || 15} min</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Clock className="h-3 w-3" /> Turnos
                    </span>
                    <span className="text-sm font-medium">1º e 2º</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Gauge className="h-3 w-3" /> Carga Atual
                    </span>
                    <span className="text-sm font-medium">Auto</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-muted/20 border border-border/30">
                <p className="text-[10px] text-muted-foreground uppercase font-bold mb-2">Especificações</p>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Fabricante</span>
                    <span className="text-sm font-medium">Indústria X</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground text-ellipsis overflow-hidden whitespace-nowrap mr-1">Técnica Principal</span>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: technique?.color || '#888' }}
                      />
                      <span className="text-sm font-medium">{technique?.name || 'Não vinculada'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <MachineRealOEESection machineId={machine.id} />
          </TabsContent>

          <TabsContent value="reliability">
            <div className="mt-4">
              <MachineReliabilityTab machineId={machine.id} />
            </div>
          </TabsContent>

          <TabsContent value="history">
            <MachineHistoryTab machineId={machine.id} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function MachineHistoryTab({ machineId }: { machineId: string }) {
  const [period, setPeriod] = useState<HistoryPeriodValue>({ preset: 'all' });
  const { data, isLoading, error } = useEntityAuditTrail('machines', machineId, {
    fromDate: period.fromDate,
    toDate: period.toDate,
  });
  const { exportAuditTrail } = useDataExport('machines');

  const handleExport = useCallback(() => {
    exportAuditTrail({
      entityType: 'machines',
      entityId: machineId,
      fromDate: period.fromDate,
      toDate: period.toDate,
    }, `auditoria_maquina_${machineId.slice(0, 8)}`);
  }, [machineId, period, exportAuditTrail]);

  return (
    <div className="mt-4">
      <HistoryPeriodFilter
        value={period}
        onChange={setPeriod}
        onExport={handleExport}
        resultCount={data?.length}
      />
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : error ? (
        <div className="text-sm text-destructive p-4 border border-destructive/30 rounded-md bg-destructive/10">
          Não foi possível carregar o histórico.
        </div>
      ) : !data || data.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-12 border border-dashed rounded-xl">
          Nenhum registro encontrado no período selecionado.
        </div>
      ) : (
        <ScrollArea className="h-[420px] pr-4">
          <div className="space-y-3 pb-4">
            {data.map((entry) => (
              <AuditEntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

function MachineRealOEESection({ machineId }: { machineId: string }) {
  const { jobs } = useSchedulingData();
  const machineJobs = jobs.filter(j => j.machine_id === machineId);
  const metrics = calculateRealOEE(machineJobs);

  return (
    <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
      <h4 className="text-xs font-bold mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-3.5 w-3.5" />
          Saúde em Tempo Real (OEE Real)
        </div>
        <Badge variant="outline" className="text-[10px] font-bold">
          {metrics.oee}%
        </Badge>
      </h4>
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-[9px] text-muted-foreground uppercase mb-1">Disponibilidade</p>
          <p className="text-lg font-bold">{metrics.availability}%</p>
        </div>
        <div className="text-center">
          <p className="text-[9px] text-muted-foreground uppercase mb-1">Performance</p>
          <p className="text-lg font-bold">{metrics.performance}%</p>
        </div>
        <div className="text-center">
          <p className="text-[9px] text-muted-foreground uppercase mb-1">Qualidade</p>
          <p className="text-lg font-bold">{metrics.quality}%</p>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-primary/10 flex justify-between text-[10px] text-muted-foreground">
        <span>Produção: {metrics.goodPieces} pçs</span>
        <span>Perdas: {metrics.lostPieces} pçs</span>
      </div>
    </div>
  );
}
