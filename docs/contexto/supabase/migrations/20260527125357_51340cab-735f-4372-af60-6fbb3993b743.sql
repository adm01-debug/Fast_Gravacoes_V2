-- Convert jobs.start_time and jobs.end_time to TIME
ALTER TABLE public.jobs 
ALTER COLUMN start_time TYPE TIME USING (CASE WHEN start_time ~ '^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$' THEN start_time::TIME ELSE NULL END),
ALTER COLUMN end_time TYPE TIME USING (CASE WHEN end_time ~ '^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$' THEN end_time::TIME ELSE NULL END)

-- Add indexes for high cardinality/frequent query columns
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled_date_status ON public.jobs (scheduled_date, status)

CREATE INDEX IF NOT EXISTS idx_jobs_technique_id ON public.jobs (technique_id)

CREATE INDEX IF NOT EXISTS idx_jobs_machine_id ON public.jobs (machine_id)

-- Ensure user_roles has an index on user_id and role
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id_role ON public.user_roles (user_id, role)
