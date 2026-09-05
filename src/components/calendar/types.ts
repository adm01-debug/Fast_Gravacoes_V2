import { JobStatus } from '@/types/scheduling';

export const statusColors: Record<JobStatus, string> = {
  queue: 'bg-status-queue/20 border-status-queue text-status-queue',
  ready: 'bg-status-ready/20 border-status-ready text-status-ready',
  scheduled: 'bg-status-scheduled/20 border-status-scheduled text-status-scheduled',
  production: 'bg-status-production/20 border-status-production text-status-production',
  finished: 'bg-status-finished/20 border-status-finished text-status-finished',
  paused: 'bg-status-paused/20 border-status-paused text-status-paused',
  cancelled: 'bg-status-cancelled/20 border-status-cancelled text-status-cancelled',
  delayed: 'bg-status-delayed/20 border-status-delayed text-status-delayed',
  rework: 'bg-status-rework/20 border-status-rework text-status-rework',
  buffer: 'bg-indigo-500/20 border-indigo-500 text-indigo-500',
  packaging: 'bg-cyan-500/20 border-cyan-500 text-cyan-500',
};

export const statusColorsSolid: Record<JobStatus, string> = {
  queue: 'bg-status-queue/80 border-status-queue',
  ready: 'bg-status-ready/80 border-status-ready',
  scheduled: 'bg-status-scheduled/80 border-status-scheduled',
  production: 'bg-status-production/80 border-status-production',
  finished: 'bg-status-finished/80 border-status-finished',
  paused: 'bg-status-paused/80 border-status-paused',
  cancelled: 'bg-status-cancelled/80 border-status-cancelled',
  delayed: 'bg-status-delayed/80 border-status-delayed',
  rework: 'bg-status-rework/80 border-status-rework',
  buffer: 'bg-indigo-500/80 border-indigo-500',
  packaging: 'bg-cyan-500/80 border-cyan-500',
};

export const statusLabels: Record<JobStatus, string> = {
  queue: 'Na Fila',
  ready: 'No Jeito',
  scheduled: 'Agendado',
  production: 'Em Produção',
  finished: 'Finalizado',
  paused: 'Pausado',
  cancelled: 'Cancelado',
  delayed: 'Atrasado',
  rework: 'Retrabalho',
  buffer: 'Buffer',
  packaging: 'Embalagem',
};

export const PRIORITY_LABELS: Record<string, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  urgent: 'Urgente',
};

export interface CalendarFilterState {
  techniques: string[];
  machines: string[];
  statuses: string[];
  priorities: string[];
  clients: string[];
  onlyDelayed: boolean;
  onlyInProduction: boolean;
  searchQuery: string;
}

export const EMPTY_FILTERS: CalendarFilterState = {
  techniques: [],
  machines: [],
  statuses: [],
  priorities: [],
  clients: [],
  onlyDelayed: false,
  onlyInProduction: false,
  searchQuery: '',
};

// E11 — Zoom temporal
export type CalendarZoomLevel = 15 | 30 | 60 | 120;
export const ZOOM_LABELS: Record<CalendarZoomLevel, string> = {
  15: '15 min',
  30: '30 min',
  60: '1 h',
  120: '2 h',
};

// E7/E8 — Agrupamento
export type CalendarGroupBy = 'machine' | 'technique';

// E9/E10 — Overlays
export interface CalendarOverlays {
  showHeatmap: boolean;
  showActualVsPlanned: boolean;
}

export const EMPTY_OVERLAYS: CalendarOverlays = {
  showHeatmap: false,
  showActualVsPlanned: false,
};

// E9 — Heatmap thresholds
export function getOccupancyColor(rate: number): string {
  if (rate < 0.5) return 'hsl(var(--status-finished) / 0.18)';
  if (rate < 0.8) return 'hsl(var(--status-delayed) / 0.20)';
  return 'hsl(var(--destructive) / 0.22)';
}

export function getOccupancyLabel(rate: number): string {
  if (rate < 0.5) return 'Baixa';
  if (rate < 0.8) return 'Média';
  return 'Alta';
}
