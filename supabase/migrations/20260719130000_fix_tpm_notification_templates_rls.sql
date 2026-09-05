-- Fix permissive FOR ALL USING(true) policy on tpm_notification_templates.
--
-- Migration 20260508121901 created two policies on this table:
--   "Templates viewable by authenticated users" FOR SELECT USING(true)  -- fine
--   "Templates editable by admins"             FOR ALL   USING(true)    -- BUG
--
-- The second policy allows any authenticated user (including operators) to
-- INSERT, UPDATE, and DELETE TPM notification template configuration rows,
-- which can silently destroy the TPM notification system.
--
-- Fix: drop the permissive FOR ALL policy and replace it with a write policy
-- restricted to coordinator/manager/admin roles using the established
-- has_role() helper that is already in use across the schema.

DROP POLICY IF EXISTS "Templates editable by admins" ON public.tpm_notification_templates;

CREATE POLICY "tpm_notification_templates_write"
  ON public.tpm_notification_templates
  FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'coordinator')
    OR public.has_role(auth.uid(), 'manager')
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'coordinator')
    OR public.has_role(auth.uid(), 'manager')
    OR public.has_role(auth.uid(), 'admin')
  );
