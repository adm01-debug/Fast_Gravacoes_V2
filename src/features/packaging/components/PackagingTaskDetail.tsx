import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Printer } from 'lucide-react';
import { usePackagingTask } from '../hooks/usePackagingTask';
import { usePackagingSettings, computeSla } from '../hooks/usePackagingSettings';
import { usePackagingSlaOverrides } from '../hooks/usePackagingSlaOverrides';
import { DefectTriageForm } from './DefectTriageForm';
import { PackagingRegisterForm } from './PackagingRegisterForm';
import { DEFECT_TYPE_LABELS, DECISION_LABELS, SEVERITY_LABELS, TASK_STATUS_LABELS } from '../types/packaging.schema';
import { PackagingChecklistPanel } from './PackagingChecklistPanel';
import { PackagingThermalLabel } from './PackagingThermalLabel';
import { PackagingAuditTimeline } from './PackagingAuditTimeline';
import { DelayReasonDialog } from './DelayReasonDialog';
import { format } from 'date-fns';

interface Props {
  taskId: string | null;
  onOpenChange: (open: boolean) => void;
}

export function PackagingTaskDetail({ taskId, onOpenChange }: Props) {
  const { task, defects, isLoading, assign, changeStatus, registerPackaging, recordDefect } = usePackagingTask(taskId);
  const { data: settings } = usePackagingSettings();
  const { data: overrides } = usePackagingSlaOverrides();
  const [showLabel, setShowLabel] = useState(false);
  const [showDelay, setShowDelay] = useState(false);

  const sla = task && settings ? computeSla(task, settings, overrides) : null;
  const isOverdue = sla?.level === 'overdue';

  const handleReadyToShip = () => {
    if (isOverdue) {
      setShowDelay(true);
    } else {
      changeStatus.mutate('ready_to_ship');
    }
  };


  return (
    <Sheet open={!!taskId} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Tarefa de Embalagem</SheetTitle>
        </SheetHeader>

        {isLoading || !task ? (
          <div className="mt-4 space-y-3">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{task.jobs?.order_number ?? '—'}</h3>
                <Badge variant="outline">{TASK_STATUS_LABELS[task.status]}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {task.jobs?.client ?? '—'} · {task.jobs?.product ?? '—'}
              </p>
              <div className="text-xs text-muted-foreground mt-1">
                Recebido: <strong>{task.received_quantity}</strong> · Aprovado: <strong>{task.approved_quantity}</strong> · Rejeitado: <strong>{task.rejected_quantity}</strong>
              </div>
            </div>

            {!task.assigned_to && (
              <Button className="w-full" onClick={() => assign.mutate()} disabled={assign.isPending}>
                Assumir tarefa
              </Button>
            )}

            <Tabs defaultValue="triage">
              <TabsList className="grid grid-cols-5 w-full">
                <TabsTrigger value="triage">Triagem</TabsTrigger>
                <TabsTrigger value="packaging">Embalagem</TabsTrigger>
                <TabsTrigger value="checklist">Conferência</TabsTrigger>
                <TabsTrigger value="defects">Defeitos ({defects.length})</TabsTrigger>
                <TabsTrigger value="history">Histórico</TabsTrigger>
              </TabsList>

              <TabsContent value="checklist" className="pt-4">
                <PackagingChecklistPanel taskId={task.id} />
              </TabsContent>

              <TabsContent value="triage" className="pt-4">
                <p className="text-sm text-muted-foreground mb-3">
                  Registre peças com defeito encontradas durante a inspeção pós-personalização.
                </p>
                <DefectTriageForm
                  taskId={task.id}
                  submitting={recordDefect.isPending}
                  onSubmit={async (values) => { await recordDefect.mutateAsync(values); }}
                />
              </TabsContent>

              <TabsContent value="packaging" className="pt-4">
                <PackagingRegisterForm
                  received={task.received_quantity}
                  submitting={registerPackaging.isPending}
                  onSubmit={async (values) => { await registerPackaging.mutateAsync(values); }}
                />
                <div className="mt-4 flex flex-col gap-2">
                  {task.approved_quantity > 0 && (
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => setShowLabel(true)}
                    >
                      <Printer className="h-4 w-4" /> Imprimir etiqueta térmica
                    </Button>
                  )}
                  {task.status === 'packaging' && (
                    <Button
                      className="w-full"
                      variant={isOverdue ? 'destructive' : 'secondary'}
                      onClick={handleReadyToShip}
                      disabled={changeStatus.isPending}
                    >
                      {isOverdue ? 'Registrar motivo e liberar envio' : 'Marcar como pronto para envio'}
                    </Button>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="defects" className="pt-4 space-y-3">
                {defects.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum defeito registrado.</p>
                ) : (
                  defects.map(d => (
                    <div key={d.id} className="border rounded-md p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {DEFECT_TYPE_LABELS[d.defect_type as keyof typeof DEFECT_TYPE_LABELS] ?? d.defect_type}
                        </span>
                        <Badge variant="outline">{SEVERITY_LABELS[d.severity as keyof typeof SEVERITY_LABELS] ?? d.severity}</Badge>
                      </div>
                      <p className="text-muted-foreground text-xs mt-1">
                        {d.quantity} peça(s) · Decisão: {DECISION_LABELS[d.decision as keyof typeof DECISION_LABELS] ?? d.decision} · {format(new Date(d.created_at), 'dd/MM HH:mm')}
                      </p>
                      {d.notes && <p className="text-xs mt-1">{d.notes}</p>}
                      {d.decision === 'rework' && (
                        <p className="text-xs mt-1 text-amber-400">
                          ↻ Pedido de retrabalho gerado automaticamente na fila de produção.
                        </p>
                      )}
                      {d.photo_url && (
                        <a href={d.photo_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline mt-1 inline-block">
                          Ver foto
                        </a>
                      )}
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="history" className="pt-4">
                <PackagingAuditTimeline taskId={task.id} />
              </TabsContent>
            </Tabs>

            {task && (
              <PackagingThermalLabel
                open={showLabel}
                onOpenChange={setShowLabel}
                data={{
                  taskId: task.id,
                  orderNumber: task.jobs?.order_number ?? '—',
                  client: task.jobs?.client ?? '—',
                  product: task.jobs?.product ?? '—',
                  approvedQuantity: task.approved_quantity,
                  packagedAt: null,
                  destination: task.jobs?.client ?? null,
                }}
              />
            )}

            {task && (
              <DelayReasonDialog
                open={showDelay}
                onOpenChange={setShowDelay}
                slaLabel={sla ? `Elapsed ${sla.elapsedHours}h / SLA ${sla.slaHours}h.` : ''}
                submitting={changeStatus.isPending}
                onConfirm={async (values) => {
                  await changeStatus.mutateAsync({
                    status: 'ready_to_ship',
                    delay_reason: values.delay_reason,
                    delay_category: values.delay_category,
                    was_overdue: true,
                  });
                  setShowDelay(false);
                }}
              />
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
