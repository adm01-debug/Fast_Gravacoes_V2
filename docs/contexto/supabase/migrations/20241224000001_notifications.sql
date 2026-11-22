-- ============================================================================
-- MIGRATION: Sistema de Notificações Completo
-- ============================================================================

-- Tabela principal de notificações
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  category TEXT,
  source_system TEXT NOT NULL,
  source_entity_type TEXT,
  source_entity_id UUID,
  channels TEXT[] DEFAULT ARRAY['in_app'],
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  group_key TEXT,
  is_grouped BOOLEAN DEFAULT false,
  group_count INT DEFAULT 1,
  action_url TEXT,
  action_label TEXT,
  action_data JSONB,
  priority INT DEFAULT 0,
  scheduled_for TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  delivery_status JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC)

CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE NOT is_read

CREATE INDEX IF NOT EXISTS idx_notifications_scheduled ON notifications(scheduled_for) WHERE scheduled_for IS NOT NULL

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications

CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id)

DROP POLICY IF EXISTS "Systems can create notifications" ON notifications

CREATE POLICY "Systems can create notifications" ON notifications FOR INSERT WITH CHECK (true)

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications

CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id)

DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications

CREATE POLICY "Users can delete own notifications" ON notifications FOR DELETE USING (auth.uid() = user_id)
