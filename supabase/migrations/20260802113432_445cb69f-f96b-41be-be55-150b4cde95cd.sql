
-- #55: Waste Tracking System (Sustentabilidade)
CREATE TABLE IF NOT EXISTS public.packaging_waste (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    material_type text NOT NULL CHECK (material_type IN ('plastic', 'cardboard', 'tape', 'bubble_wrap', 'other')),
    weight_kg numeric NOT NULL,
    task_id uuid REFERENCES public.packaging_tasks(id) ON DELETE SET NULL,
    operator_id uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now()
);

GRANT ALL ON public.packaging_waste TO authenticated;
GRANT ALL ON public.packaging_waste TO service_role;
ALTER TABLE public.packaging_waste ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert waste records" ON public.packaging_waste FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can read waste records" ON public.packaging_waste FOR SELECT TO authenticated USING (true);

-- #59: Função para gerar resumo de Manifesto
CREATE OR REPLACE FUNCTION public.get_packaging_manifest(p_task_ids uuid[])
RETURNS TABLE (
    order_number text,
    client_name text,
    package_type text,
    packages_count integer,
    total_weight numeric,
    shipping_address text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        j.order_number,
        j.client,
        t.package_type,
        t.packages_count,
        t.total_weight_kg,
        'Consultar Bitrix24'::text -- Placeholder para integração real
    FROM public.packaging_tasks t
    JOIN public.jobs j ON t.job_id = j.id
    WHERE t.id = ANY(p_task_ids);
END;
$$;
