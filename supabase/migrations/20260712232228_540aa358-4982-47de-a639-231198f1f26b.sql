
-- maintenance_records
DROP POLICY IF EXISTS "Active roles can update maintenance records" ON public.maintenance_records;
DROP POLICY IF EXISTS "Owner or elevated can update maintenance records" ON public.maintenance_records;
CREATE POLICY "Owner or elevated can update maintenance records"
ON public.maintenance_records FOR UPDATE TO authenticated
USING (performed_by = auth.uid() OR approver_id = auth.uid()
  OR public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin'))
WITH CHECK (performed_by = auth.uid() OR approver_id = auth.uid()
  OR public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin'));

-- tpm_executions
DROP POLICY IF EXISTS "Active roles can manage tpm executions" ON public.tpm_executions;
DROP POLICY IF EXISTS "Active roles can view tpm executions" ON public.tpm_executions;
DROP POLICY IF EXISTS "Technicians can insert own tpm executions" ON public.tpm_executions;
DROP POLICY IF EXISTS "Technician or elevated can update tpm executions" ON public.tpm_executions;
DROP POLICY IF EXISTS "Elevated can delete tpm executions" ON public.tpm_executions;

CREATE POLICY "Active roles can view tpm executions"
ON public.tpm_executions FOR SELECT TO authenticated USING (public.has_any_active_role());

CREATE POLICY "Technicians can insert own tpm executions"
ON public.tpm_executions FOR INSERT TO authenticated
WITH CHECK (technician_id = auth.uid()
  OR public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Technician or elevated can update tpm executions"
ON public.tpm_executions FOR UPDATE TO authenticated
USING (technician_id = auth.uid()
  OR public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin'))
WITH CHECK (technician_id = auth.uid()
  OR public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Elevated can delete tpm executions"
ON public.tpm_executions FOR DELETE TO authenticated
USING (public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin'));

-- spc_measurements
DROP POLICY IF EXISTS "Active roles can insert spc measurements" ON public.spc_measurements;
DROP POLICY IF EXISTS "Users can insert spc measurements" ON public.spc_measurements;
DROP POLICY IF EXISTS "Operators insert own spc measurements" ON public.spc_measurements;
CREATE POLICY "Operators insert own spc measurements"
ON public.spc_measurements FOR INSERT TO authenticated
WITH CHECK (operator_id = auth.uid()
  OR public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin'));

-- shift_occurrences
DROP POLICY IF EXISTS "Active roles can manage shift occurrences" ON public.shift_occurrences;
DROP POLICY IF EXISTS "Authenticated users can manage shift occurrences" ON public.shift_occurrences;
DROP POLICY IF EXISTS "Active roles can view shift occurrences" ON public.shift_occurrences;
DROP POLICY IF EXISTS "Handover participants can insert occurrences" ON public.shift_occurrences;
DROP POLICY IF EXISTS "Handover participants can update occurrences" ON public.shift_occurrences;
DROP POLICY IF EXISTS "Elevated can delete occurrences" ON public.shift_occurrences;

CREATE POLICY "Active roles can view shift occurrences"
ON public.shift_occurrences FOR SELECT TO authenticated USING (public.has_any_active_role());

CREATE POLICY "Handover participants can insert occurrences"
ON public.shift_occurrences FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.shift_handovers h WHERE h.id = handover_id
    AND (h.outgoing_operator_id = auth.uid() OR h.incoming_operator_id = auth.uid()))
  OR public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Handover participants can update occurrences"
ON public.shift_occurrences FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.shift_handovers h WHERE h.id = handover_id
    AND (h.outgoing_operator_id = auth.uid() OR h.incoming_operator_id = auth.uid()))
  OR public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin'))
WITH CHECK (
  EXISTS (SELECT 1 FROM public.shift_handovers h WHERE h.id = handover_id
    AND (h.outgoing_operator_id = auth.uid() OR h.incoming_operator_id = auth.uid()))
  OR public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Elevated can delete occurrences"
ON public.shift_occurrences FOR DELETE TO authenticated
USING (public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin'));

-- shift_pending_tasks
DROP POLICY IF EXISTS "Active roles can manage shift pending tasks" ON public.shift_pending_tasks;
DROP POLICY IF EXISTS "Authenticated users can manage shift pending tasks" ON public.shift_pending_tasks;
DROP POLICY IF EXISTS "Active roles can view shift pending tasks" ON public.shift_pending_tasks;
DROP POLICY IF EXISTS "Handover participants can insert tasks" ON public.shift_pending_tasks;
DROP POLICY IF EXISTS "Handover participants can update tasks" ON public.shift_pending_tasks;
DROP POLICY IF EXISTS "Elevated can delete tasks" ON public.shift_pending_tasks;

CREATE POLICY "Active roles can view shift pending tasks"
ON public.shift_pending_tasks FOR SELECT TO authenticated USING (public.has_any_active_role());

CREATE POLICY "Handover participants can insert tasks"
ON public.shift_pending_tasks FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.shift_handovers h WHERE h.id = handover_id
    AND (h.outgoing_operator_id = auth.uid() OR h.incoming_operator_id = auth.uid()))
  OR public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Handover participants can update tasks"
ON public.shift_pending_tasks FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.shift_handovers h WHERE h.id = handover_id
    AND (h.outgoing_operator_id = auth.uid() OR h.incoming_operator_id = auth.uid()))
  OR completed_by = auth.uid()
  OR public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin'))
WITH CHECK (
  EXISTS (SELECT 1 FROM public.shift_handovers h WHERE h.id = handover_id
    AND (h.outgoing_operator_id = auth.uid() OR h.incoming_operator_id = auth.uid()))
  OR completed_by = auth.uid()
  OR public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Elevated can delete tasks"
ON public.shift_pending_tasks FOR DELETE TO authenticated
USING (public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin'));
