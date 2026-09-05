
CREATE INDEX IF NOT EXISTS idx_telemetry_traces_created_at ON public.telemetry_traces (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_traces_trace_id ON public.telemetry_traces (trace_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_traces_service_created ON public.telemetry_traces (service_name, created_at DESC);
ANALYZE public.telemetry_traces;
