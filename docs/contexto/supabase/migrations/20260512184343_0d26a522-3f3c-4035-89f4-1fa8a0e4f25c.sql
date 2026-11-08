-- Adicionar colunas de custos na tabela shipments
ALTER TABLE public.shipments 
ADD COLUMN IF NOT EXISTS freight_cost DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS insurance_cost DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_cost DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cost_currency TEXT DEFAULT 'BRL'

-- Criar tabela de detalhamento de custos de frete (Shipment Costs)
CREATE TABLE IF NOT EXISTS public.shipment_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  cost_type TEXT NOT NULL, -- 'freight', 'insurance', 'tax', 'handling', 'other'
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BRL',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
)

-- Habilitar RLS
ALTER TABLE public.shipment_costs ENABLE ROW LEVEL SECURITY

-- Criar políticas para shipment_costs
CREATE POLICY "Users can view shipment costs" 
ON public.shipment_costs 
FOR SELECT 
USING (true)

CREATE POLICY "Users can insert shipment costs" 
ON public.shipment_costs 
FOR INSERT 
WITH CHECK (true)

CREATE POLICY "Users can update shipment costs" 
ON public.shipment_costs 
FOR UPDATE
USING (true)

-- Create function to update timestamps if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql

-- Create trigger for automatic timestamp updates
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_shipment_costs_updated_at') THEN
        CREATE TRIGGER update_shipment_costs_updated_at
        BEFORE UPDATE ON public.shipment_costs
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$
