-- Create junction table for operator-machine assignments
CREATE TABLE public.operator_machines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  machine_id uuid NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  assigned_at timestamp with time zone NOT NULL DEFAULT now(),
  assigned_by uuid REFERENCES auth.users(id),
  UNIQUE (operator_id, machine_id)
)

-- Enable RLS
ALTER TABLE public.operator_machines ENABLE ROW LEVEL SECURITY

-- Anyone can view assignments
CREATE POLICY "Anyone can view operator machines"
ON public.operator_machines
FOR SELECT
USING (true)

-- Only coordinators can manage assignments
CREATE POLICY "Coordinators can manage operator machines"
ON public.operator_machines
FOR ALL
USING (has_role(auth.uid(), 'coordinator'::app_role))
WITH CHECK (has_role(auth.uid(), 'coordinator'::app_role))

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.operator_machines
