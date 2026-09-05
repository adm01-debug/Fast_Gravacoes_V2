import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DEFECT_TYPE_LABELS, type PackagingDefectType } from '../types/packaging.schema';

export interface QualityKPIs {
  totalReceived: number;
  totalApproved: number;
  totalRejected: number;
  rejectionRate: number; // 0..1
  reworkCount: number;
  discardCount: number;
  criticalCount: number;
  tasksCompleted: number;
  paretoDefects: { type: string; label: string; count: number; cumulativePct: number }[];
  daily: { date: string; received: number; rejected: number }[];
}

// Untyped handle: novas tabelas ainda não estão nos types gerados.
type UntypedSupabase = {
  from: (t: string) => {
    select: (cols?: string) => {
      gte: (col: string, v: string) => Promise<{ data: unknown[] | null; error: unknown }>;
    };
  };
};
const db = supabase as unknown as UntypedSupabase;

export function usePackagingQuality(days = 30) {
  return useQuery<QualityKPIs>({
    queryKey: ['packaging-quality', days],
    queryFn: async () => {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      const [tasksRes, defectsRes] = await Promise.all([
        db.from('packaging_tasks').select('id,status,received_quantity,approved_quantity,rejected_quantity,completed_at,created_at').gte('created_at', since),
        db.from('packaging_defects').select('id,defect_type,severity,decision,quantity,created_at').gte('created_at', since),
      ]);

      if (tasksRes.error) throw tasksRes.error;
      if (defectsRes.error) throw defectsRes.error;

      const tasks = (tasksRes.data ?? []) as Array<{
        id: string; status: string; received_quantity: number | null;
        approved_quantity: number | null; rejected_quantity: number | null;
        completed_at: string | null; created_at: string;
      }>;
      const defects = (defectsRes.data ?? []) as Array<{
        id: string; defect_type: string; severity: string; decision: string;
        quantity: number; created_at: string;
      }>;

      const totalReceived = tasks.reduce((s, t) => s + (t.received_quantity ?? 0), 0);
      const totalApproved = tasks.reduce((s, t) => s + (t.approved_quantity ?? 0), 0);
      const totalRejected = tasks.reduce((s, t) => s + (t.rejected_quantity ?? 0), 0);
      const tasksCompleted = tasks.filter(t => t.status === 'ready_to_ship').length;

      const reworkCount = defects.filter(d => d.decision === 'rework').reduce((s, d) => s + d.quantity, 0);
      const discardCount = defects.filter(d => d.decision === 'discard').reduce((s, d) => s + d.quantity, 0);
      const criticalCount = defects.filter(d => d.severity === 'critical').reduce((s, d) => s + d.quantity, 0);

      // Pareto por tipo de defeito
      const byType = new Map<string, number>();
      for (const d of defects) {
        byType.set(d.defect_type, (byType.get(d.defect_type) ?? 0) + d.quantity);
      }
      const sortedTypes = Array.from(byType.entries()).sort((a, b) => b[1] - a[1]);
      const totalDefectQty = sortedTypes.reduce((s, [, q]) => s + q, 0) || 1;
      let running = 0;
      const paretoDefects = sortedTypes.map(([type, count]) => {
        running += count;
        return {
          type,
          label: DEFECT_TYPE_LABELS[type as PackagingDefectType] ?? type,
          count,
          cumulativePct: running / totalDefectQty,
        };
      });

      // Série diária
      const dailyMap = new Map<string, { received: number; rejected: number }>();
      for (const t of tasks) {
        const key = t.created_at.slice(0, 10);
        const cur = dailyMap.get(key) ?? { received: 0, rejected: 0 };
        cur.received += t.received_quantity ?? 0;
        cur.rejected += t.rejected_quantity ?? 0;
        dailyMap.set(key, cur);
      }
      const daily = Array.from(dailyMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, v]) => ({ date, ...v }));

      return {
        totalReceived,
        totalApproved,
        totalRejected,
        rejectionRate: totalReceived > 0 ? totalRejected / totalReceived : 0,
        reworkCount,
        discardCount,
        criticalCount,
        tasksCompleted,
        paretoDefects,
        daily,
      };
    },
    staleTime: 60_000,
  });
}
