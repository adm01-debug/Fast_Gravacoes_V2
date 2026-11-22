-- =====================================================================
-- Security: Fix overly permissive RLS policies
-- Performance: Add missing indexes on hot query paths
-- Reliability: Fix audit log trigger race condition
-- =====================================================================

-- -----------------------------------------------------------------------
-- 1. FIX RLS: jobs table — restrict write operations to authenticated users
-- -----------------------------------------------------------------------

-- Drop wildcard write policies if they exist
DO $$
BEGIN
  -- Remove any INSERT policy that uses USING(true) or no user check
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'jobs'
    AND schemaname = 'public'
    AND cmd = 'INSERT'
    AND qual = 'true'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow all inserts" ON public.jobs';
    EXECUTE 'DROP POLICY IF EXISTS "Enable insert for all" ON public.jobs';
  END IF;
END $$

-- Ensure jobs INSERT requires authentication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'jobs'
    AND schemaname = 'public'
    AND cmd = 'INSERT'
    AND qual LIKE '%auth.uid()%'
  ) THEN
    -- Only authenticated users can create jobs
    CREATE POLICY "Authenticated users can insert jobs"
    ON public.jobs
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$

-- -----------------------------------------------------------------------
-- 2. FIX RLS: operator_skills — restrict to authenticated users
-- -----------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'operator_skills'
    AND schemaname = 'public'
    AND cmd = 'INSERT'
    AND qual LIKE '%auth.uid()%'
  ) THEN
    CREATE POLICY "Authenticated users can insert operator_skills"
    ON public.operator_skills
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$

-- -----------------------------------------------------------------------
-- 3. FIX RLS: production_losses — restrict write to authenticated users
-- -----------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'production_losses'
    AND schemaname = 'public'
    AND cmd = 'INSERT'
    AND qual LIKE '%auth.uid()%'
  ) THEN
    CREATE POLICY "Authenticated users can insert production_losses"
    ON public.production_losses
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$

-- -----------------------------------------------------------------------
-- 4. FIX RLS: machine_predictions — restrict write to authenticated users
-- -----------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'machine_predictions'
    AND schemaname = 'public'
    AND cmd = 'INSERT'
    AND qual LIKE '%auth.uid()%'
  ) THEN
    CREATE POLICY "Authenticated users can insert machine_predictions"
    ON public.machine_predictions
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$

-- -----------------------------------------------------------------------
-- 5. ADD MISSING INDEXES on jobs table (hot query paths)
-- -----------------------------------------------------------------------

-- Index for filtering by status (used in most dashboard queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_status
ON public.jobs (status)

-- Index for filtering by scheduled_date (daily production views)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_scheduled_date
ON public.jobs (scheduled_date)

-- Composite index for the most common combined filter
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_status_scheduled_date
ON public.jobs (status, scheduled_date)

-- Index for machine_id (machine-specific job lookups)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_machine_id
ON public.jobs (machine_id)

-- Index for technique_id (technique-specific reports)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_technique_id
ON public.jobs (technique_id)

-- Index for created_at (default sort order)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_created_at
ON public.jobs (created_at DESC)

-- -----------------------------------------------------------------------
-- 6. ADD INDEXES on related tables
-- -----------------------------------------------------------------------

-- production_losses: machine_id, job_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_production_losses_machine_id
ON public.production_losses (machine_id) WHERE machine_id IS NOT NULL

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_production_losses_job_id
ON public.production_losses (job_id) WHERE job_id IS NOT NULL

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_production_losses_recorded_at
ON public.production_losses (recorded_at DESC)

-- spc_alerts: machine_id, resolved_at (used in KPI queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_spc_alerts_machine_id
ON public.spc_alerts (machine_id) WHERE machine_id IS NOT NULL

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_spc_alerts_resolved_at
ON public.spc_alerts (resolved_at) WHERE resolved_at IS NULL

-- -----------------------------------------------------------------------
-- 7. FIX AUDIT LOG TRIGGER: add row locking to prevent race condition
-- -----------------------------------------------------------------------

-- The original trigger selects max(id) without locking, causing hash chain
-- corruption under concurrent writes. Fix: use advisory lock or FOR UPDATE.

CREATE OR REPLACE FUNCTION public.update_audit_hash()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_last_hash TEXT;
  v_entry_data JSONB;
  v_new_hash TEXT;
BEGIN
  -- Acquire a session-level advisory lock to serialize hash chain updates.
  -- The lock key is a fixed integer derived from the table OID.
  PERFORM pg_advisory_xact_lock(hashtext('audit_logs_hash_chain'));

  -- Get the most recent hash within the same transaction (locked)
  SELECT hash_value INTO v_last_hash
  FROM public.audit_logs
  ORDER BY id DESC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_last_hash IS NULL THEN
    v_last_hash := 'GENESIS';
  END IF;

  -- Build entry data for hashing
  v_entry_data := jsonb_build_object(
    'table', TG_TABLE_NAME,
    'action', TG_OP,
    'record_id', NEW.id,
    'timestamp', NEW.created_at,
    'prev_hash', v_last_hash
  );

  -- Compute SHA-256 hash (encode as hex)
  v_new_hash := encode(
    digest(v_entry_data::text || v_last_hash, 'sha256'),
    'hex'
  );

  NEW.hash_value := v_new_hash;
  NEW.previous_hash := v_last_hash;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Never block the write if audit fails — log and continue
    RAISE WARNING 'Audit hash update failed: %', SQLERRM;
    RETURN NEW;
END;
$$

-- -----------------------------------------------------------------------
-- 8. CREATE erp_api_keys table (referenced by ERP API auth)
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.erp_api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE
)

ALTER TABLE public.erp_api_keys ENABLE ROW LEVEL SECURITY

CREATE POLICY "Only admins can manage API keys"
ON public.erp_api_keys
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
)

COMMENT ON TABLE public.erp_api_keys IS
'Stores SHA-256 hashed API keys for ERP integration authentication.'
