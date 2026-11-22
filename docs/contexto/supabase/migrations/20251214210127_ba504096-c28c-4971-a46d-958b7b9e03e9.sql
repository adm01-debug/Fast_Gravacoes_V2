-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Anyone can view sync history" ON public.bitrix24_sync_history

-- Create restrictive policy for coordinators and managers only
CREATE POLICY "Coordinators and managers can view sync history" 
ON public.bitrix24_sync_history 
FOR SELECT 
USING (
  has_role(auth.uid(), 'coordinator'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
)
