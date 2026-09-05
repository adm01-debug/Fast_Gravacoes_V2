-- Recria a função compute_audit_hash exigida pelo trigger audit_trigger_func.
-- Implementação determinística usando md5 (nativo do Postgres, dispensa
-- pgcrypto). O trigger de audit_log estava quebrado porque esta função
-- não existia no banco remoto após o deploy — toda escrita em tabelas
-- auditadas explodia com "function does not exist".
CREATE OR REPLACE FUNCTION public.compute_audit_hash(
  _entity_type text,
  _entity_id   text,
  _action      text,
  _actor_id    uuid,
  _old_data    jsonb,
  _new_data    jsonb,
  _prev_hash   text,
  _created     timestamptz
) RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  _payload text;
BEGIN
  _payload := concat_ws(
    '|',
    coalesce(_entity_type, ''),
    coalesce(_entity_id, ''),
    coalesce(_action, ''),
    coalesce(_actor_id::text, ''),
    coalesce(_old_data::text, ''),
    coalesce(_new_data::text, ''),
    coalesce(_prev_hash, ''),
    coalesce(_created::text, '')
  );
  RETURN md5(_payload);
END;
$$;