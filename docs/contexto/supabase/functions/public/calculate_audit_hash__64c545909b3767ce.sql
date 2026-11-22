CREATE OR REPLACE FUNCTION public.calculate_audit_hash(rec audit_log)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
BEGIN
  RETURN md5(
    COALESCE(rec.previous_hash, '') ||
    rec.entity_type ||
    rec.entity_id ||
    rec.action ||
    rec.actor_id::text ||
    COALESCE(rec.old_data::text, '') ||
    COALESCE(rec.new_data::text, '') ||
    rec.created_at::text
  );
END;
$function$
