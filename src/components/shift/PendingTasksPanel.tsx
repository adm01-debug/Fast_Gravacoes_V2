import { useState } from 'react';
import { format } from 'date-fns';
import {
  ListTodo,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Filter,
  MoreHorizontal
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useShiftPendingTasks, useShiftHandoverMutations, ShiftPendingTask } from '@/hooks/useShiftHandover';

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  low: { label: 'Baixa', color: 'text-slate-600', bgColor: 'bg-slate-100' },
  medium: { label: 'Média', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  high: { label: 'Alta', color: 'text-warning', bgColor: 'bg-warning' },
  critical: { label: 'Crítica', color: 'text-red-600', bgColor: 'bg-red-100' }
};

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Clock }> = {
  pending: { label: 'Pendente', icon: Clock },
  in_progress: { label: 'Em andamento', icon: ListTodo },
  completed: { label: 'Concluída', icon: CheckCircle2 },
  cancelled: { label: 'Cancelada', icon: AlertTriangle }
};

export default function PendingTasksPanel() {
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [showAll, setShowAll] = useState(false);

  const { data: tasks, isLoading } = useShiftPendingTasks(undefined, showAll);
  const { updatePendingTask } = useShiftHandoverMutations();

  const filteredTasks = tasks?.filter(task => {
    if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
    if (statusFilter === 'active' && (task.status === 'completed' || task.status === 'cancelled')) return false;
    if (statusFilter !== 'all' && statusFilter !== 'active' && task.status !== statusFilter) return false;
    return true;
  });

  const stats = {
    total: tasks?.length || 0,
    pending: tasks?.filter(t => t.status === 'pending').length || 0,
    critical: tasks?.filter(t => t.priority === 'critical' && t.status !== 'completed').length || 0,
    completed: tasks?.filter(t => t.status === 'completed').length || 0
  };

  const handleStatusChange = (task: ShiftPendingTask, newStatus: string) => {
    updatePendingTask.mutate({
      id: task.id,
      status: newStatus as ShiftPendingTask['status']
    });
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <ListTodo className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-warning" />
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-2xl font-bold">{stats.critical}</p>
                <p className="text-xs text-muted-foreground">Críticas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.completed}</p>
                <p className="text-xs text-muted-foreground">Concluídas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtros:</span>
            </div>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="critical">Crítica</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="low">Baixa</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativas</SelectItem>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="in_progress">Em andamento</SelectItem>
                <SelectItem value="completed">Concluídas</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? 'Mostrar ativas' : 'Mostrar todas'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tasks List */}
      <Card>
        <CardHeader>
          <CardTitle>Pendências</CardTitle>
          <CardDescription>
            Tarefas pendentes entre passagens de turno
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array(5).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : filteredTasks && filteredTasks.length > 0 ? (
            <div className="space-y-3">
              {filteredTasks.map((task) => {
                const priorityConfig = PRIORITY_CONFIG[task.priority];
                const StatusIcon = STATUS_CONFIG[task.status]?.icon || Clock;

                return (
                  <div
                    key={task.id}
                    className={`p-4 rounded-lg border ${
                      task.status === 'completed' ? 'opacity-60' : ''
                    } ${
                      task.priority === 'critical' ? 'border-destructive/50 bg-destructive/5' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${priorityConfig.bgColor}`}>
                          <StatusIcon className={`h-4 w-4 ${priorityConfig.color}`} />
                        </div>
                        <div>
                          <h4 className={`font-medium ${
                            task.status === 'completed' ? 'line-through' : ''
                          }`}>
                            {task.title}
                          </h4>
                          {task.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {task.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <Badge
                              variant="outline"
                              className={`${priorityConfig.color} text-xs`}
                            >
                              {priorityConfig.label}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {STATUS_CONFIG[task.status]?.label}
                            </Badge>
                            {task.machine && (
                              <span className="text-xs text-muted-foreground">
                                📍 {task.machine.name}
                              </span>
                            )}
                            {task.job && (
                              <span className="text-xs text-muted-foreground">
                                📦 {task.job.order_number}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            Criado em {format(new Date(task.created_at), "dd/MM/yyyy 'às' HH:mm")}
                          </p>
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {task.status === 'pending' && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(task, 'in_progress')}
                            >
                              <Clock className="h-4 w-4 mr-2" />
                              Iniciar
                            </DropdownMenuItem>
                          )}
                          {task.status !== 'completed' && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(task, 'completed')}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Concluir
                            </DropdownMenuItem>
                          )}
                          {task.status !== 'cancelled' && task.status !== 'completed' && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(task, 'cancelled')}
                              className="text-destructive"
                            >
                              <AlertTriangle className="h-4 w-4 mr-2" />
                              Cancelar
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <ListTodo className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg">Nenhuma pendência encontrada</h3>
              <p className="text-muted-foreground">
                Não há pendências para os filtros selecionados
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
