-- Drop the overly permissive policy that allows operators to view other operator profiles
DROP POLICY IF EXISTS "Operators can view operator profiles" ON public.profiles
