CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM public, anon, authenticated;
GRANT USAGE ON SCHEMA app_private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION app_private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND is_active = true
  )
$$;

REVOKE ALL ON FUNCTION app_private.has_role(uuid, public.app_role) FROM public, anon;
GRANT EXECUTE ON FUNCTION app_private.has_role(uuid, public.app_role) TO authenticated, service_role;

DO $$
DECLARE
  policy_record RECORD;
  optimized_using TEXT;
  optimized_check TEXT;
BEGIN
  FOR policy_record IN
    SELECT
      n.nspname AS schema_name,
      c.relname AS table_name,
      p.polname AS policy_name,
      pg_get_expr(p.polqual, p.polrelid) AS using_expr,
      pg_get_expr(p.polwithcheck, p.polrelid) AS check_expr
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND (
        pg_get_expr(p.polqual, p.polrelid) LIKE '%has_role(%'
        OR pg_get_expr(p.polwithcheck, p.polrelid) LIKE '%has_role(%'
      )
    ORDER BY n.nspname, c.relname, p.polname
  LOOP
    IF policy_record.using_expr IS NOT NULL THEN
      optimized_using := replace(
        replace(policy_record.using_expr, 'public.has_role(', 'app_private.has_role('),
        'has_role(', 'app_private.has_role('
      );

      EXECUTE format(
        'ALTER POLICY %I ON %I.%I USING (%s)',
        policy_record.policy_name,
        policy_record.schema_name,
        policy_record.table_name,
        optimized_using
      );
    END IF;

    IF policy_record.check_expr IS NOT NULL THEN
      optimized_check := replace(
        replace(policy_record.check_expr, 'public.has_role(', 'app_private.has_role('),
        'has_role(', 'app_private.has_role('
      );

      EXECUTE format(
        'ALTER POLICY %I ON %I.%I WITH CHECK (%s)',
        policy_record.policy_name,
        policy_record.schema_name,
        policy_record.table_name,
        optimized_check
      );
    END IF;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.verify_audit_chain(_limit integer DEFAULT 1000)
RETURNS TABLE(total_records bigint, verified bigint, broken bigint, first_broken_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _rec RECORD;
  _expected TEXT;
  _total BIGINT := 0;
  _ok BIGINT := 0;
  _bad BIGINT := 0;
  _first_bad UUID := NULL;
BEGIN
  IF NOT (app_private.has_role(( SELECT auth.uid() AS uid), 'coordinator') OR app_private.has_role(( SELECT auth.uid() AS uid), 'manager')) THEN
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
$function$;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;