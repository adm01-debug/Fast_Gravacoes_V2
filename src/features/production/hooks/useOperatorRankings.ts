import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';
import { useAuth } from '@/features/auth';

export interface OperatorRanking {
  operatorId: string;
  operatorName: string;
  position: number;
  totalPoints: number;
  totalProduced: number;
  efficiencyRate: number;
  qualityRate: number;
  rankingType: string;
  periodStart: string;
  periodEnd: string;
}

export function useOperatorRankings(rankingType: string = 'weekly') {
  const { user } = useAuth();
  const isAuthenticated = Boolean(user?.id);

  const { data: rankings, isLoading } = useQuery({
    queryKey: ['operator-rankings', rankingType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('operator_rankings')
        .select('*')
        .eq('ranking_type', rankingType)
        .order('position', { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
    enabled: isAuthenticated,
  });

  const { data: profiles } = useQuery({
    queryKey: ['profiles-for-rankings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url');

      if (error) throw error;
      return data ?? [];
    },
    enabled: isAuthenticated,
  });

  const enrichedRankings = useMemo((): OperatorRanking[] => {
    if (!rankings || !profiles) return [];

    return rankings.map(r => {
      const profile = profiles.find(p => p.id === r.operator_id);
      return {
        operatorId: r.operator_id,
        operatorName: profile?.full_name ?? 'Operador',
        position: r.position,
        totalPoints: r.total_points,
        totalProduced: r.total_produced,
        efficiencyRate: Number(r.efficiency_rate ?? 0),
        qualityRate: Number(r.quality_rate ?? 0),
        rankingType: r.ranking_type,
        periodStart: r.period_start,
        periodEnd: r.period_end,
      };
    });
  }, [rankings, profiles]);

  const topPerformers = useMemo(() => {
    return enrichedRankings.slice(0, 5);
  }, [enrichedRankings]);

  const getRankingByOperator = (operatorId: string) => {
    return enrichedRankings.find(r => r.operatorId === operatorId) ?? null;
  };

  return {
    rankings: enrichedRankings,
    topPerformers,
    getRankingByOperator,
    isLoading,
  };
}
