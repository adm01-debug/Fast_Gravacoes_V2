-- Corrigindo funções com search_path ausente e outras melhorias de segurança
ALTER FUNCTION public.verify_audit_chain() SET search_path = public

ALTER FUNCTION public.calculate_audit_hash(public.audit_log) SET search_path = public

ALTER FUNCTION public.process_audit_log_hashing() SET search_path = public

-- Corrigindo políticas excessivamente permissivas na tabela shipment_costs
DROP POLICY IF EXISTS "Users can insert shipment costs" ON public.shipment_costs

DROP POLICY IF EXISTS "Users can update shipment costs" ON public.shipment_costs

DROP POLICY IF EXISTS "Users can view shipment costs" ON public.shipment_costs

CREATE POLICY "Authenticated users can view shipment costs" 
ON public.shipment_costs FOR SELECT 
TO authenticated 
USING (true)

CREATE POLICY "Coordinators and managers can manage shipment costs" 
ON public.shipment_costs FOR ALL 
TO authenticated 
USING (has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'manager'::app_role))

-- Corrigindo limites de OEE na tabela techniques para percentuais (0-100)
-- O linter e a inspeção mostraram defaults como 300, 480, 600, o que sugere confusão com minutos ou outros valores.
ALTER TABLE public.techniques ALTER COLUMN low_threshold SET DEFAULT 30

ALTER TABLE public.techniques ALTER COLUMN medium_threshold SET DEFAULT 70

ALTER TABLE public.techniques ALTER COLUMN high_threshold SET DEFAULT 90

UPDATE public.techniques SET 
    low_threshold = 30 WHERE low_threshold > 100

UPDATE public.techniques SET 
    medium_threshold = 70 WHERE medium_threshold > 100

UPDATE public.techniques SET 
    high_threshold = 90 WHERE high_threshold > 100
