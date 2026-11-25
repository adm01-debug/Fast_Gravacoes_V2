import { isAfter, subHours } from 'date-fns';
import type { Job } from '../services/jobsService';
import type { JobStatus } from '@/types/scheduling';

export type SortField = 'orderNumber' | 'client' | 'scheduledDate' | 'priority' | 'quantity' | 'created_at';
export type SortDirection = 'asc' | 'desc';

export const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 } as const;

export const priorityColors = {
  urgent: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-green-500/20 text-green-400 border-green-500/30'
} as const;

export const priorityLabels = {
  urgent: 'Urgente',
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa'
} as const;

export const pendingStatuses: JobStatus[] = ['queue', 'ready', 'scheduled', 'delayed', 'rework'];

/** Job 'ready' sem atualização há >4h é considerado estagnado. */
export function isJobStuck(job: Job): boolean {
  if (job.status !== 'ready') return false;
  const now = new Date();
  const stuckThreshold = subHours(now, 4);
  return isAfter(stuckThreshold, new Date(job.updated_at));
}

const DELETE_ALLOWED_STATUSES: readonly string[] = ['queue', 'scheduled', 'cancelled'];

/**
 * Espelha o trigger trg_validate_job_delete_allowed (etapa 036): a exclusão só é
 * permitida sem produção registrada e com a OS em fila, agendada ou cancelada.
 * Devolve o motivo do impedimento, ou null quando a OS pode ser apagada.
 */
export function bulkDeleteBlocker(
  job: Pick<Job, 'produced_quantity' | 'lost_pieces' | 'status'>
): string | null {
  const produced = Number(job.produced_quantity ?? 0);
  const lost = Number(job.lost_pieces ?? 0);
  if (produced > 0 || lost > 0) {
    return `${produced} peça(s) produzida(s) e ${lost} perdida(s) já registradas`;
  }
  if (!DELETE_ALLOWED_STATUSES.includes(String(job.status))) {
    return `status "${job.status}" não permite exclusão`;
  }
  return null;
}
