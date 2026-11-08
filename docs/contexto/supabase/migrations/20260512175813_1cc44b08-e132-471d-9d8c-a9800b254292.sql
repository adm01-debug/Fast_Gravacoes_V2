ALTER TABLE public.inventory_items 
ADD COLUMN IF NOT EXISTS daily_usage_avg NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS days_of_supply INTEGER DEFAULT 0

-- Trigger para atualizar days_of_supply quando o estoque ou a média de uso mudar
CREATE OR REPLACE FUNCTION public.calculate_days_of_supply()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.daily_usage_avg > 0 THEN
        NEW.days_of_supply = FLOOR(NEW.current_stock / NEW.daily_usage_avg);
    ELSE
        NEW.days_of_supply = 999; -- Infinito ou não aplicável
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql

DROP TRIGGER IF EXISTS tr_calculate_days_of_supply ON public.inventory_items

CREATE TRIGGER tr_calculate_days_of_supply
BEFORE INSERT OR UPDATE ON public.inventory_items
FOR EACH ROW EXECUTE FUNCTION public.calculate_days_of_supply()
