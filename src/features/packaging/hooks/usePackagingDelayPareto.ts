import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DELAY_CATEGORIES, type DelayCategory } from '../types/packaging.schema';

const LABEL_MAP: Record<string, string> = Object.fromEntries(
  DELAY_CATEGORIES.map((c) => [c.value, c.label]),
);

export interface DelayParetoBucket {
  category: string;
  label: string;
  count: number;
  cumulativePct: number;
}

export function usePackagingDelayPareto(days: number) {
  return useQuery({
    queryKey: ['packaging-delay-pareto', days],
    queryFn: async (): Promise<DelayParetoBucket[]> => {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const { data, error } = await supabase
        .from('packaging_tasks')
        .select('delay_category')
        .eq('was_overdue_on_complete', true)
        .gte('completed_at', since.toISOString())
        .not('delay_category', 'is', null);

      if (error) throw error;

      const counts = new Map<string, number>();
      for (const row of data ?? []) {
        const cat = (row as { delay_category: string | null }).delay_category ?? 'outro';
        counts.set(cat, (counts.get(cat) ?? 0) + 1);
      }

      const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
      const total = sorted.reduce((sum, [, c]) => sum + c, 0);

      let cumulative = 0;
      return sorted.map(([category, count]) => {
        cumulative += count;
        return {
          category,
          label: LABEL_MAP[category] ?? category,
          count,
          cumulativePct: total > 0 ? cumulative / total : 0,
        };
      });
    },
    staleTime: 60_000,
  });
}
