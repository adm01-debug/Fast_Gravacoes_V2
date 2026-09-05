
-- ==========================================================
-- 1) technical_sheet_audit_logs  (ERROR: sem auth check)
-- ==========================================================
DROP POLICY IF EXISTS "Users can view audit logs of sheets they can access" ON public.technical_sheet_audit_logs;
CREATE POLICY "Users can view audit logs of sheets they can access"
  ON public.technical_sheet_audit_logs
  FOR SELECT
  TO authenticated
  USING (
    public.has_any_active_role()
    AND EXISTS (
      SELECT 1 FROM public.technical_sheets ts
      WHERE ts.id = technical_sheet_audit_logs.technical_sheet_id
    )
  );

-- ==========================================================
-- 2) technical_sheet_audit
-- ==========================================================
DROP POLICY IF EXISTS "Technical sheet audit visible to authenticated users" ON public.technical_sheet_audit;
CREATE POLICY "Technical sheet audit visible to active roles"
  ON public.technical_sheet_audit
  FOR SELECT
  TO authenticated
  USING (public.has_any_active_role());

-- ==========================================================
-- 3) operator_status_audit — remover policy ampla
-- ==========================================================
DROP POLICY IF EXISTS "Audit logs viewable by authenticated users" ON public.operator_status_audit;
-- (mantém "Coordinators can view operator audit logs" já restrita)

-- ==========================================================
-- 4) TPM execution tables (checklist, executions, parts)
-- ==========================================================
DROP POLICY IF EXISTS "Leitura de checklist TPM" ON public.tpm_execution_checklist;
DROP POLICY IF EXISTS "Técnicos gerenciam checklist" ON public.tpm_execution_checklist;
CREATE POLICY "Active roles can view tpm checklist"
  ON public.tpm_execution_checklist FOR SELECT TO authenticated
  USING (public.has_any_active_role());
CREATE POLICY "Active roles can manage tpm checklist"
  ON public.tpm_execution_checklist FOR ALL TO authenticated
  USING (public.has_any_active_role())
  WITH CHECK (public.has_any_active_role());

DROP POLICY IF EXISTS "Leitura de execuções TPM" ON public.tpm_executions;
DROP POLICY IF EXISTS "Técnicos gerenciam execuções" ON public.tpm_executions;
CREATE POLICY "Active roles can view tpm executions"
  ON public.tpm_executions FOR SELECT TO authenticated
  USING (public.has_any_active_role());
CREATE POLICY "Active roles can manage tpm executions"
  ON public.tpm_executions FOR ALL TO authenticated
  USING (public.has_any_active_role())
  WITH CHECK (public.has_any_active_role());

DROP POLICY IF EXISTS "Leitura de peças TPM" ON public.tpm_execution_parts;
DROP POLICY IF EXISTS "Técnicos gerenciam peças" ON public.tpm_execution_parts;
CREATE POLICY "Active roles can view tpm parts"
  ON public.tpm_execution_parts FOR SELECT TO authenticated
  USING (public.has_any_active_role());
CREATE POLICY "Active roles can manage tpm parts"
  ON public.tpm_execution_parts FOR ALL TO authenticated
  USING (public.has_any_active_role())
  WITH CHECK (public.has_any_active_role());

-- ==========================================================
-- 5) deactivated_users_retain_write_access — endurece writes
-- ==========================================================

-- energy_alerts
DROP POLICY IF EXISTS "Authenticated users can manage energy alerts" ON public.energy_alerts;
CREATE POLICY "Active roles can manage energy alerts"
  ON public.energy_alerts FOR ALL TO authenticated
  USING (public.has_any_active_role())
  WITH CHECK (public.has_any_active_role());

-- lot_movements
DROP POLICY IF EXISTS "Authenticated users can insert movements" ON public.lot_movements;
CREATE POLICY "Active roles can insert movements"
  ON public.lot_movements FOR INSERT TO authenticated
  WITH CHECK (public.has_any_active_role());

-- lot_quality_inspections
DROP POLICY IF EXISTS "Authenticated users can manage inspections" ON public.lot_quality_inspections;
CREATE POLICY "Active roles can manage inspections"
  ON public.lot_quality_inspections FOR ALL TO authenticated
  USING (public.has_any_active_role())
  WITH CHECK (public.has_any_active_role());

-- maintenance_item_responses
DROP POLICY IF EXISTS "Authenticated can manage item responses" ON public.maintenance_item_responses;
CREATE POLICY "Active roles can manage item responses"
  ON public.maintenance_item_responses FOR ALL TO authenticated
  USING (public.has_any_active_role())
  WITH CHECK (public.has_any_active_role());

-- maintenance_records
DROP POLICY IF EXISTS "Authenticated can insert maintenance records" ON public.maintenance_records;
DROP POLICY IF EXISTS "Authenticated can update maintenance records" ON public.maintenance_records;
CREATE POLICY "Active roles can insert maintenance records"
  ON public.maintenance_records FOR INSERT TO authenticated
  WITH CHECK (public.has_any_active_role());
CREATE POLICY "Active roles can update maintenance records"
  ON public.maintenance_records FOR UPDATE TO authenticated
  USING (public.has_any_active_role())
  WITH CHECK (public.has_any_active_role());

-- pre_production_checklists
DROP POLICY IF EXISTS "Authenticated users can manage checklists" ON public.pre_production_checklists;
DROP POLICY IF EXISTS "Authenticated users can update checklists" ON public.pre_production_checklists;
CREATE POLICY "Active roles can insert pre-prod checklists"
  ON public.pre_production_checklists FOR INSERT TO authenticated
  WITH CHECK (public.has_any_active_role());
CREATE POLICY "Active roles can update pre-prod checklists"
  ON public.pre_production_checklists FOR UPDATE TO authenticated
  USING (public.has_any_active_role())
  WITH CHECK (public.has_any_active_role());

-- shift_occurrences
DROP POLICY IF EXISTS "Authenticated users can manage occurrences" ON public.shift_occurrences;
CREATE POLICY "Active roles can manage occurrences"
  ON public.shift_occurrences FOR ALL TO authenticated
  USING (public.has_any_active_role())
  WITH CHECK (public.has_any_active_role());

-- shift_pending_tasks
DROP POLICY IF EXISTS "Authenticated users can manage pending tasks" ON public.shift_pending_tasks;
CREATE POLICY "Active roles can manage pending tasks"
  ON public.shift_pending_tasks FOR ALL TO authenticated
  USING (public.has_any_active_role())
  WITH CHECK (public.has_any_active_role());

-- shift_handover_checklist
DROP POLICY IF EXISTS "Authenticated users can manage checklist" ON public.shift_handover_checklist;
CREATE POLICY "Active roles can manage handover checklist"
  ON public.shift_handover_checklist FOR ALL TO authenticated
  USING (public.has_any_active_role())
  WITH CHECK (public.has_any_active_role());

-- spc_measurements
DROP POLICY IF EXISTS "Authenticated users can insert measurements" ON public.spc_measurements;
CREATE POLICY "Active roles can insert measurements"
  ON public.spc_measurements FOR INSERT TO authenticated
  WITH CHECK (public.has_any_active_role());

-- tpm_execution_alerts
DROP POLICY IF EXISTS "Users can manage tpm execution alerts" ON public.tpm_execution_alerts;
CREATE POLICY "Active roles can manage tpm execution alerts"
  ON public.tpm_execution_alerts FOR ALL TO authenticated
  USING (public.has_any_active_role())
  WITH CHECK (public.has_any_active_role());

-- tpm_execution_supplies
DROP POLICY IF EXISTS "Users can insert execution supplies" ON public.tpm_execution_supplies;
DROP POLICY IF EXISTS "Users can manage tpm execution supplies" ON public.tpm_execution_supplies;
CREATE POLICY "Active roles can insert execution supplies"
  ON public.tpm_execution_supplies FOR INSERT TO authenticated
  WITH CHECK (public.has_any_active_role());
CREATE POLICY "Active roles can manage execution supplies"
  ON public.tpm_execution_supplies FOR ALL TO authenticated
  USING (public.has_any_active_role())
  WITH CHECK (public.has_any_active_role());

-- tpm_notification_queue
DROP POLICY IF EXISTS "Acesso interno para fila TPM" ON public.tpm_notification_queue;
CREATE POLICY "Active roles can access tpm notification queue"
  ON public.tpm_notification_queue FOR ALL TO authenticated
  USING (public.has_any_active_role())
  WITH CHECK (public.has_any_active_role());

-- tpm_severity_configs
DROP POLICY IF EXISTS "Severity configs editable by authenticated users" ON public.tpm_severity_configs;
CREATE POLICY "Active roles can manage severity configs"
  ON public.tpm_severity_configs FOR ALL TO authenticated
  USING (public.has_any_active_role())
  WITH CHECK (public.has_any_active_role());
