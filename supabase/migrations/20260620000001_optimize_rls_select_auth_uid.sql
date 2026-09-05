-- =====================================================================
-- OTIMIZAÇÃO RLS: substituir auth.uid() por (select auth.uid())
-- 
-- MOTIVO: auth.uid() chamado diretamente em USING/WITH CHECK é avaliado
-- POR LINHA (volatile function). Ao envolver com (select auth.uid()),
-- o PostgreSQL trata como init-plan (subquery escalar estável), avaliando
-- UMA VEZ por query — eliminando N chamadas redundantes em tabelas grandes.
--
-- IMPACTO ESPERADO:
--   - Padrão "uid = coluna"        → permite index scan em coluna (planner
--                                     conhece o valor antes do scan)
--   - Padrão "has_role(uid, role)" → evita N avaliações de auth.uid()
--                                     (has_role ainda é chamado 1x/linha
--                                      mas com argumento constante)
--   - Padrão "uid IS NOT NULL"     → short-circuit completo (avalia 1x/query)
--
-- SEMÂNTICA: preservada integralmente — nomes, comandos, roles e expressões
--            lógicas não são alterados, apenas o wrapper de auth.uid().
-- IDEMPOTÊNCIA: usa ALTER POLICY (não DROP+CREATE), seguro para re-execução.
-- =====================================================================

-- -----------------------------------------------------------------------
-- GRUPO A — TABELAS OPERACIONAIS DE ALTO VOLUME (máxima prioridade)
-- -----------------------------------------------------------------------

-- jobs
ALTER POLICY "Authenticated users can insert jobs"
  ON public.jobs
  WITH CHECK ((select auth.uid()) IS NOT NULL);

-- production_lots  
ALTER POLICY "Coordinators can manage production lots"
  ON public.production_lots
  USING (has_role((select auth.uid()), 'coordinator'::app_role) OR has_role((select auth.uid()), 'manager'::app_role))
  WITH CHECK (has_role((select auth.uid()), 'coordinator'::app_role) OR has_role((select auth.uid()), 'manager'::app_role));

-- lot_components
ALTER POLICY "Coordinators can manage lot components"
  ON public.lot_components
  USING (has_role((select auth.uid()), 'coordinator'::app_role) OR has_role((select auth.uid()), 'manager'::app_role))
  WITH CHECK (has_role((select auth.uid()), 'coordinator'::app_role) OR has_role((select auth.uid()), 'manager'::app_role));

-- lot_movements
ALTER POLICY "Authenticated users can insert movements"
  ON public.lot_movements
  WITH CHECK ((select auth.uid()) IS NOT NULL);

-- lot_quality_inspections
ALTER POLICY "Authenticated users can manage inspections"
  ON public.lot_quality_inspections
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

-- spc_control_parameters
ALTER POLICY "Coordinators can manage SPC parameters"
  ON public.spc_control_parameters
  USING (has_role((select auth.uid()), 'coordinator'::app_role) OR has_role((select auth.uid()), 'manager'::app_role))
  WITH CHECK (has_role((select auth.uid()), 'coordinator'::app_role) OR has_role((select auth.uid()), 'manager'::app_role));

-- spc_measurements
ALTER POLICY "Authenticated users can insert measurements"
  ON public.spc_measurements
  WITH CHECK ((select auth.uid()) IS NOT NULL);

-- spc_alerts
ALTER POLICY "Authenticated users can manage SPC alerts"
  ON public.spc_alerts
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DO $$
BEGIN
  ALTER POLICY "Coordinators can manage SPC alerts"
    ON public.spc_alerts
    USING (public.has_role((select auth.uid()), 'coordinator'))
    WITH CHECK (public.has_role((select auth.uid()), 'coordinator'));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- production_losses
ALTER POLICY "Authenticated users can insert production_losses"
  ON public.production_losses
  WITH CHECK ((select auth.uid()) IS NOT NULL);

-- shift_handovers
ALTER POLICY "Authenticated users can create handovers"
  ON public.shift_handovers
  WITH CHECK ((select auth.uid()) IS NOT NULL);

-- shift_handover_checklist
ALTER POLICY "Authenticated users can manage checklist"
  ON public.shift_handover_checklist
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

-- shift_pending_tasks
ALTER POLICY "Authenticated users can manage pending tasks"
  ON public.shift_pending_tasks
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

-- shift_occurrences
ALTER POLICY "Authenticated users can manage occurrences"
  ON public.shift_occurrences
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

-- shift_checklist_templates
ALTER POLICY "Coordinators can manage templates"
  ON public.shift_checklist_templates
  USING (has_role((select auth.uid()), 'coordinator'::app_role))
  WITH CHECK (has_role((select auth.uid()), 'coordinator'::app_role));

-- pre_production_checklists
ALTER POLICY "Authenticated users can manage checklists"
  ON public.pre_production_checklists
  WITH CHECK ((select auth.uid()) IS NOT NULL);

ALTER POLICY "Authenticated users can update checklists"
  ON public.pre_production_checklists
  USING ((select auth.uid()) IS NOT NULL);

-- chat_messages
ALTER POLICY "Authenticated users can send chat messages"
  ON public.chat_messages
  WITH CHECK ((select auth.uid()) = sender_id);

ALTER POLICY "Users can update own messages"
  ON public.chat_messages
  USING ((select auth.uid()) = sender_id);

-- operator_skills
ALTER POLICY "Coordinators can manage operator skills"
  ON public.operator_skills
  USING (public.has_role((select auth.uid()), 'coordinator'));

-- -----------------------------------------------------------------------
-- GRUPO A2 — CATÁLOGO / FICHAS TÉCNICAS (alta frequência de leitura)
-- -----------------------------------------------------------------------

-- technical_sheets
ALTER POLICY "Coordinators can manage technical sheets"
  ON public.technical_sheets
  USING (has_role((select auth.uid()), 'coordinator'))
  WITH CHECK (has_role((select auth.uid()), 'coordinator'));

-- technical_sheet_steps
ALTER POLICY "Coordinators can manage sheet steps"
  ON public.technical_sheet_steps
  USING (has_role((select auth.uid()), 'coordinator'))
  WITH CHECK (has_role((select auth.uid()), 'coordinator'));

-- technical_sheet_materials
ALTER POLICY "Coordinators can manage sheet materials"
  ON public.technical_sheet_materials
  USING (has_role((select auth.uid()), 'coordinator'))
  WITH CHECK (has_role((select auth.uid()), 'coordinator'));

-- technical_sheet_tips
ALTER POLICY "Coordinators can manage sheet tips"
  ON public.technical_sheet_tips
  USING (has_role((select auth.uid()), 'coordinator'))
  WITH CHECK (has_role((select auth.uid()), 'coordinator'));

-- technical_sheet_versions
DO $$
BEGIN
  ALTER POLICY "Versions can be inserted by coordinators"
    ON public.technical_sheet_versions
    WITH CHECK (public.has_role((select auth.uid()), 'coordinator'));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER POLICY "Versions are viewable by all authenticated users"
    ON public.technical_sheet_versions
    USING ((select auth.uid()) IS NOT NULL);
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- technical_sheet_audit
DO $$
BEGIN
  ALTER POLICY "Technical sheet audit visible to authenticated users"
    ON public.technical_sheet_audit
    USING ((select auth.uid()) IS NOT NULL);
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- technical_sheet_favorites
DO $$
BEGIN
  ALTER POLICY "Users can manage their own favorites"
    ON public.technical_sheet_favorites
    USING ((select auth.uid()) = user_id);
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- product_categories
ALTER POLICY "Coordinators can manage product categories"
  ON public.product_categories
  USING (has_role((select auth.uid()), 'coordinator'))
  WITH CHECK (has_role((select auth.uid()), 'coordinator'));

-- materials
ALTER POLICY "Coordinators can manage materials"
  ON public.materials
  USING (has_role((select auth.uid()), 'coordinator'))
  WITH CHECK (has_role((select auth.uid()), 'coordinator'));

-- -----------------------------------------------------------------------
-- GRUPO A3 — MANUTENÇÃO (tabelas de checklist/registros)
-- -----------------------------------------------------------------------

ALTER POLICY "Coordinators can manage maintenance types"
  ON public.maintenance_types
  USING (has_role((select auth.uid()), 'coordinator'))
  WITH CHECK (has_role((select auth.uid()), 'coordinator'));

ALTER POLICY "Coordinators can manage maintenance schedules"
  ON public.maintenance_schedules
  USING (has_role((select auth.uid()), 'coordinator'))
  WITH CHECK (has_role((select auth.uid()), 'coordinator'));

ALTER POLICY "Coordinators can manage maintenance checklists"
  ON public.maintenance_checklists
  USING (has_role((select auth.uid()), 'coordinator'))
  WITH CHECK (has_role((select auth.uid()), 'coordinator'));

ALTER POLICY "Coordinators can manage checklist items"
  ON public.maintenance_checklist_items
  USING (has_role((select auth.uid()), 'coordinator'))
  WITH CHECK (has_role((select auth.uid()), 'coordinator'));

-- -----------------------------------------------------------------------
-- GRUPO A4 — ESTOQUE / LOGÍSTICA
-- -----------------------------------------------------------------------

-- inventory_items
ALTER POLICY "Inventory items viewable by authenticated users"
  ON public.inventory_items
  USING ((select auth.uid()) IS NOT NULL);

ALTER POLICY "Inventory items managed by managers/coordinators"
  ON public.inventory_items
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (select auth.uid())
      AND role IN ('manager', 'coordinator')
    )
  );

-- inventory_movements
ALTER POLICY "Movements viewable by authenticated users"
  ON public.inventory_movements
  USING ((select auth.uid()) IS NOT NULL);

-- shipment_costs
DO $$
BEGIN
  ALTER POLICY "Coordinators and managers can manage shipment costs"
    ON public.shipment_costs
    USING (has_role((select auth.uid()), 'coordinator'::app_role) OR has_role((select auth.uid()), 'manager'::app_role))
    WITH CHECK (has_role((select auth.uid()), 'coordinator'::app_role) OR has_role((select auth.uid()), 'manager'::app_role));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- -----------------------------------------------------------------------
-- GRUPO A5 — CUSTEIO ABC / ENERGIA / DOCUMENTOS
-- -----------------------------------------------------------------------

-- abc_activities
ALTER POLICY "Coordinators can manage activities"
  ON public.abc_activities
  USING (has_role((select auth.uid()), 'coordinator'))
  WITH CHECK (has_role((select auth.uid()), 'coordinator'));

-- abc_cost_pools
ALTER POLICY "Coordinators can manage cost pools"
  ON public.abc_cost_pools
  USING (has_role((select auth.uid()), 'coordinator'))
  WITH CHECK (has_role((select auth.uid()), 'coordinator'));

-- abc_activity_rates
ALTER POLICY "Coordinators can manage activity rates"
  ON public.abc_activity_rates
  USING (has_role((select auth.uid()), 'coordinator'))
  WITH CHECK (has_role((select auth.uid()), 'coordinator'));

-- abc_job_costs
ALTER POLICY "Coordinators can manage job costs"
  ON public.abc_job_costs
  USING (has_role((select auth.uid()), 'coordinator'))
  WITH CHECK (has_role((select auth.uid()), 'coordinator'));

-- energy_consumption
ALTER POLICY "Coordinators can manage energy consumption"
  ON public.energy_consumption
  USING (has_role((select auth.uid()), 'coordinator'::app_role))
  WITH CHECK (has_role((select auth.uid()), 'coordinator'::app_role));

-- energy_targets
ALTER POLICY "Coordinators can manage energy targets"
  ON public.energy_targets
  USING (has_role((select auth.uid()), 'coordinator'::app_role))
  WITH CHECK (has_role((select auth.uid()), 'coordinator'::app_role));

-- tpm_execution_supplies
ALTER POLICY "Users can manage tpm execution supplies"
  ON public.tpm_execution_supplies
  USING ((select auth.uid()) IS NOT NULL);

-- tpm_execution_alerts
ALTER POLICY "Users can manage tpm execution alerts"
  ON public.tpm_execution_alerts
  USING ((select auth.uid()) IS NOT NULL);

-- -----------------------------------------------------------------------
-- GRUPO B — PERFIS / PAPÉIS (segurança de acesso)
-- -----------------------------------------------------------------------

-- profiles
DO $$
BEGIN
  ALTER POLICY "Users can update own profile"
    ON public.profiles
    USING ((select auth.uid()) = id);
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER POLICY "Users can update their own profile"
    ON public.profiles
    USING ((select auth.uid()) = id);
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER POLICY "Users can insert own profile"
    ON public.profiles
    WITH CHECK ((select auth.uid()) = id);
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER POLICY "Users can view own profile"
    ON public.profiles
    USING ((select auth.uid()) = id);
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- user_roles
DO $$
BEGIN
  ALTER POLICY "Users can view their own roles"
    ON public.user_roles
    USING ((select auth.uid()) = user_id);
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER POLICY "Coordinators can view all roles"
    ON public.user_roles
    USING (public.has_role((select auth.uid()), 'coordinator'));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER POLICY "Coordinators can manage roles"
    ON public.user_roles
    USING (public.has_role((select auth.uid()), 'coordinator'));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER POLICY "Only managers can manage user roles"
    ON public.user_roles
    USING (has_role((select auth.uid()), 'manager'::app_role))
    WITH CHECK (has_role((select auth.uid()), 'manager'::app_role));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- user_mfa_settings
DO $$
BEGIN
  ALTER POLICY "Users can view own MFA settings"
    ON public.user_mfa_settings
    USING ((select auth.uid()) = user_id);
  ALTER POLICY "Users can insert own MFA settings"
    ON public.user_mfa_settings
    WITH CHECK ((select auth.uid()) = user_id);
  ALTER POLICY "Users can update own MFA settings"
    ON public.user_mfa_settings
    USING ((select auth.uid()) = user_id);
  ALTER POLICY "Coordinators can view all MFA settings"
    ON public.user_mfa_settings
    USING (has_role((select auth.uid()), 'coordinator') OR has_role((select auth.uid()), 'manager'));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- webauthn_credentials
DO $$
BEGIN
  ALTER POLICY "Users can view own credentials"
    ON public.webauthn_credentials
    USING ((select auth.uid()) = user_id);
  ALTER POLICY "Users can insert own credentials"
    ON public.webauthn_credentials
    WITH CHECK ((select auth.uid()) = user_id);
  ALTER POLICY "Users can delete own credentials"
    ON public.webauthn_credentials
    USING ((select auth.uid()) = user_id);
  ALTER POLICY "Users can update own credentials"
    ON public.webauthn_credentials
    USING ((select auth.uid()) = user_id);
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- webauthn_challenges
DO $$
BEGIN
  ALTER POLICY "Users can manage own challenges"
    ON public.webauthn_challenges
    USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- login_audit
DO $$
BEGIN
  ALTER POLICY "Users can view own login audit"
    ON public.login_audit
    USING ((select auth.uid()) = user_id);
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- ip_allowlist
DO $$
BEGIN
  ALTER POLICY "Coordinators can view IP allowlist"
    ON public.ip_allowlist
    USING (has_role((select auth.uid()), 'coordinator') OR has_role((select auth.uid()), 'manager'));
  ALTER POLICY "Coordinators can manage IP allowlist"
    ON public.ip_allowlist
    USING (has_role((select auth.uid()), 'coordinator'))
    WITH CHECK (has_role((select auth.uid()), 'coordinator'));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- password_reset_requests
DO $$
BEGIN
  ALTER POLICY "Coordinators and managers can view all requests"
    ON public.password_reset_requests
    USING (has_role((select auth.uid()), 'coordinator') OR has_role((select auth.uid()), 'manager'));
  ALTER POLICY "Coordinators and managers can update requests"
    ON public.password_reset_requests
    USING (has_role((select auth.uid()), 'coordinator') OR has_role((select auth.uid()), 'manager'));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER POLICY "Coordinators can update password reset requests"
    ON public.password_reset_requests
    USING (public.has_role((select auth.uid()), 'coordinator'))
    WITH CHECK (public.has_role((select auth.uid()), 'coordinator'));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- audit_log
DO $$
BEGIN
  ALTER POLICY "Managers and Coordinators can view audit logs"
    ON public.audit_log
    USING (has_role((select auth.uid()), 'manager'::app_role) OR has_role((select auth.uid()), 'coordinator'::app_role));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- erp_api_keys
DO $$
BEGIN
  ALTER POLICY "Managers can manage API keys"
    ON public.erp_api_keys
    USING (public.has_role((select auth.uid()), 'manager'::public.app_role))
    WITH CHECK (public.has_role((select auth.uid()), 'manager'::public.app_role));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- -----------------------------------------------------------------------
-- GRUPO C — DADOS PESSOAIS DO USUÁRIO
-- -----------------------------------------------------------------------

-- notifications
ALTER POLICY "Users can view own notifications"
  ON notifications
  USING ((select auth.uid()) = user_id);

ALTER POLICY "Users can update own notifications"
  ON notifications
  USING ((select auth.uid()) = user_id);

ALTER POLICY "Users can delete own notifications"
  ON notifications
  USING ((select auth.uid()) = user_id);

-- notification_preferences
ALTER POLICY "Users can manage own preferences"
  ON notification_preferences
  USING ((select auth.uid()) = user_id);

-- saved_filters
ALTER POLICY "Users can view own filters"
  ON public.saved_filters
  USING ((select auth.uid()) = user_id);

ALTER POLICY "Users can insert own filters"
  ON public.saved_filters
  WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "Users can update own filters"
  ON public.saved_filters
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "Users can delete own filters"
  ON public.saved_filters
  USING ((select auth.uid()) = user_id);

-- entity_versions
ALTER POLICY "Users can insert versions"
  ON public.entity_versions
  WITH CHECK ((select auth.uid()) = changed_by OR changed_by IS NULL);

-- user_favorites
DO $$
BEGIN
  ALTER POLICY "Users can view own favorites"
    ON public.user_favorites
    USING ((select auth.uid()) = user_id);
  ALTER POLICY "Users can insert own favorites"
    ON public.user_favorites
    WITH CHECK ((select auth.uid()) = user_id);
  ALTER POLICY "Users can update own favorites"
    ON public.user_favorites
    USING ((select auth.uid()) = user_id);
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- dashboard_layouts
DO $$
BEGIN
  ALTER POLICY "Users can view their own dashboard layout"
    ON public.dashboard_layouts
    USING ((select auth.uid()) = user_id);
  ALTER POLICY "Users can insert their own dashboard layout"
    ON public.dashboard_layouts
    WITH CHECK ((select auth.uid()) = user_id);
  ALTER POLICY "Users can update their own dashboard layout"
    ON public.dashboard_layouts
    USING ((select auth.uid()) = user_id);
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER POLICY "Users can view their own layouts"
    ON public.dashboard_layouts
    USING ((select auth.uid()) = user_id);
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- dashboard_presets
DO $$
BEGIN
  ALTER POLICY "Users can view their own presets"
    ON public.dashboard_presets
    USING ((select auth.uid()) = user_id);
  ALTER POLICY "Users can create their own presets"
    ON public.dashboard_presets
    WITH CHECK ((select auth.uid()) = user_id);
  ALTER POLICY "Users can update their own presets"
    ON public.dashboard_presets
    USING ((select auth.uid()) = user_id);
  ALTER POLICY "Users can delete their own presets"
    ON public.dashboard_presets
    USING ((select auth.uid()) = user_id);
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- user_notification_settings
DO $$
BEGIN
  ALTER POLICY "Users can view their own settings"
    ON public.user_notification_settings
    USING ((select auth.uid()) = user_id);
  ALTER POLICY "Users can update their own settings"
    ON public.user_notification_settings
    USING ((select auth.uid()) = user_id);
  ALTER POLICY "Users can insert their own settings"
    ON public.user_notification_settings
    WITH CHECK ((select auth.uid()) = user_id);
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- push_notifications
DO $$
BEGIN
  ALTER POLICY "Users can update their own notifications"
    ON public.push_notifications
    USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);
  ALTER POLICY "Users can delete their own notifications"
    ON public.push_notifications
    USING ((select auth.uid()) = user_id);
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- realtime notifications (20251220151304)
DO $$
BEGIN
  ALTER POLICY "Users can manage their own subscriptions"
    ON public.notification_subscriptions
    USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);
  ALTER POLICY "Users can view their own notifications"
    ON public.notification_subscriptions
    USING ((select auth.uid()) = user_id);
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- user_devices
DO $$
BEGIN
  ALTER POLICY "Users can view their own devices"
    ON public.user_devices
    USING ((select auth.uid()) = user_id);
  ALTER POLICY "Users can delete their own devices"
    ON public.user_devices
    USING ((select auth.uid()) = user_id);
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- new_device_alerts
DO $$
BEGIN
  ALTER POLICY "Users can view their own alerts"
    ON public.new_device_alerts
    USING ((select auth.uid()) = user_id);
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- report_templates
DO $$
BEGIN
  ALTER POLICY "Users can view their own templates"
    ON public.report_templates
    USING ((select auth.uid()) = user_id OR is_public = true);
  ALTER POLICY "Users can create their own templates"
    ON public.report_templates
    WITH CHECK ((select auth.uid()) = user_id);
  ALTER POLICY "Users can update their own templates"
    ON public.report_templates
    USING ((select auth.uid()) = user_id);
  ALTER POLICY "Users can delete their own templates"
    ON public.report_templates
    USING ((select auth.uid()) = user_id);
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- email_verification_tokens
DO $$
BEGIN
  ALTER POLICY "Users can view own verification tokens"
    ON public.email_verification_tokens
    USING ((select auth.uid()) = user_id);
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- error_logs
DO $$
BEGIN
  ALTER POLICY "Users can view their own error logs"
    ON public.error_logs
    USING ((select auth.uid()) = user_id);
  ALTER POLICY "Users can insert error logs"
    ON public.error_logs
    WITH CHECK ((select auth.uid()) IS NOT NULL);
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- -----------------------------------------------------------------------
-- GRUPO D — CONFIGURAÇÃO / CONTROLE / SEGURANÇA
-- -----------------------------------------------------------------------

-- rate_limit_logs
DO $$
BEGIN
  ALTER POLICY "Coordinators and managers can view rate limit logs"
    ON public.rate_limit_logs
    USING (has_role((select auth.uid()), 'coordinator') OR has_role((select auth.uid()), 'manager'));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- blocked_ips
DO $$
BEGIN
  ALTER POLICY "Coordinators can manage blocked IPs"
    ON public.blocked_ips
    USING (has_role((select auth.uid()), 'coordinator'))
    WITH CHECK (has_role((select auth.uid()), 'coordinator'));
  ALTER POLICY "Managers can view blocked IPs"
    ON public.blocked_ips
    USING (has_role((select auth.uid()), 'manager'));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- rate_limit_settings
DO $$
BEGIN
  ALTER POLICY "Coordinators can manage rate limit settings"
    ON public.rate_limit_settings
    USING (has_role((select auth.uid()), 'coordinator'))
    WITH CHECK (has_role((select auth.uid()), 'coordinator'));
  ALTER POLICY "Managers can view rate limit settings"
    ON public.rate_limit_settings
    USING (has_role((select auth.uid()), 'manager'));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- security_events
DO $$
BEGIN
  ALTER POLICY "Coordinators and managers can view security events"
    ON public.security_events
    USING (has_role((select auth.uid()), 'coordinator') OR has_role((select auth.uid()), 'manager'));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- business_config
DO $$
BEGIN
  ALTER POLICY "Apenas gestores podem atualizar configs"
    ON public.business_config
    USING (public.has_role((select auth.uid()), 'manager'))
    WITH CHECK (public.has_role((select auth.uid()), 'manager'));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- feature_flags
DO $$
BEGIN
  ALTER POLICY "Apenas administradores gerenciam flags"
    ON public.feature_flags
    USING (public.has_role((select auth.uid()), 'manager'))
    WITH CHECK (public.has_role((select auth.uid()), 'manager'));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- telemetry_traces
DO $$
BEGIN
  ALTER POLICY "Authenticated users can insert traces"
    ON public.telemetry_traces
    WITH CHECK ((select auth.uid()) IS NOT NULL);
  ALTER POLICY "Apenas administradores veem traces"
    ON public.telemetry_traces
    USING (public.has_role((select auth.uid()), 'manager'));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- webhook_logs
DO $$
BEGIN
  ALTER POLICY "Managers can view webhook logs"
    ON public.webhook_logs
    USING (public.has_role((select auth.uid()), 'manager'));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- gamification / reward_redemptions
DO $$
BEGIN
  ALTER POLICY "Users can view their redemptions"
    ON public.reward_redemptions
    USING ((select auth.uid()) = user_id);
  ALTER POLICY "Users can create redemptions"
    ON public.reward_redemptions
    WITH CHECK ((select auth.uid()) = user_id);
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- operator_skills (INSERT, from original migration)
DO $$
BEGIN
  ALTER POLICY "Authenticated users can insert operator_skills"
    ON public.operator_skills
    WITH CHECK ((select auth.uid()) IS NOT NULL);
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- machine_predictions
DO $$
BEGIN
  ALTER POLICY "Authenticated users can insert machine_predictions"
    ON public.machine_predictions
    WITH CHECK ((select auth.uid()) IS NOT NULL);
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- kpi_alerts (nota: usa 'admin' que pode não existir no enum, mas preservamos semântica)
DO $$
BEGIN
  ALTER POLICY "Admins can view all alerts"
    ON public.kpi_alerts
    USING (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'manager'));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- storage.objects (technical-documents)
DO $$
BEGIN
  ALTER POLICY "Coordinators can delete technical documents"
    ON storage.objects
    USING (bucket_id = 'technical-documents' AND has_role((select auth.uid()), 'coordinator'));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER POLICY "Authenticated users can upload technical documents"
    ON storage.objects
    WITH CHECK (bucket_id = 'technical-documents' AND (select auth.uid()) IS NOT NULL);
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER POLICY "Coordinators can update technical documents"
    ON storage.objects
    USING (bucket_id = 'technical-documents' AND (public.has_role((select auth.uid()), 'coordinator') OR public.has_role((select auth.uid()), 'manager')));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- documents / document_versions (20251220150808)
DO $$
BEGIN
  ALTER POLICY "Anyone can view approved documents"
    ON public.documents
    USING (status = 'approved' OR has_role((select auth.uid()), 'coordinator'::app_role) OR has_role((select auth.uid()), 'manager'::app_role));
  ALTER POLICY "Coordinators can manage documents"
    ON public.documents
    USING (has_role((select auth.uid()), 'coordinator'::app_role) OR has_role((select auth.uid()), 'manager'::app_role))
    WITH CHECK (has_role((select auth.uid()), 'coordinator'::app_role) OR has_role((select auth.uid()), 'manager'::app_role));
  ALTER POLICY "Coordinators can manage versions"
    ON public.document_versions
    USING (has_role((select auth.uid()), 'coordinator'::app_role))
    WITH CHECK (has_role((select auth.uid()), 'coordinator'::app_role));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- ai_conversations (20251213121106)
DO $$
BEGIN
  ALTER POLICY "Users can view their own conversations"
    ON public.ai_conversations
    USING ((select auth.uid()) = user_id);
  ALTER POLICY "Users can create their own conversations"
    ON public.ai_conversations
    WITH CHECK ((select auth.uid()) = user_id);
  ALTER POLICY "Users can update their own conversations"
    ON public.ai_conversations
    USING ((select auth.uid()) = user_id);
  ALTER POLICY "Users can delete their own conversations"
    ON public.ai_conversations
    USING ((select auth.uid()) = user_id);
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- qr_code_scans (20251213123245)
DO $$
BEGIN
  ALTER POLICY "Users can insert their own scans"
    ON public.qr_code_scans
    WITH CHECK ((select auth.uid()) = operator_id);
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

