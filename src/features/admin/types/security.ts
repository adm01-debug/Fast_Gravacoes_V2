export interface SecurityEvent {
  id: string;
  event_type: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  description: string;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

export interface BlockedIP {
  id: string;
  ip_address: string;
  reason?: string;
  blocked_at: string;
  expires_at?: string;
}
