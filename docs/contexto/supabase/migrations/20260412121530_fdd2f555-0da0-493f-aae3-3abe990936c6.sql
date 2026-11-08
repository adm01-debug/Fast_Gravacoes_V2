-- 1. Fix password_reset_requests: restrict INSERT to authenticated users only
DROP POLICY IF EXISTS "Anyone can request password reset" ON public.password_reset_requests

CREATE POLICY "Authenticated users can request password reset"
  ON public.password_reset_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (true)

-- 2. Fix production-photos storage: ensure DELETE requires authenticated role
DROP POLICY IF EXISTS "Authenticated users can delete production photos" ON storage.objects

CREATE POLICY "Authenticated users can delete production photos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'production-photos' AND public.has_role(auth.uid(), 'coordinator'))

-- 3. Fix spc_measurements: restrict SELECT to authenticated
DROP POLICY IF EXISTS "Anyone can view SPC measurements" ON public.spc_measurements

DROP POLICY IF EXISTS "Authenticated users can view SPC measurements" ON public.spc_measurements

CREATE POLICY "Authenticated users can view SPC measurements"
  ON public.spc_measurements
  FOR SELECT
  TO authenticated
  USING (true)

-- 4. Fix bitrix24_field_mappings: restrict SELECT to authenticated
DROP POLICY IF EXISTS "Anyone can view field mappings" ON public.bitrix24_field_mappings

DROP POLICY IF EXISTS "Authenticated users can view field mappings" ON public.bitrix24_field_mappings

CREATE POLICY "Authenticated users can view field mappings"
  ON public.bitrix24_field_mappings
  FOR SELECT
  TO authenticated
  USING (true)

-- 5. Fix permissive INSERT/UPDATE policies across tables
-- password_reset_requests UPDATE - restrict to coordinators
DROP POLICY IF EXISTS "Coordinators can update password reset requests" ON public.password_reset_requests

CREATE POLICY "Coordinators can update password reset requests"
  ON public.password_reset_requests
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'coordinator'))
  WITH CHECK (public.has_role(auth.uid(), 'coordinator'))
