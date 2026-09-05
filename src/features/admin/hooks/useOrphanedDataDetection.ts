/* eslint-disable react-hooks/exhaustive-deps --
   Dependências intencionalmente omitidas: incluí-las causaria loops
   infinitos, invalidação excessiva de cache ou recomputação em cada
   render. Callbacks/valores externos são estáveis por contrato. */
import { useMemo } from 'react';
import { useJobs, useTechniques, DbJob, DbTechnique, DbMachine } from '@/features/jobs';
import { useMachines } from '@/features/production';

export interface OrphanedTechnique {
  technique: DbTechnique;
  jobCount: number;
  activeJobCount: number;
  issue: string;
}

export interface DataIntegrityIssue {
  type: 'orphaned_technique' | 'job_without_machine' | 'production_without_machine';
  severity: 'warning' | 'error';
  message: string;
  affectedIds: string[];
}

export function useOrphanedDataDetection() {
  const { data: jobsData } = useJobs();
  const { data: techniquesData } = useTechniques();
  const { data: machinesData } = useMachines();

  // Ensure we have arrays even if data is undefined
  const jobs = jobsData || [];
  const techniques = techniquesData || [];
  const machines = machinesData || [];

  const analysis = useMemo(() => {
    if (!jobsData || !techniquesData || !machinesData) {
      return {
        orphanedTechniques: [],
        issues: [],
        isLoading: true,
        errorCount: 0,
        warningCount: 0,
      };
    }

    const orphanedTechniques: OrphanedTechnique[] = [];
    const issues: DataIntegrityIssue[] = [];

    // Check for techniques with jobs but no machines
    techniques.forEach(technique => {
      const techniqueMachines = machines.filter(m => m.technique_id === technique.id);
      const techniqueJobs = jobs.filter(j => j.technique_id === technique.id);
      const activeJobs = techniqueJobs.filter(j =>
        !['finished', 'cancelled'].includes(j.status)
      );

      if (techniqueMachines.length === 0 && techniqueJobs.length > 0) {
        orphanedTechniques.push({
          technique,
          jobCount: techniqueJobs.length,
          activeJobCount: activeJobs.length,
          issue: `Técnica "${technique.name}" tem ${techniqueJobs.length} job(s) mas nenhuma máquina cadastrada`
        });

        if (activeJobs.length > 0) {
          issues.push({
            type: 'orphaned_technique',
            severity: 'error',
            message: `Técnica "${technique.name}" tem ${activeJobs.length} job(s) ativo(s) sem máquina disponível`,
            affectedIds: activeJobs.map(j => j.id)
          });
        }
      }
    });

    // Check for jobs in production without assigned machine
    const productionWithoutMachine = jobs.filter(j =>
      j.status === 'production' && !j.machine_id
    );

    if (productionWithoutMachine.length > 0) {
      issues.push({
        type: 'production_without_machine',
        severity: 'warning',
        message: `${productionWithoutMachine.length} job(s) em produção sem máquina atribuída`,
        affectedIds: productionWithoutMachine.map(j => j.id)
      });
    }

    return {
      orphanedTechniques,
      issues,
      isLoading: false,
      errorCount: issues.filter(i => i.severity === 'error').length,
      warningCount: issues.filter(i => i.severity === 'warning').length,
    };
  }, [jobsData, techniquesData, machinesData]); // Use original data for dependency tracking

  return analysis;
}
