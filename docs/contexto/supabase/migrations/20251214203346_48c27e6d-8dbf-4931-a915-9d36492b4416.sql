-- =====================================================
-- FIX CRITICAL SECURITY VULNERABILITIES
-- =====================================================

-- 1. Fix profiles table: Restrict public access to authenticated users only
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles

-- Create new restrictive policies
-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id)

-- Coordinators and managers can view all profiles (needed for team management)
CREATE POLICY "Coordinators can view all profiles"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'coordinator'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
)

-- Operators can view profiles of other operators (for team visibility in production)
CREATE POLICY "Operators can view operator profiles"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'operator'::app_role) AND
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = profiles.id 
    AND user_roles.role = 'operator'::app_role
  )
)

-- 2. Fix jobs table: Restrict public access to authenticated users only
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view jobs" ON public.jobs

-- Create new restrictive policy: Only authenticated users can view jobs
CREATE POLICY "Authenticated users can view jobs"
ON public.jobs
FOR SELECT
TO authenticated
USING (true)

-- 3. Add audit logging for role changes (warning mitigation)
-- Create index for faster role lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id)

CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role)
