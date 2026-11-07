-- Fix policies permissivas de INSERT (WITH CHECK true) restantes no fim da cadeia.
--
-- Contexto:
--   - tpm_notification_logs ("Logs insertable by system"): já dropada em
--     20260712232418_e0446f80 (REPLACE + policy restrita "Users can insert own log entries").
--   - packaging_waste ("Users can insert waste records"): tabela dropada em
--     20261001150000_drop_dead_tables_and_functions.sql.
--   - password_reset_requests ("Anyone can create password reset requests", criada em
--     20251231024327): policy INSERT com WITH CHECK (true) ainda viva. Como a migration
--     de verificação (20261106011000) agora também detecta WITH CHECK (true), esta policy
--     permissiva precisa ser removida; a policy restrita que a substitui já existe
--     ("Anyone can request password reset", WITH CHECK (status = 'pending'), criada em
--     20261031184500).
--
-- Idempotente: DROP IF EXISTS.

DROP POLICY IF EXISTS "Anyone can create password reset requests"
  ON public.password_reset_requests;