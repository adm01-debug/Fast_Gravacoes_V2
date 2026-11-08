-- Drop overly permissive policies for INSERT, UPDATE, DELETE
DROP POLICY IF EXISTS "Authenticated users can insert jobs" ON public.jobs

DROP POLICY IF EXISTS "Authenticated users can update jobs" ON public.jobs

DROP POLICY IF EXISTS "Authenticated users can delete jobs" ON public.jobs

-- Create restrictive policies for coordinators and managers only
CREATE POLICY "Coordinators and managers can insert jobs" 
ON public.jobs 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'coordinator'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
)

CREATE POLICY "Coordinators and managers can update jobs" 
ON public.jobs 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'coordinator'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
)

CREATE POLICY "Coordinators and managers can delete jobs" 
ON public.jobs 
FOR DELETE 
USING (
  has_role(auth.uid(), 'coordinator'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
)
