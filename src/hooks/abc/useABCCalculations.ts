import { useMemo, useCallback } from 'react';
import { ABCCostPool, ABCJobCost, JobCostSummary, TechniqueCostSummary } from './types';
import type { Database } from '@/integrations/supabase/types';

type Job = Database['public']['Tables']['jobs']['Row'];
type Technique = Database['public']['Tables']['techniques']['Row'];

interface UseABCCalculationsProps {
  costPools: ABCCostPool[];
  jobCosts: ABCJobCost[];
  jobs: Job[];
  techniques: Technique[];
}

export function useABCCalculations({ costPools, jobCosts, jobs, techniques }: UseABCCalculationsProps) {
  // Calculate job cost summary
  const getJobCostSummary = useCallback((jobId: string): JobCostSummary | null => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return null;

    const costs = jobCosts.filter(jc => jc.job_id === jobId);
    const totalCost = costs.reduce((sum, c) => sum + Number(c.total_cost), 0);

    const costByPool = costPools.map(pool => {
      const poolCosts = costs.filter(c => c.cost_pool_id === pool.id);
      const amount = poolCosts.reduce((sum, c) => sum + Number(c.total_cost), 0);
      return {
        pool_type: pool.pool_type,
        pool_name: pool.name,
        amount,
        percentage: totalCost > 0 ? (amount / totalCost) * 100 : 0,
      };
    }).filter(p => p.amount > 0);

    return {
      job_id: job.id,
      order_number: job.order_number,
      client: job.client,
      product: job.product,
      technique_id: job.technique_id,
      quantity: job.quantity,
      total_cost: totalCost,
      unit_cost: job.quantity > 0 ? totalCost / job.quantity : 0,
      cost_breakdown: costByPool,
    };
  }, [costPools, jobCosts, jobs]);

  // Calculate technique cost summary
  const getTechniqueCostSummary = useCallback((): TechniqueCostSummary[] => {
    return techniques.map(technique => {
      const techniqueJobs = jobs.filter(j => j.technique_id === technique.id);
      const techniqueJobIds = techniqueJobs.map(j => j.id);
      const techniqueCosts = jobCosts.filter(jc => techniqueJobIds.includes(jc.job_id));

      const totalCost = techniqueCosts.reduce((sum, c) => sum + Number(c.total_cost), 0);
      // Null produced_quantity means "not recorded" — not "fully produced".
      const totalQuantity = techniqueJobs.reduce((sum, j) => sum + (j.produced_quantity ?? 0), 0);

      const costByPool = costPools.map(pool => {
        const poolCosts = techniqueCosts.filter(c => c.cost_pool_id === pool.id);
        const amount = poolCosts.reduce((sum, c) => sum + Number(c.total_cost), 0);
        return {
          pool_type: pool.pool_type,
          amount,
          percentage: totalCost > 0 ? (amount / totalCost) * 100 : 0,
        };
      }).filter(p => p.amount > 0);

      return {
        technique_id: technique.id,
        technique_name: technique.name,
        total_jobs: techniqueJobs.length,
        total_quantity: totalQuantity,
        total_cost: totalCost,
        avg_unit_cost: totalQuantity > 0 ? totalCost / totalQuantity : 0,
        cost_by_pool: costByPool,
      };
    }).filter(t => t.total_jobs > 0);
  }, [costPools, jobCosts, jobs, techniques]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalBudget = costPools.reduce((sum, p) => sum + Number(p.monthly_budget), 0);
    const totalAllocatedCost = jobCosts.reduce((sum, c) => sum + Number(c.total_cost), 0);
    const totalPiecesProduced = jobs.reduce((sum, j) => sum + (j.produced_quantity ?? 0), 0);
    const averageUnitCost = totalPiecesProduced > 0 ? totalAllocatedCost / totalPiecesProduced : 0;

    return {
      totalBudget,
      totalAllocatedCost,
      averageUnitCost,
    };
  }, [costPools, jobCosts, jobs]);

  return {
    getJobCostSummary,
    getTechniqueCostSummary,
    ...totals,
  };
}
