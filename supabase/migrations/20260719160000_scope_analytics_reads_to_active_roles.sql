-- Replace permissive USING(true) SELECT policies on three analytics tables.
--
-- Background: daily_summaries, efficiency_alert_history, and
-- spc_capability_history all had SELECT policies scoped to the
-- `authenticated` role with USING(true).  Although this required a valid
-- JWT (no unauthenticated access), it allowed any newly-created user who
-- had not yet been assigned any active role to read the full contents of
-- these tables via the PostgREST API.
--
-- Fix: replace USING(true) with a correlated EXISTS check against
-- user_roles.  user_roles already has a "Users can view their own roles"
-- policy (auth.uid() = user_id), so the subquery runs safely under RLS
-- without additional grants.  Only users with at least one is_active=true
-- row in user_roles can now read these tables.
--
-- Write policies are already correctly restricted to elevated roles in
-- migrations 20260317221345 (daily_summaries),
-- 20260711152441 (spc_capability_history), and
-- 20260712232418 (efficiency_alert_history); this migration touches
-- SELECT only.

-- Helper expression used in all three policies (inline for clarity):
-- EXISTS (SELECT 1 FROM public.user_roles
--         WHERE user_id = auth.uid() AND is_active = true)

-- ── daily_summaries ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can view summaries" ON public.daily_summaries;

CREATE POLICY "Active role users can view summaries"
  ON public.daily_summaries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = auth.uid()
        AND is_active = true
    )
  );

-- ── efficiency_alert_history ───────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can view efficiency alert history"
  ON public.efficiency_alert_history;
-- Also drop the earlier variant that shares a different name, in case it
-- survived the June 2026 migration chain.
DROP POLICY IF EXISTS "Authenticated users can view efficiency alerts"
  ON public.efficiency_alert_history;

CREATE POLICY "Active role users can view efficiency alerts"
  ON public.efficiency_alert_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = auth.uid()
        AND is_active = true
    )
  );

-- ── spc_capability_history ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can view capability history"
  ON public.spc_capability_history;

CREATE POLICY "Active role users can view capability history"
  ON public.spc_capability_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = auth.uid()
        AND is_active = true
    )
  );
