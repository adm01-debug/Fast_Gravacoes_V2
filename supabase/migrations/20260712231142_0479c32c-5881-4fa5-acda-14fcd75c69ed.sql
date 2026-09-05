
-- 1) technical_sheets: usar user_roles em vez de jwt claim
DROP POLICY IF EXISTS "Operators can only view published sheets" ON public.technical_sheets;
CREATE POLICY "Role-based technical sheets visibility"
  ON public.technical_sheets FOR SELECT TO authenticated
  USING (
    (public.has_role((SELECT auth.uid()), 'operator'::app_role) AND status = 'published'::sheet_status)
    OR public.has_role((SELECT auth.uid()), 'coordinator'::app_role)
    OR public.has_role((SELECT auth.uid()), 'manager'::app_role)
    OR public.has_role((SELECT auth.uid()), 'admin'::app_role)
  );

-- 2) audit_log: consolidar policies
DROP POLICY IF EXISTS "Audit logs are viewable by staff only" ON public.audit_log;
DROP POLICY IF EXISTS "Coordinators and managers can view audit log" ON public.audit_log;
DROP POLICY IF EXISTS "Managers and Coordinators can view audit logs" ON public.audit_log;
DROP POLICY IF EXISTS "Managers can view audit logs" ON public.audit_log;
CREATE POLICY "Coordinators and managers can view audit log"
  ON public.audit_log FOR SELECT TO authenticated
  USING (
    app_private.has_role((SELECT auth.uid()), 'coordinator'::app_role)
    OR app_private.has_role((SELECT auth.uid()), 'manager'::app_role)
  );

-- 3) storage.objects: uploads com ownership binding (path começa com <uid>/)
DROP POLICY IF EXISTS "Authenticated users can upload execution evidence" ON storage.objects;
CREATE POLICY "Active roles can upload own execution evidence"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'execution-evidence'
    AND public.has_any_active_role()
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "Authenticated can upload tpm evidences" ON storage.objects;
CREATE POLICY "Active roles can upload own tpm evidences"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'tpm-evidences'
    AND public.has_any_active_role()
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );
