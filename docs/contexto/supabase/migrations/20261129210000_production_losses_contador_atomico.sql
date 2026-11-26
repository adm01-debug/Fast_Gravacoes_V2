-- Contador de perda e detalhe na mesma transacao.
--
-- Antes, src/features/production/hooks/useProductionLosses.ts chamava
-- public.increment_job_lost_pieces (transacao 1) e so depois inseria a linha em
-- public.production_losses (transacao 2). Falha no insert deixava o total da OS
-- ja incrementado, e a nova tentativa do usuario incrementava outra vez.
--
-- O trigger roda no mesmo comando do insert: ou os dois valem, ou nenhum.
-- SECURITY INVOKER de proposito: o UPDATE em public.jobs passa pelas politicas de
-- RLS de jobs como passava o fallback, entao quem registra a perda so consegue
-- mexer no contador de ordem que ja podia escrever (operador na propria maquina,
-- coordenador ou gerente). Com SECURITY DEFINER o gatilho viraria caminho de
-- escrita privilegiada: qualquer papel ativo inflaria perdidas de ordem de outra
-- maquina so inserindo a linha em production_losses.
CREATE OR REPLACE FUNCTION public.production_losses_aplicar_contador()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $fn$
BEGIN
  PERFORM public.increment_job_lost_pieces(NEW.job_id, NEW.quantity);
  RETURN NEW;
END;
$fn$

REVOKE ALL ON FUNCTION public.production_losses_aplicar_contador() FROM PUBLIC

REVOKE ALL ON FUNCTION public.production_losses_aplicar_contador() FROM anon

REVOKE ALL ON FUNCTION public.production_losses_aplicar_contador() FROM authenticated

DROP TRIGGER IF EXISTS trg_production_losses_contador ON public.production_losses

CREATE TRIGGER trg_production_losses_contador
AFTER INSERT ON public.production_losses
FOR EACH ROW
EXECUTE FUNCTION public.production_losses_aplicar_contador()
