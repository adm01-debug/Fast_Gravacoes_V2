
DROP POLICY IF EXISTS "Versions are viewable by all authenticated users" ON public.technical_sheet_versions;
CREATE POLICY "Role-based technical sheet versions visibility"
  ON public.technical_sheet_versions FOR SELECT TO authenticated
  USING (
    public.has_role((SELECT auth.uid()), 'coordinator'::app_role)
    OR public.has_role((SELECT auth.uid()), 'manager'::app_role)
    OR public.has_role((SELECT auth.uid()), 'admin'::app_role)
    OR (
      public.has_role((SELECT auth.uid()), 'operator'::app_role)
      AND EXISTS (
        SELECT 1 FROM public.technical_sheets ts
        WHERE ts.id = technical_sheet_versions.sheet_id
          AND ts.status = 'published'::sheet_status
      )
    )
  );

DROP POLICY IF EXISTS "Managers and coordinators can view job status audit" ON public.job_status_audit;
CREATE POLICY "Staff can view job status audit"
  ON public.job_status_audit FOR SELECT TO authenticated
  USING (
    public.has_role((SELECT auth.uid()), 'coordinator'::app_role)
    OR public.has_role((SELECT auth.uid()), 'manager'::app_role)
  );

DROP POLICY IF EXISTS "Managers and coordinators can view machine event audit" ON public.machine_event_audit;
CREATE POLICY "Staff can view machine event audit"
  ON public.machine_event_audit FOR SELECT TO authenticated
  USING (
    public.has_role((SELECT auth.uid()), 'coordinator'::app_role)
    OR public.has_role((SELECT auth.uid()), 'manager'::app_role)
  );

DROP POLICY IF EXISTS "Authenticated users can request password reset" ON public.password_reset_requests;
CREATE POLICY "Users can only request reset for their own email"
  ON public.password_reset_requests FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
    AND lower(user_email) = lower(((SELECT auth.jwt()) ->> 'email'))
  );
