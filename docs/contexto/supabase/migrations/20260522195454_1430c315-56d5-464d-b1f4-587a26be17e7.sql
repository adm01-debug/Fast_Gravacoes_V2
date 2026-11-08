-- 1. Restrict public-role SELECT policies to authenticated users
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles

CREATE POLICY "Authenticated users can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true)

DROP POLICY IF EXISTS "Status history viewable by everyone" ON public.job_status_history

CREATE POLICY "Authenticated users can view job status history" ON public.job_status_history FOR SELECT TO authenticated USING (true)

DROP POLICY IF EXISTS "Downtime viewable by everyone" ON public.machine_downtime

CREATE POLICY "Authenticated users can view machine downtime" ON public.machine_downtime FOR SELECT TO authenticated USING (true)

DROP POLICY IF EXISTS "Rankings are viewable by everyone" ON public.operator_rankings

DROP POLICY IF EXISTS "Everyone can view operator skills" ON public.operator_skills

DROP POLICY IF EXISTS "Operator skills are viewable by everyone" ON public.operator_skills

CREATE POLICY "Authenticated users can view operator skills" ON public.operator_skills FOR SELECT TO authenticated USING (true)

DROP POLICY IF EXISTS "Production losses viewable by everyone" ON public.production_losses

CREATE POLICY "Authenticated users can view production losses" ON public.production_losses FOR SELECT TO authenticated USING (true)

DROP POLICY IF EXISTS "Users can view tpm execution alerts" ON public.tpm_execution_alerts

CREATE POLICY "Authenticated users can view tpm execution alerts" ON public.tpm_execution_alerts FOR SELECT TO authenticated USING (true)

DROP POLICY IF EXISTS "Users can view execution supplies" ON public.tpm_execution_supplies

DROP POLICY IF EXISTS "Users can view tpm execution supplies" ON public.tpm_execution_supplies

CREATE POLICY "Authenticated users can view tpm execution supplies" ON public.tpm_execution_supplies FOR SELECT TO authenticated USING (true)

DROP POLICY IF EXISTS "Everyone can view parameter alerts" ON public.tpm_parameter_alerts

CREATE POLICY "Authenticated users can view parameter alerts" ON public.tpm_parameter_alerts FOR SELECT TO authenticated USING (true)

DROP POLICY IF EXISTS "Anyone can view gamification settings" ON public.gamification_settings

CREATE POLICY "Authenticated users can view gamification settings" ON public.gamification_settings FOR SELECT TO authenticated USING (true)

DROP POLICY IF EXISTS "Anyone can view maintenance checklists" ON public.maintenance_checklists

CREATE POLICY "Authenticated users can view maintenance checklists" ON public.maintenance_checklists FOR SELECT TO authenticated USING (true)

DROP POLICY IF EXISTS "Anyone can view checklist items" ON public.maintenance_checklist_items

CREATE POLICY "Authenticated users can view maintenance checklist items" ON public.maintenance_checklist_items FOR SELECT TO authenticated USING (true)

DROP POLICY IF EXISTS "Anyone can view maintenance types" ON public.maintenance_types

CREATE POLICY "Authenticated users can view maintenance types" ON public.maintenance_types FOR SELECT TO authenticated USING (true)

DROP POLICY IF EXISTS "Anyone can view templates" ON public.shift_checklist_templates

CREATE POLICY "Authenticated users can view shift checklist templates" ON public.shift_checklist_templates FOR SELECT TO authenticated USING (true)

DROP POLICY IF EXISTS "Anyone can view technical sheets" ON public.technical_sheets

CREATE POLICY "Authenticated users can view technical sheets" ON public.technical_sheets FOR SELECT TO authenticated USING (true)

DROP POLICY IF EXISTS "Anyone can view technical sheet materials" ON public.technical_sheet_materials

CREATE POLICY "Authenticated users can view technical sheet materials" ON public.technical_sheet_materials FOR SELECT TO authenticated USING (true)

DROP POLICY IF EXISTS "Anyone can view technical sheet steps" ON public.technical_sheet_steps

CREATE POLICY "Authenticated users can view technical sheet steps" ON public.technical_sheet_steps FOR SELECT TO authenticated USING (true)

DROP POLICY IF EXISTS "Anyone can view technical sheet tips" ON public.technical_sheet_tips

CREATE POLICY "Authenticated users can view technical sheet tips" ON public.technical_sheet_tips FOR SELECT TO authenticated USING (true)

DROP POLICY IF EXISTS "Anyone can view techniques" ON public.techniques

CREATE POLICY "Authenticated users can view techniques" ON public.techniques FOR SELECT TO authenticated USING (true)

DROP POLICY IF EXISTS "Anyone can view machines" ON public.machines

CREATE POLICY "Authenticated users can view machines" ON public.machines FOR SELECT TO authenticated USING (true)

DROP POLICY IF EXISTS "Anyone can view materials" ON public.materials

CREATE POLICY "Authenticated users can view materials" ON public.materials FOR SELECT TO authenticated USING (true)

DROP POLICY IF EXISTS "Anyone can view product categories" ON public.product_categories

CREATE POLICY "Authenticated users can view product categories" ON public.product_categories FOR SELECT TO authenticated USING (true)

DROP POLICY IF EXISTS "Anyone can view mappings" ON public.bitrix24_field_mappings

DROP POLICY IF EXISTS "Anyone can view SPC parameters" ON public.spc_control_parameters

-- 2. Prevent coordinator privilege escalation in user_roles
DROP POLICY IF EXISTS "Coordinators can manage roles" ON public.user_roles

CREATE POLICY "Coordinators can manage operator roles"
  ON public.user_roles
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'coordinator'::app_role) AND role = 'operator'::app_role)
  WITH CHECK (public.has_role(auth.uid(), 'coordinator'::app_role) AND role = 'operator'::app_role)

-- 3. Make storage buckets private
UPDATE storage.buckets SET public = false WHERE id IN ('production-photos','technical-documents','tpm-evidences','tpm_signatures','execution-evidence')

-- 4. Storage UPDATE/DELETE policies for buckets that lack them
CREATE POLICY "Owners and staff can update tpm-evidences"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'tpm-evidences' AND (owner = auth.uid() OR public.has_role(auth.uid(),'coordinator'::app_role) OR public.has_role(auth.uid(),'manager'::app_role)))

CREATE POLICY "Owners and staff can delete tpm-evidences"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'tpm-evidences' AND (owner = auth.uid() OR public.has_role(auth.uid(),'coordinator'::app_role) OR public.has_role(auth.uid(),'manager'::app_role)))

CREATE POLICY "Owners and staff can update tpm_signatures"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'tpm_signatures' AND (owner = auth.uid() OR public.has_role(auth.uid(),'coordinator'::app_role) OR public.has_role(auth.uid(),'manager'::app_role)))

CREATE POLICY "Owners and staff can delete tpm_signatures"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'tpm_signatures' AND (owner = auth.uid() OR public.has_role(auth.uid(),'coordinator'::app_role) OR public.has_role(auth.uid(),'manager'::app_role)))

CREATE POLICY "Owners and staff can update execution-evidence"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'execution-evidence' AND (owner = auth.uid() OR public.has_role(auth.uid(),'coordinator'::app_role) OR public.has_role(auth.uid(),'manager'::app_role)))

CREATE POLICY "Owners and staff can delete execution-evidence"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'execution-evidence' AND (owner = auth.uid() OR public.has_role(auth.uid(),'coordinator'::app_role) OR public.has_role(auth.uid(),'manager'::app_role)))

-- 5. Fix function search_path
ALTER FUNCTION public.audit_job_status_change() SET search_path = public
