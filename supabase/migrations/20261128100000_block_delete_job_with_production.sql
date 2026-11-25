-- Etapa 036 (RN-04): bloqueia no banco a exclusao de OS que ja teve producao.
--
-- A regra R1.1 (docs/contexto/regras/07-REGRAS-DE-NEGOCIO.md:20-21) diz que um
-- job nao pode ser excluido se produced_quantity > 0 ou lost_pieces > 0, ou se
-- o status nao for queue, scheduled ou cancelled. Ela existia apenas no
-- documento: public.jobs nao tinha trigger BEFORE DELETE, e as quatro rotas de
-- exclusao (PendingQueue.tsx:233, KanbanBoard.tsx:255, JobDetailsModal e o
-- service) apagavam a OS direto. Como oito tabelas apontam para jobs com
-- ON DELETE CASCADE, a exclusao ainda levava embora expedicao, perdas de
-- producao e a trilha de status (a cascata e o assunto da etapa 039).
--
-- O banco e o unico ponto por onde as quatro rotas passam, por isso a regra
-- entra aqui. Mensagem em portugues, exibida pelo aplicativo.
--
-- Excecao deliberada: o arquivamento (etapa 038) precisa remover a OS concluida
-- de public.jobs dentro da mesma transacao que grava em public.archived_jobs.
-- Essa operacao e intencional e auditada, entao a funcao de arquivamento marca
-- a sessao com set_config('app.archiving_job', 'on', true) e o trigger a
-- respeita. Nenhum outro caminho de escrita define essa marcacao.
--
-- A marcacao entra aqui por ALTER FUNCTION ... SET e nao reescrevendo o corpo:
-- a funcao de 20261029002000 continua sendo a unica fonte da logica de
-- arquivamento, e recriar 190 linhas numa migration de trigger criaria duas
-- copias que divergem na proxima mudanca. O parametro e aplicado na entrada da
-- funcao e restaurado na saida, como um SET LOCAL.
--
-- ERRCODE estavel 'FG001' para o aplicativo reconhecer a recusa sem depender do
-- texto da mensagem (o PostgREST devolve o code no corpo do erro).

CREATE OR REPLACE FUNCTION public.validate_job_delete_allowed()
RETURNS TRIGGER LANGUAGE plpgsql AS
$function$
BEGIN
  IF current_setting('app.archiving_job', true) = 'on' THEN
    RETURN OLD;
  END IF;

  IF COALESCE(OLD.produced_quantity, 0) > 0 OR COALESCE(OLD.lost_pieces, 0) > 0 THEN
    RAISE EXCEPTION 'Nao e possivel excluir a OS %: ela ja tem producao registrada (% pecas produzidas, % pecas perdidas).',
      COALESCE(OLD.order_number, OLD.id::text), COALESCE(OLD.produced_quantity, 0), COALESCE(OLD.lost_pieces, 0)
      USING ERRCODE = 'FG001';
  END IF;

  IF OLD.status NOT IN ('queue', 'scheduled', 'cancelled') THEN
    RAISE EXCEPTION 'Nao e possivel excluir a OS %: o status atual (%) so permite exclusao de OS em fila, agendada ou cancelada.',
      COALESCE(OLD.order_number, OLD.id::text), OLD.status
      USING ERRCODE = 'FG001';
  END IF;

  RETURN OLD;
END;
$function$;

DROP TRIGGER IF EXISTS trg_validate_job_delete_allowed ON public.jobs;
CREATE TRIGGER trg_validate_job_delete_allowed
  BEFORE DELETE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.validate_job_delete_allowed();

-- Sem isto o gatilho recusaria a OS finalizada dentro do proprio arquivamento,
-- e archive_finished_jobs cairia no EXCEPTION do loop: a OS nunca sairia de
-- public.jobs e o cron passaria a contar um "skipped" por execucao.
ALTER FUNCTION public.archive_finished_jobs(timestamptz) SET app.archiving_job = 'on';