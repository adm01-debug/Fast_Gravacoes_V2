-- Semeia price_per_piece (fallback hardcoded 2.5 em useKPIs) e permite INSERT
-- por gestores — sem a policy, business_config só aceitava UPDATE de linhas
-- preexistentes e a config nunca era criável pela UI.

INSERT INTO public.business_config (key, value, description) VALUES
('price_per_piece', '2.5', 'Preço médio por peça usado no estimatedRevenue dos KPIs')
ON CONFLICT (key) DO NOTHING;

DROP POLICY IF EXISTS "Gestores podem inserir configs" ON public.business_config;
CREATE POLICY "Gestores podem inserir configs"
ON public.business_config FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'manager'));
