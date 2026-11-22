-- Create password reset requests table
CREATE TABLE public.password_reset_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  requested_by_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_by_name TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '24 hours')
)

-- Enable RLS
ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY

-- Policies
CREATE POLICY "Anyone can create password reset requests"
ON public.password_reset_requests
FOR INSERT
WITH CHECK (true)

CREATE POLICY "Coordinators and managers can view all requests"
ON public.password_reset_requests
FOR SELECT
USING (has_role(auth.uid(), 'coordinator') OR has_role(auth.uid(), 'manager'))

CREATE POLICY "Coordinators and managers can update requests"
ON public.password_reset_requests
FOR UPDATE
USING (has_role(auth.uid(), 'coordinator') OR has_role(auth.uid(), 'manager'))

-- Index for faster lookups
CREATE INDEX idx_password_reset_requests_status ON public.password_reset_requests(status)

CREATE INDEX idx_password_reset_requests_email ON public.password_reset_requests(user_email)
