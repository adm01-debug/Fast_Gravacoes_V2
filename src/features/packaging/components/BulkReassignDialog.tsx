import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { usePackagingAssignees } from '../hooks/usePackagingAssignees';
import { packagingService } from '../services/packagingService';
import { logger } from '@/lib/logger';

interface BulkReassignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskIds: string[];
  title?: string;
  description?: string;
}

const ROLE_LABEL: Record<string, string> = {
  manager: 'Gestor',
  coordinator: 'Coordenador',
  operator: 'Operador',
};

export function BulkReassignDialog({
  open,
  onOpenChange,
  taskIds,
  title = 'Reatribuir tarefas',
  description,
}: BulkReassignDialogProps) {
  const [userId, setUserId] = useState<string>('');
  const { data: assignees, isLoading } = usePackagingAssignees();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => packagingService.bulkAssign(taskIds, userId),
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['packaging-tasks'] });
      toast.success(`${count} tarefa(s) reatribuída(s) com sucesso.`);
      setUserId('');
      onOpenChange(false);
    },
    onError: (error) => {
      logger.error('bulkAssign failed', error, 'BulkReassignDialog');
      toast.error('Falha ao reatribuir tarefas.');
    },
  });

  const disabled = !userId || taskIds.length === 0 || mutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description ??
              `Você está prestes a reatribuir ${taskIds.length} tarefa(s) com SLA vencido para um responsável. A ação sobrescreve o responsável atual.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="assignee">Responsável</Label>
          <Select value={userId} onValueChange={setUserId} disabled={isLoading}>
            <SelectTrigger id="assignee">
              <SelectValue placeholder={isLoading ? 'Carregando…' : 'Selecione um responsável'} />
            </SelectTrigger>
            <SelectContent>
              {(assignees ?? []).map((a) => (
                <SelectItem key={a.user_id} value={a.user_id}>
                  {a.full_name ?? 'Sem nome'} · {ROLE_LABEL[a.role] ?? a.role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={disabled}>
            {mutation.isPending ? 'Reatribuindo…' : `Reatribuir ${taskIds.length} tarefa(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
