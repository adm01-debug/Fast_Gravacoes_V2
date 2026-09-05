-- Segurança: a policy de INSERT em notifications ainda usava WITH CHECK (true)
-- (criada em 20241224000001, nunca revista pelas ondas de hardening posteriores).
-- Qualquer usuário autenticado podia inserir notificação para QUALQUER user_id
-- (spam/phishing no feed de outro usuário). Alinhado ao mesmo padrão já aplicado
-- em push_notifications (20260712232418): próprio usuário OU role elevada.
DROP POLICY IF EXISTS "Systems can create notifications" ON public.notifications;

CREATE POLICY "Users or elevated roles can create notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'coordinator')
  OR public.has_role(auth.uid(), 'manager')
  OR public.has_role(auth.uid(), 'admin')
);
