import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth';
import { toast } from 'sonner';
import { KeyRound } from 'lucide-react';
import { useRealtimeChannel } from '@/lib/realtimeChannel';

export function useRealtimeResetRequests() {
  const { isCoordinator, isManager, user } = useAuth();
  const navigate = useNavigate();

  useRealtimeChannel('password-reset-notifications', [{ table: 'password_reset_requests' }], (payload) => {
    if (!isCoordinator && !isManager) return;
    if (!user) return;
    const newRequest = payload.new as {
      user_email: string;
      requested_by_name: string | null;
      status: string;
    };

    toast.info(
      `Nova solicitação de reset de senha`,
      {
        description: `${newRequest.user_email} solicitou reset de senha`,
        duration: 10000,
        icon: <KeyRound className="h-4 w-4" />,
        action: {
          label: 'Ver',
          onClick: () => {
            navigate('/settings?tab=users');
          },
        },
      }
    );
  });
}
