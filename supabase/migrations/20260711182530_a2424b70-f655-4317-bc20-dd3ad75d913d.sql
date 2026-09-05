-- Composite indexes to optimize hot notification queries
CREATE INDEX IF NOT EXISTS idx_push_notifications_user_created ON public.push_notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_push_notifications_status_created ON public.push_notifications (status, created_at DESC) WHERE status = 'pending';

-- Composite index to optimize audit queries by entity + time
CREATE INDEX IF NOT EXISTS idx_audit_log_entity_created ON public.audit_log (entity_type, entity_id, created_at DESC);