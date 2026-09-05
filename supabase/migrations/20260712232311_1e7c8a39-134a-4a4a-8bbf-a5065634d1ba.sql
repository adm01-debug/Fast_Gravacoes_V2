
DROP POLICY IF EXISTS "Users can view audit logs of sheets they can access" ON public.technical_sheet_audit_logs;
CREATE POLICY "Elevated or published sheets audit visibility"
ON public.technical_sheet_audit_logs FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(),'coordinator')
  OR public.has_role(auth.uid(),'manager')
  OR public.has_role(auth.uid(),'admin')
  OR EXISTS (
    SELECT 1 FROM public.technical_sheets ts
    WHERE ts.id = technical_sheet_id
      AND ts.status = 'published'
  )
);
