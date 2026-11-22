-- Add is_active column to user_roles table for temporary deactivation
ALTER TABLE public.user_roles 
ADD COLUMN is_active boolean NOT NULL DEFAULT true

-- Add index for faster filtering by active status
CREATE INDEX idx_user_roles_is_active ON public.user_roles(is_active)

-- Comment for documentation
COMMENT ON COLUMN public.user_roles.is_active IS 'Indicates if the user role is currently active. Inactive operators cannot access operator-specific features.'
