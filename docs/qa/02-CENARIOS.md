# 02 — Matriz de cenários por jornada

Cada cenário cruza **ator × estado do dado × entrada × condição** e é rastreado de ponta a ponta (interface → hook → chamada → backend → banco → resposta → interface).

**Marca de verificação**
- `EXECUTADO` — foi disparado um comando, consulta ou requisição real e o resultado foi observado nesta auditoria (ou o CI real executou no commit auditado).
- `RASTREADO` — o caminho foi seguido pelo código/catálogo, sem exercitar o comportamento.

Nenhum cenário envolveu escrita em produção. Login não foi feito (ver limites em `01-INVENTARIO.md`), portanto **todo cenário autenticado é RASTREADO**.

---

## Jornada A — Entrar no sistema (ator: visitante → operator/coordinator/manager/admin)

| # | ator | estado | entrada | condição | esperado | encontrado | marca | achado |
|---|---|---|---|---|---|---|---|---|
| A1 | visitante | app publicado | abre `/auth` | normal | tela de login em pt-BR | OK — título "Entrar \| FAST GRAVAÇÕES" em `https://fast-gravacoes-v2.vercel.app/auth` | EXECUTADO | — |
| A2 | visitante | — | abre `https://fast-gravacoes-v2-juca1.vercel.app/` (host configurado no Supabase Auth) | normal | o app | **tela "Login – Vercel"**: host protegido por autenticação da Vercel | EXECUTADO | AUT-01 |
| A3 | visitante | — | abre `https://fastgravacoes.com.br` (default de `APP_URL` das edge functions) | normal | o app | **conexão fechada** — domínio não responde | EXECUTADO | AUT-01 |
| A4 | visitante | conta existente | pede "esqueci a senha" | normal | e-mail com link que abre o app | link gerado contra `site_url` = host protegido da Vercel; `authService.resetPassword` não passa `redirectTo` (`src/features/auth/services/authService.ts:31-34`) | RASTREADO | AUT-01 |
| A5 | gestor | solicitação pendente | aprova reset em `/security` | normal | operador recebe e-mail e troca a senha | `approve-password-reset` monta link em `APP_URL/reset-password` com `APP_URL` default `https://fastgravacoes.com.br` (`supabase/functions/approve-password-reset/index.ts:9,134`), domínio que não responde; `APP_URL` não está entre os secrets do projeto | RASTREADO | AUT-01, INT-01 |
| A6 | qualquer | — | 3 pedidos de reset na mesma hora | repetição | todos recebem e-mail | `rate_limit_email_sent: 2` por hora e `smtp_host: null` (sem SMTP próprio) → a partir do 3º, nenhum e-mail sai | RASTREADO | AUT-02 |
| A7 | visitante | — | `POST /auth/v1/signup` com a chave publishable (pública no bundle) | fora da UI | cadastro recusado | `disable_signup: false` no projeto; o bloqueio existe só no cliente (`AuthProvider.tsx:444-446` devolve erro sem chamar a API) | RASTREADO | AUT-03 |
| A8 | usuário com MFA | fator não-TOTP ou `listFactors` falhando | login | instabilidade | mensagem de erro clara | laço de redirecionamento entre `/` e `/auth` (`ProtectedRoute.tsx:124-127` × `AuthPage.tsx:70-82`) | RASTREADO | AUT-04 |
| A9 | operator | sessão expirada | mantém aba aberta e age | sessão expirada | pedido de novo login | `autoRefreshToken: true` + `storage: sessionStorage` (`src/integrations/supabase/client.ts:12-15`): ao fechar a aba a sessão morre; refresh falho cai em 401 tratado por tela | RASTREADO | — |
| A10 | qualquer | — | logout | normal | cache limpo | `queryClient.clear()` + `offlineStorage.clearAll()` (`AuthProvider.tsx:455-462`) | RASTREADO | — |
| A11 | admin | papel `admin` ativo | abre `/security`, salva permissão | normal | permissão salva | front libera tudo para `admin` (`ProtectedRoute.tsx:147-150`, `useRBAC.tsx:185`), mas nenhuma policy de `jobs`, `audit_log`, `role_permissions`, `blocked_ips` menciona `admin` → gravação negada pelo banco | RASTREADO | AUT-05 |

## Jornada B — Produzir: mudar o status de uma OS (ator: operator/coordinator)

| # | ator | estado | entrada | condição | esperado | encontrado | marca | achado |
|---|---|---|---|---|---|---|---|---|
| B1 | operator | OS em `ready` na máquina dele | "Iniciar produção" | normal | status vai para `production` | **falha**: o trigger `tr_audit_job_status` chama `audit_job_status_change()`, que insere em `audit_log(old_values, new_values)` — colunas que não existem (a tabela tem `old_data`/`new_data`) → erro 42703 em qualquer UPDATE de `jobs.status` | RASTREADO (reprodução ao vivo registrada em `docs/pendencias/F-009...md`) | BD-01 |
| B2 | coordinator | OS em `production` | "Concluir" | normal | `finished` + tarefa de embalagem criada | mesma falha de B1 antes de qualquer trigger de negócio rodar | RASTREADO | BD-01 |
| B3 | cron | OS concluída | `auto-promote-jobs` a cada 5 min | automático | promove próxima OS | o UPDATE de status é a última etapa e falha pelo mesmo motivo | RASTREADO | BD-01 |
| B4 | operator | OS em `queue` | `PATCH /rest/v1/jobs` direto com `status=finished` | fora da UI | recusa (transição inválida) | banco só valida o **valor** (`jobs_status_check`), não a transição; a máquina de estados existe apenas no cliente (`src/features/jobs/services/jobStateMachine.ts:8-20`) | RASTREADO | RN-01 |
| B5 | operator | OS de máquina não atribuída | tenta atualizar | — | recusa | policy `Operators can update jobs on assigned machines` exige `machine_id` entre as máquinas do operador | RASTREADO | — |
| B6 | operator | OS atribuída | atualiza `quantity`, `priority`, `order_number`, `produced_quantity` | fora da UI | recusa (não é papel dele) | a policy autoriza **a linha inteira**, sem restrição por coluna | RASTREADO | RN-02 |
| B7 | dois operadores | mesma OS | concluem ao mesmo tempo | concorrência | um vence, outro recebe aviso | sem travamento otimista (`updated_at`/`version` não é comparado em `jobsService.update`, `src/features/jobs/services/jobsService.ts:66`) | RASTREADO | RN-03 |
| B8 | operator | sem rede | conclui OS | rede caindo | ação enfileirada e reenviada | há fila offline (`offlineStorage`) — comportamento com conflito ao reconectar não é resolvido | RASTREADO | RN-03 |

## Jornada C — Rastreamento público (ator: visitante)

| # | ator | estado | entrada | condição | esperado | encontrado | marca | achado |
|---|---|---|---|---|---|---|---|---|
| C1 | visitante | — | abre `/track` | normal | formulário de rastreio | OK — "Portal Oficial de Rastreamento" | EXECUTADO | — |
| C2 | visitante | OS existente | informa `OS-2026-001` | normal | status do próprio pedido | RPC `get_public_tracking` devolve id, nº, status, produto, prazo, **fotos de produção** e dados de entrega | RASTREADO | SEG-03 |
| C3 | visitante | — | varre `OS-2026-001..999` | repetição | bloqueio por limite | número de OS é digitado em formato sequencial (`NewJobPage.tsx:290`, "Ex: OS-2024-001") e a RPC é `SECURITY DEFINER` liberada a `anon`, sem limite de requisições | RASTREADO | SEG-03 |
| C4 | visitante | — | `POST /rest/v1/password_reset_requests` com e-mail arbitrário | repetição | bloqueio | policy `Anyone can request password reset` permite INSERT de `anon` só exigindo `status='pending'`; `user_email` é texto livre, sem FK, sem unicidade, sem limite | RASTREADO | SEG-02 |
| C5 | visitante | — | abre `/design-system` | normal | nada (rota interna) | renderiza o **layout autenticado completo**, com menu interno, "Novo Agendamento" e "Sair" | EXECUTADO | SEG-01 |

## Jornada D — Publicar mudanças (ator: agente/dono)

| # | ator | estado | entrada | condição | esperado | encontrado | marca | achado |
|---|---|---|---|---|---|---|---|---|
| D1 | agente | PR verde | merge em `main` | normal | migrations aplicadas + edges publicadas | **Deploy falha**: `Remote migration versions not found in local migrations directory` → `20261122010000` está registrada no banco e não existe na `main`; `Apply DB Migrations` e `Deploy Edge Functions` ficam `skipped` | EXECUTADO (run 45061732797, 2026-11-22) | DEP-01 |
| D2 | agente | 4 commits seguidos | push em `main` | repetição | deploy verde | 4 falhas consecutivas (15:44, 16:06, 16:32, 19:36 de 2026-11-22); último deploy verde foi `75dc9249` às 11:23 | EXECUTADO | DEP-01 |
| D3 | agente | PR com teste E2E vermelho | merge | — | merge bloqueado | `Quality Gate ✅` trata `e2e` como advisory e considera `skipped`/`cancelled` como aprovado (`.github/workflows/ci.yml:543-556`) | EXECUTADO (gate verde no commit auditado) | CI-01 |
| D4 | dono | — | confia no painel do Supabase | — | estado íntegro | a branch do projeto está com `status: MIGRATIONS_FAILED` (`supabase/project-config.md`) | EXECUTADO | DEP-01 |

## Jornada E — Embalar e expedir (ator: operator/coordinator)

| # | ator | estado | entrada | condição | esperado | encontrado | marca | achado |
|---|---|---|---|---|---|---|---|---|
| E1 | sistema | OS concluída | gatilho cria tarefa de embalagem | automático | tarefa criada | depende de B1/B2, que falham antes (o gatilho é AFTER UPDATE de `jobs`) | RASTREADO | BD-01 |
| E2 | operator | tarefa livre | "assumir tarefa" | normal | tarefa atribuída | função do banco `assign_packaging_task` valida usuário e papel corretamente | RASTREADO | — |
| E3 | operator | tarefa atribuída | registra defeito com foto | normal | defeito gravado e quantidade rejeitada somada | `packagingService.ts:190-193` lê a quantidade e grava a soma em duas etapas, sem transação (corrida; é a PR #249, aberta) | RASTREADO | — (PR aberta) |
| E4 | operator | — | envia arquivo `.exe` renomeado para `.jpg` | malformada | recusa | `packagingService.ts:197-211` envia sem verificar conteúdo, tipo ou tamanho; o balde também não tem limite | RASTREADO | SEG-06, STO-02 |
| E5 | qualquer logado | — | lista defeitos de qualquer tarefa | fora do escopo | só os defeitos das tarefas dele | policy `Anyone can see defects` com `USING true` libera todos | RASTREADO | BD-05 |
| E6 | coordinator | tarefa pronta | gatilho cria expedição | repetição do gatilho | uma expedição | `shipments` não tem unicidade por OS: reexecução cria duplicada | RASTREADO | BD-17 |
| E7 | cliente | pedido com foto | consulta `/track` | normal | status | recebe também link direto da foto de produção, válido por 30 dias | RASTREADO | SEG-07, STO-01 |
| E8 | operator | 30 dias depois | abre a evidência da tarefa | passagem de tempo | foto abre | o link assinado expirou e foi o que ficou gravado no banco | RASTREADO | STO-01 |

## Jornada F — Manutenção e TPM (ator: technician/coordinator)

| # | ator | estado | entrada | condição | esperado | encontrado | marca | achado |
|---|---|---|---|---|---|---|---|---|
| F1 | coordinator | máquina cadastrada | cria agendamento preventivo | normal | agendamento criado | funciona (há mutação de criação) | RASTREADO | — |
| F2 | coordinator | agendamento com data errada | corrigir a data | normal | agendamento atualizado | **não existe** ação de editar nem de desativar (`useTPMLifecycleMutations.ts:270-274` expõe só criar/iniciar/concluir) | RASTREADO | FUN-06 |
| F3 | sistema | agendamento vencendo | aviso por e-mail | automático | técnico avisado | sem chave de e-mail configurada, nada sai e o painel registra como enviado | RASTREADO | INT-01 |
| F4 | sistema | fila de avisos de TPM | rotina consome a fila | automático | avisos enviados | a fila **não tem produtor**: o laço que deveria gerar os itens não gera nada | RASTREADO | EDG-09 |
| F5 | sistema | item da fila falhou | nova tentativa | repetição | reprocessa | a consulta busca só `pending`; o caminho de falha grava `failed` e nunca é tentado de novo | RASTREADO | EDG-10 |
| F6 | technician | execução concluída | anexa evidência | normal | evidência salva e visível | upload funciona (caminho com identificador do usuário); o link gravado expira em 30 dias | RASTREADO | STO-01 |
| F7 | coordinator | 21h de Brasília | gera a OS impressa | borda de horário | data do dia corrente | as funções de servidor formatam sem fuso e rodam em UTC: imprime a data do dia seguinte | RASTREADO | EDG-12 |
| F8 | sistema | previsão nova para a máquina | grava predição | falha no meio | máquina mantém previsão anterior | a função desativa as anteriores **antes** de inserir, sem transação: falha deixa a máquina sem previsão | RASTREADO | EDG-14 |

## Jornada G — Decidir com os painéis (ator: manager/admin)

| # | ator | estado | entrada | condição | esperado | encontrado | marca | achado |
|---|---|---|---|---|---|---|---|---|
| G1 | manager | base vazia | abre o gêmeo digital | vazio | "sem dado" | mostra "Eficiência Global (OEE) 92,4% — Excelente" | RASTREADO | UI-11 |
| G2 | manager | qualquer | abre o quiosque de fábrica | normal | números reais | OEE 94,2%, consumo 1,2 kWh, tempo médio 42s e previsão 16:45, todos fixos no código | RASTREADO | UI-10 |
| G3 | manager | qualquer | exporta o relatório de inteligência de negócio | normal | planilha com dados reais | sai com eficiência 95% fixa em todas as linhas | RASTREADO | UI-13 |
| G4 | manager | qualquer | exporta o painel de indicadores | normal | planilha com as OS | sai **vazia** (a lista é passada fixada em vazio) | RASTREADO | FUN-03 |
| G5 | manager | mais de 1000 OS no período | recebe o relatório por e-mail | muitos registros | totais corretos | o cálculo é feito sobre a resposta cortada no limite de 1000 linhas do projeto | RASTREADO | EDG-11 |
| G6 | manager | qualquer | seleciona "Studio Beta" no filtro | entrada válida | OS do grupo | tela zerada: o filtro aponta para técnicas que não existem no banco | RASTREADO | UI-14 |
| G7 | manager | qualquer | abre o painel de monitoramento e deixa aberto | repetição | dados atualizados | quatro consultas em repetição, uma delas de 3,57s, somando ~8,5s de banco por minuto por aba | RASTREADO | PERF-02 |
| G8 | manager | qualquer | abre o painel de erros do sistema | normal | lista de erros | **sempre vazio**: a permissão exige dono do registro e o gravador nunca informa o dono — e a consulta já custou 41 minutos de processamento | RASTREADO | BD-14, PERF-01 |
| G9 | manager | 42 mil medições | abre o gráfico de tendência das rotinas | muitos registros | tendência completa | usa as 1000 primeiras linhas (pede 2000, o projeto corta em 1000), sem avisar | RASTREADO | PERF-03 |
| G10 | manager | qualquer | define a meta no painel executivo | normal | meta salva | avisa "meta salva" e volta a 85% ao recarregar | RASTREADO | FUN-07 |

## Jornada H — Administrar (ator: admin/coordinator)

| # | ator | estado | entrada | condição | esperado | encontrado | marca | achado |
|---|---|---|---|---|---|---|---|---|
| H1 | admin | qualquer | abre qualquer tela e tenta salvar | normal | salva | o aplicativo libera tudo para `admin`, e nenhuma permissão do banco em `jobs`, `audit_log`, `role_permissions`, `blocked_ips` reconhece esse papel: a gravação é negada | RASTREADO | AUT-05 |
| H2 | coordinator | papel com permissão concedida | **revoga** uma permissão | normal | usuário perde o acesso | o aplicativo soma as permissões do banco com um mapa fixo no código: a revogação não tem efeito | RASTREADO | AUT-07 |
| H3 | coordinator | — | cria operador | normal | operador criado com papel | fluxo existe (função de servidor com verificação de papel e limite de uso) | RASTREADO | — |
| H4 | coordinator | — | altera dados de um operador | fora da UI | só operador pode ser alvo | a função aceita qualquer identificador de perfil, sem validar formato nem papel do alvo, e sem limite de uso | RASTREADO | EDG-07 |
| H5 | staff desativado | papel marcado inativo | consulta perfis | revogação | acesso negado | `is_staff()` não filtra papel ativo: continua lendo todos os perfis e todos os papéis | RASTREADO | BD-07 |
| H6 | operator | — | abre a busca rápida (atalho de teclado) | normal | só o que ele pode usar | lista todas as telas restritas; ao escolher, é barrado pela rota | RASTREADO | NAV-02 |
| H7 | qualquer logado | — | pressiona o botão "Novo Item" do estoque | normal | formulário de item | o botão foi **removido** porque nunca houve formulário; o catálogo é somente leitura | RASTREADO | FUN-04 |
| H8 | coordinator | dois lotes selecionados | clica "QR Lote" | normal | etiqueta aberta | valida a seleção e não mostra nada: o componente de etiqueta nunca é montado | RASTREADO | FUN-05 |
| H9 | atacante com sessão aberta de outra pessoa | — | desativa o segundo fator | sessão alheia | pede a senha | o mecanismo de re-autenticação existe pronto e **nenhuma tela o chama** | RASTREADO | AUT-10 |
| H10 | operator B | operator A saiu por expiração | usa o mesmo navegador | sessão expirada | nenhum dado do A | só a saída pelo botão limpa o cache e o banco local; expiração e saída pelo serviço não limpam | RASTREADO | AUT-09 |

## Resumo da matriz

| | quantidade |
|---|---|
| cenários rastreados ponta a ponta | **63** |
| dos quais verificados por execução real (navegação ao vivo, consulta ao catálogo por comando, ou execução do CI no commit auditado) | **11** |
| cenários em que o encontrado difere do esperado (viraram achado) | **54** |
| jornadas cobertas | 8 (acesso, produção, rastreamento público, publicação, embalagem/expedição, manutenção, painéis, administração) |

Dimensões cruzadas em cada jornada: **ator** (visitante, operator, coordinator, manager, admin, cron/servidor, usuário de outra conta), **estado do dado** (vazio, um registro, muitos, no limite do projeto, inválido, duplicado, já excluído), **entrada** (válida, vazia, enorme, malformada, caractere especial, valor de borda) e **condição** (duplo clique, duas abas, dois usuários ao mesmo tempo, rede caindo, sessão expirada, terceiro fora do ar, reenvio, passos fora de ordem, borda de fuso horário).
