-- Etapa 7 do plano-mestre 10/10 — MFA AAL2 obrigatório para papéis elevados.
--
-- Endurece `public.user_roles` (a tabela mais sensível do RBAC: quem a escreve
-- controla papéis de qualquer usuário):
--   * Leitura: mantida para coordinator/admin (UI de gestão) e para o próprio
--     usuário (policy "Users can view their own roles", inalterada).
--   * Escrita (INSERT/UPDATE/DELETE): exige papel elevado + sessão AAL2
--     (MFA verificado) — sessões AAL1 recebem 403 no banco, nas edge functions
--     (guard requireAal2 em _shared/auth.ts) e na UI (ProtectedRoute).
--
-- ⚠️ BREAKING (intencional, aprovado no plano-mestre): coordinator/admin sem
-- fator MFA verificado perdem escrita em user_roles até concluir o enrollment
-- em Configurações → Segurança (TwoFactorSetup) e re-autenticar.
--
-- Nota: `auth.jwt() ->> 'aal'` reflete o nível de garantia da SESSÃO atual
-- ('aal1' só-senha | 'aal2' MFA verificado). É nulo em tokens legados —
-- coalesce para 'aal1' mantém a postura fechada.
DROP POLICY IF EXISTS "Coordinators can manage roles" ON public.user_roles;

-- Leitura por papéis elevados (substitui o FOR ALL anterior no eixo SELECT)
CREATE POLICY "Elevated roles can view all roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'coordinator')
    OR public.has_role(auth.uid(), 'admin')
  );

-- Escrita exige papel elevado + AAL2
CREATE POLICY "Role inserts require elevated AAL2"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'admin'))
    AND coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
  );

CREATE POLICY "Role updates require elevated AAL2"
  ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING (
    (public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'admin'))
    AND coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
  )
  WITH CHECK (
    (public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'admin'))
    AND coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
  );

CREATE POLICY "Role deletes require elevated AAL2"
  ON public.user_roles
  FOR DELETE
  TO authenticated
  USING (
    (public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'admin'))
    AND coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
  );
