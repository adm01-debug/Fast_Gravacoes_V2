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
-- lock_timeout curto: adicionar chave estrangeira toma SHARE ROW EXCLUSIVE em
-- production_losses. Se a tabela estiver ocupada, e melhor a migration falhar e
-- ser reaplicada do que segurar escrita em producao.
SET lock_timeout = '5s';

ALTER TABLE public.production_losses
  DROP CONSTRAINT IF EXISTS production_losses_job_id_fkey;

ALTER TABLE public.production_losses
  ADD CONSTRAINT production_losses_job_id_fkey
  FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE RESTRICT;

RESET lock_timeout;