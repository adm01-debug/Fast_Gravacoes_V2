
-- technical_documents: restringir a authenticated + papel ativo
DROP POLICY IF EXISTS "Anyone can view approved documents" ON public.technical_documents;
CREATE POLICY "Active roles can view approved documents"
  ON public.technical_documents FOR SELECT TO authenticated
  USING (
    public.has_any_active_role()
    AND (
      status = 'approved'
      OR app_private.has_role((SELECT auth.uid()), 'coordinator'::app_role)
      OR app_private.has_role((SELECT auth.uid()), 'manager'::app_role)
    )
  );

-- document_versions
DROP POLICY IF EXISTS "Anyone can view versions of approved documents" ON public.document_versions;
CREATE POLICY "Active roles can view approved document versions"
  ON public.document_versions FOR SELECT TO authenticated
  USING (
    public.has_any_active_role()
    AND EXISTS (
      SELECT 1 FROM public.technical_documents td
      WHERE td.id = document_versions.document_id
        AND (
          td.status = 'approved'
          OR app_private.has_role((SELECT auth.uid()), 'coordinator'::app_role)
          OR app_private.has_role((SELECT auth.uid()), 'manager'::app_role)
        )
    )
  );

-- gamification_rewards
DROP POLICY IF EXISTS "Anyone can view active rewards" ON public.gamification_rewards;
CREATE POLICY "Active roles can view active rewards"
  ON public.gamification_rewards FOR SELECT TO authenticated
  USING (is_active = true AND public.has_any_active_role());

-- machine_downtime
DROP POLICY IF EXISTS "Operators can manage downtime" ON public.machine_downtime;
CREATE POLICY "Active roles can manage machine downtime"
  ON public.machine_downtime FOR ALL TO authenticated
  USING (public.has_any_active_role())
  WITH CHECK (public.has_any_active_role());
