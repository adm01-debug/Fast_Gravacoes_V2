import { useProductionLots, useLotComponents, useLotMovements } from '@/features/inventory';
import { useJobStatusHistory } from '@/features/jobs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, Truck, Layers, Info, History, Clock, User } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseDateOnly } from '@/lib/dateUtils';

interface JobTraceabilityTabProps {
  jobId: string;
}

export function JobTraceabilityTab({ jobId }: JobTraceabilityTabProps) {
  const { data: allLots, isLoading: isLoadingLots } = useProductionLots();
  const { history, isLoading: isLoadingHistory } = useJobStatusHistory(jobId);

  const jobLot = allLots?.find(l => l.job_id === jobId);

  const { data: components, isLoading: isLoadingComponents } = useLotComponents(jobLot?.id || null);
  const { data: movements, isLoading: isLoadingMovements } = useLotMovements(jobLot?.id || null);

  if (isLoadingLots) {
    return (
      <div className="space-y-4 py-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!jobLot) {
    return (
      <div className="text-center py-12 border border-dashed rounded-xl space-y-3">
        <Package className="h-12 w-12 text-muted-foreground mx-auto opacity-50" />
        <div className="space-y-1">
          <p className="font-medium">Sem dados de rastreabilidade</p>
          <p className="text-sm text-muted-foreground max-w-[250px] mx-auto">
            Este job ainda não possui um lote de produção registrado para rastreabilidade.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4">
      {/* Lot Info */}
      <Card className="bg-primary/5 border-primary/20 shadow-none">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10 text-primary">
                <Package className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Lote: {jobLot.lot_number}</h3>
                <p className="text-sm text-muted-foreground">
                  Produzido em {format(parseDateOnly(jobLot.production_date) ?? new Date(), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>
            </div>
            <Badge variant="outline" className="bg-success/10 text-success border-success/30">
              {jobLot.status === 'finished' ? 'Concluído' : jobLot.status}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Components Used */}
        <section className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            Componentes e Insumos
          </h4>
          <div className="space-y-2">
            {isLoadingComponents ? (
              <Skeleton className="h-20 w-full" />
            ) : !components || components.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center border border-dashed rounded-lg">
                Nenhum componente registrado.
              </p>
            ) : (
              components.map(comp => (
                <div key={comp.id} className="p-3 rounded-lg bg-secondary/30 border border-border/50 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold">{comp.component_name}</span>
                    <span className="text-[10px] font-mono bg-background px-1.5 py-0.5 rounded border">
                      {comp.batch_number || 'Sem lote'}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Qtd: {comp.quantity_used} {comp.unit}</span>
                    <span>Fornecedor: {comp.supplier || 'N/D'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Movements */}
        <section className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Truck className="h-4 w-4 text-primary" />
            Histórico de Movimentação
          </h4>
          <ScrollArea className="h-[250px] pr-4">
            <div className="space-y-3">
              {isLoadingMovements ? (
                <Skeleton className="h-20 w-full" />
              ) : !movements || movements.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center border border-dashed rounded-lg">
                  Nenhuma movimentação registrada.
                </p>
              ) : (
                movements.map(mov => (
                  <div key={mov.id} className="flex gap-3 items-start relative pb-4 last:pb-0">
                    <div className="absolute left-[7px] top-4 bottom-0 w-[1px] bg-border/50 last:hidden" />
                    <div className="w-4 h-4 rounded-full bg-primary/20 border-2 border-primary shrink-0 z-10 mt-1" />
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold uppercase tracking-wider">{mov.movement_type}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(mov.created_at), "dd/MM HH:mm")}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {mov.from_location || 'Origem'} → {mov.to_location || 'Destino'}
                      </p>
                      {mov.reason && <p className="text-[10px] italic">"{mov.reason}"</p>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </section>
      </div>

      {/* Job Status Audit Trail */}
      <section className="space-y-3 pt-2">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          Rastreabilidade de Fluxo (Status Audit)
        </h4>
        <Card className="glass-card bg-muted/10 border-none shadow-none">
          <CardContent className="p-4">
            <ScrollArea className="h-[200px] pr-4">
              <div className="space-y-4">
                {isLoadingHistory ? (
                  <Skeleton className="h-10 w-full" />
                ) : !history || history.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Nenhum histórico de status registrado.</p>
                ) : (
                  history.map((item, idx) => (
                    <div key={item.id} className="flex gap-4 items-start relative pb-4 last:pb-0">
                      {idx < history.length - 1 && (
                        <div className="absolute left-[7px] top-4 bottom-0 w-[0.5px] bg-border/50" />
                      )}
                      <div className="w-4 h-4 rounded-full bg-primary/20 border-2 border-primary shrink-0 z-10 mt-1" />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] font-bold uppercase py-0 px-1.5 h-auto">
                            {item.new_status}
                          </Badge>
                          {item.previous_status && (
                            <span className="text-[10px] text-muted-foreground">
                              anterior: {item.previous_status}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {item.created_at ? format(new Date(item.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : '--/--'}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {item.changed_by_profile?.full_name || 'Usuário'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </section>

      <div className="p-4 rounded-xl bg-muted/20 border border-border/30 space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <Info className="h-4 w-4 text-primary" />
          <h5 className="text-xs font-bold uppercase tracking-wider">Conformidade Regulatória</h5>
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Dados de rastreabilidade completa gerados automaticamente. Este registro garante a conformidade com normas de qualidade e permite o rastreio reverso de insumos em caso de não-conformidade.
        </p>
      </div>
    </div>
  );
}
