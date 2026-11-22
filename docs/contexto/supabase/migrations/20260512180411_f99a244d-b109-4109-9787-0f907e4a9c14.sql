-- 1. Extensão pgcrypto para hashing SHA256
CREATE EXTENSION IF NOT EXISTS pgcrypto

-- 2. Função para calcular o hash de um registro de auditoria
CREATE OR REPLACE FUNCTION public.calculate_audit_hash(rec public.audit_log)
RETURNS text AS $$
BEGIN
    RETURN encode(digest(
        COALESCE(rec.previous_hash, '') || 
        rec.entity_type || 
        rec.entity_id || 
        rec.action || 
        rec.actor_id::text || 
        COALESCE(rec.old_data::text, '') || 
        COALESCE(rec.new_data::text, '') || 
        rec.created_at::text,
        'sha256'
    ), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE

-- 3. Trigger para garantir o encadeamento (Chain) e hashing automático
CREATE OR REPLACE FUNCTION public.process_audit_log_hashing()
RETURNS TRIGGER AS $$
DECLARE
    last_hash text;
BEGIN
    -- Obter o hash do registro anterior para encadeamento
    SELECT hash INTO last_hash 
    FROM public.audit_log 
    ORDER BY created_at DESC, id DESC 
    LIMIT 1;
    
    NEW.previous_hash := COALESCE(last_hash, 'GENESIS');
    NEW.hash := public.calculate_audit_hash(NEW);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql

DROP TRIGGER IF EXISTS tr_audit_log_hashing ON public.audit_log

CREATE TRIGGER tr_audit_log_hashing
BEFORE INSERT ON public.audit_log
FOR EACH ROW EXECUTE FUNCTION public.process_audit_log_hashing()

-- 4. RPC para verificar a integridade da cadeia
CREATE OR REPLACE FUNCTION public.verify_audit_chain()
RETURNS TABLE (
    total_records bigint,
    verified_count bigint,
    broken_count bigint,
    is_integral boolean
) AS $$
DECLARE
    rec RECORD;
    prev_h text := 'GENESIS';
    v_total bigint := 0;
    v_verified bigint := 0;
    v_broken bigint := 0;
    calc_h text;
BEGIN
    FOR rec IN SELECT * FROM public.audit_log ORDER BY created_at ASC, id ASC LOOP
        v_total := v_total + 1;
        
        -- Verificar se o previous_hash bate com o hash calculado do anterior
        IF rec.previous_hash != prev_h THEN
            v_broken := v_broken + 1;
        ELSE
            -- Re-calcular o hash do registro atual e comparar
            calc_h := public.calculate_audit_hash(rec);
            IF rec.hash != calc_h THEN
                v_broken := v_broken + 1;
            ELSE
                v_verified := v_verified + 1;
            END IF;
        END IF;
        
        prev_h := rec.hash;
    END LOOP;
    
    RETURN QUERY SELECT v_total, v_verified, v_broken, (v_broken = 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
