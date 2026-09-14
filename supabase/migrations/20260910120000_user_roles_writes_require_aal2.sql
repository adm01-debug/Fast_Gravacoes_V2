-- Etapa 7 do plano-mestre 10/10 — MFA AAL2 obrigatório para papéis elevados.
--
-- Endurece `public.user_roles` (a tabela mais sensível do RBAC: quem a escreve
-- controla papéis de qualquer usuário):
--   * Leitura: as policies existentes continuam sendo a fonte de verdade.
--   * Escrita (INSERT/UPDATE/DELETE): exige sessão AAL2 além das policies de
--     papel já existentes
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
-- Policies permissivas são combinadas com OR no PostgreSQL. Por isso estas
-- policies são RESTRICTIVE: elas são combinadas com AND com as policies
-- permissivas legadas que já delimitam o papel e o papel-alvo. Assim AAL1 não
-- consegue aproveitar uma policy antiga, e coordinator/manager continuam sem
-- poder elevar privilégios além das permissões previamente definidas.
CREATE POLICY "AAL2 required for user_roles inserts"
  ON public.user_roles
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
  );

CREATE POLICY "AAL2 required for user_roles updates"
  ON public.user_roles
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (
    coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
  )
  WITH CHECK (
    coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
  );

CREATE POLICY "AAL2 required for user_roles deletes"
  ON public.user_roles
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (
    coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
  );
