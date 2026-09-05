-- Add missing FK: user_roles.user_id → profiles.id
-- This enables PostgREST to resolve the join in queries like:
--   user_roles!inner(profiles!inner(...))
-- Without this, the schema cache cannot find the relationship path.

ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Ensure no orphaned user_roles rows exist before applying the FK
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.user_roles ur
    LEFT JOIN public.profiles p ON p.id = ur.user_id
    WHERE p.id IS NULL
  ) THEN
    RAISE NOTICE 'Found user_roles rows without matching profiles. These will fail the FK constraint.';
  END IF;
END $$;
