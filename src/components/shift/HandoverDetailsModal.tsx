import { useState } from 'react';
import { format } from 'date-fns';
import {
  CheckCircle2,
  Circle,
  Clock,
  User,
  Settings,
  MessageSquare,
  AlertTriangle,
  ListTodo,
  Plus,
  Send
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/features/auth';
import {
  ShiftHandover,
  useShiftChecklist,
  useShiftPendingTasks,
  useShiftOccurrences,
  useShiftHandoverMutations
} from '@/hooks/useShiftHandover';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  open: { label: 'Em andamento', color: 'text-primary' },
  pending_acceptance: { label: 'Aguardando aceite', color: 'text-warning' },
  completed: { label: 'Concluída', color: 'text-green-500' },
  cancelled: { label: 'Cancelada', color: 'text-destructive' }
};

const SHIFT_LABELS: Record<string, string> = {
  morning: 'Manhã',
  afternoon: 'Tarde',
  night: 'Noite'
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-slate-500',
  medium: 'bg-blue-500',
  high: 'bg-warning',
  critical: 'bg-destructive'
};

const OCCURRENCE_ICONS: Record<string, string> = {
  incident: '⚠️',
  maintenance: '🔧',
  quality: '✓',
  safety: '🛡️',
  production: '📦',
  other: '📝'
};

interface Props {
  handover: ShiftHandover | null;
  onClose: () => void;
}

export default function HandoverDetailsModal({ handover, onClose }: Props) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('checklist');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [generalNotes, setGeneralNotes] = useState('');

  const { data: checklist } = useShiftChecklist(handover?.id || null);
  const { data: pendingTasks } = useShiftPendingTasks(handover?.id);
  const { data: occurrences } = useShiftOccurrences(handover?.id);

  const {
    updateHandover,
    completeHandover,
    acceptHandover,
    updateChecklistItem,
    addPendingTask
  } = useShiftHandoverMutations();

  if (!handover) return null;

  const isOwner = handover.outgoing_operator_id === user?.id;
  const canEdit = isOwner && handover.status === 'open';
  const canAccept = !isOwner && handover.status === 'pending_acceptance';
  const canComplete = isOwner && handover.status === 'open';

  const checklistProgress = checklist ? {
    total: checklist.length,
    completed: checklist.filter(i => i.is_checked).length
  } : { total: 0, completed: 0 };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim() || !handover.id) return;

    await addPendingTask.mutateAsync({
      handover_id: handover.id,
      title: newTaskTitle.trim(),
      priority: newTaskPriority,
      status: 'pending',
      description: null,
      machine_id: handover.machine_id,
      job_id: null,
      due_date: null
    });

    setNewTaskTitle('');
    setNewTaskPriority('medium');
  };

  const handleUpdateNotes = async () => {
    if (!handover.id) return;
    await updateHandover.mutateAsync({
      id: handover.id,
      general_notes: generalNotes || handover.general_notes
    });
  };

  return (
    <Dialog open={!!handover} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              Passagem de Turno - {SHIFT_LABELS[handover.shift_type]}
              <Badge
                variant="outline"
                className={STATUS_LABELS[handover.status]?.color}
              >
                {STATUS_LABELS[handover.status]?.label}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              Visualize e gerencie os detalhes da passagem de turno, checklist e pendências.
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* Info Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-b">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div className="text-sm">
              <p className="text-muted-foreground">Iniciado</p>
              <p className="font-medium">
                {format(new Date(handover.started_at), "dd/MM HH:mm")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-muted-foreground" />
            <div className="text-sm">
              <p className="text-muted-foreground">Máquina</p>
              <p className="font-medium">{handover.machine?.name || 'Geral'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <div className="text-sm">
              <p className="text-muted-foreground">Operador saindo</p>
              <p className="font-medium">{handover.outgoing_profile?.full_name || 'N/A'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <div className="text-sm">
              <p className="text-muted-foreground">Operador entrando</p>
              <p className="font-medium">{handover.incoming_profile?.full_name || 'Aguardando...'}</p>
            </div>
          </div>
        </div>

        {/* Tabs Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="checklist" className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Checklist
              <Badge variant="secondary" className="ml-1">
                {checklistProgress.completed}/{checklistProgress.total}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="pending" className="gap-2">
              <ListTodo className="h-4 w-4" />
              Pendências
              {pendingTasks && pendingTasks.length > 0 && (
                <Badge variant="secondary" className="ml-1">{pendingTasks.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="occurrences" className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              Ocorrências
            </TabsTrigger>
            <TabsTrigger value="notes" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Observações
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            <TabsContent value="checklist" className="mt-0 space-y-2">
              {checklist && checklist.length > 0 ? (
                checklist.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${
                      item.is_checked ? 'bg-muted/50' : ''
                    }`}
                  >
                    <Checkbox
                      checked={item.is_checked}
                      disabled={!canEdit}
                      onCheckedChange={(checked) => {
                        updateChecklistItem.mutate({
                          id: item.id,
                          is_checked: !!checked
                        });
                      }}
                    />
                    <div className="flex-1">
                      <p className={item.is_checked ? 'line-through text-muted-foreground' : ''}>
                        {item.item_description}
                      </p>
                      {item.checked_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Verificado em {format(new Date(item.checked_at), "dd/MM HH:mm")}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Circle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum item no checklist</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="pending" className="mt-0 space-y-4">
              {canEdit && (
                <div className="flex gap-2">
                  <Input
                    placeholder="Nova pendência..."
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddTask();
                    }}
                  />
                  <Select
                    value={newTaskPriority}
                    onValueChange={(v) => setNewTaskPriority(v as typeof newTaskPriority)}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="critical">Crítica</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAddTask} disabled={!newTaskTitle.trim()}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <div className="space-y-2">
                {pendingTasks && pendingTasks.length > 0 ? (
                  pendingTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 p-3 rounded-lg border"
                    >
                      <div className={`w-2 h-2 rounded-full mt-2 ${PRIORITY_COLORS[task.priority]}`} />
                      <div className="flex-1">
                        <p className="font-medium">{task.title}</p>
                        {task.description && (
                          <p className="text-sm text-muted-foreground">{task.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {task.priority === 'low' ? 'Baixa' :
                             task.priority === 'medium' ? 'Média' :
                             task.priority === 'high' ? 'Alta' : 'Crítica'}
                          </Badge>
                          {task.machine && (
                            <span className="text-xs text-muted-foreground">
                              {task.machine.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <ListTodo className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma pendência registrada</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="occurrences" className="mt-0 space-y-2">
              {occurrences && occurrences.length > 0 ? (
                occurrences.map((occ) => (
                  <div
                    key={occ.id}
                    className={`p-3 rounded-lg border ${
                      occ.severity === 'critical' ? 'border-destructive bg-destructive/5' :
                      occ.severity === 'error' ? 'border-orange-500 bg-orange-500/5' :
                      ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xl">{OCCURRENCE_ICONS[occ.occurrence_type]}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{occ.title}</p>
                          <Badge
                            variant={occ.severity === 'critical' ? 'destructive' : 'outline'}
                            className="text-xs"
                          >
                            {occ.severity}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{occ.description}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {format(new Date(occ.occurred_at), "dd/MM/yyyy HH:mm")}
                          {occ.machine && ` • ${occ.machine.name}`}
                        </p>
                        {occ.resolution && (
                          <div className="mt-2 p-2 bg-green-500/10 rounded text-sm">
                            <p className="text-green-600 font-medium">Resolução:</p>
                            <p>{occ.resolution}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma ocorrência registrada</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="notes" className="mt-0 space-y-4">
              <Textarea
                placeholder="Observações gerais sobre a passagem de turno..."
                rows={6}
                defaultValue={handover.general_notes || ''}
                onChange={(e) => setGeneralNotes(e.target.value)}
                disabled={!canEdit}
              />
              {canEdit && (
                <Button
                  onClick={handleUpdateNotes}
                  disabled={updateHandover.isPending}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Salvar Observações
                </Button>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          {canComplete && (
            <Button
              onClick={() => completeHandover.mutate(handover.id)}
              disabled={completeHandover.isPending}
            >
              Finalizar Passagem
            </Button>
          )}
          {canAccept && (
            <Button
              onClick={() => acceptHandover.mutate(handover.id)}
              disabled={acceptHandover.isPending}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Aceitar Turno
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
