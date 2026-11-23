import { Job } from '../services/jobsService';

export interface ColorGroup {
  color: string;
  jobs: Job[];
  jobCount: number;
}

export interface SequencingSuggestion {
  id: string;
  machineId: string;
  /** Dia (YYYY-MM-DD) do grupo — a mesma máquina pode ter uma sugestão por data. */
  date?: string;
  machineName: string;
  machineCode: string;
  techniqueId: string;
  techniqueName: string;
  currentSequence: Job[];
  optimizedSequence: Job[];
  estimatedSavings: number; // minutes saved
  colorGroups: ColorGroup[];
  bottleneckRisk: 'low' | 'medium' | 'high';
  estimatedColumnTime?: string; // e.g., "2h 15m"
  totalMinutes: number;
  currentChanges: number;
  optimizedChanges: number;
  totalQuantity: number;
  aiPriorityScore: number;
  setupComplexity: 'low' | 'medium' | 'high';
}
