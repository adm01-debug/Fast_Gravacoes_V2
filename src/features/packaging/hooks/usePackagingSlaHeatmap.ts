import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { computeSla, type PackagingSettings } from './usePackagingSettings';

export interface HeatmapCell {
  weekday: number; // 0..6 (0 = Domingo)
  hour: number; // 0..23
  total: number;
  overdue: number;
  warning: number;
  breachRate: number; // 0..1
}

export interface SlaHeatmapData {
  cells: HeatmapCell[];
  maxOverdue: number;
  totalOverdue: number;
  totalTasks: number;
  peakLabel: string | null;
}

type UntypedSupabase = {
  from: (t: string) => {
    select: (cols?: string) => {
      gte: (col: string, v: string) => Promise<{ data: unknown[] | null; error: unknown }>;
    };
  };
};

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function usePackagingSlaHeatmap(settings: PackagingSettings | undefined, days = 30) {
  return useQuery<SlaHeatmapData>({
    enabled: !!settings,
    queryKey: ['packaging-sla-heatmap', days, settings?.id ?? 'defaults'],
    queryFn: async () => {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const db = supabase as unknown as UntypedSupabase;
      const { data, error } = await db
        .from('packaging_tasks')
        .select('id,status,created_at,started_at,completed_at')
        .gte('created_at', since);
      if (error) throw error;

      const tasks = (data ?? []) as Array<{
        id: string;
        status: string;
        created_at: string;
        started_at: string | null;
        completed_at: string | null;
      }>;

      const grid = new Map<string, HeatmapCell>();
      for (let d = 0; d < 7; d++) {
        for (let h = 0; h < 24; h++) {
          grid.set(`${d}-${h}`, { weekday: d, hour: h, total: 0, overdue: 0, warning: 0, breachRate: 0 });
        }
      }

      let totalOverdue = 0;
      let maxOverdue = 0;
      let peakCell: HeatmapCell | null = null;

      for (const t of tasks) {
        const ref = new Date(t.created_at);
        const key = `${ref.getDay()}-${ref.getHours()}`;
        const cell = grid.get(key);
        if (!cell) continue;
        cell.total += 1;
        const sla = computeSla(t, settings as PackagingSettings);
        if (sla.level === 'overdue') {
          cell.overdue += 1;
          totalOverdue += 1;
        } else if (sla.level === 'warning') {
          cell.warning += 1;
        }
        if (cell.overdue > maxOverdue) {
          maxOverdue = cell.overdue;
          peakCell = cell;
        }
      }

      const cells = Array.from(grid.values()).map((c) => ({
        ...c,
        breachRate: c.total > 0 ? c.overdue / c.total : 0,
      }));

      const peakLabel = peakCell && peakCell.overdue > 0
        ? `${WEEKDAY_LABELS[peakCell.weekday]} · ${String(peakCell.hour).padStart(2, '0')}h (${peakCell.overdue})`
        : null;

      return { cells, maxOverdue, totalOverdue, totalTasks: tasks.length, peakLabel };
    },
    staleTime: 60_000,
  });
}

export const HEATMAP_WEEKDAYS = WEEKDAY_LABELS;
