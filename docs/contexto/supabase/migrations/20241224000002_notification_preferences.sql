-- ============================================================================
-- MIGRATION: Preferências de Notificação
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email_enabled BOOLEAN DEFAULT true,
  push_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  whatsapp_enabled BOOLEAN DEFAULT false,
  preferences JSONB DEFAULT '{"approval":{"channels":["in_app","email","push"],"priority":3},"alert":{"channels":["in_app","push"],"priority":2},"reminder":{"channels":["in_app","email"],"priority":1},"system":{"channels":["in_app"],"priority":0}}'::jsonb,
  dnd_enabled BOOLEAN DEFAULT false,
  dnd_start_time TIME,
  dnd_end_time TIME,
  dnd_days INT[],
  digest_enabled BOOLEAN DEFAULT false,
  digest_frequency TEXT DEFAULT 'daily',
  digest_time TIME DEFAULT '09:00:00',
  grouping_enabled BOOLEAN DEFAULT true,
  grouping_window_minutes INT DEFAULT 5,
  phone_number TEXT,
  whatsapp_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY

DROP POLICY IF EXISTS "Users can manage own preferences" ON notification_preferences

CREATE POLICY "Users can manage own preferences" ON notification_preferences FOR ALL USING (auth.uid() = user_id)

-- Função para marcar notificação como lida
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE notifications SET is_read = true, read_at = NOW(), updated_at = NOW()
  WHERE id = p_notification_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER

-- Função para marcar todas como lidas
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS VOID AS $$
BEGIN
  UPDATE notifications SET is_read = true, read_at = NOW(), updated_at = NOW()
  WHERE user_id = auth.uid() AND NOT is_read;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
