-- Ensure authenticated users can see their own layouts
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'dashboard_layouts' AND policyname = 'Users can view their own layouts'
    ) THEN
        CREATE POLICY "Users can view their own layouts" 
        ON public.dashboard_layouts 
        FOR SELECT 
        TO authenticated 
        USING (auth.uid() = user_id);
    END IF;
END $$
