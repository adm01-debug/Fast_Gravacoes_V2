CREATE OR REPLACE FUNCTION public.insert_csp_report_dedup(p_document_uri text, p_referrer text, p_violated_directive text, p_effective_directive text, p_original_policy text, p_blocked_uri text, p_source_file text, p_line_number integer, p_column_number integer, p_status_code integer, p_disposition text, p_user_agent text, p_raw jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Serializa só inserts da MESMA assinatura; relatórios distintos não se
    -- bloqueiam. Lock de transação: libera sozinho no fim da chamada RPC.
    PERFORM pg_advisory_xact_lock(hashtextextended(concat_ws('|',
        coalesce(p_document_uri, ''),
        coalesce(p_violated_directive, ''),
        coalesce(p_blocked_uri, ''),
        coalesce(p_source_file, ''),
        coalesce(p_disposition, '')
    ), 0));

    IF EXISTS (
        SELECT 1 FROM public.csp_violation_reports
        WHERE document_uri IS NOT DISTINCT FROM p_document_uri
          AND violated_directive IS NOT DISTINCT FROM p_violated_directive
          AND blocked_uri IS NOT DISTINCT FROM p_blocked_uri
          AND source_file IS NOT DISTINCT FROM p_source_file
          AND disposition IS NOT DISTINCT FROM p_disposition
          AND created_at > now() - INTERVAL '1 hour'
    ) THEN
        RETURN FALSE;
    END IF;

    INSERT INTO public.csp_violation_reports (
        document_uri, referrer, violated_directive, effective_directive,
        original_policy, blocked_uri, source_file, line_number,
        column_number, status_code, disposition, user_agent, raw
    ) VALUES (
        p_document_uri, p_referrer, p_violated_directive, p_effective_directive,
        p_original_policy, p_blocked_uri, p_source_file, p_line_number,
        p_column_number, p_status_code, p_disposition, p_user_agent, p_raw
    );
    RETURN TRUE;
END;
$function$
