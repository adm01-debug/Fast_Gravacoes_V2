-- Etapa 039 (RN-04), segunda parte: expedicao fora da cascata de exclusao da OS.
-- Ver o cabecalho de 20261128110000_fk_production_losses_restrict.sql para a
-- decisao completa (quais tabelas ficam em CASCADE e por que).
SET lock_timeout = '5s';

ALTER TABLE public.shipments
  DROP CONSTRAINT IF EXISTS shipments_job_id_fkey;

ALTER TABLE public.shipments
  ADD CONSTRAINT shipments_job_id_fkey
  FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE RESTRICT;

RESET lock_timeout;