-- Etapa 039 (RN-04): tirar a expedicao e o registro de perdas do caminho de
-- exclusao em cascata da OS.
--
-- public.production_losses e public.shipments sao prova de operacao: perda de
-- material e expedicao aconteceram de verdade e nao se reconstroem. Hoje as duas
-- apontam para public.jobs com ON DELETE CASCADE, entao apagar uma OS apagava
-- tambem o registro de perdas e a expedicao dela.
--
-- ON DELETE RESTRICT fecha esse caminho: a OS so sai se nao houver prova
-- vinculada. O bloqueio por status e por producao registrada e o assunto da
-- etapa 036 (trigger BEFORE DELETE).
--
-- Ficam em CASCADE, por serem dado derivado ou gerado pela propria maquina:
-- abc_job_costs, job_status_audit, job_status_history, packaging_tasks,
-- pre_production_checklists e qr_scan_history. Motivo registrado: a trilha de
-- status recebe linha em qualquer mudanca de status, inclusive o "delayed"
-- automatico do dashboard, e a mantendo em CASCADE a exclusao legitima de uma OS
-- sem producao (fluxo de correcao de cadastro) continua funcionando.
--
-- Arquivamento (etapa 038, migration 20261128130000): a rotina de arquivar OS
-- concluida copia os filhos para archived_jobs.children e depois apaga as linhas
-- originais antes de apagar a OS, inclusive nestas duas tabelas. Ou seja, o
-- RESTRICT protege a exclusao avulsa (usuario apagando OS na tela), nao o
-- arquivamento automatico. Decisao registrada:
--
--   * production_losses.job_id e NOT NULL, entao ON DELETE SET NULL nao cabe;
--     sem poder desvincular, o arquivamento copia e apaga. O total perdido
--     continua em jobs.lost_pieces, que e o que os relatorios somam
--     (useOperatorEvolution.ts:149), e a copia fica em archived_jobs.children;
--     a lista detalhada (useProductionLosses) deixa de mostrar perdas de OS
--     arquivadas, o que e o preco do arquivamento;
--   * shipments.job_id e nullable, mas fica em RESTRICT de proposito: a
--     expedicao e prova logistica e apagar OS com envio vinculado deve ser
--     acao consciente, nao cascata silenciosa.
--
-- lock_timeout curto limita a ESPERA por cada lock, nao o tempo em que ele fica
-- retido. Para nao segurar escrita em producao durante a varredura, a chave
-- entra como NOT VALID (DDL curto, sem varrer a tabela) e a varredura corre em
-- VALIDATE CONSTRAINT, que toma SHARE UPDATE EXCLUSIVE e nao bloqueia DML.
SET lock_timeout = '5s';
SET statement_timeout = '300s';

ALTER TABLE public.production_losses
  DROP CONSTRAINT IF EXISTS production_losses_job_id_fkey;

ALTER TABLE public.production_losses
  ADD CONSTRAINT production_losses_job_id_fkey
  FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE RESTRICT NOT VALID;

ALTER TABLE public.production_losses
  VALIDATE CONSTRAINT production_losses_job_id_fkey;

RESET statement_timeout;
RESET lock_timeout;