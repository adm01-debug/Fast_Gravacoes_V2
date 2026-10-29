import { useEfficiencyNotifications } from '@/features/notifications/hooks/useEfficiencyNotifications';
import { useNotifications } from '@/features/notifications/hooks/useNotifications';

export function EfficiencyNotificationProvider({ children }: { children: React.ReactNode }) {
  // Initialize both notification systems
  useNotifications();
  useEfficiencyNotifications();

  return <>{children}</>;
}
