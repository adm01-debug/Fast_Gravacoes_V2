import { format } from 'date-fns';
import { Command, Settings2, TrendingUp, Trophy } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OperatorGoalsTab } from '@/components/operators/OperatorGoalsTab';
import { OperatorPerformanceTab } from '@/components/operators/OperatorPerformanceTab';
import { formatLastSeen } from '@/components/operators/operator-utils';
import type { OperatorWithProfile } from '@/features/production/hooks/useOperators';
import type { Machine as DbMachine } from '@/features/production/services/machinesService';

interface OperatorDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operator: OperatorWithProfile | null;
  isOnline: boolean;
  lastSeen: Date | undefined;
  assignedMachines: DbMachine[];
  onOpenAssignment: () => void;
}

export function OperatorDetailsDialog({ open, onOpenChange, operator, isOnline, lastSeen, assignedMachines, onOpenAssignment }: OperatorDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12 border-2 border-primary/20">
                  <AvatarImage src={operator?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {operator?.full_name
                      ? operator.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                      : 'OP'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <DialogTitle className="text-xl">
                    {operator?.full_name}
                  </DialogTitle>
                  <DialogDescription>
                    {operator?.phone || 'Sem telefone'} • Ativo desde {operator && format(new Date(operator.created_at), "dd/MM/yyyy")}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <Tabs defaultValue="performance" className="mt-4 flex-1 flex flex-col overflow-hidden">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="performance" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Desempenho
                </TabsTrigger>
                <TabsTrigger value="goals" className="flex items-center gap-2">
                  <Trophy className="h-4 w-4" />
                  Metas
                </TabsTrigger>
                <TabsTrigger value="machines" className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  Máquinas & Config
                </TabsTrigger>
              </TabsList>

              <TabsContent value="performance" className="flex-1 mt-4 overflow-auto min-h-0">
                {operator && (
                  <OperatorPerformanceTab operatorId={operator.user_id} />
                )}
              </TabsContent>

              <TabsContent value="goals" className="flex-1 mt-4 overflow-auto min-h-0">
                {operator && (
                  <OperatorGoalsTab operatorId={operator.user_id} />
                )}
              </TabsContent>

              <TabsContent value="machines" className="flex-1 mt-4 overflow-auto min-h-0">
                <div className="space-y-6 pb-6">
                  <section className="space-y-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Máquinas Atribuídas</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {operator && assignedMachines.length > 0 ? (
                        assignedMachines.map(machine => (
                          <div key={machine.id} className="p-3 rounded-lg bg-secondary/30 border border-border/50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded bg-background flex items-center justify-center">
                                <Command className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">{machine.code}</p>
                                <p className="text-xs text-muted-foreground">{machine.name}</p>
                              </div>
                            </div>
                            {machine.is_active ? (
                              <Badge variant="outline" className="text-success border-success/30 text-[10px]">Ativa</Badge>
                            ) : (
                              <Badge variant="outline" className="text-destructive border-destructive/30 text-[10px]">Inativa</Badge>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground py-4 text-center col-span-2 border border-dashed rounded-lg">
                          Nenhuma máquina atribuída a este operador.
                        </p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      className="w-full mt-2"
                      onClick={() => {
                        onOpenChange(false);
                        if (operator) onOpenAssignment();
                      }}
                    >
                      Gerenciar Atribuições
                    </Button>
                  </section>

                  <section className="space-y-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Status do Sistema</h3>
                    <div className="p-4 rounded-lg bg-secondary/20 border border-border/50 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Conta Ativa</span>
                        <Badge variant={operator?.is_active ? 'success' : 'warning'}>
                          {operator?.is_active ? 'Sim' : 'Não'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Presença (Tempo Real)</span>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${operator && isOnline ? 'bg-success' : 'bg-muted-foreground/50'}`} />
                          <span className="text-sm">
                            {operator && isOnline ? 'Conectado' : 'Desconectado'}
                          </span>
                        </div>
                      </div>
                      {operator && !isOnline && lastSeen && (
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Última vez visto</span>
                          <span>{formatLastSeen(lastSeen)}</span>
                        </div>
                      )}
                    </div>
                  </section>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
  );
}
