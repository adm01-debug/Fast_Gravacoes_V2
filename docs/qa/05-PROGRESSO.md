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
- [ ] 014 — Parar de registrar "e-mail enviado" quando nenhum e-mail foi enviado (alerta de rotina) — onda 1 — Alta
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
- [ ] 036 — Bloquear no banco a exclusão de OS que já teve produção — onda 1 — Crítica · **aprovação do dono**
- [ ] 037 — Dizer ao usuário o que a exclusão em massa vai apagar junto — onda 1 — Alta
- [ ] 038 — Usar o arquivamento que já existe em vez de apagar OS concluída — onda 1 — Média · **aprovação do dono**
- [ ] 039 — Revisar as exclusões em cascata que levam embora expedição e perdas — onda 1 — Alta · **aprovação do dono**
- [ ] 040 — Fazer a regra de bloqueio de exclusão valer no serviço do aplicativo — onda 1 — Crítica
- [ ] 056 — Tirar `user_roles` e a trilha de auditoria da lista de tabelas do túnel de banco — onda 1 — Crítica · **aprovação do dono**
- [ ] 057 — Decidir se o túnel genérico de banco deve continuar existindo — onda 1 — Alta · **aprovação do dono**
- [ ] 058 — Impedir que qualquer pessoa bloqueie a conta de um operador — onda 1 — Crítica · **aprovação do dono**
- [ ] 066 — Parar de aprovar itens de segurança sem verificar nada — onda 1 — Alta
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
- [ ] 232 — Limpar os dados do usuário anterior em toda saída de sessão — onda 1 — Alta
- [ ] 233 — Exigir senha de novo nas ações sensíveis (mecanismo já existe e está desligado) — onda 1 — Alta
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
- [ ] 052 — Unificar, no aplicativo, quais status ocupam uma máquina — onda 2 — Alta
- [ ] 053 — Decidir e corrigir, no banco, se OS concluída continua ocupando a máquina — onda 2 — Média · **aprovação do dono**
- [ ] 054 — Corrigir o tipo de técnica no esquema de validação de OS — onda 2 — Média
- [ ] 055 — Unificar os três esquemas concorrentes de OS — onda 2 — Média
- [ ] 059 — Corrigir o cálculo de ranking que falha em toda execução — onda 2 — Alta
- [ ] 060 — Fazer a limpeza de rankings obsoletos realmente apagar algo — onda 2 — Média
- [ ] 061 — Deixar um único critério de papel no cálculo de ranking — onda 2 — Média
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
- [ ] 260 — Estado de erro em a fila de pendentes — onda 5 — Alta
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
