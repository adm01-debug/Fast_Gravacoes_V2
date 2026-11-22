-- Create audit log table for operator status changes
CREATE TABLE public.operator_status_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operator_id UUID NOT NULL,
  operator_name TEXT,
  action TEXT NOT NULL CHECK (action IN ('activated', 'deactivated', 'removed')),
  performed_by UUID NOT NULL,
  performed_by_name TEXT,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
)

-- Enable RLS
ALTER TABLE public.operator_status_audit ENABLE ROW LEVEL SECURITY

-- Policy: Coordinators and managers can view audit logs
CREATE POLICY "Coordinators can view operator audit logs"
ON public.operator_status_audit
FOR SELECT
USING (
  has_role(auth.uid(), 'coordinator') OR 
  has_role(auth.uid(), 'manager')
)

-- Policy: Coordinators can insert audit logs
CREATE POLICY "Coordinators can insert operator audit logs"
ON public.operator_status_audit
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'coordinator'))

-- Create index for faster queries
CREATE INDEX idx_operator_status_audit_operator_id ON public.operator_status_audit(operator_id)

CREATE INDEX idx_operator_status_audit_created_at ON public.operator_status_audit(created_at DESC)

-- Comment for documentation
COMMENT ON TABLE public.operator_status_audit IS 'Audit log tracking operator status changes (activation, deactivation, removal)'
