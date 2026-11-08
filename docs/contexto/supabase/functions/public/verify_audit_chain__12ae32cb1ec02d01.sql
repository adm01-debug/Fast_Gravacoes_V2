CREATE OR REPLACE FUNCTION public.verify_audit_chain()
 RETURNS TABLE(total_records bigint, verified_count bigint, broken_count bigint, is_integral boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
