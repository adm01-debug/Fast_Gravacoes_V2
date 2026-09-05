
-- Hardening RLS em todas as tabelas de packaging (Fixed)

-- 2. packaging_defects
DROP POLICY IF EXISTS "Anyone can see defects" ON public.packaging_defects;
CREATE POLICY "Anyone can see defects" ON public.packaging_defects FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authorized defect management" ON public.packaging_defects;
CREATE POLICY "Authorized defect management" ON public.packaging_defects 
FOR ALL TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.packaging_tasks 
        WHERE id = packaging_task_id AND (assigned_to = auth.uid() OR public.has_role(auth.uid(), 'coordinator'))
    )
);
