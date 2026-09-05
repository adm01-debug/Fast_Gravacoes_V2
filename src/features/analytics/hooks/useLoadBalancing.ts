 
import { useMemo } from 'react';
import { useJobs, useTechniques, DbJob, DbMachine, DbTechnique } from '@/features/jobs';
import { useMachines } from '@/features/production';
import { useBusinessConfig } from '@/features/admin';
import { format } from 'date-fns';
import { MachineLoad, LoadBalancingSuggestion, TechniqueLoadSummary } from '../types';

// Data validation helpers
function isValidJob(job: DbJob): boolean {
  return (
    typeof job.id === 'string' && job.id.length > 0 &&
    typeof job.estimated_duration === 'number' && job.estimated_duration >= 0 &&
    typeof job.status === 'string'
  );
}

function isValidMachine(machine: DbMachine): boolean {
  return (
    typeof machine.id === 'string' && machine.id.length > 0 &&
    typeof machine.technique_id === 'string'
  );
}

function sanitizeNumber(value: unknown, fallback = 0): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(0, value);
}

function clampPercentage(value: number): number {
  return Math.min(100, Math.max(0, value));
}

// DAILY_CAPACITY_MINUTES is now derived inside the hook from business_config


export function useLoadBalancing(targetDate?: Date) {
  const { data: jobs } = useJobs();
  const { data: machines } = useMachines();
  const { data: techniques } = useTechniques();
  const { getConfig, isLoading: configLoading } = useBusinessConfig();

  const DAILY_CAPACITY_MINUTES = useMemo(() => {
    const hours = getConfig('operating_hours', { start: '07:00', end: '18:00' });
    const startParts = (hours.start || '07:00').split(':');
    const endParts = (hours.end || '18:00').split(':');
    const startMin = parseInt(startParts[0], 10) * 60 + parseInt(startParts[1], 10);
    const endMin = parseInt(endParts[0], 10) * 60 + parseInt(endParts[1], 10);
    return Math.max(60, endMin - startMin);
  }, [getConfig]);

  const analysis = useMemo(() => {
    if (!jobs || !machines || !techniques || configLoading) {
      return { byTechnique: [], suggestions: [], isLoading: true };
    }

    // Validate input data
    const validJobs = jobs.filter(isValidJob);
    const validMachines = machines.filter(isValidMachine);
    const validTechniques = techniques.filter(t =>
      typeof t.id === 'string' && typeof t.name === 'string'
    );

    const date = targetDate || new Date();
    const dateStr = format(date, 'yyyy-MM-dd');

    // Calculate load per machine
    const machineLoads = new Map<string, MachineLoad>();

    validMachines.forEach(machine => {
      const technique = validTechniques.find(t => t.id === machine.technique_id);
      if (!technique) return;

      machineLoads.set(machine.id, {
        machine,
        technique,
        scheduledMinutes: 0,
        availableMinutes: DAILY_CAPACITY_MINUTES as number,
        occupancyRate: 0,
        jobCount: 0,
        jobs: []
      });
    });

    // Assign jobs to machines with validation
    validJobs.forEach(job => {
      if (!job.machine_id || !job.scheduled_date) return;
      if (['finished', 'cancelled'].includes(job.status)) return;

      const jobDate = job.scheduled_date;
      if (jobDate !== dateStr) return;

      const load = machineLoads.get(job.machine_id);
      if (!load) return;

      load.scheduledMinutes += sanitizeNumber(job.estimated_duration);
      load.jobCount++;
      load.jobs.push(job);
    });

    // Calculate occupancy rates with clamping
    machineLoads.forEach(load => {
      load.occupancyRate = clampPercentage((load.scheduledMinutes / (DAILY_CAPACITY_MINUTES as number)) * 100);
      load.availableMinutes = Math.max(0, (DAILY_CAPACITY_MINUTES as number) - load.scheduledMinutes);
    });

    // Group by technique and find imbalances
    const techniqueMap = new Map<string, TechniqueLoadSummary>();

    validTechniques.forEach(technique => {
      const techniqueMachines = Array.from(machineLoads.values())
        .filter(l => l.technique.id === technique.id);

      if (techniqueMachines.length === 0) return;

      const occupancies = techniqueMachines.map(m => m.occupancyRate);
      const avgOccupancy = occupancies.reduce((a, b) => a + b, 0) / occupancies.length;
      const maxOccupancy = Math.max(...occupancies);
      const minOccupancy = Math.min(...occupancies);
      const isUnbalanced = maxOccupancy - minOccupancy > 30;

      // Generate suggestions for unbalanced techniques
      const suggestions: LoadBalancingSuggestion[] = [];

      if (isUnbalanced) {
        // Find overloaded machines and underloaded ones
        const overloaded = techniqueMachines
          .filter(m => m.occupancyRate > avgOccupancy + 15)
          .sort((a, b) => b.occupancyRate - a.occupancyRate);

        const underloaded = techniqueMachines
          .filter(m => m.occupancyRate < avgOccupancy - 15 && m.availableMinutes > 60)
          .sort((a, b) => a.occupancyRate - b.occupancyRate);

        overloaded.forEach(overMachine => {
          // Get movable jobs (not in production, not urgent priority)
          const movableJobs = overMachine.jobs.filter(j =>
            !['production', 'finished'].includes(j.status) &&
            j.priority !== 'urgent'
          );

          movableJobs.forEach(job => {
            const bestTarget = underloaded.find(m =>
              m.availableMinutes >= job.estimated_duration
            );

            if (bestTarget) {
              suggestions.push({
                jobId: job.id,
                orderNumber: job.order_number,
                client: job.client,
                currentMachineId: overMachine.machine.id,
                currentMachineName: overMachine.machine.name,
                suggestedMachineId: bestTarget.machine.id,
                suggestedMachineName: bestTarget.machine.name,
                currentLoad: overMachine.occupancyRate,
                suggestedLoad: bestTarget.occupancyRate,
                loadDifference: overMachine.occupancyRate - bestTarget.occupancyRate
              });
            }
          });
        });
      }

      // Sort suggestions by load difference (most impactful first)
      const sortedSuggestions = suggestions.sort((a, b) => b.loadDifference - a.loadDifference);

      techniqueMap.set(technique.id, {
        technique,
        machines: techniqueMachines.sort((a, b) => b.occupancyRate - a.occupancyRate),
        averageOccupancy: avgOccupancy,
        maxOccupancy,
        minOccupancy,
        isUnbalanced,
        suggestions: sortedSuggestions // Return all suggestions, not limited to 3
      });
    });

    const allSuggestions = Array.from(techniqueMap.values())
      .flatMap(t => t.suggestions)
      .sort((a, b) => b.loadDifference - a.loadDifference);

    return {
      byTechnique: Array.from(techniqueMap.values()),
      suggestions: allSuggestions,
      isLoading: false
    };
  }, [jobs, machines, techniques, targetDate, DAILY_CAPACITY_MINUTES, configLoading]);

  return analysis;
}
