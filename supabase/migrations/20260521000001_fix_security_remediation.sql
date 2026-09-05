-- =====================================================================
-- Corrective migration for 20260520000001_security_rls_indexes_fixes.sql
--
-- The previous remediation migration shipped with three concrete defects:
--   B1) update_audit_hash() was written against a non-existent
--       public.audit_logs(plural)/hash_value/id schema. The real trigger
--       fires on public.audit_log(singular) via process_audit_log_hashing(),
--       so the race condition was never actually mitigated.
--   B2) The erp_api_keys policy gated access on profiles.role = 'admin',
--       but the app_role enum is ('coordinator','operator','manager') and
--       'admin' does not exist. Effective access: nobody.
--   B3) CREATE INDEX CONCURRENTLY cannot run inside the implicit transaction
--       the migration runner wraps each file in, so all idx_* creations
--       failed silently (or aborted the migration).
--
-- This migration is idempotent.
-- =====================================================================

-- ---------------------------------------------------------------------
-- B1. Serialize the audit_log hash chain via advisory xact lock
-- ---------------------------------------------------------------------
-- Recreates the real BEFORE INSERT trigger function on public.audit_log
-- with pg_advisory_xact_lock at the top, so two concurrent inserts cannot
-- both read the same predecessor row before either commits.
CREATE OR REPLACE FUNCTION public.process_audit_log_hashing()
RETURNS TRIGGER AS $$
DECLARE
    last_hash text;
BEGIN
    -- Serialize hash-chain extension across concurrent transactions.
    -- The lock is released automatically at COMMIT/ROLLBACK.
    PERFORM pg_advisory_xact_lock(hashtext('audit_log_hash_chain'));

    SELECT hash INTO last_hash
    FROM public.audit_log
    ORDER BY created_at DESC, id DESC
    LIMIT 1;

    NEW.previous_hash := COALESCE(last_hash, 'GENESIS');
    NEW.hash := public.calculate_audit_hash(NEW);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- B2. Replace the dead 'admin'-gated policy on erp_api_keys
-- ---------------------------------------------------------------------
-- 'admin' is not a member of public.app_role; the original policy granted
-- nothing. Re-gate on the real role model via has_role(auth.uid(),'manager').
DROP POLICY IF EXISTS "Only admins can manage API keys" ON public.erp_api_keys;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='erp_api_keys') THEN
    EXECUTE $pol$
      CREATE POLICY "Managers can manage API keys"
      ON public.erp_api_keys
      FOR ALL
      USING (public.has_role(auth.uid(), 'manager'::public.app_role))
      WITH CHECK (public.has_role(auth.uid(), 'manager'::public.app_role))
    $pol$;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------
-- B3. Recreate the indexes without CONCURRENTLY
-- ---------------------------------------------------------------------
-- Same names as 20260520000001 so the intent is preserved. On large tables
-- in production, prefer running CONCURRENTLY manually outside a migration.
CREATE INDEX IF NOT EXISTS idx_jobs_status
  ON public.jobs (status);

CREATE INDEX IF NOT EXISTS idx_jobs_scheduled_date
  ON public.jobs (scheduled_date);

CREATE INDEX IF NOT EXISTS idx_jobs_status_scheduled_date
  ON public.jobs (status, scheduled_date);

CREATE INDEX IF NOT EXISTS idx_jobs_machine_id
  ON public.jobs (machine_id);

CREATE INDEX IF NOT EXISTS idx_jobs_technique_id
  ON public.jobs (technique_id);

CREATE INDEX IF NOT EXISTS idx_jobs_created_at
  ON public.jobs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_production_losses_machine_id
  ON public.production_losses (machine_id) WHERE machine_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_production_losses_job_id
  ON public.production_losses (job_id) WHERE job_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_production_losses_recorded_at
  ON public.production_losses (recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_spc_alerts_machine_id
  ON public.spc_alerts (machine_id) WHERE machine_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_spc_alerts_resolved_at
  ON public.spc_alerts (resolved_at) WHERE resolved_at IS NULL;
