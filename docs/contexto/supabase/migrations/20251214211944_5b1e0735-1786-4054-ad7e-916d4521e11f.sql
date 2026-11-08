-- Restrict maintenance_records SELECT to authenticated users only
DROP POLICY IF EXISTS "Anyone can view maintenance records" ON public.maintenance_records

CREATE POLICY "Authenticated users can view maintenance records"
ON public.maintenance_records
FOR SELECT
TO authenticated
USING (true)
