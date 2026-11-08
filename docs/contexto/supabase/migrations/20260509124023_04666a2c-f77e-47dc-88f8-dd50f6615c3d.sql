-- Create inventory items table
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- 'ink', 'screen', 'solvent', 'consumable', 'other'
    current_stock NUMERIC NOT NULL DEFAULT 0,
    unit TEXT NOT NULL, -- 'kg', 'unit', 'l', 'm'
    min_stock_level NUMERIC NOT NULL DEFAULT 0,
    location TEXT,
    specification TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
)

-- Enable RLS for inventory items
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY

CREATE POLICY "Inventory items viewable by authenticated users" 
ON public.inventory_items FOR SELECT 
USING (auth.uid() IS NOT NULL)

CREATE POLICY "Inventory items managed by managers/coordinators" 
ON public.inventory_items 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('manager', 'coordinator')
  )
)

-- Create inventory movements table for audit trail
CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    type TEXT NOT NULL, -- 'IN' (Entry), 'OUT' (Exit), 'ADJUST' (Correction)
    quantity NUMERIC NOT NULL,
    reason TEXT,
    job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
)

-- Enable RLS for movements
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY

CREATE POLICY "Movements viewable by authenticated users" 
ON public.inventory_movements FOR SELECT 
USING (auth.uid() IS NOT NULL)

-- Add inventory_item_id to technical_sheet_materials to link them
ALTER TABLE public.technical_sheet_materials 
ADD COLUMN IF NOT EXISTS inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL

-- Function to update current stock on movement
CREATE OR REPLACE FUNCTION public.update_inventory_stock()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.type = 'IN') THEN
        UPDATE public.inventory_items 
        SET current_stock = current_stock + NEW.quantity,
            updated_at = now()
        WHERE id = NEW.item_id;
    ELSIF (NEW.type = 'OUT') THEN
        UPDATE public.inventory_items 
        SET current_stock = current_stock - NEW.quantity,
            updated_at = now()
        WHERE id = NEW.item_id;
    ELSIF (NEW.type = 'ADJUST') THEN
        UPDATE public.inventory_items 
        SET current_stock = NEW.quantity, -- In ADJUST, we set the absolute value
            updated_at = now()
        WHERE id = NEW.item_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER

-- Trigger for stock update
CREATE TRIGGER tr_update_inventory_stock
AFTER INSERT ON public.inventory_movements
FOR EACH ROW EXECUTE FUNCTION public.update_inventory_stock()

-- Add some initial common items if table is empty
INSERT INTO public.inventory_items (name, category, current_stock, unit, min_stock_level, specification)
SELECT 'Tinta Branca Vinílica', 'ink', 25.5, 'kg', 5.0, 'Alta cobertura'
WHERE NOT EXISTS (SELECT 1 FROM public.inventory_items WHERE name = 'Tinta Branca Vinílica')

INSERT INTO public.inventory_items (name, category, current_stock, unit, min_stock_level, specification)
SELECT 'Solvente Retardador', 'solvent', 10.0, 'l', 2.0, 'Uso geral'
WHERE NOT EXISTS (SELECT 1 FROM public.inventory_items WHERE name = 'Solvente Retardador')
