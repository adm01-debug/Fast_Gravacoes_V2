-- Fix search_path mutable nos helpers
CREATE OR REPLACE FUNCTION public.audit_log_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only and cannot be modified or deleted (record %)', COALESCE(OLD.id::text, 'unknown')
    USING ERRCODE = '42501';
END;
$$

CREATE OR REPLACE FUNCTION public.compute_audit_hash(
  _entity_type TEXT,
  _entity_id TEXT,
  _action TEXT,
  _actor_id UUID,
  _old_data JSONB,
  _new_data JSONB,
  _previous_hash TEXT,
  _created_at TIMESTAMPTZ
)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public, extensions
AS $$
  SELECT encode(
    digest(
      COALESCE(_previous_hash,'') ||
      '|' || _entity_type ||
      '|' || _entity_id ||
      '|' || _action ||
      '|' || COALESCE(_actor_id::text,'') ||
      '|' || COALESCE(_old_data::text,'') ||
      '|' || COALESCE(_new_data::text,'') ||
      '|' || _created_at::text,
      'sha256'
    ),
    'hex'
  )
$$
