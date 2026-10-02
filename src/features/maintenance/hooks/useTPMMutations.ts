import type {
  MaintenanceSchedule,
  MaintenanceAlert,
} from './types';
import { useTPMLifecycleMutations } from './useTPMLifecycleMutations';
import { useTPMApprovalMutations } from './useTPMApprovalMutations';
import { useTPMAlertMutations } from './useTPMAlertMutations';

interface UseTPMMutationsProps {
  schedules: MaintenanceSchedule[];
  alerts: MaintenanceAlert[];
}

export function useTPMMutations({ schedules, alerts }: UseTPMMutationsProps) {
  const lifecycle = useTPMLifecycleMutations({ schedules, alerts });
  const approval = useTPMApprovalMutations({ schedules, alerts });
  const alertMutations = useTPMAlertMutations({ schedules, alerts });

  return {
    ...lifecycle,
    ...approval,
    ...alertMutations,
  };
}
