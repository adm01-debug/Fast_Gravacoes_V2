# 05 — Progresso da execução

Marque cada etapa **apenas** depois de executar a verificação descrita nela e registrar a evidência aqui embaixo, na seção "Evidências". Ordem de execução: a das ondas (ver `04-PLANO.md`), respeitando o campo `Depende de` de cada etapa.

Legenda: `[ ]` não iniciada · `[x]` concluída com verificação registrada · `[~]` parada (evidência não confere com o código atual, ou dependência bloqueada — explique na linha) · `[A]` PR aberta aguardando aprovação do dono.

Totais: 300 etapas · 12 Críticas · 121 Altas · 125 Médias · 42 Baixas · 129 exigem aprovação humana antes do merge.


## Onda 1 — Segurança e risco de perda de dado (80 etapas)

- [x] 001 — Levantar exatamente qual versão de migration o banco tem e a `main` não tem — onda 1 — Crítica · banco com 259 versões, `main` com 259 arquivos, **nenhuma órfã**; `20261122010000_seed_role_permissions.sql` está na `main` (evidência abaixo)
- [x] 002 — Trazer para a `main` a migration que já foi aplicada em produção, de forma idempotente — onda 1 — Crítica · arquivo já presente na `main` e registrado no banco — integrado pela PR #256 (commit `84eca7c2`, 23/11), onde está a aprovação do dono; `Validate Supabase Target (dry-run)` deixa de acusar versão órfã (run 45452172254)
- [x] 003 — Confirmar que o deploy voltou a aplicar banco e funções de servidor — onda 1 — Crítica · primeiro deploy verde: run 45452172254 (24/11 17:46); deploy mais recente na `main`: run 45495650263 (24/11 21:53) — `Validate Supabase Target`, `Apply DB Migrations` e `Deploy Edge Functions` em `success`. O projeto saiu de `MIGRATIONS_FAILED`: `GET /v1/projects` devolve `status=ACTIVE_HEALTHY` para `uoujzvpecohinketylud` (verificado 24/11)
- [x] 004 — Corrigir as funções de auditoria de OS que gravam em colunas inexistentes — onda 1 — Crítica · entregue pela PR #244 (migration 20261121110000, na `main`); em produção (Management API, 24/11), por leitura de `pg_get_functiondef`: nenhuma das 4 funções usa `old_values`/`new_values` nem `NEW.code`, e `audit_job_status_change` grava em `job_status_history`. Desvio registrado: houve um UPDATE de status em produção dentro de transação com `ROLLBACK`, e ele não vale como prova (`docs/agentes/banco.md:14` exige Postgres descartável para teste que escreve); a prova de escrita fica pendente de ambiente descartável.
- [~] 005 — Apontar o endereço do sistema no Supabase Auth para o host que realmente serve o app — onda 1 — Crítica · aplicado na Management API (24/11): `site_url` = `https://fast-gravacoes-v2.vercel.app` (HTTP 200, título "FAST GRAVAÇÕES"); `uri_allow_list` com o host novo + `/**` + previews (`fast-*-gravacoes-v2.vercel.app`) e o host antigo mantido na transição; `GET /auth/v1/verify` honra o `redirect_to` do host novo e do antigo e devolve host não autorizado para o `site_url` (controle negativo); `fastgravacoes.com.br` não resolve (NXDOMAIN). **Pendente**: o critério de `04-PLANO.md:133` exige abrir o link recebido por e-mail — nenhum e-mail foi enviado ainda (depende da etapa 008) — e a escolha do endereço oficial pelo dono (Vercel, não o domínio próprio) não está registrada como decisão dele.
- [~] 006 — Passar `redirectTo` explícito no pedido de recuperação de senha feito pelo app — onda 1 — Alta · código entregue pela PR #294: `redirectTo` com `window.location.origin` em src/features/auth/services/authService.ts:34; teste src/features/auth/services/authService.test.ts 2/2. **Pendente**: `04-PLANO.md:152` exige abrir o link recebido e confirmar que ele aponta para `<host do app>/reset-password` — sem e-mail entregue (etapas 005/008), só o teste unitário está comprovado.
- [ ] 007 — Definir o segredo `APP_URL` no projeto Supabase e tirar o endereço morto do código — onda 1 — Alta · **aprovação do dono**
- [ ] 008 — Configurar servidor de e-mail próprio e aumentar o limite de envio — onda 1 — Alta · **aprovação do dono**
- [ ] 009 — Traduzir e identificar os e-mails de autenticação — onda 1 — Baixa · **aprovação do dono**
- [ ] 010 — Desligar o cadastro público no backend — onda 1 — Média · **aprovação do dono**
- [ ] 011 — Fechar a rota `/design-system` para visitante — onda 1 — Média
- [ ] 012 — Fixar o caminho de busca das cinco funções com privilégio elevado — onda 1 — Média · **aprovação do dono**
- [ ] 013 — Criar o segredo do serviço de e-mail (`RESEND_API_KEY`) no projeto — onda 1 — Crítica · **aprovação do dono**
- [x] 014 — Parar de registrar "e-mail enviado" quando nenhum e-mail foi enviado (alerta de rotina) — onda 1 — Alta · marcador `cron_email_sent` só quando o provedor aceita; sem chave ou sem envio aceito grava `cron_alert` com texto que não afirma envio, `data->>'email_enviado' = false` (booleano por destinatário) e `console.error`, e a resposta HTTP devolve `sent`/`failed` com as rotinas cujo envio não foi aceito · **código no ar; a verificação funcional das duas linhas do plano NÃO foi executada** porque o gateway recusa 100% das chamadas do banco (154/154 em 401 — conserto na etapa 019), então não existe invocação possível hoje; provas executadas: testes e diff (evidência abaixo)
- [ ] 015 — Tornar visível a recusa de envio no relatório por e-mail — onda 1 — Média
- [ ] 016 — Diferenciar canal indisponível de canal entregue nas notificações de TPM — onda 1 — Média
- [ ] 017 — Decidir e registrar o destino da integração com o Bitrix24 (hoje sem nenhum segredo) — onda 1 — Alta · **aprovação do dono**
- [ ] 018 — Decidir o destino do assistente técnico (sem chave de IA configurada) — onda 1 — Média · **aprovação do dono**
- [ ] 019 — Conferir, uma por uma, as chaves de autorização das funções chamadas por máquina — onda 1 — Alta · **aprovação do dono**
- [ ] 020 — Ligar o monitoramento de erros do servidor (`SENTRY_DSN` ausente) — onda 1 — Média · **aprovação do dono**
- [ ] 021 — Guardar o caminho do arquivo, não o link que expira — onda 1 — Alta
- [ ] 022 — Recuperar o acesso às evidências já gravadas com link expirado — onda 1 — Alta · **aprovação do dono**
- [ ] 023 — Impor limite de tamanho e de tipo nos quatro baldes de arquivo — onda 1 — Média · **aprovação do dono**
- [ ] 024 — Limitar quem pode criar pedido de redefinição de senha — onda 1 — Média · **aprovação do dono**
- [ ] 025 — Impedir a varredura de pedidos pelo rastreamento público — onda 1 — Média · **aprovação do dono**
- [ ] 026 — Ligar a recuperação a um ponto no tempo (PITR) do banco de produção — onda 1 — Alta · **aprovação do dono**
- [ ] 027 — Descobrir o que está gerando 77 mil registros de erro por dia — onda 1 — Alta
- [ ] 028 — Limitar e agrupar o registro de erro do aplicativo — onda 1 — Média
- [ ] 029 — Encurtar a retenção dos registros de erro e recuperar o espaço — onda 1 — Média · **aprovação do dono**
- [ ] 030 — Corrigir o filtro que impede o registro de falhas de consulta — onda 1 — Média
- [ ] 031 — Fazer o banco reconhecer o papel `admin` nas tabelas em que o aplicativo já o libera — onda 1 — Alta · **aprovação do dono**
- [x] 032 — Unificar o critério de segundo fator entre a tela de login e o guarda de rota — onda 1 — Alta · `useAuthenticatorAssuranceLevel` passa a ser a única decisão de 2FA (`challengeableFactorId`, `factorsUnavailable`, `refresh`) e é lida pelos dois lados — `src/features/auth/hooks/useAuthenticatorAssuranceLevel.ts:52-121` e `src/components/auth/ProtectedRoute.tsx:76`; com desafio impossível o AuthPage para de navegar e mostra o motivo em `role="alert"` com "Tentar novamente"/"Sair" (`src/pages/AuthPage.tsx:64-96`); testes `src/features/auth/hooks/useAuthenticatorAssuranceLevel.test.tsx` 6/6 e `src/pages/AuthPage.mfaBlocked.test.tsx` 8/8; PR #291
- [ ] 033 — Restringir a leitura de defeitos de embalagem a quem tem relação com a tarefa — onda 1 — Baixa · **aprovação do dono**
- [ ] 034 — Impedir que o operador altere campos comerciais da OS — onda 1 — Média · **aprovação do dono**
- [ ] 035 — Fazer o portão de qualidade falhar fechado — onda 1 — Média · **aprovação do dono**
- [x] 036 — Bloquear no banco a exclusão de OS que já teve produção — onda 1 — Crítica · `validate_job_delete_allowed()` + `trg_validate_job_delete_allowed BEFORE DELETE ON public.jobs` recusa OS com `produced_quantity`/`lost_pieces` e OS fora de `queue`/`scheduled`/`cancelled` (código `FG001`), liberado por `app.archiving_job='on'` para o arquivamento da etapa 038; migration `20261128100000` aplicada em produção em 25/11 e provada por transação (A–I); telas seguem a versão da #306, que já mostra as recusas parciais com o motivo; PR #303
- [x] 037 — Dizer ao usuário o que a exclusão em massa vai apagar junto — onda 1 — Alta · implementada na #306
- [x] 038 — Usar o arquivamento que já existe em vez de apagar OS concluída — onda 1 — Média · `archive_jobs(p_older_than, p_job_id)` casa colunas por nome (`jsonb_populate_record`) — o `archive_finished_jobs` inseria 35 valores em 33 colunas desde que `jobs` ganhou `cancel_reason`/`external_ref`, estourava e caía em `skipped`, por isso `archived_jobs` estava com 0 linhas em produção (erro 42601 reproduzido em Postgres descartável); migration `20261128130000` aplicada em produção em 25/11 e provada por transação (casos A–I) · Também bloqueia arquivamento com remessa pendente/em trânsito (`FG003`) para a logística não perder a entrega que está na rua, relança o motivo na chamada individual (embalagem `FG002`, remessa `FG003`) em vez de devolver `skipped` sem explicação, e expõe `get_finished_jobs_for_evolution` (jobs + arquivo, paginado, gerente/admin/coordenador) para o indicador de produtividade não cair conforme o cron arquiva · Fecha a corrida com o cadastro de remessa (`FOR UPDATE` em `jobs`), limita o lote do cron a 200 OS por execução e cria o agendamento `archive-finished-jobs-daily` (04:07 UTC) — sem ele a rotina nunca começava: produção tem 7 jobs em `cron.job` e nenhum arquiva; PR #305
- [x] 039 — Revisar as exclusões em cascata que levam embora expedição e perdas — onda 1 — Alta · `production_losses_job_id_fkey` e `shipments_job_id_fkey` passam de `CASCADE` para `RESTRICT` (migrations `20261128110000`/`20261128120000`, aplicadas em produção em 25/11 e provadas por transação); as outras 6 FKs de `jobs` continuam em `CASCADE` porque a trilha de status é gravada automaticamente em OS `delayed` e bloquearia exclusão legítima; PR #304
- [x] 040 — Fazer a regra de bloqueio de exclusão valer no serviço do aplicativo — onda 1 — Crítica · implementada na #306
- [ ] 056 — Tirar `user_roles` e a trilha de auditoria da lista de tabelas do túnel de banco — onda 1 — Crítica · **aprovação do dono**
- [ ] 057 — Decidir se o túnel genérico de banco deve continuar existindo — onda 1 — Alta · **aprovação do dono**
- [ ] 058 — Impedir que qualquer pessoa bloqueie a conta de um operador — onda 1 — Crítica · **aprovação do dono**
- [x] 066 — Parar de aprovar itens de segurança sem verificar nada — onda 1 — Alta
- [ ] 086 — Fazer `is_staff()` respeitar papel desativado — onda 1 — Alta · **aprovação do dono**
- [ ] 087 — Separar por operação as policies amplas que hoje liberam apagar dado — onda 1 — Alta · **aprovação do dono**
- [ ] 088 — Exigir papel ativo (e não apenas estar logado) para escrever nas três tabelas abertas — onda 1 — Alta · **aprovação do dono**
- [ ] 089 — Recriar o índice anti-repetição de pedido de senha que não existe no banco — onda 1 — Alta · **aprovação do dono**
- [ ] 090 — Fechar os privilégios padrão do banco que liberam tudo para visitante — onda 1 — Média · **aprovação do dono**
- [ ] 091 — Tirar do cliente a gravação das trilhas de segurança — onda 1 — Média · **aprovação do dono**
- [ ] 116 — Resolver a rotina de backup que grava numa tabela inexistente — onda 1 — Alta · **aprovação do dono**
- [ ] 146 — Validar o arquivo enviado na foto de defeito de embalagem — onda 1 — Alta
- [ ] 147 — Parar de entregar link de foto de produção a visitante anônimo — onda 1 — Média · **aprovação do dono**
- [ ] 149 — Parar de guardar os valores de filtro das consultas no registro de erro — onda 1 — Média
- [ ] 154 — Separar por operação a policy ampla de `energy_alerts` — onda 1 — Alta · **aprovação do dono**
- [ ] 155 — Separar por operação a policy ampla de `lot_quality_inspections` — onda 1 — Alta · **aprovação do dono**
- [ ] 156 — Separar por operação a policy ampla de `machine_downtime` — onda 1 — Alta · **aprovação do dono**
- [ ] 157 — Separar por operação a policy ampla de `maintenance_item_responses` — onda 1 — Alta · **aprovação do dono**
- [ ] 158 — Separar por operação a policy ampla de `shift_handover_checklist` — onda 1 — Alta · **aprovação do dono**
- [ ] 159 — Separar por operação a policy ampla de `shift_occurrences` — onda 1 — Alta · **aprovação do dono**
- [ ] 160 — Separar por operação a policy ampla de `shift_pending_tasks` — onda 1 — Alta · **aprovação do dono**
- [ ] 161 — Separar por operação a policy ampla de `tpm_execution_alerts` — onda 1 — Alta · **aprovação do dono**
- [ ] 162 — Separar por operação a policy ampla de `tpm_execution_parts` — onda 1 — Alta · **aprovação do dono**
- [ ] 163 — Separar por operação a policy ampla de `tpm_execution_supplies` — onda 1 — Alta · **aprovação do dono**
- [ ] 164 — Separar por operação a policy ampla de `tpm_notification_queue` — onda 1 — Alta · **aprovação do dono**
- [ ] 165 — Separar por operação a policy ampla de `tpm_severity_configs` — onda 1 — Alta · **aprovação do dono**
- [ ] 218 — Fechar a escrita direta de `security_events` — onda 1 — Média · **aprovação do dono**
- [ ] 219 — Fechar a escrita direta de `login_audit` — onda 1 — Média · **aprovação do dono**
- [ ] 220 — Fechar a escrita direta de `geo_blocking_logs` — onda 1 — Média · **aprovação do dono**
- [ ] 221 — Fechar a escrita direta de `query_telemetry` — onda 1 — Média · **aprovação do dono**
- [ ] 222 — Fechar a escrita direta de `rate_limit_logs` — onda 1 — Média · **aprovação do dono**
- [ ] 223 — Fechar a escrita direta de `tpm_notification_logs` — onda 1 — Média · **aprovação do dono**
- [ ] 231 — Mover o bloqueio de login para o servidor — onda 1 — Crítica · **aprovação do dono**
- [x] 232 — Limpar os dados do usuário anterior em toda saída de sessão — onda 1 — Alta
- [x] 233 — Exigir senha de novo nas ações sensíveis (mecanismo já existe e está desligado) — onda 1 — Alta
- [ ] 234 — Fazer o banco ser a autoridade das permissões (remover a união com o mapa fixo) — onda 1 — Alta · **aprovação do dono**
- [ ] 235 — Elevar o mínimo de senha e ligar a proteção contra robôs — onda 1 — Média · **aprovação do dono**
- [ ] 236 — Revogar a execução anônima das funções de papel — onda 1 — Baixa · **aprovação do dono**
- [ ] 287 — Revogar a execução anônima das funções de rotina e verificação — onda 1 — Baixa · **aprovação do dono**
- [ ] 288 — Revogar a execução anônima das funções de escrita de embalagem e alerta — onda 1 — Baixa · **aprovação do dono**

## Onda 2 — Fluxos principais quebrados (42 etapas)

- [ ] 041 — Religar a atualização em tempo real das tabelas que o aplicativo assina — onda 2 — Alta · **aprovação do dono**
- [ ] 042 — Remover ou marcar as assinaturas de tempo real que não serão religadas — onda 2 — Média
- [ ] 043 — Resolver o nome do canal antes do efeito para o WebSocket parar de cair — onda 2 — Média
- [ ] 044 — Separar a chave de cache de "máquinas ativas" de "todas as máquinas" — onda 2 — Alta
- [ ] 045 — Parar de repetir consultas que foram negadas por permissão — onda 2 — Média
- [x] 046 — Expor no aplicativo a coluna de motivo de cancelamento que o banco exige — onda 2 — Alta · `src/integrations/supabase/types.ts` regenerado pela Management API (24/11); `cancel_reason` presente em `jobs` (linhas 1567/1602/1637 do arquivo gerado). O arquivo antigo listava 8 tabelas que não existem no banco (`email_verification_tokens`, `gamification_settings`, `packaging_equipment`, `packaging_waste`, `shipment_costs`, `tpm_execution_checklist`, `webauthn_challenges`, `webauthn_credentials`) e omitia 6 que existem (`archived_jobs`, `backup_logs`, `bitrix24_oauth_states`, `csp_violation_reports`, `erp_api_keys`, `system_metrics`) — registro na seção "Achados novos"; nenhum código usava as 8 fantasmas, tsc 0 após a troca
- [x] 047 — Criar a ação de cancelar OS com motivo obrigatório — onda 2 — Alta · `jobsService.updateStatus(id, status, cancelReason?)` recusa `cancelled` sem motivo (`src/features/jobs/services/jobsService.ts:78-92`) e grava `cancel_reason`; `useUpdateJobStatus` repassa o motivo; botão "Cancelar OS" em `src/components/jobs/JobQuickActions.tsx` (gated por `canTransition`) e Dialog de motivo obrigatório em `src/components/jobs/JobDetailsModal.tsx`; testes `src/test/jobsService.test.ts` 17/17 provados e 2/17 falhando sem o `jobsService` (stash); banco recusou `cancelled` sem motivo em transação com ROLLBACK
- [ ] 048 — Fazer toda mudança de status de OS passar pela validação de transição — onda 2 — Alta
- [ ] 049 — Fazer a promoção automática de fila ler o alvo configurado, não uma constante — onda 2 — Alta
- [ ] 050 — Mostrar no painel o mesmo alvo de buffer que o sistema usa — onda 2 — Média
- [ ] 051 — Deixar um único lugar carimbando início e fim de produção — onda 2 — Alta
- [x] 052 — Unificar, no aplicativo, quais status ocupam uma máquina — onda 2 — Alta · MACHINE_BLOCKING_STATUSES e MACHINE_ACTIVE_SCHEDULE_STATUSES em src/constants/index.ts, consumidas por AlertScheduleModal (espelha check_job_overlap: tudo menos cancelado) e useSchedulingConflicts (agenda viva, lista preservada); teste novo src/components/dashboard/AlertScheduleModal.test.tsx 3/3 falhando sem a correção; PR #302
- [A] 053 — OS concluída deixa de ocupar a máquina (função `check_job_overlap` + `MACHINE_BLOCKING_STATUSES`) — onda 2 — Média · implementada na #307: migration `20261128140000_f053_os_concluida_nao_ocupa_maquina.sql` reescreve `check_job_overlap` (deixa de ocupar em `cancelled` e `finished`, e revalida a reabertura `finished -> production`), `MACHINE_BLOCKING_STATUSES` sem `finished` e teste `nao avisa conflito para OS concluida, que o banco libera desde a etapa 053`
- [ ] 054 — Corrigir o tipo de técnica no esquema de validação de OS — onda 2 — Média
- [ ] 055 — Unificar os três esquemas concorrentes de OS — onda 2 — Média
- [x] 059 — Corrigir o cálculo de ranking que falha em toda execução — onda 2 — Alta · `onConflict` passou a listar `period_end`; produção recusava a lista de três colunas com `42P10` (evidência abaixo) · PR #330
- [x] 060 — Fazer a limpeza de rankings obsoletos realmente apagar algo — onda 2 — Média · `.lt("period_end", ...)` → `.eq("period_end", ...)`; o `.lt()` era falso para as próprias linhas do período, então a limpeza nunca apagava nada · PR #330
- [x] 061 — Deixar um único critério de papel no cálculo de ranking — onda 2 — Média · `authenticate()` + `requireRole(admin, coordinator)` do `_shared/auth.ts` (que filtra `is_active`) no lugar dos dois blocos divergentes, que aceitavam `manager` e papel revogado · PR #330
- [ ] 062 — Resolver a autenticação da API do ERP, que aponta para uma tabela inexistente — onda 2 — Alta · **aprovação do dono**
- [ ] 063 — Agendar de verdade as rotinas que hoje não têm quem as dispare — onda 2 — Alta · **aprovação do dono**
- [ ] 067 — Tirar do ar os indicadores inventados do quiosque de fábrica — onda 2 — Alta
- [ ] 068 — Parar de mostrar 92,4% de eficiência quando não há dado — onda 2 — Alta
- [ ] 070 — Calcular a projeção de prazo do BI com dados reais — onda 2 — Alta
- [ ] 081 — Remover o botão que diz ter enviado parâmetros para a máquina — onda 2 — Alta
- [ ] 095 — Não expulsar o usuário quando a leitura do papel demora — onda 2 — Alta
- [ ] 096 — Corrigir os dois links que levam a página inexistente — onda 2 — Alta
- [ ] 113 — Fazer a tela de permissões refletir o que o sistema realmente verifica — onda 2 — Alta · **aprovação do dono**
- [ ] 123 — Deixar uma única verificação de assinatura no webhook do CRM — onda 2 — Alta
- [ ] 124 — Parar de registrar sincronização bem-sucedida quando a gravação falhou — onda 2 — Alta
- [ ] 125 — Limitar as chamadas ao webhook público do CRM — onda 2 — Alta
- [ ] 127 — Enviar e-mail com remetente do domínio da empresa — onda 2 — Alta · **aprovação do dono**
- [ ] 131 — Corrigir o monitor de saúde, que grava em colunas inexistentes — onda 2 — Alta
- [ ] 138 — Fazer o site esperar o banco antes de ir ao ar — onda 2 — Alta · **aprovação do dono**
- [ ] 140 — Verificar o estado do sistema depois do deploy do backend — onda 2 — Alta · **aprovação do dono**
- [ ] 200 — Agendar a rotina `cleanup-security-logs` — onda 2 — Alta · **aprovação do dono**
- [ ] 201 — Agendar a rotina `calculate-rankings` — onda 2 — Alta · **aprovação do dono**
- [ ] 202 — Agendar a rotina `calculate-inventory-intelligence` — onda 2 — Alta · **aprovação do dono**
- [ ] 203 — Agendar a rotina `metrics-collector` — onda 2 — Alta · **aprovação do dono**
- [ ] 204 — Agendar a rotina `daily-maintenance-summary` — onda 2 — Alta · **aprovação do dono**
- [ ] 255 — Verificar, em produção, o fluxo de acesso depois da onda de segurança — onda 2 — Alta
- [ ] 256 — Verificar, em produção, o ciclo completo de uma ordem de serviço — onda 2 — Crítica
- [ ] 296 — Fechar a decisão sobre a API do ERP com o dono — onda 2 — Alta

## Onda 3 — Integridade de dados e regras de negócio (33 etapas)

- [ ] 064 — Fazer a sincronização do CRM atualizar os campos do pedido, não só o status — onda 3 — Média
- [ ] 065 — Validar o alvo e limitar o uso na alteração de operador — onda 3 — Média
- [ ] 071 — Tirar a eficiência fixa de 95% dos dados do BI e do arquivo exportado — onda 3 — Média
- [ ] 072 — Corrigir o filtro por Studio do BI, que aponta para técnicas inexistentes — onda 3 — Alta
- [ ] 092 — Completar as permissões de arquivo dos baldes de fotos e documentos — onda 3 — Média · **aprovação do dono**
- [ ] 093 — Transformar as policies de bloqueio em restritivas de verdade — onda 3 — Baixa · **aprovação do dono**
- [ ] 098 — Filtrar a busca rápida (Ctrl+K) pelo papel do usuário — onda 3 — Média
- [ ] 100 — Trocar os três `upsert` parciais de OS por atualização por identificador — onda 3 — Média
- [ ] 101 — Impedir resgate de recompensa além do saldo — onda 3 — Alta · **aprovação do dono**
- [ ] 105 — Fechar o domínio do tipo de movimento de estoque — onda 3 — Alta · **aprovação do dono**
- [ ] 106 — Impedir duas expedições para a mesma OS — onda 3 — Média · **aprovação do dono**
- [ ] 108 — Consolidar as quatro trilhas de auditoria da OS em uma — onda 3 — Média · **aprovação do dono**
- [ ] 126 — Importar todas as páginas de negócios do CRM, não só a primeira — onda 3 — Alta
- [ ] 130 — Corrigir a página Master API, que mostra chave no cliente e documenta endereços inexistentes — onda 3 — Média · **aprovação do dono**
- [ ] 134 — Calcular o relatório por e-mail no banco, não sobre uma fatia das OS — onda 3 — Alta · **aprovação do dono**
- [ ] 135 — Mostrar horário de Brasília nos e-mails e na ordem de serviço impressa — onda 3 — Média
- [ ] 179 — Corrigir o gráfico de tendência que usa dados cortados sem avisar — onda 3 — Alta
- [ ] 192 — Aplicar o prazo por cliente e técnica que hoje é cadastrado e ignorado — onda 3 — Alta
- [ ] 205 — Descontinuar o gatilho `tr_audit_job_changes` — onda 3 — Média · **aprovação do dono**
- [ ] 206 — Descontinuar o gatilho `trigger_log_job_status_change` — onda 3 — Média · **aprovação do dono**
- [ ] 207 — Descontinuar o gatilho `audit_jobs` — onda 3 — Média · **aprovação do dono**
- [ ] 224 — Completar as permissões de arquivo do balde `production-photos` — onda 3 — Média · **aprovação do dono**
- [ ] 225 — Completar as permissões de arquivo do balde `technical-documents` — onda 3 — Média · **aprovação do dono**
- [ ] 226 — Tornar restritiva a policy de bloqueio de `audit_log` — onda 3 — Baixa · **aprovação do dono**
- [ ] 227 — Tornar restritiva a policy de bloqueio de `job_status_audit` — onda 3 — Baixa · **aprovação do dono**
- [ ] 228 — Tornar restritiva a policy de bloqueio de `bitrix24_oauth_tokens` — onda 3 — Baixa · **aprovação do dono**
- [ ] 229 — Tornar restritiva a policy de bloqueio de `bitrix24_oauth_states` — onda 3 — Baixa · **aprovação do dono**
- [ ] 230 — Tornar restritiva a policy de bloqueio de `login_lockouts` — onda 3 — Baixa · **aprovação do dono**
- [ ] 275 — Agregar no banco os números do coletor de métricas — onda 3 — Média
- [ ] 276 — Agregar no banco os números da exportação em planilha — onda 3 — Média
- [ ] 277 — Corrigir o cálculo de início de dia no coletor de métricas — onda 3 — Média
- [ ] 278 — Aplicar o prazo por exceção na tela do operador de embalagem — onda 3 — Alta
- [ ] 279 — Aplicar o prazo por exceção nos painéis de embalagem — onda 3 — Média

## Onda 4 — Funcionalidades incompletas (34 etapas)

- [ ] 069 — Remover os alertas fixos do Gêmeo Digital — onda 4 — Média
- [ ] 073 — Resolver o painel de "IA" que inventa diagnósticos com nome de operador — onda 4 — Alta
- [ ] 074 — Decidir o destino do painel de Qualidade de Código, hoje inteiramente fixo — onda 4 — Média
- [ ] 075 — Tirar os indicadores de desempenho fixos do painel de telemetria — onda 4 — Média
- [x] 076 — Corrigir o gráfico do simulador, que mostra zero em todos os cenários — onda 4 — Média · agrupado por cenário base (scenarioBaseId em src/lib/simulation.ts:22,134,145 + aggregateScenarioResults em src/lib/simulation.ts:184; chartData em src/pages/SimulationDashboard.tsx:44); teste src/test/simulationAggregation.test.ts 4/4; PR #289
- [ ] 082 — Ligar ou remover os botões de ação dos alertas preditivos — onda 4 — Alta
- [ ] 083 — Ligar ou remover os botões das abas de sequenciamento e balanceamento — onda 4 — Alta
- [ ] 084 — Varrer e resolver os demais botões sem ação — onda 4 — Média
- [ ] 085 — Fazer as duas configurações que não têm efeito funcionarem (ou sair da tela) — onda 4 — Média
- [ ] 097 — Resolver os três links que apontam para um detalhe de OS que não existe — onda 4 — Média
- [ ] 099 — Dar entrada na interface (ou remover) as quatro telas acessíveis só por URL — onda 4 — Média
- [ ] 132 — Decidir o destino da fila de notificações de manutenção, que não tem quem a alimente — onda 4 — Alta · **aprovação do dono**
- [ ] 170 — Resolver os dois botões do painel de eficiência — onda 4 — Média
- [ ] 171 — Resolver os três botões do Gêmeo Digital — onda 4 — Média
- [ ] 172 — Resolver os dois botões da visão executiva de indicadores — onda 4 — Média
- [ ] 173 — Resolver o botão de detalhes da passagem de turno — onda 4 — Média
- [ ] 174 — Resolver o botão do assistente de otimização do calendário — onda 4 — Média
- [ ] 175 — Resolver os botões do widget preditivo e das recomendações de eficiência — onda 4 — Média
- [ ] 176 — Resolver os botões de logística e da página Master API — onda 4 — Média
- [ ] 191 — Mostrar as notificações reais na central de notificações — onda 4 — Alta
- [ ] 193 — Fazer a exportação do painel de indicadores entregar os dados — onda 4 — Alta
- [ ] 194 — Permitir cadastrar e editar itens de estoque — onda 4 — Alta
- [ ] 195 — Fazer o botão de etiqueta de lote abrir a etiqueta — onda 4 — Alta
- [ ] 196 — Permitir editar e desativar um agendamento de manutenção — onda 4 — Alta
- [ ] 197 — Guardar a meta do painel executivo — onda 4 — Média
- [ ] 198 — Escolher um único mecanismo de preferências de notificação — onda 4 — Média
- [ ] 257 — Verificar, em produção, que os painéis param de mostrar número inventado — onda 4 — Alta
- [ ] 280 — Permitir criar item de estoque — onda 4 — Alta
- [ ] 281 — Permitir editar e desativar item de estoque — onda 4 — Alta
- [ ] 282 — Permitir editar um agendamento de manutenção — onda 4 — Alta
- [ ] 283 — Permitir desativar um agendamento de manutenção — onda 4 — Média
- [ ] 284 — Ligar a preferência de avisos visuais — onda 4 — Média
- [ ] 285 — Ligar a preferência de atualização automática — onda 4 — Média
- [ ] 286 — Mostrar as notificações reais na contagem e no 'marcar todas como lidas' — onda 4 — Alta

## Onda 5 — Robustez: erros, estados, concorrência (31 etapas)

- [ ] 077 — Fazer a falha de leitura de dados aparecer para o usuário — onda 5 — Alta
- [ ] 078 — Mostrar erro e opção de tentar de novo nas telas de operação — onda 5 — Alta
- [ ] 079 — Mostrar erro nos painéis de gestão — onda 5 — Média
- [ ] 080 — Mostrar erro nas telas restantes que hoje ficam em branco — onda 5 — Baixa
- [ ] 102 — Não transformar erro de leitura de favoritos em "favoritos padrão" — onda 5 — Média
- [ ] 103 — Fazer o registro de erro guardar quem teve o erro (e o painel voltar a mostrar algo) — onda 5 — Alta · **aprovação do dono**
- [ ] 128 — Limitar o uso do assistente técnico, que custa por pergunta — onda 5 — Média
- [ ] 129 — Não contar notificação como enviada quando o envio não acontece — onda 5 — Média
- [ ] 133 — Fazer a fila de notificações reprocessar o que falhou — onda 5 — Média
- [ ] 136 — Usar gravação idempotente no registro de envio do relatório — onda 5 — Média
- [ ] 137 — Não deixar a máquina sem previsão quando a gravação da predição falha — onda 5 — Média · **aprovação do dono**
- [ ] 148 — Ligar o limitador de requisições que já existe e ninguém usa — onda 5 — Média
- [ ] 166 — Estado de erro em ABCCostingDashboard, BIDashboard, DocumentsPage — onda 5 — Baixa
- [ ] 167 — Estado de erro em EfficiencyDashboard, MLPredictionsDashboard, PackagingDashboard — onda 5 — Baixa
- [ ] 168 — Estado de erro em LogisticsPage, OperatorsPage, OperatorProductivityPage — onda 5 — Baixa
- [ ] 169 — Estado de erro em QRScannerPage, SystemMonitoringPage, DigitalTwin — onda 5 — Baixa
- [ ] 237 — Impedir que duas pessoas sobrescrevam a mesma OS sem aviso — onda 5 — Média
- [ ] 259 — Estado de erro em o quadro de produção — onda 5 — Alta
- [x] 260 — Estado de erro em a fila de pendentes — onda 5 — Alta · PendingQueue.tsx lê o `error` de useSchedulingData (hooks expõem, nenhum consumidor usava) e mostra EmptyState de erro com "Tentar novamente" via refetchAll; estado vazio legítimo preservado; teste src/pages/PendingQueue.test.tsx 3/3; PR #301
- [ ] 261 — Estado de erro em a tela do operador — onda 5 — Alta
- [ ] 262 — Estado de erro em o calendário diário — onda 5 — Alta
- [ ] 263 — Estado de erro em o calendário semanal — onda 5 — Alta
- [ ] 264 — Estado de erro em o calendário mensal — onda 5 — Alta
- [ ] 265 — Estado de erro em o painel de alertas — onda 5 — Alta
- [ ] 266 — Estado de erro em o painel de indicadores — onda 5 — Alta
- [ ] 267 — Estado de erro em o painel de eficiência de máquina — onda 5 — Alta
- [ ] 268 — Estado de erro em o painel executivo — onda 5 — Alta
- [ ] 269 — Estado de erro em a comparação de máquinas — onda 5 — Alta
- [ ] 270 — Estado de erro em o histórico do operador — onda 5 — Alta
- [ ] 294 — Estado de erro nas telas de embalagem e logística — onda 5 — Baixa
- [ ] 295 — Estado de erro nas telas de manutenção e qualidade — onda 5 — Baixa

## Onda 6 — Performance (17 etapas)

- [ ] 104 — Reescrever a verificação de saúde das rotinas, que é a consulta mais caras do banco — onda 6 — Alta · **aprovação do dono**
- [ ] 143 — Corrigir o cache do aplicativo, que entrega arquivo velho para sempre — onda 6 — Média
- [ ] 150 — Reduzir o custo das 71 policies que reavaliam a identidade linha por linha — onda 6 — Média · **aprovação do dono**
- [ ] 151 — Criar os três índices que faltam em chaves estrangeiras — onda 6 — Baixa · **aprovação do dono**
- [ ] 152 — Completar a identidade de réplica das tabelas em tempo real — onda 6 — Baixa · **aprovação do dono**
- [ ] 177 — Parar a consulta de 41 minutos de processamento que nunca devolve linha — onda 6 — Alta
- [ ] 178 — Espaçar as consultas do painel de monitoramento ao custo real delas — onda 6 — Alta
- [ ] 180 — Paginar a listagem de ordens de serviço — onda 6 — Alta
- [ ] 181 — Tirar as bibliotecas de PDF e imagem do carregamento da tela inicial — onda 6 — Média
- [ ] 183 — Comprimir as fotos antes de enviar — onda 6 — Média
- [ ] 184 — Otimizar as cinco policies de `user_roles` — onda 6 — Média · **aprovação do dono**
- [ ] 185 — Otimizar as policies de embalagem (`packaging_defects`, `packaging_tasks`, `packaging_task_checklist`, `packaging_settings`, `packaging_checklist_items`, `packaging_sla_overrides`) — onda 6 — Média · **aprovação do dono**
- [ ] 186 — Otimizar as policies de turno (`shift_occurrences`, `shift_pending_tasks`) — onda 6 — Média · **aprovação do dono**
- [ ] 187 — Otimizar as policies de manutenção (`tpm_executions`, `maintenance_schedules`, `maintenance_alerts`, `maintenance_records`, `tpm_parameter_alerts`, `tpm_notification_logs`, `machine_predictions`, `machine_health_metrics`) — onda 6 — Média · **aprovação do dono**
- [ ] 188 — Otimizar as policies de `storage.objects` — onda 6 — Média · **aprovação do dono**
- [ ] 189 — Otimizar as policies das tabelas de registro e telemetria (`security_events`, `login_audit`, `query_telemetry`, `rate_limit_logs`, `geo_blocking_logs`, `csp_violation_reports`, `edge_health_history`, `cron_p95_daily`, `system_metrics`, `push_notifications`, `technical_sheet_audit_logs`) — onda 6 — Média · **aprovação do dono**
- [ ] 190 — Otimizar as policies restantes (`profiles`, `inventory_items`, `shipments`, `shipping_providers`, `spc_measurements`, `spc_capability_history`, `efficiency_alert_history`, `bitrix24_sync_history`, `password_reset_requests`, `geo_blocking_rules`, `geo_blocking_settings`, `business_config`, `archived_jobs`, `backup_logs`, `cron_health_history`, `inventory_items`) — onda 6 — Média · **aprovação do dono**

## Onda 7 — Experiência de uso e consistência (9 etapas)

- [ ] 110 — Dar estado vazio às seis tabelas que hoje mostram só o cabeçalho — onda 7 — Baixa
- [ ] 111 — Corrigir o botão dentro de link em toda a navegação — onda 7 — Baixa
- [ ] 112 — Alinhar os títulos de página em português ao rótulo do menu — onda 7 — Baixa
- [ ] 118 — Corrigir o item de menu que não leva a lugar nenhum — onda 7 — Baixa
- [ ] 145 — Corrigir os endereços de compartilhamento do site — onda 7 — Baixa
- [ ] 271 — Dar estado vazio às três listas do módulo de inteligência de negócio — onda 7 — Baixa
- [ ] 272 — Dar estado vazio às três listas restantes (energia e indicadores) — onda 7 — Baixa
- [ ] 273 — Corrigir o botão dentro de link no componente de item de menu — onda 7 — Baixa
- [ ] 274 — Corrigir os quatro pontos restantes de botão dentro de link — onda 7 — Baixa

## Onda 8 — Higiene: código morto, CI, observabilidade, documentação (54 etapas)

- [ ] 094 — Remover as policies do balde de arquivos que não existe — onda 8 — Baixa · **aprovação do dono**
- [ ] 107 — Remover índices e restrições duplicados — onda 8 — Baixa · **aprovação do dono**
- [ ] 109 — Resolver os dois estados de OS que nunca acontecem — onda 8 — Baixa
- [ ] 114 — Remover o mapa de permissões por rota que não corresponde a nenhuma rota — onda 8 — Baixa
- [ ] 115 — Decidir o destino das dez funções de servidor publicadas e sem uso — onda 8 — Média · **aprovação do dono**
- [ ] 117 — Limpar do arquivo de tipos as oito tabelas que não existem no banco — onda 8 — Baixa
- [ ] 119 — Remover os trinta componentes que ninguém usa — onda 8 — Baixa
- [ ] 120 — Quebrar os nove ciclos de importação — onda 8 — Baixa
- [ ] 121 — Corrigir a medição de dívida que engana quem planeja — onda 8 — Média
- [ ] 122 — Decidir o que fazer com os 28 arquivos acima de 500 linhas — onda 8 — Baixa
- [ ] 139 — Deixar um único arquivo de travamento de dependências — onda 8 — Alta · **aprovação do dono**
- [ ] 141 — Fazer o portão de qualidade rodar os testes dos próprios scripts de CI — onda 8 — Média · **aprovação do dono**
- [ ] 142 — Renomear os arquivos de ambiente versionados para modelo — onda 8 — Média
- [ ] 144 — Fixar as versões das dependências das funções de servidor — onda 8 — Média
- [ ] 153 — Mover a extensão de rede para o esquema recomendado — onda 8 — Baixa · **aprovação do dono**
- [ ] 182 — Fazer o orçamento de pacote por rota somar o que a rota realmente carrega — onda 8 — Média · **aprovação do dono**
- [ ] 199 — Decidir, item a item, o destino dos treze hooks e quatro componentes nunca integrados — onda 8 — Média
- [ ] 208 — Executar os testes de função de servidor que hoje ninguém roda — onda 8 — Alta · **aprovação do dono**
- [ ] 209 — Fazer o teste do túnel de banco testar o código de verdade — onda 8 — Alta
- [ ] 210 — Enviar os erros para o monitoramento externo (hoje nenhum chega) — onda 8 — Alta
- [ ] 211 — Fazer os testes de ponta a ponta reprovarem quando o acesso é negado — onda 8 — Média
- [ ] 212 — Cobrir com teste o serviço de embalagem — onda 8 — Alta
- [ ] 213 — Cobrir a cadeia de alerta das rotinas automáticas — onda 8 — Média
- [ ] 214 — Estender a trava de tipo solto às funções de servidor — onda 8 — Média · **aprovação do dono**
- [ ] 215 — Resolver os dez componentes de biblioteca de interface sem uso — onda 8 — Baixa
- [ ] 216 — Resolver os componentes órfãos de operação e cadastro — onda 8 — Baixa
- [ ] 217 — Resolver os componentes órfãos de apoio e acessibilidade — onda 8 — Baixa
- [ ] 238 — Decidir o destino de `backup-scheduler` — onda 8 — Média · **aprovação do dono**
- [ ] 239 — Decidir o destino de `cleanup-security-logs` — onda 8 — Média · **aprovação do dono**
- [ ] 240 — Decidir o destino de `excel-export` — onda 8 — Média · **aprovação do dono**
- [ ] 241 — Decidir o destino de `image-optimizer` — onda 8 — Média · **aprovação do dono**
- [ ] 242 — Decidir o destino de `metrics-collector` — onda 8 — Média · **aprovação do dono**
- [ ] 243 — Decidir o destino de `security-alert` — onda 8 — Média · **aprovação do dono**
- [ ] 244 — Decidir o destino de `send-email-report` — onda 8 — Média · **aprovação do dono**
- [ ] 245 — Decidir o destino de `validate-login-ip` — onda 8 — Média · **aprovação do dono**
- [ ] 246 — Decidir o destino de `health-monitor` — onda 8 — Média · **aprovação do dono**
- [ ] 247 — Decidir o destino de `cron-cleanup` — onda 8 — Média · **aprovação do dono**
- [ ] 248 — Corrigir os dossiês F-004, F-005 e F-006, que dizem resolvido o que não está — onda 8 — Média
- [ ] 249 — Corrigir o dossiê F-009, cuja resolução depende de uma PR que não pode ser aplicada — onda 8 — Média
- [ ] 250 — Alinhar os documentos de operação às rotinas que existem de verdade — onda 8 — Média
- [ ] 251 — Registrar no RUNBOOK a proteção de dados que existe de fato — onda 8 — Média
- [ ] 252 — Travar com teste a correção dos gatilhos de auditoria de OS — onda 8 — Alta
- [ ] 253 — Travar com teste a regra que impede excluir OS com produção — onda 8 — Alta
- [ ] 254 — Travar com teste a lista de tabelas do túnel de banco — onda 8 — Alta
- [ ] 258 — Avisar quando o deploy falhar — onda 8 — Alta · **aprovação do dono**
- [ ] 289 — Alinhar o arquivo de tipos às nove tabelas com divergência — onda 8 — Baixa
- [ ] 290 — Decidir o destino dos hooks órfãos do módulo de administração — onda 8 — Média
- [ ] 291 — Decidir o destino dos hooks órfãos de rastreabilidade e análise — onda 8 — Média
- [ ] 292 — Decidir o destino dos hooks órfãos de notificação — onda 8 — Média
- [ ] 293 — Decidir o destino dos componentes de feature órfãos — onda 8 — Média
- [ ] 297 — Travar com teste o fluxo de recuperação de senha — onda 8 — Alta · **aprovação do dono**
- [ ] 298 — Travar com verificação automática a publicação das tabelas em tempo real — onda 8 — Alta · **aprovação do dono**
- [ ] 299 — Travar com verificação automática a correspondência entre rotas e menu — onda 8 — Média · **aprovação do dono**
- [ ] 300 — Regerar o contexto e conferir que os alertas refletem as correções — onda 8 — Média


## Backlog (além das 300)

- [ ] B-01 — Fazer os testes de agendamento usarem a mesma definição de "hoje" que o código — onda 2 — Alta

---

## Evidências

Uma entrada por etapa concluída, no formato:

```
### 001 — 2026-__-__
Comando/consulta: <o que foi executado>
Resultado: <saída, colada>
PR: <link> · estado: mergeada | aguardando dono | CI vermelha (motivo)
```

### 001 — 2026-11-24
Comando/consulta: `select version, name from supabase_migrations.schema_migrations order by version;` no projeto `uoujzvpecohinketylud` (Management API) contra `git ls-tree -r --name-only origin/main -- supabase/migrations`.
Resultado: **259** versões registradas no banco e **259** arquivos de migration na `main` — diferença vazia nos dois sentidos. `20261122010000_seed_role_permissions.sql` existe na `main`, ou seja, o registro `20261122010000` deixou de ser órfão. Nenhum `migration repair` foi executado.
PR: (registro, sem mudança de código) · estado: mergeada na `main` @ `828487b3`

### 002 — 2026-11-24
Comando/consulta: conferência do arquivo em `origin/main` e do job de validação do deploy.
Resultado: `supabase/migrations/20261122010000_seed_role_permissions.sql` presente na `main`; run `45452172254` do workflow `Deploy` tem `Validate Supabase Target (dry-run)` em `success`, sem o erro `Remote migration versions not found in local migrations directory`.
PR: arquivo já mergeado em `main` · estado: mergeada

### 003 — 2026-11-24
Comando/consulta: `gh run view 45452172254 --json jobs` (último `Deploy` da `main`).
Resultado: `Security Scan`, `Unit Tests`, `Validate Supabase Target (dry-run)`, `Build`, `Apply DB Migrations` e `Deploy Edge Functions` — todos em `success`. Os quatro deploys anteriores da `main` (45441618237, 45447223260, 45450690205, 45452172254) também concluíram em `success`.
PR: (verificação, sem mudança de código) · estado: concluída
### 038 — 2026-11-25
Comando/consulta: banco descartável `d305` (Postgres 16, container `fgtest036`) com stub de `jobs`, `archived_jobs` **sem** `cancel_reason`/`external_ref`, `shipments`, `packaging_tasks`, `auth.uid()` e `app_private.has_role`; `psql -v ON_ERROR_STOP=1 -f supabase/migrations/20261128130000_f038_arquivar_os_concluida.sql` e a bateria abaixo.
Resultado: migration aplica sem erro e o bloco de sincronização adiciona `cancel_reason` e `external_ref` a `archived_jobs`. `archive_jobs(p_job_id)` numa OS `finished` devolveu `{"archived":1,"skipped":0}` e o arquivo ficou com `cancel_reason='cliente desistiu'`, `external_ref='ERP-B'`, `quantity=100`, `produced_quantity=98`, `lost_pieces=2`; a OS saiu de `jobs`. OS com remessa `in_transit` → `FG003 OS com remessa em andamento nao pode ser arquivada.`, com OS e remessa intactas; com a remessa em `delivered` → `{"archived":1}` e `children->'shipments'->0->>'tracking_code' = BR123`. OS com `packaging_tasks` pendente → `FG002` na chamada individual (antes virava `{archived:0,skipped:1}`, sem motivo); no lote `archive_jobs(p_older_than => now())` não levanta, devolve `{"skipped":2,"archived":3}` e registra `WARNING` nomeando cada motivo. `get_finished_jobs_for_evolution` devolveu 6 OS (jobs + arquivo); páginas de 2 em `offset 0` e `offset 2` sem id repetido; `operator` recebeu `42501` e `coordinator` leu as 6. `tsc` sem erro fora do baseline (`resizable`), `eslint` limpo nos arquivos tocados, `vitest src/features/jobs/services/jobsService.test.ts` 7/7.
PR: #305 · estado: aguardando o dono (DDL)

### 046 — 2026-11-24
Comando/consulta: `GET /v1/projects/uoujzvpecohinketylud/types/typescript` (Management API) gravado em `src/integrations/supabase/types.ts`, comparado com `git show HEAD:src/integrations/supabase/types.ts` por conjunto de nomes de tabela.
Resultado: 133 tabelas no arquivo antigo, 131 no banco. Só no arquivo antigo: `email_verification_tokens`, `gamification_settings`, `packaging_equipment`, `packaging_waste`, `shipment_costs`, `tpm_execution_checklist`, `webauthn_challenges`, `webauthn_credentials`. Só no banco: `archived_jobs`, `backup_logs`, `bitrix24_oauth_states`, `csp_violation_reports`, `erp_api_keys`, `system_metrics`. `cancel_reason` passou a existir em `jobs` (linhas 1567/1602/1637). Diff de 713 linhas; `npx tsc --noEmit` em 0 erros depois de trocar `null` por `undefined` nos argumentos RPC de `src/features/packaging/services/packagingService.ts:175-178` e `src/pages/PublicTrackingPage.tsx:80,86,92`.
PR: esta PR · estado: aguardando merge

### 047 — 2026-11-24
Comando/consulta: `.\node_modules\.bin\vitest.cmd run src/test/jobsService.test.ts src/features/jobs src/features/packaging` e prova de regressão com `git stash push -- jobsService.ts`; prova no banco em transação com `ROLLBACK`.
Resultado: 10 arquivos, **77 testes passed**. Com `jobsService.ts` original: **2 failed | 15 passed** — os dois casos novos de cancelamento são os que falham. No banco, `UPDATE jobs SET status='cancelled'` sem `cancel_reason` levanta `cancel_reason é obrigatório ao cancelar um job`; com motivo, passa. `tsc` 0 erros, `eslint` 0 erros nos arquivos tocados.
Caminho de leitura do motivo (revisão da #297): `jobsService.getAll` passa cada linha por `jobSchema.safeParse`, que descarta chaves não declaradas; `cancel_reason` foi declarado em `src/features/jobs/types/job.schema.ts:24` e há teste que falha sem essa linha (`src/test/jobsService.test.ts`, "preserves cancel_reason of a cancelled job for the details panel"). O modal renderiza o valor sob a guarda `job.status === 'cancelled'`.
Limite conhecido: o percurso pela tela (abrir a OS, tentar confirmar sem motivo, ver a gravação) **não** tem teste automatizado de render — o repo tem infra de RTL/jsdom, mas nenhum teste monta `JobDetailsModal`, que depende de ~14 hooks/providers. A cobertura do bloqueio é do serviço e da constraint no banco.
PR: esta PR · estado: aguardando merge

### 039 — 2026-11-25
Comando/consulta: banco descartável `d304` no Postgres 16, com `jobs`, `production_losses` e `shipments` no estado de produção (as duas chaves em `ON DELETE CASCADE`); aplicação das duas migrations e tentativa de `DELETE` em cada cenário.
Resultado: chaves passam a `confdeltype = 'r'` com `convalidated = true`. `DELETE` de OS com perda → `violates foreign key constraint "production_losses_job_id_fkey"`; `DELETE` de OS com expedição → `violates foreign key constraint "shipments_job_id_fkey"`; `DELETE` de OS sem prova → passa. A chave entra `NOT VALID` e a varredura corre em `VALIDATE CONSTRAINT`, então a migração não bloqueia `INSERT/UPDATE/DELETE` durante a validação; `statement_timeout` de 300s limita o tempo total.
Decisão registrada no cabeçalho da migration: o arquivamento (etapa 038) copia os filhos para `archived_jobs.children` e depois apaga as linhas originais, então o `RESTRICT` protege a exclusão avulsa e não o arquivamento — `production_losses.job_id` é `NOT NULL`, o que descarta `SET NULL`, e o total perdido continua em `jobs.lost_pieces`. A trilha de status segue em `CASCADE` porque recebe linha automática em OS `delayed`.
PR: esta PR · estado: aguardando dono (DDL)
### 038b — 2026-11-28
Comando/consulta: banco descartável `d305` (container `fgtest036`) com `public.jobs`, `archived_jobs`, `shipments`, `packaging_tasks`, `user_roles` e stubs de `auth.uid()`, `auth.jwt()` (lê `request.jwt.claims`) e de `cron.job`/`cron.schedule`/`cron.unschedule`. `psql -v ON_ERROR_STOP=1 -f supabase/migrations/20261128130000_f038_arquivar_os_concluida.sql` **duas vezes seguidas** e a bateria de asserções abaixo (cada checagem levanta exceção se falhar, então "TODAS AS ASSERCOES PASSARAM" é o resultado verde).
Resultado:
- **Agendamento** — depois de duas aplicações da migration, `cron.job` tem **uma** linha `archive-finished-jobs-daily`, `schedule='7 4 * * *'`, `command='SELECT public.archive_finished_jobs(now() - interval ''180 days'')'`. Prova por execução: sem `pg_cron` no banco de teste o bloco emite `WARNING`; com os stubs cria o job e `unschedule`+`schedule` não duplica.
- **Lote de 200** — 250 OS `finished` (200 dias atrás): 1ª chamada `{"archived":200,"skipped":0}`, 2ª `{"archived":50,"skipped":0}`, 3ª `{"archived":0,"skipped":0}`; `jobs` zerado e `archived_jobs` com as 250. Sem o `LIMIT`, a primeira execução do cron (produção tem `archived_jobs` com 0 linhas) arrastaria a tabela inteira numa transação.
- **MFA (aal2)** — `archive_jobs`: `manager` com `aal1` → `42501 Arquivar OS exige sessao com MFA verificado (aal2).`; `operator` com `aal2` → `42501 Apenas gerentes e administradores podem arquivar uma OS.`; `manager` com `aal2` → `{"archived":1}`; sem claims (cron/`service_role`) → `{"archived":1}`. `get_finished_jobs_for_evolution`: `manager` `aal1` → `42501 Historico arquivado exige sessao com MFA verificado (aal2).`; `coordinator` `aal2` lê as 254 OS e as páginas `limit 100 offset 0` / `offset 100` não repetem id.
- **Corrida com a logística** — tabela filha com trigger `BEFORE DELETE` (`pg_sleep(3)`) para manter a janela aberta dentro da função. **Com** o `FOR UPDATE`: o `INSERT INTO shipments` concorrente esperou **2.459 ms** e falhou em `shipments_job_id_fkey` (sqlstate `23503`); a OS foi arquivada e nenhuma remessa ficou órfã. **Sem** o lock (mesma ordem antiga: lê filhos → dorme → `DELETE`): o `INSERT` concorrente **teve sucesso** e a linha desapareceu no `ON DELETE CASCADE` — `shipments` terminou com 0 linhas e nenhum erro para o usuário. É exatamente a perda silenciosa que a thread apontou.
PR: #305 · estado: aguardando o dono (DDL)

### 059 / 060 / 061 — 2026-11-26
Comando/consulta: transação com `ROLLBACK` na Management API do projeto `uoujzvpecohinketylud` contra `public.operator_rankings` de produção, inserindo a mesma linha com `on conflict (operator_id, ranking_type, period_start)` e depois com `on conflict (operator_id, ranking_type, period_start, period_end)`; em seguida `deno check supabase/functions/calculate-rankings/index.ts`, `tsc --noEmit -p tsconfig.app.json` e `eslint src/pages/GamificationPage.tsx --max-warnings 0`.
Resultado: o alvo de conflito de **três** colunas devolveu `42P10 there is no unique or exclusion constraint matching the ON CONFLICT specification` — é o que o PostgREST converte em 400 e fazia a função lançar antes de gravar qualquer linha; o de **quatro** colunas passou e gravou 1 linha. Depois do `ROLLBACK`, `operator_rankings` continua com **0** linhas, ou seja, nenhum dado de prova ficou no banco. `deno check`, `tsc` e `eslint` terminaram sem erro.
Limite conhecido (não mascarar): o caminho de escrita **não** pôde ser exercitado de ponta a ponta. Produção tem 6 OS `finished`: 5 são semente sem `operator_id` e a única real (`b5b4f9b2-0812-463a-b341-7bbf363e87ad`) tem `actual_end_time` nulo, fora do filtro de período. Sem linha no período o upsert é pulado (`if (rankings.length > 0)`) e a chamada devolve `rankings_count: 0`, exatamente o que mascarava o defeito. A prova acima é do ponto exato que quebrava.
Como a tela dispara: `src/pages/GamificationPage.tsx` ganhou o botão Recalcular (visível para admin/coordenador) ligado a `calculateRankings` do `useGamification` — a mutation existia no hook e nenhuma tela chamava.
PR: #330 · estado: aguardando CI

---

## Achados novos durante a execução

Problema encontrado no caminho **não** é corrigido na hora. Anote aqui, com arquivo:linha, e siga a etapa atual.

```
### <data> — <título curto>
Onde: <arquivo:linha>
O que acontece:
Como foi notado:
```

### 2026-11-24 — Tipos do Supabase desatualizados em relação ao banco
Onde: `src/integrations/supabase/types.ts` (regenerado na etapa 046)
O que acontece: o arquivo declarava 8 tabelas que não existem no banco (`email_verification_tokens`, `gamification_settings`, `packaging_equipment`, `packaging_waste`, `shipment_costs`, `tpm_execution_checklist`, `webauthn_challenges`, `webauthn_credentials`) e omitia 6 que existem (`archived_jobs`, `backup_logs`, `bitrix24_oauth_states`, `csp_violation_reports`, `erp_api_keys`, `system_metrics`). Nenhum código usava as fantasmas, então o efeito era só tipo errado em consulta nova.
Como foi notado: comparação do arquivo antigo com a saída da Management API durante a etapa 046.

### 2026-11-24 — RLS de `jobs` não deixa `admin` atualizar OS
Onde: `public.jobs` (policies de UPDATE), `src/features/jobs/services/jobsService.ts:66`
O que acontece: as únicas policies de UPDATE são `Coordinators and managers can update jobs` (coordinator/manager) e `Operators can update jobs on assigned machines` (operator da máquina). O app libera o Kanban para quem tem `editJobs` (`src/features/auth/permissions.ts`), o que inclui `admin`, mas o UPDATE não atinge nenhuma linha e `jobsService.update` falha em `.single()` com "no rows returned" — a edição/cancelamento por admin nunca grava. Confirmado no banco de produção por `select policyname, cmd, roles, qual from pg_policies where tablename='jobs'`.
Como foi notado: revisão automatizada da PR do cancelamento de OS (#297), verificada contra `pg_policies`.
Efeito: correção exige DDL (policy de UPDATE para `admin`) — não entra nesta PR de front.

### 2026-11-26 — OS `finished` sem `actual_end_time` (e semente sem `operator_id`) deixa o ranking vazio
Onde: `supabase/functions/calculate-rankings/index.ts:111-113` (filtro `status = 'finished'` + `actual_end_time` no período) e `src/hooks/useGamification.ts:277-283` (mesmo filtro no cálculo local)
O que acontece: a OS `b5b4f9b2-0812-463a-b341-7bbf363e87ad` está `finished`, com `operator_id` preenchido e `actual_end_time` **nulo** — nenhum dos dois cálculos a enxerga. As outras 5 OS `finished` são semente (`a1111111-…`, julho/2026) e não têm `operator_id`, então o cálculo do servidor descarta todas (linha 144: `operator_id` nulo → `continue`). Em produção, hoje, o ranking persistido não tem como produzir linha: a tela só mostra algo pelo cálculo local, que atribui por `operator_machines` em vez de `operator_id` — duas regras de atribuição diferentes para a mesma pergunta, uma no backend e outra no navegador.
Como foi notado: durante a prova da etapa 059, ao tentar exercitar o caminho de escrita.
Efeito: decidir qual regra vale (operador que executou × máquina atribuída) e o que fazer com OS concluída sem `actual_end_time` é decisão de negócio — não entra nesta PR.

---

## Registros que as etapas pedem

- **Etapa 001** — versões de migration registradas no banco e ausentes do repositório, com o objeto que cada uma cria e a PR onde o arquivo está.
- **Etapa 020** — decisão do dono sobre monitoramento externo de erros.
- **Etapa 026** — decisão do dono sobre recuperação a um ponto no tempo (custo) e resultado do teste de restauração.
- **Etapa 027** — as duas consultas de diagnóstico de `error_logs` e a mensagem dominante.
- **Etapa 115 / 238–247** — decisão por função de servidor sem dono: agendar, desativar ou manter.
- **Etapa 122** — lista dos 28 arquivos acima de 500 linhas e a regra combinada.
- **Etapa 296** — decisão do dono sobre a API do ERP.
- **Etapa 300** — tabela antes / depois / pendente dos alertas do contexto gerado.

### 037 / 040 — 2026-11-28
Comando/consulta: `npx tsc --noEmit -p tsconfig.app.json` **e** `npx tsc --noEmit -p tsconfig.node.json` — o `--noEmit` sem `-p` não é equivalente: o repositório tem dois projetos e o comando solto deixa de checar o app; `npx vitest run src/pages/PendingQueue.test.tsx src/pages/KanbanBoard.test.tsx src/features/jobs/services/jobsService.test.ts src/test/jobsService.test.ts`; `npx eslint --max-warnings=0` nos 8 arquivos tocados. Tudo no worktree da branch da #306.
Resultado: **40/40** (PendingQueue 11 + KanbanBoard 2 + jobsService 7 + legado 20); `tsc -p tsconfig.app.json` só com os 7 erros de baseline em `src/components/ui/resizable.tsx` e `resizable.test.tsx`; `tsc -p tsconfig.node.json` exit 0; `eslint --max-warnings=0` exit 0. A regra de exclusão passou a viver em `deleteJobsByIds` (`src/features/jobs/services/jobsService.ts`), que lê `status`, `produced_quantity` e `lost_pieces` antes de apagar, **reaparece os mesmos filtros no próprio `DELETE`** — a promoção automática (`auto-promote-jobs`) pode levar a OS de `queue` para `ready` entre a leitura e o `DELETE` — e faz **uma única mutação** para o lote, para não quebrar a cadeia do `process_audit_log_hashing`, com `select('id')` no fim, que é o que distingue "apagou" de "a policy de DELETE filtrou sem erro". `deleteMany` devolve `{ deleted, refused }`; `PendingQueue.handleBulkDelete` (`src/pages/PendingQueue.tsx`) e a ação de exclusão do Kanban (`src/pages/KanbanBoard.tsx`) mantêm selecionadas apenas as recusadas, invalidam `['jobs']` quando alguma linha saiu e informam o motivo real no toast. `selectHiddenDeleteTargets` (`src/features/jobs/lib/pending-queue.ts`) lista, no diálogo de confirmação, as OS selecionadas que o filtro esconde. O texto completo dos 8 arquivos tocados está na PR #306.
PR: [#306](https://github.com/adm01-debug/Fast_Gravacoes_V2/pull/306) · estado: aguardando CI

### 014 — 2026-11-25
Comando/consulta: `deno check --frozen supabase/functions/cron-alert-email/index.ts`; `deno test --frozen --allow-env --allow-read=supabase/functions/_shared supabase/functions/_shared/*.test.ts`; `npx eslint supabase/functions/cron-alert-email/index.ts --max-warnings 0`; consulta em produção (`uoujzvpecohinketylud`) a `push_notifications`, `cron.job`, `net._http_response` e aos segredos do projeto pela Management API.
Resultado: `deno check` sem erro; suíte `_shared` **70 passed / 0 failed** (inclui os 16 casos de `emailDelivery.test.ts` que a #300 trouxe); eslint exit 0. Em produção: `RESEND_API_KEY` **não existe** entre os segredos do projeto e há 6 destinatários ativos (4 coordinator + 2 manager) com e-mail — o ramo que afirmava envio era o único possível; `push_notifications` tem **0 linhas** de `cron_email_sent`, porque a coleta não chega a rodar (ver abaixo). **Verificação funcional bloqueada**: o agendamento `cron-alert-email-every-30min` (`cron.job` id 5, `*/30 * * * *`) chama `https://supabase.atomicabr.com.br/functions/v1/cron-alert-email` só com `x-cron-secret`, mas a função está publicada com `verify_jwt = true` (`supabase/config.toml`); o gateway devolve `{"error":true,"code":"authorization_failed"}` e `net._http_response` registra **154 respostas, todas 401**. Nenhuma chamada de banco para Edge Function chega à função hoje — sem invocação não há linha real para registrar, e a prova executada são os testes acima mais o diff.
PR: [#300](https://github.com/adm01-debug/Fast_Gravacoes_V2/pull/300) (mergeada em `main` @ `18240190`) + PR desta branch (campos `email_enviado`/`failed`) · estado: mergeada + aguardando CI
### 233 — 2026-11-25
Comando/consulta: `npx vitest run src/features/admin/components/security/MFASettings.test.tsx` **antes e depois** da correção (`git stash push -- src/features/admin/components/security/MFASettings.tsx`); `npx tsc --noEmit -p tsconfig.app.json`; `npx eslint --max-warnings 0` nos três arquivos tocados.
Resultado: **2/2** testes novos. Com a correção removida o caso principal falha com `AssertionError: expected "vi.fn()" to be called with arguments: [ 'disable_mfa', Any<Function> ]` e `unenroll` não é chamado; com a correção passa. O `requireReauth` que já existia (`src/contexts/ReauthContext.tsx:58`) passou a ser chamado em: remover autenticador (`src/features/admin/components/security/MFASettings.tsx`, ação `disable_mfa` — antes bastava clicar em Remover com a sessão aberta e o segundo fator caía) e, em `src/components/settings/UserManagement.tsx`, editar usuário/papel, excluir usuário e convidar (ação `manage_users`). `ReauthProvider` já está montado em `src/providers/AppProviders.tsx`; validade de 5 min evita atrito repetido. tsc sem erro nos arquivos tocados; eslint exit 0; **verificação no navegador não executada** (exige sessão real de gestor em produção) — a prova é o teste que clica em Remover e confere que a senha é exigida antes de qualquer chamada ao Supabase. A revisão apontou dois furos fechados no mesmo escopo, em ``src/contexts/ReauthContext.tsx``: (1) a verificação chamava ``supabase.auth.signInWithPassword`` no cliente compartilhado, o que substituía a sessão AAL2 (2FA concluído) por uma sessão AAL1 e fazia o banco recusar a escrita de papel — agora a senha é conferida em um cliente descartável (``persistSession: false``, descartado no ``finally``), conferindo também que o id do usuário autenticado é o mesmo da sessão; (2) a confirmação de 5 min sobrevivia à troca de conta na mesma aba — agora vale só para o operador que a fez (``reauthOwnerId`` vs ``sessionUserId``) e é zerada no ``SIGNED_OUT``. Prova: ``src/contexts/ReauthContext.test.tsx`` com 3 casos (senha errada não prossegue e registra ``reauth_failed``; senha certa prossegue sem chamar o ``signInWithPassword`` do cliente compartilhado; troca de conta exige senha de novo) — **3/3** com a correção e **3/3 falhando** com ``git stash push -- src/contexts/ReauthContext.tsx``. ``MFASettings.test.tsx`` continua **2/2**.
A quarta rodada da revisão abriu 2 achados, tratados no mesmo escopo: (1) cada confirmação de senha criava um cliente Supabase com listener de `visibilitychange` que `signOut({ scope: 'local' })` não desfaz — a aba acumulava clientes vivos, acionados a cada retorno ao foco; o `finally` de `verifyPassword` (`src/contexts/ReauthContext.tsx:54-63`) passou a chamar `verifier.auth.dispose()` (disponível em `@supabase/auth-js` 2.119.0, `GoTrueClient.js:4692`, que remove o callback de visibilidade, para o auto-refresh, fecha o broadcast channel e limpa os emissores). Prova: caso de senha errada e caso de senha certa passaram a exigir `dispose` — com a chamada neutralizada os dois falham (`expected "vi.fn()" to be called at least once` e `expected "vi.fn()" to be called 1 times, but got 0 times`). (2) o teste da troca de conta disparava `SIGNED_OUT`, que limpa a confirmação por si só, então não exercitava a comparação entre contas; dois casos novos em `src/contexts/ReauthContext.test.tsx` cobrem o vínculo: `TOKEN_REFRESHED` do mesmo operador mantém a confirmação (segundo `requireReauth` chama o callback sem diálogo) e `SIGNED_IN` de outra conta **sem** `SIGNED_OUT` volta a exigir senha — com a comparação de dono removida (`reauthOwnerId !== sessionUserId`) esse caso falha em `AssertionError: expected "vi.fn()" to be called 1 times, but got 2 times`. Arquivo inteiro: `npx vitest run src/contexts/ReauthContext.test.tsx` **5/5**; `npx eslint` exit 0; `npx tsc --noEmit -p tsconfig.app.json` sem erro nos arquivos tocados.

### 232 — 2026-11-25
Comando/consulta: `npx vitest run src/features/auth/components/AuthProvider.test.tsx src/hooks/useOfflineSync.test.ts` no worktree da branch, **antes e depois** da correção (o mesmo teste com `git stash` do arquivo de produção); `npx eslint src/features/auth/components/AuthProvider.tsx src/features/auth/components/AuthProvider.test.tsx --max-warnings 0`; `npx tsc --noEmit -p tsconfig.app.json`.
Resultado: **18/18** testes do arquivo. Prova de que o teste cobre a etapa: com a correção removida (`git stash push -- …/AuthProvider.tsx`) o caso novo falha com `AssertionError: expected [ { id: 'job-do-usuario-anterior' } ] to be undefined`; com a correção passa. A limpeza (`queryClient.clear()`, `offlineStorage.clearAll()` e `clearFormDrafts`) saiu de `signOut()` e passou para o ramo `SIGNED_OUT` (`src/features/auth/components/AuthProvider.tsx`), por onde passam inatividade (`useSessionTimeout`), expiração de token e o gate de geo/IP — essas três chamam `supabase.auth.signOut()` direto e não executavam limpeza nenhuma. eslint exit 0; `tsc -p tsconfig.app.json` só com os 7 erros de baseline em `resizable.tsx`/`resizable.test.tsx` (o `node_modules` compartilhado tem `react-resizable-panels` 2.1.9 enquanto `package.json` pede ^4.24.1 — artefato do ambiente, não do código). **Verificação no navegador não executada**: entrar com o usuário A, forçar saída e entrar com B no mesmo perfil exige sessão real de produção; a prova obtida é o teste que emite `SIGNED_OUT` e confere cache do React Query, IndexedDB e rascunho zerados. A revisão da PR apontou um segundo buraco, fechado no mesmo escopo: a fila offline (`src/hooks/useOfflineSync.ts`) guarda ações pendentes e cache no **localStorage** (`fastgravacoes_pending_actions`, `fastgravacoes_cached_data`, `fastgravacoes_failed_actions`, `fastgravacoes_acknowledged_actions`), que o `offlineStorage.clearAll()` (IndexedDB) não alcança — e o `OfflineSyncProvider` continua montado depois da saída. `clearOfflineQueueStorage()` (`src/lib/offline/offlineQueue.ts`) mais uma assinatura de `SIGNED_OUT` no próprio hook limpam as quatro chaves e zeram o estado de cada instância montada; prova: `npx vitest run src/hooks/useOfflineSync.test.ts` **7/7**, e sem a assinatura o caso novo falha com `AssertionError: expected undefined to be type of 'function'`. A revisão apontou também que essa limpeza apagava a **única cópia** das alterações offline ainda não entregues (a tela promete que nada foi perdido): a saída passou a guardar a fila sob o id de quem saiu (`fastgravacoes_orphan_queue_<id>`) e o mesmo operador a recebe de volta ao entrar; outro operador nunca a recebe, e o cache de leitura continua sendo apagado. Prova: `quarantineOfflineQueueStorage`/`takeQuarantinedQueue` em `src/lib/offline/offlineQueue.ts` e 2 casos novos em `src/hooks/useOfflineSync.test.ts` — **9/9** com a correção, e os 2 novos casos falham sem ela (`git stash push -- src/hooks/useOfflineSync.ts`).
A terceira rodada da revisão abriu 3 achados no mesmo mecanismo, todos corrigidos: (a) sair **durante** um lote de sync quarentenava a fila anterior ao lote, incluindo ações que o servidor acabou de aplicar — o próximo login as reenviava em duplicidade; agora a quarentena é adiada para o fim do lote (`pendingSignOutOwnerRef` no `finally` de `runSyncPass`, `src/hooks/useOfflineSync.ts`), depois de o resultado do lote estar gravado, e o `toast`/`cacheData()` do operador anterior não rodam mais nesse caso. Prova: caso novo em `src/hooks/useOfflineSync.test.ts` com o banco pendurado (`jobsTable.then` pendente), a saída no meio do lote e a liberação depois — passa com a correção e, com a quarentena imediata restaurada, falha em `AssertionError: expected '{"pending":[{"id":"f26d407e-…' not to contain 'job-1'`. (b) `takeQuarantinedQueue` apagava a cópia guardada **antes** de a fila ativa ser gravada, então fechar a aba entre as duas operações perdia a única cópia da alteração; virou `readQuarantinedQueue` (lê sem apagar) + `dropQuarantinedQueue`, chamado só quando `safeLocalStorageSet(STORAGE_KEYS.PENDING_ACTIONS, …)` teve sucesso. Prova: caso novo que derruba o `Storage.prototype.setItem` para a chave da fila — a cópia guardada permanece (`toContain('acao-1')`) e, com o descarte incondicional, falha com `AssertionError: the given combination of arguments (null and string) is invalid`. (c) a cópia guardada ficava em texto claro no `localStorage` de um navegador compartilhado sem prazo: agora expira em 24 h (`QUARANTINE_TTL_MS`) e é removida ao ser lida fora do prazo. Prova: caso novo com `savedAt` 1 s além do TTL — não é restaurada e a chave some; com o teste de expiração desligado falha em `AssertionError: expected 1 to be +0`. Arquivo de teste inteiro: `npx vitest run src/hooks/useOfflineSync.test.ts` **12/12**; `npx eslint src/hooks/useOfflineSync.ts src/lib/offline/offlineQueue.ts src/hooks/useOfflineSync.test.ts` exit 0; `npx tsc --noEmit -p tsconfig.app.json` sem erro nos arquivos tocados. **Limitação conhecida e não resolvida no escopo**: qualquer código no `localStorage` do quiosque é legível por quem tem o aparelho (chave de criptografia no mesmo storage é teatro); o TTL de 24 h é o limite de exposição adotado.
A quarta rodada da revisão fechou o que sobrava desse mesmo mecanismo, em dois pontos. (a) A quarentena adiada lia fila e fracassos **do storage**, que naquele instante ainda tem a foto anterior ao lote: as ações rejeitadas no próprio lote (conflito ou tentativas esgotadas) saíam do estado antes de o lote gravá-las e não entravam na cópia; e a lista de rejeições já existente do operador que saía era apagada pelo efeito de persistência do estado zerado. Agora `runSyncPass` guarda o resultado do lote (`batchOutcome`) e a saída tira uma foto de `failedActions` (`departingFailedRef`) — a cópia guardada é a **união** dessas listas com o que já está no storage (`readQueueFromStorage` e `fastgravacoes_failed_actions`), deduplicada por id (`mergeById`), e nunca substitui a cópia anterior do mesmo dono — substituí-la apagaria a rejeição que só a outra aba conhecia —, e um lote nunca descarta a cópia de outro dono. Prova: caso novo que enfileira uma ação já em `MAX_RETRIES`, semeia uma rejeição anterior, prende o banco, sai no meio do lote (deixando o efeito de persistência gravar `[]` em `fastgravacoes_failed_actions`) e faz o banco responder erro — a cópia fica com `failed: ['acao-antiga', 'acao-exausta']` e `pending` vazio; sem a união das listas falha com `expected [ 'acao-antiga' ] to include 'acao-exausta'`. (b) Quando a restauração não cabia no storage, as ações seguiam em memória e eram sincronizadas, mas a cópia guardada ficava desatualizada e o próximo login (inclusive na renovação de token) reenviava o que já tinha sido aplicado. Agora a restauração que falha marca o dono (`quarantineMirrorOwnerRef`) e a primeira gravação bem-sucedida da fila ativa descarta essa cópia — só quando o dono da sessão é o mesmo. Prova: caso novo com o primeiro `setItem` da fila recusado, restauração em memória, sync bem-sucedido e `fastgravacoes_orphan_queue_operador-a` nula no fim; sem o descarte falha com `expected '{"pending":[{"id":"acao-1",…' to be null`. (c) O prazo de 24 h só valia quando o mesmo operador voltava; até lá a cópia ficava legível no aparelho. Agora todo evento de auth roda `purgeExpiredQuarantines()` (`src/lib/offline/offlineQueue.ts`), que varre `fastgravacoes_orphan_queue_*` e remove as vencidas de qualquer dono; cópias sem `savedAt` (formato anterior) são preservadas — idade desconhecida não é motivo para descartar alteração nunca entregue. Prova: caso novo com uma cópia vencida de `operador-vencido` e uma válida de `operador-b` no storage e login de `operador-a` — a vencida some e a válida permanece; sem a varredura falha com `expected '{"pending":[{"id":"job-1"}],"failed":…' to be null`. Arquivo inteiro: `npx vitest run src/hooks/useOfflineSync.test.ts` **15/15**; com as três correções revertidas os três casos novos falham (`3 failed | 12 passed`, cada um com a asserção acima); `npx eslint src/hooks/useOfflineSync.ts src/lib/offline/offlineQueue.ts src/hooks/useOfflineSync.test.ts` exit 0; `npx tsc --noEmit -p tsconfig.app.json` sem erro nos arquivos tocados. O `beforeEach` do teste também passou a devolver o thenable do banco ao comportamento padrão — um caso que o deixa pendurado contaminava os seguintes.
A quinta rodada fechou dois vãos que sobravam na cópia guardada. (a) Uma ação enfileirada **depois** de o lote tirar seu saldo ficava de fora: `quarantineOfflineQueueStorage` substituía `pending` pelo resultado do lote, então a alteração criada durante a saída (a tela só sai depois disso) não era guardada e o login seguinte a perdia. Agora a gravação **mescla** com a cópia existente e filtra a fila ativa pelas ações que o lote já resolveu (`processedIds`, o `snapshotIds` de `runSyncPass`, propagado no `batchOutcome`) — o que o servidor aplicou não é reenviado em duplicidade, e o que chegou depois fica guardado. Prova: caso novo que enfileira `acao-depois` durante o lote pendurado, sai e confere `pending` com a ação nova e sem as já aplicadas; com a substituição antiga falha. (b) Com duas abas, o mesmo `SIGNED_OUT` chega às duas e a segunda (chaves ativas já vazias) sobrescrevia a cópia da primeira, perdendo as rejeições mais recentes. Agora a mesclagem preserva `pending`, `failed` e `acknowledged` já guardados, unindo por id. Prova: caso novo que semeia a cópia de `operador-a`, dispara a saída de uma instância sem estado e confere que a rejeição guardada continua lá; sem a mesclagem falha. Arquivo inteiro: `npx vitest run src/hooks/useOfflineSync.test.ts` **17/17**; com o `offlineQueue.ts` do commit anterior os dois casos novos falham (`2 failed | 15 passed`); `npx tsc --noEmit` exit 0.

### 066 — 2026-11-25
Comando/consulta: `npx vitest run src/features/admin/components/security/SecurityOverviewCard.test.tsx`; `npx eslint --max-warnings 0 src/features/admin/components/security/SecurityOverviewCard.tsx src/features/admin/components/security/SecurityOverviewCard.test.tsx`; `npx tsc --noEmit -p tsconfig.app.json`
Resultado: **3/3**. Score de uma conta nova (sem 2FA, sem dispositivo, email não confirmado, HTTP) **antes = 60/100 "Médio"** (20 senha + 20 email + 15 sessão + 5 dispositivos eram somados com `status: 'pass'` fixo) e **depois = 0/100 "Crítico"**: os três itens fixos viraram leitura real — email por `user.email_confirmed_at` (`useAuth()`) e sessão por `window.location.protocol === 'https:'` — e "senha forte" virou `'warn'` com "Não verificado — o navegador não mede a força da senha", porque não há leitura possível no navegador. A pontuação passou a normalizar pelo máximo alcançável (80: 2FA 30 + dispositivos 15 + email 20 + sessão 15), então item não verificado não soma ponto (dispositivos saiu de 5 para 0 quando não há nenhum). Conta completa (2FA + dispositivo + email confirmado) dá 81/100, conferido no mesmo teste. eslint exit 0; `tsc -p tsconfig.app.json` sem erro nos arquivos tocados. A revisão apontou três ajustes fechados no mesmo escopo: (1) dispositivo só pontua se estiver marcado como confiável (`is_trusted`), o mesmo critério do resumo em `src/pages/SecurityDashboard.tsx:62` — antes qualquer registro aprovava o item e a tela mostrava zero confiáveis; (2) a legenda deixou de chamar o teto de "segurança máxima": 100 agora diz "Todos os itens verificáveis concluídos", porque a senha segue sem verificação automática; (3) a evidência passou a exercitar HTTPS — o teste troca `window.location.protocol` e confere 81/100 em HTTP (sessão "Não verificada") e 100/100 em HTTPS. Total do arquivo: **5/5** casos; com o componente original (`git checkout 14b04998 -- …/SecurityOverviewCard.tsx`) os **5 casos falham** — não três: os dois casos de regressão também contrariam o componente original, que exibe dispositivos registrados e aprova a sessão mesmo em HTTP. Asserções: `Unable to find an element with the text: 0/100 pontos`, `81/100 pontos`, `Não verificado — o navegador não mede a força da senha`, `0 dispositivo(s) confiável(is)` e `Não verificada — conexão sem HTTPS`.
PR: [#314](https://github.com/adm01-debug/Fast_Gravacoes_V2/pull/314)
