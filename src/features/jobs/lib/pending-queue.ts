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
