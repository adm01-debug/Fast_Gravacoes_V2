export * from './hooks/useJobs';
export * from './hooks/useTechniques';
export * from './hooks/useSchedulingData';
export * from './hooks/usePaginatedJobs';
export * from './hooks/useStuckJobsDetection';
export * from './hooks/useDailyDragDrop';
export * from './hooks/useWeeklyDragDrop';
export * from './hooks/useKanbanDragDrop';
export * from './hooks/useSchedulingConflicts';
export * from './hooks/useAutoBufferPromotion';
export * from './hooks/useSmartSequencing';
export * from './hooks/useSmartSequencingWithActions';
export * from './hooks/useDuplicateJob';
export * from './hooks/useJobStatusHistory';
export * from './hooks/useJobInventoryCheck';
export * from './hooks/usePriorityEscalation';
export * from './services/jobsService';
export * from './services/techniquesService';
export * from './services/jobStateMachine';
export * from './services/scheduling';
export * from './types/job.schema';
export * from './types/sequencing';

// Re-export machines from production for convenience (deprecated - use @/features/production instead)
// export { useMachines } from '../production/hooks/useMachines';

// Compatibility aliases
export type DbJob = import('./services/jobsService').Job;
export type DbTechnique = import('./services/techniquesService').Technique;
export type DbMachine = import('../production/services/machinesService').Machine;
export type { JobStatus, JobPriority } from './types/job.schema';
export type SchedulingConflict = import('./hooks/useSchedulingConflicts').SchedulingConflict;
export type StuckJob = import('./hooks/useStuckJobsDetection').StuckJob;
export type { SequencingSuggestion, ColorGroup } from './types/sequencing';
