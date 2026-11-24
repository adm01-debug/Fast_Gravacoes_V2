-- Chave de idempotencia para jobs criados por integracao externa.
--
-- O Promo Design enfileira `os.closed` e reenvia em caso de retry/reenvio
-- manual. Sem chave unica, cada reenvio criaria um job duplicado na producao.
-- O indice e parcial (WHERE external_ref IS NOT NULL) porque jobs criados
-- manualmente na UI nao tem referencia externa e nao devem colidir entre si
-- no valor NULL.

ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS external_ref TEXT

COMMENT ON COLUMN public.jobs.external_ref IS
  'Chave de idempotencia do sistema de origem (ex.: service_orders.id do Promo Design).'

CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_external_ref
  ON public.jobs (external_ref)
  WHERE external_ref IS NOT NULL
