
CREATE INDEX IF NOT EXISTS idx_jobs_created_at_desc ON public.jobs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_status_updated_at ON public.jobs (status, updated_at);
