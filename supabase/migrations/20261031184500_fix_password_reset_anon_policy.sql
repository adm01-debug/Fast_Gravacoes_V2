-- Fix: restaurar acesso anon ao INSERT em password_reset_requests
--
-- Contexto:
--   A tabela password_reset_requests e usada no fluxo "esqueci minha senha".
--   O usuario que esqueceu a senha NAO esta autenticado, portanto politicas
--   TO authenticated bloqueiam o fluxo inteiro.
--
--   Historico de regressoes:
--     20260412121530: trocou "Anyone can request" ? TO authenticated
--     20260712231426: adicionou WITH CHECK (jwt.email = user_email), impossivel para anon
--
-- Correcao:
--   Remove a policy que exige autenticacao para INSERT.
--   Cria policy que permite anon + authenticated com WITH CHECK (status = 'pending')
--   para impedir que um usuario anonimo insira um registro ja aprovado.
--
--   As demais policies (SELECT / UPDATE) permanecem restritas a coordinator/manager.

DROP POLICY IF EXISTS "Users can only request reset for their own email"
  ON public.password_reset_requests;

DROP POLICY IF EXISTS "Authenticated users can request password reset"
  ON public.password_reset_requests;

DROP POLICY IF EXISTS "Anyone can request password reset"
  ON public.password_reset_requests;

CREATE POLICY "Anyone can request password reset"
  ON public.password_reset_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (status = 'pending');
