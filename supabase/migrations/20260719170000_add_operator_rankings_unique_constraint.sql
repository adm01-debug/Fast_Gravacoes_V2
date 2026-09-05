-- Add UNIQUE constraint on operator_rankings(operator_id, ranking_type, period_start).
--
-- Background: operator_rankings has no uniqueness guarantee on the natural key
-- (operator_id, ranking_type, period_start).  Without this constraint:
--
--   1. The calculate-rankings edge function can create duplicate rows for the
--      same operator/type/period if it runs concurrently (e.g., two back-to-back
--      cron ticks while the first is still running) or retries after a partial
--      failure.  Duplicate rows corrupt the leaderboard: aggregations in the
--      frontend double-count the operator's score.
--
--   2. INSERT ... ON CONFLICT (operator_id, ranking_type, period_start) DO UPDATE
--      -- the standard upsert pattern for idempotent recalculation -- requires a
--      unique index on those columns to resolve the conflict target; without it,
--      Postgres rejects the statement with "there is no unique or exclusion
--      constraint matching the ON CONFLICT specification".
--
-- The constraint is added with NOT VALID first, then validated in a separate
-- statement.  On a live database this avoids a full-table ACCESS EXCLUSIVE lock
-- during the initial scan: VALIDATE CONSTRAINT acquires SHARE UPDATE EXCLUSIVE
-- (non-blocking for reads/inserts) instead.  If pre-existing duplicates exist,
-- VALIDATE will fail — the operator running this migration should first deduplicate
-- via: DELETE FROM operator_rankings WHERE id NOT IN (SELECT DISTINCT ON
-- (operator_id, ranking_type, period_start) id FROM operator_rankings
-- ORDER BY operator_id, ranking_type, period_start, created_at DESC);

ALTER TABLE public.operator_rankings
  ADD CONSTRAINT operator_rankings_operator_type_period_unique
  UNIQUE (operator_id, ranking_type, period_start)
  NOT VALID;

ALTER TABLE public.operator_rankings
  VALIDATE CONSTRAINT operator_rankings_operator_type_period_unique;
