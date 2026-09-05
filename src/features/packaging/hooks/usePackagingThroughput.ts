import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OperatorThroughput {
  operatorId: string;
  operatorName: string;
  tasksCompleted: number;
  piecesApproved: number;
  piecesRejected: number;
  avgCycleMinutes: number | null;
  rejectionRate: number; // 0..1
}

type UntypedSupabase = {
  from: (t: string) => {
    select: (cols?: string) => {
      gte: (col: string, v: string) => {
        not: (col: string, op: string, v: unknown) => Promise<{ data: unknown[] | null; error: unknown }>;
      };
      in: (col: string, v: string[]) => Promise<{ data: unknown[] | null; error: unknown }>;
    };
  };
};

export function usePackagingThroughput(days = 30) {
  return useQuery<OperatorThroughput[]>({
    queryKey: ['packaging-throughput', days],
    queryFn: async () => {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const db = supabase as unknown as UntypedSupabase;

      const tasksRes = await db
        .from('packaging_tasks')
        .select('id,assigned_to,approved_quantity,rejected_quantity,started_at,completed_at,status')
        .gte('completed_at', since)
        .not('assigned_to', 'is', null);

      if (tasksRes.error) throw tasksRes.error;
      const tasks = (tasksRes.data ?? []) as Array<{
        id: string;
        assigned_to: string | null;
        approved_quantity: number | null;
        rejected_quantity: number | null;
        started_at: string | null;
        completed_at: string | null;
        status: string;
      }>;

      const byOp = new Map<string, {
        tasks: number;
        approved: number;
        rejected: number;
        cycleSum: number;
        cycleCount: number;
      }>();

      for (const t of tasks) {
        if (!t.assigned_to || t.status !== 'ready_to_ship') continue;
        const cur = byOp.get(t.assigned_to) ?? { tasks: 0, approved: 0, rejected: 0, cycleSum: 0, cycleCount: 0 };
        cur.tasks += 1;
        cur.approved += t.approved_quantity ?? 0;
        cur.rejected += t.rejected_quantity ?? 0;
        if (t.started_at && t.completed_at) {
          const diff = (new Date(t.completed_at).getTime() - new Date(t.started_at).getTime()) / 60000;
          if (diff > 0 && diff < 24 * 60) {
            cur.cycleSum += diff;
            cur.cycleCount += 1;
          }
        }
        byOp.set(t.assigned_to, cur);
      }

      const ids = Array.from(byOp.keys());
      const nameMap = new Map<string, string>();
      if (ids.length > 0) {
        const profRes = await db.from('profiles').select('id,full_name').in('id', ids);
        if (!profRes.error) {
          for (const p of (profRes.data ?? []) as Array<{ id: string; full_name: string | null }>) {
            nameMap.set(p.id, p.full_name ?? 'Operador');
          }
        }
      }

      return Array.from(byOp.entries())
        .map(([operatorId, v]) => {
          const total = v.approved + v.rejected;
          return {
            operatorId,
            operatorName: nameMap.get(operatorId) ?? 'Operador',
            tasksCompleted: v.tasks,
            piecesApproved: v.approved,
            piecesRejected: v.rejected,
            avgCycleMinutes: v.cycleCount > 0 ? v.cycleSum / v.cycleCount : null,
            rejectionRate: total > 0 ? v.rejected / total : 0,
          };
        })
        .sort((a, b) => b.piecesApproved - a.piecesApproved);
    },
    staleTime: 60_000,
  });
}
