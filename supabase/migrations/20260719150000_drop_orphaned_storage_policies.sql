-- Drop orphaned storage.objects policies that were never cleaned up.
--
-- Background: migrations 20260712231142 and 20260712231328 added properly
-- role-gated INSERT and SELECT policies for the tpm_signatures and
-- execution-evidence buckets, but only dropped the English-named policies
-- they knew about. The original Portuguese-named policies (created in May
-- 2026) were never dropped. Because RLS evaluates multiple policies with
-- OR semantics, the presence of the old permissive policies renders the
-- newer restrictive ones completely ineffective.
--
-- Specific issues:
--
--   1. "Usuários autenticados podem enviar assinaturas" — FOR INSERT on
--      tpm_signatures with auth.role()='authenticated'. Any authenticated
--      user can upload signatures, bypassing "Active roles can upload own
--      tpm signatures" (which requires has_any_active_role()).
--
--   2. "Assinaturas são visíveis para todos" — FOR SELECT on tpm_signatures
--      with no TO clause, allowing unauthenticated SELECT via the storage
--      API endpoint. The newer "Owner or staff view tpm signatures" policy
--      was added but never replaced this one.
--
--   3. "Anyone can view execution evidence" — FOR SELECT on execution-evidence
--      with no TO clause and no authentication requirement. Same issue as #2.

DROP POLICY IF EXISTS "Usuários autenticados podem enviar assinaturas" ON storage.objects;
DROP POLICY IF EXISTS "Assinaturas são visíveis para todos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view execution evidence" ON storage.objects;
