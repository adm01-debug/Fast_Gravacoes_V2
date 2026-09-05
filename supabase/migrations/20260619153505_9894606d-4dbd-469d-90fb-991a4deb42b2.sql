-- Mantém audit_log_created_idx (mais antigo); remove duplicatas
DROP INDEX IF EXISTS public.idx_audit_log_created_at_desc;
DROP INDEX IF EXISTS public.idx_audit_log_created_at;

-- Mantém UNIQUE constraints; remove índices simples redundantes
DROP INDEX IF EXISTS public.idx_dashboard_layouts_user_id;
DROP INDEX IF EXISTS public.idx_user_roles_user_id_role;
DROP INDEX IF EXISTS public.idx_login_lockouts_identifier;
DROP INDEX IF EXISTS public.idx_geo_blocking_rules_country;

-- qr_scan_history: mantém o _desc (melhor para ORDER BY DESC)
DROP INDEX IF EXISTS public.idx_qr_scan_history_scanned_at;