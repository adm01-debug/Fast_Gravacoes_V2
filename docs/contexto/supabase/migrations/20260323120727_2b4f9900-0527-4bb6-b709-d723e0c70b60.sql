CREATE TABLE public.query_telemetry (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operation TEXT NOT NULL,
  table_name TEXT,
  rpc_name TEXT,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  record_count INTEGER,
  query_limit INTEGER,
  query_offset INTEGER,
  count_mode TEXT,
  severity TEXT NOT NULL DEFAULT 'normal',
  error_message TEXT,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
)

CREATE INDEX idx_query_telemetry_created_at ON public.query_telemetry (created_at DESC)

CREATE INDEX idx_query_telemetry_severity ON public.query_telemetry (severity)

ALTER TABLE public.query_telemetry ENABLE ROW LEVEL SECURITY

CREATE POLICY "Coordinators and managers can view telemetry"
  ON public.query_telemetry FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'manager'::app_role))

CREATE POLICY "Authenticated can insert telemetry"
  ON public.query_telemetry FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL)

CREATE POLICY "Coordinators can delete telemetry"
  ON public.query_telemetry FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'coordinator'::app_role))
