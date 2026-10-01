-- Tabela destino dos relatórios de violação de CSP (report-uri → csp-report edge function).
-- INSERT só via service role (a function usa SUPABASE_SERVICE_ROLE_KEY e ignora RLS);
-- SELECT liberado para coordinator/manager/admin como nas demais tabelas de segurança.

CREATE TABLE IF NOT EXISTS public.csp_violation_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_uri TEXT,
    referrer TEXT,
    violated_directive TEXT,
    effective_directive TEXT,
    original_policy TEXT,
    blocked_uri TEXT,
    source_file TEXT,
    line_number INTEGER,
    column_number INTEGER,
    status_code INTEGER,
    disposition TEXT,
    user_agent TEXT,
    raw JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_csp_violation_reports_created_at
    ON public.csp_violation_reports (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_csp_violation_reports_directive
    ON public.csp_violation_reports (violated_directive);

ALTER TABLE public.csp_violation_reports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'csp_violation_reports'
          AND policyname = 'Coordinators and managers can view csp reports'
    ) THEN
        CREATE POLICY "Coordinators and managers can view csp reports"
            ON public.csp_violation_reports FOR SELECT
            USING (public.has_role(auth.uid(), 'coordinator'::app_role)
                OR public.has_role(auth.uid(), 'manager'::app_role)
                OR public.has_role(auth.uid(), 'admin'::app_role));
    END IF;
END $$;

COMMENT ON TABLE public.csp_violation_reports IS
    'Relatórios de violação de CSP coletados pela edge function csp-report (report-uri). Sem policy de INSERT: apenas service role grava.';
