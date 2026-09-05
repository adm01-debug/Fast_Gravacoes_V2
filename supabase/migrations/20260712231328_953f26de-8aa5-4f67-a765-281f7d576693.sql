
-- ==========================
-- job_status_audit: bloquear writes de clientes explicitamente
-- ==========================
CREATE POLICY "Deny direct client writes to job_status_audit"
  ON public.job_status_audit FOR ALL TO authenticated, anon
  USING (false) WITH CHECK (false);

-- ==========================
-- storage.objects — SELECT com ownership/staff
-- ==========================

-- production-photos: SELECT
DROP POLICY IF EXISTS "Authenticated can view production photos" ON storage.objects;
CREATE POLICY "Owner or staff can view production photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'production-photos'
    AND public.has_any_active_role()
    AND (
      owner = (SELECT auth.uid())
      OR public.has_role((SELECT auth.uid()), 'coordinator'::app_role)
      OR public.has_role((SELECT auth.uid()), 'manager'::app_role)
      OR public.has_role((SELECT auth.uid()), 'admin'::app_role)
    )
  );

-- production-photos: INSERT com ownership binding
DROP POLICY IF EXISTS "Authenticated users can upload production photos" ON storage.objects;
CREATE POLICY "Active roles can upload own production photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'production-photos'
    AND public.has_any_active_role()
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

-- technical-documents: SELECT
DROP POLICY IF EXISTS "Authenticated can view technical documents" ON storage.objects;
CREATE POLICY "Staff or approved-only view technical documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'technical-documents'
    AND public.has_any_active_role()
    AND (
      owner = (SELECT auth.uid())
      OR public.has_role((SELECT auth.uid()), 'coordinator'::app_role)
      OR public.has_role((SELECT auth.uid()), 'manager'::app_role)
      OR public.has_role((SELECT auth.uid()), 'admin'::app_role)
    )
  );

-- technical-documents: INSERT ownership
DROP POLICY IF EXISTS "Authenticated users can upload technical documents" ON storage.objects;
CREATE POLICY "Active roles can upload own technical documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'technical-documents'
    AND public.has_any_active_role()
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

-- execution-evidence: SELECT
DROP POLICY IF EXISTS "Authenticated can view execution evidence" ON storage.objects;
CREATE POLICY "Owner or staff view execution evidence"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'execution-evidence'
    AND public.has_any_active_role()
    AND (
      owner = (SELECT auth.uid())
      OR (storage.foldername(name))[1] = (SELECT auth.uid())::text
      OR public.has_role((SELECT auth.uid()), 'coordinator'::app_role)
      OR public.has_role((SELECT auth.uid()), 'manager'::app_role)
      OR public.has_role((SELECT auth.uid()), 'admin'::app_role)
    )
  );

-- tpm-evidences: SELECT
DROP POLICY IF EXISTS "Authenticated can view tpm evidences" ON storage.objects;
CREATE POLICY "Owner or staff view tpm evidences"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'tpm-evidences'
    AND public.has_any_active_role()
    AND (
      owner = (SELECT auth.uid())
      OR (storage.foldername(name))[1] = (SELECT auth.uid())::text
      OR public.has_role((SELECT auth.uid()), 'coordinator'::app_role)
      OR public.has_role((SELECT auth.uid()), 'manager'::app_role)
      OR public.has_role((SELECT auth.uid()), 'admin'::app_role)
    )
  );

-- tpm_signatures: SELECT
DROP POLICY IF EXISTS "Authenticated can view signatures" ON storage.objects;
CREATE POLICY "Owner or staff view tpm signatures"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'tpm_signatures'
    AND public.has_any_active_role()
    AND (
      owner = (SELECT auth.uid())
      OR (storage.foldername(name))[1] = (SELECT auth.uid())::text
      OR public.has_role((SELECT auth.uid()), 'coordinator'::app_role)
      OR public.has_role((SELECT auth.uid()), 'manager'::app_role)
      OR public.has_role((SELECT auth.uid()), 'admin'::app_role)
    )
  );

-- tpm_signatures: INSERT ownership
DROP POLICY IF EXISTS "Authenticated can upload signatures" ON storage.objects;
CREATE POLICY "Active roles can upload own tpm signatures"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'tpm_signatures'
    AND public.has_any_active_role()
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );
