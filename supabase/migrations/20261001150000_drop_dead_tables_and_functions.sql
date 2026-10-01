-- Remove 17 tabelas criadas e nunca consultadas (ESTADO_ATUAL.md §4.10)
-- e 5 funções órfãs sem chamador no app nem em edge functions.
-- Verificado: zero referências em src/ e supabase/functions/ (o app usa
-- push_notifications, não notifications). DROP sem CASCADE: se existir
-- dependência viva, a migration falha em vez de destruir silenciosamente.

BEGIN;

DROP TABLE IF EXISTS public.notifications;
DROP TABLE IF EXISTS public.notification_preferences;
DROP TABLE IF EXISTS public.saved_filters;
DROP TABLE IF EXISTS public.entity_versions;
DROP TABLE IF EXISTS public.gamification_settings;
DROP TABLE IF EXISTS public.kpi_alerts;
DROP TABLE IF EXISTS public.packaging_waste;
DROP TABLE IF EXISTS public.packaging_equipment;
DROP TABLE IF EXISTS public.shipment_costs;
DROP TABLE IF EXISTS public.technical_sheet_audit_logs;
DROP TABLE IF EXISTS public.technical_sheet_versions;
DROP TABLE IF EXISTS public.tpm_execution_audit_logs;
DROP TABLE IF EXISTS public.tpm_execution_checklist;
DROP TABLE IF EXISTS public.webauthn_credentials;
DROP TABLE IF EXISTS public.webauthn_challenges;
DROP TABLE IF EXISTS public.email_verification_tokens;
DROP TABLE IF EXISTS public.rls_test_results;

-- Funções órfãs (update_updated_at_column é compartilhada e PERMANECE).
DROP FUNCTION IF EXISTS public.mark_notification_read(uuid);
DROP FUNCTION IF EXISTS public.mark_all_notifications_read();
DROP FUNCTION IF EXISTS public.update_saved_filters_updated_at();
DROP FUNCTION IF EXISTS public.ensure_single_default_filter();
DROP FUNCTION IF EXISTS public.test_rls_policies(text, uuid, text);

COMMIT;
