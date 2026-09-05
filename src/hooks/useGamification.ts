import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth';

export interface Achievement {
  id: string;
  operator_id: string;
  achievement_type: string;
  achievement_name: string;
  description: string | null;
  icon: string;
  points: number;
  achieved_at: string;
  period_start?: string;
  period_end?: string;
}

export interface OperatorRanking {
  id: string;
  operator_id: string;
  ranking_type: string;
  position: number;
  total_points: number;
  total_produced: number;
  efficiency_rate: number | null;
  quality_rate: number | null;
  period_start: string;
  period_end: string;
  calculated_at: string;
  profile?: { full_name: string | null; avatar_url?: string | null };
  level?: number;
  xp_progress?: number;
  xp_target?: number;
}

export interface Reward {
  id: string;
  name: string;
  description: string;
  cost_points: number;
  icon: string;
  color_class: string;
  stock: number;
}

export function useGamification(period: 'daily' | 'weekly' | 'monthly' = 'weekly') {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAuthenticated = Boolean(user?.id);
  const now = new Date();

  let periodStart: Date;
  let periodEnd: Date;

  if (period === 'daily') {
    periodStart = startOfDay(now);
    periodEnd = endOfDay(now);
  } else if (period === 'weekly') {
    periodStart = startOfWeek(now, { weekStartsOn: 1 });
    periodEnd = endOfWeek(now, { weekStartsOn: 1 });
  } else {
    periodStart = startOfMonth(now);
    periodEnd = endOfMonth(now);
  }

  // Fetch rankings from database (persisted)
  const rankingsQuery = useQuery({
    queryKey: ['operator-rankings', period],
    queryFn: async () => {
      // First try to get persisted rankings
      const { data: rankings, error } = await supabase
        .from('operator_rankings')
        .select('*')
        .eq('ranking_type', period)
        .gte('period_start', periodStart.toISOString())
        .lte('period_end', periodEnd.toISOString())
        .order('position', { ascending: true });

      if (error) throw error;

      // Get profiles for operator names
      const operatorIds = rankings?.map(r => r.operator_id) || [];

      if (operatorIds.length === 0) {
        // No persisted rankings, calculate on the fly
        return await calculateRankingsLocally(periodStart, periodEnd, period);
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', operatorIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return rankings?.map(r => {
        const profile = profileMap.get(r.operator_id) || { full_name: `Operador ${r.position}`, avatar_url: null };
        const levelInfo = calculateLevelInfo(r.total_points);
        return {
          ...r,
          profile,
          ...levelInfo,
        };
      }) as OperatorRanking[];
    },
    enabled: isAuthenticated,
    staleTime: 60000,
  });

  // Fetch achievements
  const achievementsQuery = useQuery({
    queryKey: ['operator-achievements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('operator_achievements')
        .select('*')
        .order('achieved_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as Achievement[];
    },
    enabled: isAuthenticated,
    staleTime: 60000,
  });

  // Mutation to trigger ranking calculation
  const calculateRankingsMutation = useMutation({
    mutationFn: async (rankingType: 'daily' | 'weekly' | 'monthly') => {
      const { data, error } = await supabase.functions.invoke('calculate-rankings', {
        body: { ranking_type: rankingType },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Rankings ${period} calculados: ${data.rankings_count} operadores`);
      queryClient.invalidateQueries({ queryKey: ['operator-rankings'] });
      queryClient.invalidateQueries({ queryKey: ['operator-achievements'] });
    },
    onError: (error) => {
      toast.error('Erro ao calcular rankings');
    },
  });

  // Fetch rewards store
  const rewardsQuery = useQuery({
    queryKey: ['gamification-rewards'],
    queryFn: async () => {
      const { data, error } = await supabase.from('gamification_rewards').select('*').eq('is_active', true);
      if (error) throw error;
      return data as Reward[];
    },
    enabled: isAuthenticated,
    staleTime: 300000,
  });

  // Calculate user balance
  const balanceQuery = useQuery({
    queryKey: ['user-points-balance', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return 0;

      // Points from achievements (the source of truth for earned points)
      const { data: achievements } = await supabase
        .from('operator_achievements')
        .select('points')
        .eq('operator_id', user.id);

      const earned = (achievements || []).reduce((sum, a) => sum + a.points, 0);

      // Deduct redemptions
      const { data: redemptions } = await supabase
        .from('reward_redemptions')
        .select('points_spent')
        .eq('user_id', user.id)
        .neq('status', 'cancelled');

      const spent = (redemptions || []).reduce((sum, r) => sum + r.points_spent, 0);

      return Math.max(0, earned - spent);
    },
    staleTime: 30000,
  });

  // Fetch redemptions history
  const redemptionsQuery = useQuery({
    queryKey: ['reward-redemptions', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('reward_redemptions')
        .select('*, reward:gamification_rewards(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    staleTime: 60000,
  });

  // Redemption mutation
  const redeemReward = useMutation({
    mutationFn: async (reward: Reward) => {
      if (!user?.id) {
        throw new Error('Usuário não autenticado.');
      }

      // Verify current balance to prevent over-redemption
      const { data: achievements } = await supabase
        .from('operator_achievements')
        .select('points')
        .eq('operator_id', user.id);
      const earned = (achievements || []).reduce((s: number, a: { points: number }) => s + a.points, 0);

      const { data: existingRedemptions } = await supabase
        .from('reward_redemptions')
        .select('points_spent')
        .eq('user_id', user.id)
        .neq('status', 'cancelled');
      const spent = (existingRedemptions || []).reduce((s: number, r: { points_spent: number }) => s + r.points_spent, 0);

      const currentBalance = Math.max(0, earned - spent);
      if (currentBalance < reward.cost_points) {
        throw new Error(`Saldo insuficiente. Você tem ${currentBalance} pontos, mas este resgate custa ${reward.cost_points}.`);
      }

      if (reward.stock !== undefined && reward.stock <= 0) {
        throw new Error('Este prêmio está esgotado.');
      }

      const { error } = await supabase.from('reward_redemptions').insert({
        user_id: user.id,
        reward_id: reward.id,
        points_spent: reward.cost_points,
        status: 'pending'
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-points-balance'] });
      toast.success('Resgate solicitado com sucesso! Aguardando aprovação.');
    },
    onError: () => toast.error('Erro ao solicitar resgate. Tente novamente.'),
  });

  return {
    rankings: rankingsQuery.data || [],
    achievements: achievementsQuery.data || [],
    rewards: rewardsQuery.data || [],
    balance: balanceQuery.data || 0,
    isLoading: rankingsQuery.isLoading || achievementsQuery.isLoading || rewardsQuery.isLoading,
    periodStart,
    periodEnd,
    calculateRankings: () => calculateRankingsMutation.mutate(period),
    isCalculating: calculateRankingsMutation.isPending,
    redeemReward,
    redemptionsQuery
  };
}

// Local calculation fallback when no persisted rankings exist
async function calculateRankingsLocally(
  periodStart: Date,
  periodEnd: Date,
  period: string
): Promise<OperatorRanking[]> {
  const { data: jobs } = await supabase
    .from('jobs')
    .select('*')
    .eq('status', 'finished')
    .gte('actual_end_time', periodStart.toISOString())
    .lte('actual_end_time', periodEnd.toISOString());

  const { data: assignments } = await supabase
    .from('operator_machines')
    .select('operator_id, machine_id');

  const { data: profiles } = await supabase.from('profiles').select('id, full_name, avatar_url');

  // Build machine to operator map
  const machineToOperator: Record<string, string> = {};
  (assignments || []).forEach((a) => {
    machineToOperator[a.machine_id] = a.operator_id;
  });

  // Aggregate stats by operator
  const operatorStats: Record<string, { produced: number; quantity: number; lost: number; jobs: number }> = {};

  (jobs || []).forEach(job => {
    if (!job.machine_id) return;
    const operatorId = machineToOperator[job.machine_id];
    if (!operatorId) return;

    if (!operatorStats[operatorId]) {
      operatorStats[operatorId] = { produced: 0, quantity: 0, lost: 0, jobs: 0 };
    }
    operatorStats[operatorId].produced += job.produced_quantity || 0;
    operatorStats[operatorId].quantity += job.quantity || 0;
    operatorStats[operatorId].lost += job.lost_pieces || 0;
    operatorStats[operatorId].jobs += 1;
  });

  const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

  const rankings: OperatorRanking[] = Object.entries(operatorStats)
    .map(([id, stats]) => {
      const efficiency = stats.quantity > 0 ? (stats.produced / stats.quantity) * 100 : 0;
      const quality = (stats.produced + stats.lost) > 0
        ? (stats.produced / (stats.produced + stats.lost)) * 100
        : 100;

      const points = Math.round(stats.produced + efficiency * 10 + quality * 5 + stats.jobs * 2);

      return {
        id: crypto.randomUUID(),
        operator_id: id,
        ranking_type: period,
        position: 0,
        total_points: points,
        total_produced: stats.produced,
        efficiency_rate: Math.round(efficiency * 100) / 100,
        quality_rate: Math.round(quality * 100) / 100,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        calculated_at: new Date().toISOString(),
        profile: profileMap.get(id) || { full_name: `Operador`, avatar_url: null },
        ...calculateLevelInfo(points),
      };
    })
    .sort((a, b) => b.total_points - a.total_points)
    .map((r, i) => ({ ...r, position: i + 1 }));

  return rankings;
}

function calculateLevelInfo(points: number) {
  const level = Math.floor(points / 1000) + 1;
  const xp_progress = points % 1000;
  const xp_target = 1000;
  return { level, xp_progress, xp_target };
}
