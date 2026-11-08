-- Fix technical-documents upload: restrict to authenticated
DROP POLICY IF EXISTS "Authenticated users can upload technical documents" ON storage.objects

CREATE POLICY "Authenticated users can upload technical documents"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'technical-documents' AND auth.uid() IS NOT NULL)

-- Fix technical-documents delete: restrict to authenticated
DROP POLICY IF EXISTS "Coordinators can delete technical documents" ON storage.objects

CREATE POLICY "Coordinators can delete technical documents"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'technical-documents' AND has_role(auth.uid(), 'coordinator'))
