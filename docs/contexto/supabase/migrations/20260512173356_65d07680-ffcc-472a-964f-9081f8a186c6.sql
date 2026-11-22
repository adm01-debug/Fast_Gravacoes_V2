-- Create shipping providers table
CREATE TABLE IF NOT EXISTS public.shipping_providers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    contact_info TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
)

-- Create shipments table
CREATE TABLE IF NOT EXISTS public.shipments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES public.shipping_providers(id),
    tracking_code TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, in_transit, delivered, returned, cancelled
    origin TEXT,
    destination TEXT,
    estimated_delivery TIMESTAMP WITH TIME ZONE,
    actual_delivery TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
)

-- Add shipping fields to jobs if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'shipment_id') THEN
        ALTER TABLE public.jobs ADD COLUMN shipment_id UUID REFERENCES public.shipments(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'shipping_status') THEN
        ALTER TABLE public.jobs ADD COLUMN shipping_status TEXT;
    END IF;
END $$

-- Enable RLS
ALTER TABLE public.shipping_providers ENABLE ROW LEVEL SECURITY

ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY

-- Drop existing policies if they exist to avoid errors on retry
DROP POLICY IF EXISTS "Shipping providers are viewable by all authenticated users" ON public.shipping_providers

DROP POLICY IF EXISTS "Managers and admins can manage shipping providers" ON public.shipping_providers

DROP POLICY IF EXISTS "Shipments are viewable by all authenticated users" ON public.shipments

DROP POLICY IF EXISTS "Coordinators and above can manage shipments" ON public.shipments

-- Policies for shipping_providers
CREATE POLICY "Shipping providers are viewable by all authenticated users"
ON public.shipping_providers FOR SELECT
USING (auth.role() = 'authenticated')

CREATE POLICY "Managers and admins can manage shipping providers"
ON public.shipping_providers
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role IN ('admin'::app_role, 'manager'::app_role)
    )
)

-- Policies for shipments
CREATE POLICY "Shipments are viewable by all authenticated users"
ON public.shipments FOR SELECT
USING (auth.role() = 'authenticated')

CREATE POLICY "Coordinators and above can manage shipments"
ON public.shipments
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role IN ('admin'::app_role, 'manager'::app_role, 'coordinator'::app_role)
    )
)

-- Triggers for updated_at (ensure the function exists first)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql

DROP TRIGGER IF EXISTS update_shipping_providers_updated_at ON public.shipping_providers

CREATE TRIGGER update_shipping_providers_updated_at
BEFORE UPDATE ON public.shipping_providers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()

DROP TRIGGER IF EXISTS update_shipments_updated_at ON public.shipments

CREATE TRIGGER update_shipments_updated_at
BEFORE UPDATE ON public.shipments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()

-- Seed some default providers if table is empty
INSERT INTO public.shipping_providers (name)
SELECT name FROM (
    SELECT 'Loggi' AS name UNION ALL
    SELECT 'Jadlog' UNION ALL
    SELECT 'Correios' UNION ALL
    SELECT 'Retirada no Local'
) t
WHERE NOT EXISTS (SELECT 1 FROM public.shipping_providers)
