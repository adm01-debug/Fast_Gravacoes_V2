-- Add composite and partial indexes for high-read query patterns.
--
-- Single-column FK indexes already exist on these tables (added in earlier
-- migrations). The indexes below cover multi-predicate queries where Postgres
-- must otherwise index-scan on one column and then sort or re-scan for the
-- second, causing unnecessary heap I/O on large tables.
--
-- All statements use IF NOT EXISTS so re-running this migration is safe.

-- ── spc_measurements ──────────────────────────────────────────────────────────
-- SPC chart load: "fetch N latest measurements for parameter X".
-- Without this composite, Postgres scans idx_spc_measurements_parameter_id
-- and then re-sorts by measured_at — a costly sort on a high-volume table.
CREATE INDEX IF NOT EXISTS idx_spc_measurements_param_measured_at
  ON public.spc_measurements (parameter_id, measured_at DESC);

-- Operator-drill-down: "show all measurements taken by operator Y".
CREATE INDEX IF NOT EXISTS idx_spc_measurements_operator_id
  ON public.spc_measurements (operator_id);

-- ── production_lots ───────────────────────────────────────────────────────────
-- Date-range lot queries (e.g., "lots produced this week").
CREATE INDEX IF NOT EXISTS idx_production_lots_production_date
  ON public.production_lots (production_date DESC);

-- Most common kanban filter: active/quarantine lots sorted by production date.
-- Covers "WHERE status = X ORDER BY production_date DESC" with index-only scan.
CREATE INDEX IF NOT EXISTS idx_production_lots_status_date
  ON public.production_lots (status, production_date DESC);

-- ── lot_movements ─────────────────────────────────────────────────────────────
-- Movement audit trail for a lot, time-ordered.
-- Existing idx_lot_movements_lot_id covers the filter but not the sort.
CREATE INDEX IF NOT EXISTS idx_lot_movements_lot_created_at
  ON public.lot_movements (lot_id, created_at DESC);

-- Global filter by movement type (e.g., "show all transfers today").
CREATE INDEX IF NOT EXISTS idx_lot_movements_movement_type
  ON public.lot_movements (movement_type);

-- ── lot_quality_inspections ───────────────────────────────────────────────────
-- Inspection history for a lot, time-ordered.
-- Existing idx_lot_quality_inspections_lot_id covers the filter but not the sort.
CREATE INDEX IF NOT EXISTS idx_lot_quality_inspections_lot_inspected_at
  ON public.lot_quality_inspections (lot_id, inspected_at DESC);

-- Inspector productivity queries: "all inspections by inspector Z".
CREATE INDEX IF NOT EXISTS idx_lot_quality_inspections_inspector_id
  ON public.lot_quality_inspections (inspector_id);

-- ── abc_job_costs ─────────────────────────────────────────────────────────────
-- Recency queries: "latest cost recalculation run" and time-range cost reports.
CREATE INDEX IF NOT EXISTS idx_abc_job_costs_calculated_at
  ON public.abc_job_costs (calculated_at DESC);

-- ── tpm_executions ────────────────────────────────────────────────────────────
-- Machine maintenance history: "last N executions for machine M".
-- Existing idx_tpm_executions_machine_id covers the filter but not the sort.
CREATE INDEX IF NOT EXISTS idx_tpm_executions_machine_started_at
  ON public.tpm_executions (machine_id, started_at DESC);

-- Risk dashboard: only rows where failure risk was detected — a small fraction
-- of the table. A partial index is much smaller and faster for this scan.
CREATE INDEX IF NOT EXISTS idx_tpm_executions_failure_risk_machine
  ON public.tpm_executions (machine_id, started_at DESC)
  WHERE failure_risk_detected = true;
