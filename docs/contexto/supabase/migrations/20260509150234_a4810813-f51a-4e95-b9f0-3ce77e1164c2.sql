-- Add price_per_unit to inventory_items
ALTER TABLE public.inventory_items 
ADD COLUMN price_per_unit NUMERIC DEFAULT 0

-- Add location tracking to inventory_movements
ALTER TABLE public.inventory_movements
ADD COLUMN from_location TEXT,
ADD COLUMN to_location TEXT

-- Update existing items with some sample prices if needed (optional)
UPDATE public.inventory_items SET price_per_unit = 15.5 WHERE price_per_unit = 0
