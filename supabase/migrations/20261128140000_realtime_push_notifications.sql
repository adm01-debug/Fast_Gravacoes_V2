-- Central de Notificacoes: entrega ao vivo dos avisos pessoais.
--
-- public.push_notifications e' a fonte da Central e do contador do sino, mas
-- nunca foi adicionada a publicacao supabase_realtime. As migrations que
-- publicaram outras tabelas (jobs, machines, maintenance_alerts,
-- daily_summaries...) listam tudo menos ela: o canal assina com sucesso
-- (SUBSCRIBED) e nao recebe INSERT nenhum, entao a Central so atualiza no
-- botao Atualizar e o sino depende de recarga da pagina.
--
-- Idempotente: consulta pg_publication_tables antes de alterar a publicacao,
-- para poder ser reaplicada sem erro em ambiente que ja tenha a tabela.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1
       FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'push_notifications'
     )
  THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.push_notifications';
  END IF;
END $$;

-- As outras tabelas que a Central assina (maintenance_alerts, machine_predictions
-- e daily_summaries) ja estao publicadas desde 20260112223232_92ec6cef, portanto
-- esta migration nao precisa republica-las.

-- Realtime + RLS: sem REPLICA IDENTITY FULL o evento de DELETE carrega apenas a
-- chave primaria. Como o Realtime avalia a policy de SELECT sobre o registro que
-- recebe, um DELETE sem os demais campos nao passa pela policy "Users can view
-- their own notifications" (auth.uid() = user_id) e o evento pode chegar a
-- assinantes que nao sao o destinatario. Com a identidade completa o registro
-- antigo fica disponivel e a policy filtra o DELETE como filtra o INSERT.
ALTER TABLE public.push_notifications REPLICA IDENTITY FULL;