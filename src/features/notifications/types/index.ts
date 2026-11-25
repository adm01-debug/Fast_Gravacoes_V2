export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'urgent';
  category: string | null;
  source_system: string;
  is_read: boolean;
  read_at: string | null;
  action_url: string | null;
  action_label: string | null;
  priority: number;
  group_count: number;
  is_grouped: boolean;
  created_at: string;
    /** `data` cru do push: a Central usa `type`/`jobid` para dispensar alerta de rotina sem perder o registro de dedupe. */
    metadata?: Record<string, unknown>;
}

export interface NotificationSettings {
  id: string;
  user_id: string;
  email_enabled: boolean;
  push_enabled: boolean;
  desktop_enabled: boolean;
  in_app_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  categories: Record<string, boolean>;
  created_at: string;
  updated_at: string;
}
