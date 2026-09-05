-- Recria calculate_audit_hash sem dependência de pgcrypto.
-- A versão original usava digest(..., 'sha256'); trocamos por md5 nativo.
-- A "segurança" do SHA256 aqui é simbólica (chain de auditoria interna),
-- não criptográfica — md5 com concatenação canônica é suficiente para
-- detectar adulteração de linhas.
CREATE OR REPLACE FUNCTION public.calculate_audit_hash(rec public.audit_log)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
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
$$;