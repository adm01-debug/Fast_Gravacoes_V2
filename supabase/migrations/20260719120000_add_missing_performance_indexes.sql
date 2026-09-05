-- Add missing performance indexes and integrity constraints.
--
-- Rationale:
--   1. abc_job_costs: individual FK indexes already exist (job_id, activity_id,
--      cost_pool_id) but the three-column combination must be UNIQUE to prevent
--      duplicate cost rows for the same (job, activity, pool) triple and to
--      enable efficient ON CONFLICT upserts in recalculation jobs.
--
--   2. spc_measurements: measured_at is the primary sort key in every SPC chart
--      query; without an index every chart render is a full table scan.
--
--   3. tpm_executions: filtering by (status, started_at) covers the common
--      "active executions in date range" query pattern used in the TPM dashboard.
--
--   4. production_lots: status-only index covers the "list active lots" query
--      that runs on the production kanban board.
--
--   5. maintenance_records: machine_id + started_at covers the predictive
--      maintenance "last N records per machine" pattern in ml-predictions.

-- 1. Composite UNIQUE for abc_job_costs to prevent duplicate cost allocations.
--    IF NOT EXISTS is safe here because no previous migration created this.
ALTER TABLE public.abc_job_costs
  ADD CONSTRAINT abc_job_costs_job_activity_pool_unique
  UNIQUE (job_id, activity_id, cost_pool_id);

-- 2. Index on spc_measurements(measured_at DESC) for time-ordered SPC queries.
CREATE INDEX IF NOT EXISTS idx_spc_measurements_measured_at
  ON public.spc_measurements (measured_at DESC);

-- 3. Composite covering index for tpm_executions status + time-range filtering.
CREATE INDEX IF NOT EXISTS idx_tpm_executions_status_started_at
  ON public.tpm_executions (status, started_at DESC);

-- 4. Index on production_lots(status) for kanban active-lot queries.
CREATE INDEX IF NOT EXISTS idx_production_lots_status
  ON public.production_lots (status);

-- 5. Composite index on maintenance_records(machine_id, started_at) for the
--    "latest records per machine" scan in the ML predictions function.
CREATE INDEX IF NOT EXISTS idx_maintenance_records_machine_started
  ON public.maintenance_records (machine_id, started_at DESC);
