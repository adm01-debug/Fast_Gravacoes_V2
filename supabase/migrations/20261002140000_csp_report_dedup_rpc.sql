-- Insert atômico com dedupe para csp_violation_reports.
-- Verificação + insert rodam numa única transação (a edge function chama a
-- RPC uma vez) com advisory lock por assinatura — elimina a janela
-- check-then-insert em que rajadas concorrentes idênticas passavam todas.
-- A assinatura inclui disposition: enforce e report-only da mesma violação
-- são eventos distintos e os dois devem ser coletados.
CREATE OR REPLACE FUNCTION public.insert_csp_report_dedup(
    p_document_uri TEXT,
    p_referrer TEXT,
    p_violated_directive TEXT,
    p_effective_directive TEXT,
    p_original_policy TEXT,
    p_blocked_uri TEXT,
    p_source_file TEXT,
    p_line_number INTEGER,
    p_column_number INTEGER,
    p_status_code INTEGER,
    p_disposition TEXT,
    p_user_agent TEXT,
    p_raw JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
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
$$;

-- A migration de default-privileges de setembro tira EXECUTE de PUBLIC nas
-- functions novas — sem grant explícito, a edge function (service_role) não
-- consegue chamar a RPC e toda telemetria CSP retornaria 500.
REVOKE EXECUTE ON FUNCTION public.insert_csp_report_dedup(
    text, text, text, text, text, text, text, integer, integer, integer, text, text, jsonb
) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.insert_csp_report_dedup(
    text, text, text, text, text, text, text, integer, integer, integer, text, text, jsonb
) FROM anon;
REVOKE EXECUTE ON FUNCTION public.insert_csp_report_dedup(
    text, text, text, text, text, text, text, integer, integer, integer, text, text, jsonb
) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.insert_csp_report_dedup(
    text, text, text, text, text, text, text, integer, integer, integer, text, text, jsonb
) TO service_role;
