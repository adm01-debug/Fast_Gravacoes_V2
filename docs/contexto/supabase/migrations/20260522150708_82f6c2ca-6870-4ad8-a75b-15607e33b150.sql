-- Update foreign key for inventory_movements to point to profiles instead of auth.users
ALTER TABLE public.inventory_movements
DROP CONSTRAINT IF EXISTS inventory_movements_user_id_fkey

ALTER TABLE public.inventory_movements
ADD CONSTRAINT inventory_movements_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id)
ON DELETE SET NULL
