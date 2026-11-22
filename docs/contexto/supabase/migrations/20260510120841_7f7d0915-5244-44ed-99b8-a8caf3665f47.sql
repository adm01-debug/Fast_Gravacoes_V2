-- Fix search_path for compute_audit_hash to include extensions (where digest lives)
CREATE OR REPLACE FUNCTION public.compute_audit_hash(_entity_type text, _entity_id text, _action text, _actor_id uuid, _old_data jsonb, _new_data jsonb, _previous_hash text, _created_at timestamp with time zone)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO public, extensions
AS $function$
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
$function$

-- Fix search_path for audit_trigger_func
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO public, extensions
AS $function$
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
$function$

-- Add sort_order column to jobs table
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0

-- Create an index for faster sorting
CREATE INDEX IF NOT EXISTS idx_jobs_status_sort_order ON public.jobs (status, sort_order)

-- Initialize sort_order based on creation date for existing jobs
WITH sorted_jobs AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY status ORDER BY created_at ASC) as row_num
  FROM public.jobs
)
UPDATE public.jobs
SET sort_order = sorted_jobs.row_num
FROM sorted_jobs
WHERE public.jobs.id = sorted_jobs.id
