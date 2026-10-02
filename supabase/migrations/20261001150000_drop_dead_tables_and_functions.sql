-- Remove 13 tabelas criadas e nunca consultadas (ESTADO_ATUAL.md §4.10)
-- e 6 funções órfãs sem chamador no app nem em edge functions.
-- Verificado: zero referências em src/ e supabase/functions/ (o app usa
-- push_notifications, não notifications). DROP sem CASCADE: se existir
-- dependência viva, a migration falha em vez de destruir silenciosamente.
--
-- MANTIDAS apesar de "sem leitura no app" — têm escritores vivos em
-- triggers/RPCs e dropar quebraria transações em produção:
--   kpi_alerts                 ← RPC check_and_notify_kpi_alert (useOEEAlerts,
--                                allowlist do external-db-bridge)
--   technical_sheet_versions   ← trigger on_technical_sheet_save
--   technical_sheet_audit_logs ← trigger tr_log_technical_sheet_changes
--   tpm_execution_audit_logs   ← trigger trigger_audit_tpm_execution
--                                (AFTER UPDATE em maintenance_records)

BEGIN;

DROP TABLE IF EXISTS public.notifications;
DROP TABLE IF EXISTS public.notification_preferences;
DROP TABLE IF EXISTS public.saved_filters;
DROP TABLE IF EXISTS public.entity_versions;
DROP TABLE IF EXISTS public.gamification_settings;
DROP TABLE IF EXISTS public.packaging_waste;
DROP TABLE IF EXISTS public.packaging_equipment;
DROP TABLE IF EXISTS public.shipment_costs;
DROP TABLE IF EXISTS public.tpm_execution_checklist;
DROP TABLE IF EXISTS public.webauthn_credentials;
DROP TABLE IF EXISTS public.webauthn_challenges;
DROP TABLE IF EXISTS public.email_verification_tokens;
DROP TABLE IF EXISTS public.rls_policy_tests;

-- Funções órfãs (update_updated_at_column é compartilhada e PERMANECE;
-- create_technical_sheet_version e audit_tpm_execution_changes têm
-- triggers vivos e PERMANECEM).
DROP FUNCTION IF EXISTS public.mark_notification_read(uuid);
DROP FUNCTION IF EXISTS public.mark_all_notifications_read();
DROP FUNCTION IF EXISTS public.update_saved_filters_updated_at();
DROP FUNCTION IF EXISTS public.ensure_single_default_filter();
DROP FUNCTION IF EXISTS public.ensure_test_results;
DROP FUNCTION IF EXISTS public.test_rls_policies(text, uuid, text);

COMMIT;
