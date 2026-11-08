-- Allow operators to update jobs on their assigned machines
-- This enables production registration (produced_quantity, lost_pieces, actual_start_time, actual_end_time)
-- Note: Column-level restrictions are enforced at the application layer

CREATE POLICY "Operators can update jobs on assigned machines"
ON public.jobs
FOR UPDATE
TO authenticated
USING (
  -- Operator must have the operator role
  has_role(auth.uid(), 'operator'::app_role)
  AND
  -- Job must be on a machine assigned to this operator
  machine_id IN (
    SELECT machine_id 
    FROM public.operator_machines 
    WHERE operator_id = auth.uid()
  )
)
