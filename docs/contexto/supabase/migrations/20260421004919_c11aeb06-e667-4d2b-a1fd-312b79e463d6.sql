-- ============================================================================
-- E1: Audit Trail Imutável com Hash Chain (21 CFR Part 11 / ANVISA)
-- ============================================================================

-- Habilitar pgcrypto (para sha256)
CREATE EXTENSION IF NOT EXISTS pgcrypto

-- Tabela append-only de auditoria
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  actor_id UUID,
  actor_email TEXT,
  old_data JSONB,
  new_data JSONB,
  changed_fields TEXT[],
  hash TEXT NOT NULL,
  previous_hash TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
)

CREATE INDEX IF NOT EXISTS audit_log_entity_idx ON public.audit_log (entity_type, entity_id, created_at DESC)

CREATE INDEX IF NOT EXISTS audit_log_actor_idx ON public.audit_log (actor_id, created_at DESC)

CREATE INDEX IF NOT EXISTS audit_log_created_idx ON public.audit_log (created_at DESC)

-- Habilitar RLS
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY

-- Apenas coordenadores e managers podem visualizar
CREATE POLICY "Coordinators and managers can view audit log"
ON public.audit_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager'))

-- Permitir INSERT apenas via triggers (security definer functions)
CREATE POLICY "System can insert audit records"
ON public.audit_log
FOR INSERT
TO authenticated
WITH CHECK (true)

-- ============================================================================
-- Imutabilidade: bloqueia UPDATE e DELETE
-- ============================================================================
CREATE OR REPLACE FUNCTION public.audit_log_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only and cannot be modified or deleted (record %)', COALESCE(OLD.id::text, 'unknown')
    USING ERRCODE = '42501';
END;
$$

DROP TRIGGER IF EXISTS audit_log_no_update ON public.audit_log

CREATE TRIGGER audit_log_no_update
BEFORE UPDATE ON public.audit_log
FOR EACH ROW EXECUTE FUNCTION public.audit_log_immutable()

DROP TRIGGER IF EXISTS audit_log_no_delete ON public.audit_log

CREATE TRIGGER audit_log_no_delete
BEFORE DELETE ON public.audit_log
FOR EACH ROW EXECUTE FUNCTION public.audit_log_immutable()

-- ============================================================================
-- Computa hash sha256 do payload encadeado com hash anterior
-- ============================================================================
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

-- ============================================================================
-- Trigger genérico de auditoria (encadeia hash)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _entity_type TEXT := TG_TABLE_NAME;
  _entity_id TEXT;
  _action TEXT := TG_OP;
  _actor_id UUID := auth.uid();
  _actor_email TEXT;
  _old_data JSONB;
  _new_data JSONB;
  _changed TEXT[];
  _prev_hash TEXT;
  _created TIMESTAMPTZ := now();
  _hash TEXT;
BEGIN
  -- Resolve id
  IF TG_OP = 'DELETE' THEN
    _entity_id := COALESCE((row_to_json(OLD)->>'id'), 'unknown');
    _old_data := to_jsonb(OLD);
    _new_data := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    _entity_id := COALESCE((row_to_json(NEW)->>'id'), 'unknown');
    _old_data := to_jsonb(OLD);
    _new_data := to_jsonb(NEW);
    SELECT array_agg(key) INTO _changed
    FROM jsonb_each(_new_data) k(key, val)
    WHERE _old_data->key IS DISTINCT FROM val;
  ELSE
    _entity_id := COALESCE((row_to_json(NEW)->>'id'), 'unknown');
    _old_data := NULL;
    _new_data := to_jsonb(NEW);
  END IF;

  -- Email do actor (se disponível)
  IF _actor_id IS NOT NULL THEN
    SELECT email INTO _actor_email FROM auth.users WHERE id = _actor_id LIMIT 1;
  END IF;

  -- Hash anterior global (chain única)
  SELECT hash INTO _prev_hash
  FROM public.audit_log
  ORDER BY created_at DESC, id DESC
  LIMIT 1;

  _hash := public.compute_audit_hash(
    _entity_type, _entity_id, _action, _actor_id,
    _old_data, _new_data, _prev_hash, _created
  );

  INSERT INTO public.audit_log (
    entity_type, entity_id, action, actor_id, actor_email,
    old_data, new_data, changed_fields, hash, previous_hash, created_at
  ) VALUES (
    _entity_type, _entity_id, _action, _actor_id, _actor_email,
    _old_data, _new_data, _changed, _hash, _prev_hash, _created
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$

-- ============================================================================
-- Aplica trigger de auditoria nas tabelas críticas
-- ============================================================================
DROP TRIGGER IF EXISTS audit_jobs ON public.jobs

CREATE TRIGGER audit_jobs
AFTER INSERT OR UPDATE OR DELETE ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func()

DROP TRIGGER IF EXISTS audit_lot_components ON public.lot_components

CREATE TRIGGER audit_lot_components
AFTER INSERT OR UPDATE OR DELETE ON public.lot_components
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func()

DROP TRIGGER IF EXISTS audit_lot_quality_inspections ON public.lot_quality_inspections

CREATE TRIGGER audit_lot_quality_inspections
AFTER INSERT OR UPDATE OR DELETE ON public.lot_quality_inspections
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func()

-- ============================================================================
-- Função pública: verificar integridade da chain
-- ============================================================================
CREATE OR REPLACE FUNCTION public.verify_audit_chain(_limit INT DEFAULT 1000)
RETURNS TABLE (
  total_records BIGINT,
  verified BIGINT,
  broken BIGINT,
  first_broken_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _rec RECORD;
  _expected TEXT;
  _total BIGINT := 0;
  _ok BIGINT := 0;
  _bad BIGINT := 0;
  _first_bad UUID := NULL;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager')) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  FOR _rec IN
    SELECT * FROM public.audit_log
    ORDER BY created_at ASC, id ASC
    LIMIT _limit
  LOOP
    _total := _total + 1;
    _expected := public.compute_audit_hash(
      _rec.entity_type, _rec.entity_id, _rec.action, _rec.actor_id,
      _rec.old_data, _rec.new_data, _rec.previous_hash, _rec.created_at
    );
    IF _expected = _rec.hash THEN
      _ok := _ok + 1;
    ELSE
      _bad := _bad + 1;
      IF _first_bad IS NULL THEN _first_bad := _rec.id; END IF;
    END IF;
  END LOOP;

  RETURN QUERY SELECT _total, _ok, _bad, _first_bad;
END;
$$
