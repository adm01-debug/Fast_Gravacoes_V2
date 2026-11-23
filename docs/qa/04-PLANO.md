# 04 — Plano de correção em 300 etapas

> Produzido pela auditoria de QA de 2026-11-22/23 sobre o commit `ca42441b` da `main`.
> Achados e evidências: `docs/qa/03-ACHADOS.md`. Cenários: `docs/qa/02-CENARIOS.md`. Progresso: `docs/qa/05-PROGRESSO.md`.

## Instruções para o agente executor

Você vai executar este plano sozinho, sem acesso a quem o escreveu. Tudo o que você precisa está aqui e nos arquivos irmãos em `docs/qa/`.

1. **Uma etapa por vez, na ordem das ondas** (ver a tabela "Ondas e ordem de execução"), respeitando `Depende de`. Cada etapa tem sua própria branch e sua própria PR, no padrão do repositório: `claude/<fix|feat|chore|infra>-<slug>-<AAMMDD-HHMM>` (sem o carimbo de data/hora a branch não é aceita). Nunca commite em `main`, nunca reaproveite branch de outro agente, nunca escreva em branch que você não criou nesta sessão.
2. **Antes de mudar qualquer coisa, releia a evidência da etapa no código atual.** O repositório tem vários agentes trabalhando ao mesmo tempo. Se o arquivo, a linha ou o comportamento descrito já não corresponde ao que está lá, **pare a etapa**: registre em `05-PROGRESSO.md` a linha `[~] NNN — evidência não confere: <o que você encontrou>` e siga para a próxima etapa independente. Não "adapte" a etapa por conta própria.
3. **Antes de começar qualquer etapa**, leia o estado real: `git fetch origin contexto && git show origin/contexto:docs/contexto/00-INDEX.md`. Migration no repositório é histórico; o que existe no banco está em `origin/contexto:docs/contexto/supabase/`. Liste também as PRs abertas (`github_graphql`) — se houver PR aberta tocando os mesmos arquivos da sua etapa, pare e avise o dono.
4. **Corrija a causa raiz com a menor mudança possível.** Não refatore, não renomeie, não "melhore" e não comente o que a etapa não pede. Não reescreva arquivo inteiro para mudar três linhas. Dependência nova ou bump de major só se for indispensável — e avise na PR.
5. **Problema novo encontrado no caminho não é corrigido na hora.** Anote no fim de `05-PROGRESSO.md`, na seção "Achados novos durante a execução", com arquivo:linha. Expandir escopo é a forma mais comum de quebrar este plano.
6. **Etapa marcada com `Precisa de aprovação humana: sim` fica com a PR aberta**, com o corpo explicando o que muda e o que foi verificado, e você avisa o dono. Não mergeie. Isso vale para: DDL/migration em produção, CI/workflows, segredos, Dockerfile/infra, deleção de dado, mudança de arquitetura ou de custo.
7. **Etapas sem aprovação humana** (front, hook, edge function, config de app) você mergeia você mesmo quando a PR estiver pronta: CI verde, sem conflito com `main`. Squash-merge e apague a branch.
8. **Uma etapa só é concluída com a verificação executada e a evidência anotada** em `05-PROGRESSO.md` (saída do comando, resultado da consulta, status HTTP da requisição). "Deveria funcionar" não conclui etapa. Nunca escreva "testado" sobre algo que você só leu.
9. **Nunca desabilite, pule ou coloque em quarentena um teste para ficar verde.** Se o teste estava vermelho antes da sua mudança (herdado da `main`), anote em "Achados novos" e siga.
10. **Comandos de verificação do repositório**: `npm ci --legacy-peer-deps` · `npm run lint` · `npx tsc --noEmit -p tsconfig.app.json && npx tsc --noEmit -p tsconfig.node.json` · `npm run test` (um arquivo: `npx vitest run <caminho>`) · `npm run test:e2e` · `npm run quality:gate`. Em ambiente onde `npm ci` falhe por bloqueio de registry, diga isso na PR em vez de afirmar que verificou.
11. **Ordem das ondas é deliberada.** As etapas 001–012 destravam o resto: enquanto o deploy de banco estiver bloqueado (Onda 1), nenhuma correção de banco ou de edge function chega à produção, e portanto nenhuma etapa que dependa de DDL pode ser concluída de verdade. Não pule a Onda 1 para "adiantar" front.
12. **Escrita no GitHub** nos repositórios `adm01-debug` usa o MCP `GITHUB - MCP - FOREVER` (o MCP padrão responde 403 em escrita). `github_push_files` manda arquivos e deleções num único commit.

### Ondas e ordem de execução

**Execute na ordem das ondas, não na ordem dos números.** As etapas foram numeradas na ordem em que foram escritas; a ordem de execução é a da tabela abaixo e, dentro de cada onda, a ordem numérica respeitando o campo `Depende de`. Uma etapa cujas dependências estão em onda posterior (acontece em poucos casos, sempre indicado no campo) espera por elas.

| ordem | onda | etapas | qtd |
|---|---|---|---|
| 1º | Segurança e risco de perda de dado | 001–040, 056–058, 066, 086–091, 116, 146–147, 149, 154–165, 218–223, 231–236, 287–288 | 80 |
| 2º | Fluxos principais quebrados | 041–055, 059–063, 067–068, 070, 081, 095–096, 113, 123–125, 127, 131, 138, 140, 200–204, 255–256, 296 | 42 |
| 3º | Integridade de dados e regras de negócio | 064–065, 071–072, 092–093, 098, 100–101, 105–106, 108, 126, 130, 134–135, 179, 192, 205–207, 224–230, 275–279 | 33 |
| 4º | Funcionalidades incompletas | 069, 073–076, 082–085, 097, 099, 132, 170–176, 191, 193–198, 257, 280–286 | 34 |
| 5º | Robustez: erros, estados, concorrência | 077–080, 102–103, 128–129, 133, 136–137, 148, 166–169, 237, 259–270, 294–295 | 31 |
| 6º | Performance | 104, 143, 150–152, 177–178, 180–181, 183–190 | 17 |
| 7º | Experiência de uso e consistência | 110–112, 118, 145, 271–274 | 9 |
| 8º | Higiene: código morto, CI, observabilidade, documentação | 094, 107, 109, 114–115, 117, 119–122, 139, 141–142, 144, 153, 182, 199, 208–217, 238–254, 258, 289–293, 297–300 | 54 |

Total: **300 etapas** · 12 Críticas, 121 Altas, 125 Médias, 42 Baixas · **129** exigem aprovação humana antes do merge (migration/DDL em produção, CI, segredos, infraestrutura, custo ou decisão de negócio).

**As doze primeiras coisas a fazer** (nesta ordem, porque destravam o resto): 001, 002, 003 (deploy de banco e funções voltar a funcionar) → 004 (mudança de status de OS parar de falhar) → 005, 006, 007, 008 (recuperação de senha e e-mail voltarem a funcionar) → 013 (segredo do serviço de e-mail) → 056, 058 (fechar a escalada de privilégio e o bloqueio remoto de conta) → 036 (parar de permitir apagar OS com produção).

---

## Onda 1 — Segurança e risco de perda de dado

### Etapa 001 — Levantar exatamente qual versão de migration o banco tem e a `main` não tem
Onda 1 / Severidade Crítica / Camada: infraestrutura de publicação
Achados resolvidos: DEP-01
Problema hoje: o job *Validate Supabase Target (dry-run)* do `deploy.yml` aborta com `Remote migration versions not found in local migrations directory` (run 45061732797) e sugere `supabase migration repair --status reverted 20261122010000 --remote`. O banco registra `20261122010000 seed_role_permissions` (`origin/contexto:docs/contexto/supabase/migrations.md:256`), arquivo que não existe na `main`.
Causa raiz: uma migration de PR aberta foi aplicada direto no banco, fora do fluxo arquivo → PR → merge → `deploy.yml`.
Caminho recomendado: esta etapa **não corrige nada** — ela produz o diagnóstico que as etapas 002 e 003 consomem, e existe separada porque escolher errado entre "registrar a migration no repo" e "reverter o registro no banco" causa perda de permissões em produção. Faça: (a) `git fetch origin contexto && git show origin/contexto:docs/contexto/supabase/migrations.md | tail -20` e liste toda versão registrada no banco que não tenha arquivo em `supabase/migrations/` na `main`; (b) para cada uma, verifique se o objeto que ela cria **já existe** no banco (no caso de `seed_role_permissions`, confira `origin/contexto:docs/contexto/supabase/tables/public/role_permissions.md` e a contagem em `stats.md` — hoje ~170 linhas, ou seja, o seed rodou); (c) verifique se o arquivo existe em alguma PR aberta (`github_graphql` nas PRs abertas, hoje #256); (d) escreva o resultado em `docs/qa/05-PROGRESSO.md`. Não rode `migration repair` nesta etapa. O atalho tentador é rodar o `repair` que a mensagem do Supabase sugere: ele marcaria a migration como revertida e, no próximo `db push`, o Supabase tentaria **aplicar de novo** um seed que já rodou.
Arquivos e objetos a tocar: nenhum (somente leitura) + `docs/qa/05-PROGRESSO.md`.
Não tocar / armadilhas: não altere a branch `contexto` (é gerada); não mexa na PR #256 (é de outro agente); não aplique nada pelo painel do Supabase.
Depende de: — · Libera: 002, 003
Risco e como reverter: nenhum (leitura).
Precisa de aprovação humana antes do merge: não
Como verificar: a nota em `05-PROGRESSO.md` lista, para cada versão órfã, se o objeto existe no banco e em qual PR está o arquivo. Esperado hoje: exatamente uma versão (`20261122010000`), objeto presente, arquivo na PR #256.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 002 — Trazer para a `main` a migration que já foi aplicada em produção, de forma idempotente
Onda 1 / Severidade Crítica / Camada: banco (DDL)
Achados resolvidos: DEP-01
Problema hoje: a versão `20261122010000` existe no banco e não na `main`, e por isso `supabase db push` falha antes de aplicar qualquer coisa (log do run 45061732797).
Causa raiz: idem 001.
Caminho recomendado: antes de escrever o arquivo, **extraia o conteúdo real que está em produção** — `SELECT role, permission, resource, action, is_granted FROM role_permissions ORDER BY role, permission` (somente leitura) — e compare com o arquivo da PR #256: o que vale é o que está no banco, porque é isso que a versão registrada representa. Depois crie em `supabase/migrations/20261122010000_seed_role_permissions.sql` **o mesmo conteúdo** que está na PR #256 (copie o arquivo dela; não reescreva do zero), ajustando apenas as linhas em que ele divergir do banco e torne-o seguro para reaplicação: todo `INSERT` com `ON CONFLICT DO NOTHING` e todo `CREATE` com `IF NOT EXISTS`, porque o Supabase pode considerar a versão pendente em algum ambiente. Não inclua nada além do seed — a PR #256 também muda código de front, e misturar as duas coisas devolve o problema de origem. Padrão a seguir: qualquer migration de seed recente do repositório, por exemplo `supabase/migrations/20261108000001_business_rules_ddl.sql`. O atalho tentador é esperar o merge da PR #256: enquanto ela não mergear, **todo** deploy da `main` continua falhando, inclusive os de etapas desta onda.
Arquivos e objetos a tocar: `supabase/migrations/20261122010000_seed_role_permissions.sql` (novo).
Não tocar / armadilhas: não renomeie o arquivo nem mude o carimbo de versão (precisa casar exatamente com o que está registrado no banco); não toque em `src/`; não edite a PR #256.
Depende de: 001 · Libera: 003, 004, 005, 006
Risco e como reverter: baixo — o arquivo é histórico; se divergir do que rodou, o `db push` apenas marcará a versão como aplicada. Reverter = remover o arquivo.
Precisa de aprovação humana antes do merge: sim (migration em produção)
Como verificar: na PR, o job *Validate Supabase Target (dry-run)* do `deploy.yml` passa a concluir sem o erro `Remote migration versions not found`. Depois do merge, confira o run do `Deploy` da `main`: `Apply DB Migrations` sai de `skipped`.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 003 — Confirmar que o deploy voltou a aplicar banco e funções de servidor
Onda 1 / Severidade Crítica / Camada: infraestrutura de publicação
Achados resolvidos: DEP-01
Problema hoje: os quatro últimos deploys da `main` falharam (15:44, 16:06, 16:32 e 19:36 de 2026-11-22) e o projeto está com `"status": "MIGRATIONS_FAILED"` (`origin/contexto:docs/contexto/supabase/project-config.md`).
Causa raiz: idem 001.
Caminho recomendado: depois do merge da etapa 002, acompanhe o run do workflow `Deploy` na `main` e verifique os três jobs: *Validate Supabase Target*, *Apply DB Migrations*, *Deploy Edge Functions*. Se `Apply DB Migrations` falhar por outra versão órfã, volte à etapa 001 para essa versão (pode haver mais de uma) em vez de forçar. Em seguida espere a próxima coleta da branch `contexto` (a cada 10 min) e confirme que `project-config.md` não traz mais `MIGRATIONS_FAILED`. O atalho tentador é declarar sucesso só porque a PR ficou verde: o `deploy.yml` roda **depois** do merge; PR verde não prova deploy aplicado.
Arquivos e objetos a tocar: nenhum (verificação) + `docs/qa/05-PROGRESSO.md`.
Não tocar / armadilhas: não re-rode o deploy repetidamente se o erro for `toomanyrequests` do ghcr.io — isso é conhecido (`PENDENCIAS.md` item 3) e resolve com um novo run.
Depende de: 002 · Libera: 004 a 012, e toda etapa com DDL
Risco e como reverter: nenhum (leitura).
Precisa de aprovação humana antes do merge: não
Como verificar: run do `Deploy` da `main` com conclusão `success` e os jobs `Apply DB Migrations` e `Deploy Edge Functions` executados (não `skipped`). Registre o número do run em `05-PROGRESSO.md`.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 004 — Corrigir as funções de auditoria de OS que gravam em colunas inexistentes
Onda 1 / Severidade Crítica / Camada: banco (função de trigger)
Achados resolvidos: BD-01
Problema hoje: `audit_job_status_change()` insere em `public.audit_log (… old_values, new_values …)` (`origin/contexto:docs/contexto/supabase/functions/public/audit_job_status_change__12ae32cb1ec02d01.sql`), mas as colunas reais de `audit_log` são `old_data` e `new_data` (`origin/contexto:docs/contexto/supabase/tables/public/audit_log.md`). O trigger `tr_audit_job_status` está habilitado em `jobs` (`tables/public/jobs.md`), então **todo** UPDATE que muda `jobs.status` falha com 42703.
Causa raiz: a tabela de auditoria foi reconstruída com outros nomes de coluna e as funções de trigger antigas nunca foram atualizadas.
Caminho recomendado: a correção já está escrita na **PR #244** (`supabase/migrations/20261121110000_fix_audit_triggers_old_values.sql`), aberta aguardando o dono. Primeiro leia essa migration e confira, contra `audit_log.md` e `job_status_audit.md` do snapshot, que ela usa os nomes reais (`old_data`/`new_data`) e que não referencia `NEW.code` (coluna que não existe em `jobs`). Se estiver correta, **não crie uma migration nova**: peça ao dono a aprovação da PR #244 e registre em `05-PROGRESSO.md` que a etapa depende dela. Se faltar algo (por exemplo, `audit_job_changes`/`log_job_status_change` ainda referenciando coluna inexistente), abra uma migration complementar `CREATE OR REPLACE FUNCTION` apenas para a função que falta, seguindo o estilo das funções já corrigidas. O atalho tentador é desabilitar o trigger (`ALTER TABLE jobs DISABLE TRIGGER`): isso devolve o fluxo ao usuário, mas apaga a trilha de auditoria da fábrica — e trilha de auditoria é o que o negócio usa para explicar perda de peça.
Arquivos e objetos a tocar: `supabase/migrations/20261121110000_fix_audit_triggers_old_values.sql` (via PR #244) ou uma migration complementar; funções `public.audit_job_status_change`, `public.audit_job_changes`, `public.log_job_status_change`, `public.audit_trigger_func`.
Não tocar / armadilhas: não mexa nas tabelas `audit_log`/`job_status_audit` (renomear coluna quebraria `verify_audit_chain` e `compute_audit_hash`); não remova triggers nesta etapa (isso é a etapa 091).
Depende de: 003 · Libera: 046, 047, 048, 049, 050
Risco e como reverter: médio — é DDL em produção. Reverter = `CREATE OR REPLACE` da versão anterior da função, que está em `origin/contexto:docs/contexto/supabase/functions/public/`.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: depois do deploy, peça ao dono (ou use um ambiente de teste) a execução de um UPDATE de status em uma OS de teste e confirme ausência de erro 42703; em seguida confira que apareceu linha nova em `audit_log` e em `job_status_audit`. Sem acesso de escrita, registre explicitamente "verificação pendente de execução pelo dono" — não marque a etapa como concluída.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 005 — Apontar o endereço do sistema no Supabase Auth para o host que realmente serve o app
Onda 1 / Severidade Crítica / Camada: configuração de autenticação
Achados resolvidos: AUT-01
Problema hoje: `site_url` = `https://fast-gravacoes-v2-juca1.vercel.app/` e `uri_allow_list` só aceita esse host (`origin/contexto:docs/contexto/supabase/auth.md`). Esse host responde com a página "Login – Vercel" (proteção de deployment), enquanto o app funciona em `https://fast-gravacoes-v2.vercel.app` — host que **não** está na lista. Verificado ao vivo em 2026-11-22.
Causa raiz: o endereço do app mudou e a configuração do backend ficou no host antigo e protegido.
Caminho recomendado: esta é uma decisão de negócio antes de ser técnica — **pergunte ao dono qual é o endereço oficial** (domínio próprio `fastgravacoes.com.br`, que hoje não responde, ou o endereço da Vercel) e só então altere, pelo painel do Supabase ou pela Management API: `site_url` para o endereço oficial e `uri_allow_list` para esse endereço, seus curingas (`/**`) e, se o dono quiser previews, o padrão de preview. Deixe o host antigo na lista durante a transição para não derrubar links já enviados. Registre no PR qual endereço foi escolhido. O atalho tentador é só adicionar o host novo à allowlist e deixar o `site_url` como está: o `site_url` é o que entra nos e-mails quando o código não passa `redirectTo` (é o caso de `authService.ts:31`), então o problema continuaria.
Arquivos e objetos a tocar: configuração do projeto Supabase (Auth → URL Configuration). Nenhum arquivo do repositório — registre a mudança em `docs/qa/05-PROGRESSO.md` e em `docs/agentes/banco.md` se o endereço oficial mudar.
Não tocar / armadilhas: não mexa em `supabase/config.toml` (não controla `site_url`); não remova o host antigo no mesmo passo.
Depende de: — · Libera: 006, 007, 008
Risco e como reverter: baixo; reverter = restaurar os valores anteriores, que estão em `origin/contexto:docs/contexto/supabase/auth.md`.
Precisa de aprovação humana antes do merge: sim (configuração de infraestrutura e decisão de negócio)
Como verificar: abra `https://<endereço oficial>/auth` e confirme que carrega o app (título "Entrar | FAST GRAVAÇÕES"); depois peça um reset de senha de uma conta de teste e confirme que o link do e-mail abre `<endereço oficial>/reset-password` sem passar por tela da Vercel. Registre o endereço testado.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 006 — Passar `redirectTo` explícito no pedido de recuperação de senha feito pelo app
Onda 1 / Severidade Alta / Camada: front (serviço de autenticação)
Achados resolvidos: AUT-01
Problema hoje: `src/features/auth/services/authService.ts:31-34` chama `supabase.auth.resetPasswordForEmail(email)` sem `redirectTo`, então o link do e-mail depende inteiramente do `site_url` do projeto.
Causa raiz: o app delegou o endereço de volta à configuração do backend, que estava errada.
Caminho recomendado: passe `{ redirectTo: \`${window.location.origin}/reset-password\` }`. Usar a origem da própria janela faz o link voltar para o mesmo host em que a pessoa pediu o reset, o que funciona em produção, em preview e em desenvolvimento sem uma variável nova. Garanta que esse host esteja na `uri_allow_list` (etapa 005) — se não estiver, o Supabase ignora o `redirectTo` e cai no `site_url`. Padrão de referência no repositório: `supabase/functions/approve-password-reset/index.ts:132-144`, que já valida o destino contra uma origem conhecida.
Arquivos e objetos a tocar: `src/features/auth/services/authService.ts`.
Não tocar / armadilhas: não troque o fluxo por `signInWithOtp`; não remova a validação de origem da edge function. Em teste (`jsdom`) `window.location.origin` existe, mas confira se algum teste de `authService` precisa de ajuste de expectativa.
Depende de: 005 · Libera: 008
Risco e como reverter: baixo; reverter é remover o segundo argumento.
Precisa de aprovação humana antes do merge: não
Como verificar: `npx vitest run src/features/auth` passa; em seguida, com uma conta de teste, peça reset pela tela e confirme que o link recebido aponta para `<host do app>/reset-password`.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 007 — Definir o segredo `APP_URL` no projeto Supabase e tirar o endereço morto do código
Onda 1 / Severidade Alta / Camada: edge functions / segredos
Achados resolvidos: AUT-01, INT-01
Problema hoje: `supabase/functions/approve-password-reset/index.ts:9` usa `Deno.env.get('APP_URL') || 'https://fastgravacoes.com.br'`, e `APP_URL` **não está** entre os 12 secrets do projeto (`origin/contexto:docs/contexto/supabase/edge-functions.md`, seção Secrets). O domínio do default não responde (verificado ao vivo). O mesmo default aparece em `supabase/functions/_shared/cors.ts:21`.
Causa raiz: o endereço do app está escrito em três lugares (default no código, `APP_URL`, `PUBLIC_URL`) e nenhum deles aponta para o host que serve o app.
Caminho recomendado: (a) peça ao dono para criar o secret `APP_URL` com o endereço oficial definido na etapa 005 (`supabase secrets set APP_URL=...` ou painel); (b) no código, troque o default literal por uma falha explícita quando a variável não existir — `_shared/cors.ts` é o lugar certo para centralizar isso, pois já é a fonte das origens permitidas. Uma função que precisa montar link para o usuário deve recusar-se a montar um link errado em vez de usar um domínio que não existe. Padrão a seguir: o próprio `cors.ts` com `EXTRA_ALLOWED_ORIGINS`. O atalho tentador é só trocar o literal pelo host da Vercel: o problema volta na próxima vez que o endereço mudar.
Arquivos e objetos a tocar: `supabase/functions/_shared/cors.ts`, `supabase/functions/approve-password-reset/index.ts`; secret `APP_URL` no projeto.
Não tocar / armadilhas: não exponha `APP_URL` como `VITE_*` (iria para o pacote público sem necessidade); não altere as origens já aceitas pelo CORS sem rodar `supabase/functions/_shared/cors.test.ts`.
Depende de: 005 · Libera: 008, 012
Risco e como reverter: médio — errar o CORS derruba todas as chamadas do front às funções. Reverter = restaurar o default anterior.
Precisa de aprovação humana antes do merge: sim (segredo de infraestrutura)
Como verificar: `deno test supabase/functions/_shared/cors.test.ts` (ou o job *Edge Functions (Deno)* do CI) passa; depois do deploy, chame `approve-password-reset` com uma solicitação de teste e confirme no log da função que o link gerado usa o endereço oficial.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 008 — Configurar servidor de e-mail próprio e aumentar o limite de envio
Onda 1 / Severidade Alta / Camada: configuração de autenticação
Achados resolvidos: AUT-02
Problema hoje: `smtp_host`, `smtp_admin_email`, `smtp_pass` e `smtp_port` são `null` e `rate_limit_email_sent` é **2 por hora** para o projeto inteiro (`origin/contexto:docs/contexto/supabase/auth.md`).
Causa raiz: o projeto nunca saiu do serviço de e-mail de demonstração do Supabase.
Caminho recomendado: o projeto já usa Resend nas edge functions, então o caminho de menor atrito é configurar o SMTP do Supabase com as credenciais do Resend (host `smtp.resend.com`, porta 465, usuário `resend`, senha = chave de API) e um remetente do domínio verificado da empresa; depois elevar `rate_limit_email_sent` para um valor compatível com a operação (por exemplo 30/hora). Peça a chave ao dono — nunca coloque chave no repositório. Faça as duas coisas juntas: elevar o limite sem SMTP próprio não resolve, porque o serviço de demonstração tem limites próprios e remetente genérico. O atalho tentador é só subir o `rate_limit_email_sent`.
Arquivos e objetos a tocar: configuração do projeto Supabase (Auth → SMTP Settings e Rate Limits). Nenhum arquivo do repositório.
Não tocar / armadilhas: sem domínio verificado no Resend o envio é recusado — confirme a verificação antes; não reutilize a mesma chave para SMTP e para as funções se o dono preferir chaves separadas.
Depende de: 005 · Libera: 009
Risco e como reverter: baixo; reverter = limpar os campos de SMTP (volta ao serviço de demonstração).
Precisa de aprovação humana antes do merge: sim (segredo e custo)
Como verificar: dispare três pedidos de reset seguidos com contas de teste e confirme que os três e-mails chegam, com remetente do domínio da empresa. Registre os horários.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 009 — Traduzir e identificar os e-mails de autenticação
Onda 1 / Severidade Baixa / Camada: configuração de autenticação
Achados resolvidos: AUT-02
Problema hoje: `mailer_subjects_recovery: "Reset your password"`, `mailer_subjects_confirmation: "Confirm your email address"` e o corpo padrão em inglês (`origin/contexto:docs/contexto/supabase/auth.md`), num sistema inteiramente em português.
Causa raiz: templates padrão do Supabase nunca personalizados.
Caminho recomendado: no painel do Supabase, substitua assunto e corpo dos templates de *Recovery*, *Confirmation* e *Invite* por texto em português com o nome FAST GRAVAÇÕES, mantendo a variável `{{ .ConfirmationURL }}`. Faça depois da etapa 008 para que o remetente já seja o do domínio da empresa. Não invente política de conteúdo: use o mesmo tom das mensagens do app (`src/i18n/`).
Arquivos e objetos a tocar: templates de e-mail no painel do Supabase.
Não tocar / armadilhas: não remova `{{ .ConfirmationURL }}`; não troque o idioma do `mailer_otp_length`/validade sem pedir.
Depende de: 008 · Libera: —
Risco e como reverter: baixo; o painel mantém o template padrão restaurável.
Precisa de aprovação humana antes do merge: sim (configuração de infraestrutura)
Como verificar: dispare um reset de teste e confirme o e-mail recebido em português com o remetente correto. Anexe o assunto recebido em `05-PROGRESSO.md`.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 010 — Desligar o cadastro público no backend
Onda 1 / Severidade Média / Camada: configuração de autenticação
Achados resolvidos: AUT-03
Problema hoje: `disable_signup: false` (`origin/contexto:docs/contexto/supabase/auth.md`) enquanto o app devolve "Cadastro público desabilitado" sem nem chamar a API (`src/features/auth/components/AuthProvider.tsx:444-446`). A chave publishable é pública, então qualquer pessoa chama `POST /auth/v1/signup` direto.
Causa raiz: regra aplicada só no cliente.
Caminho recomendado: ative *Disable signup* no painel (Auth → Providers → Email) ou via Management API. Antes, confirme com o dono que nenhum fluxo legítimo depende de auto-cadastro — o cadastro de operador é feito pela função `create-operator`, que usa a chave de serviço e **não** passa pelo signup público, então desligar não quebra o fluxo oficial (confirme lendo `supabase/functions/create-operator/index.ts`). O atalho tentador é "proteger melhor a tela de cadastro": a tela não é o caminho usado por quem abusa.
Arquivos e objetos a tocar: configuração do projeto Supabase. Nenhum arquivo do repositório.
Não tocar / armadilhas: não remova `AuthProvider.signUp` (outros pontos ainda importam o tipo); não desligue a confirmação de e-mail junto.
Depende de: — · Libera: —
Risco e como reverter: baixo; reverter = reativar o signup.
Precisa de aprovação humana antes do merge: sim (configuração de infraestrutura)
Como verificar: `curl -s -o /dev/null -w '%{http_code}' -X POST "$SUPABASE_URL/auth/v1/signup" -H "apikey: <chave publishable>" -H 'Content-Type: application/json' --data '{"email":"teste-qa@exemplo.com","password":"Senha!12345"}'` deve responder **422** com `signup_disabled` (antes respondia 200/400 criando o usuário). Não use um e-mail real.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 011 — Fechar a rota `/design-system` para visitante
Onda 1 / Severidade Média / Camada: front (rotas)
Achados resolvidos: SEG-01
Problema hoje: `/design-system` é pública (`origin/contexto:docs/contexto/codigo/INDEX.md` → públicas: `/*`, `/auth`, `/design-system`, `/install`, `/reset-password`, `/track`) e, aberta sem login em `https://fast-gravacoes-v2.vercel.app/design-system`, entrega o layout interno completo: cabeçalho da empresa, menu lateral ("Novo Agendamento", "Operação"), usuário e botão "Sair" (verificado ao vivo em 2026-11-22).
Causa raiz: rota de desenvolvimento publicada em produção junto com o resto.
Caminho recomendado: envolva a rota em `ProtectedRoute` no mesmo padrão das outras rotas internas de `src/routes/AppRoutes.tsx` — é a mudança de menor diff e mantém a página utilizável para quem trabalha no sistema. A alternativa (remover a rota) descarta uma ferramenta útil de time; a alternativa de "esconder do menu" não resolve, porque a URL continua acessível.
Arquivos e objetos a tocar: `src/routes/AppRoutes.tsx` (apenas a entrada de `/design-system`).
Não tocar / armadilhas: `/track`, `/auth`, `/reset-password` e `/install` **devem** continuar públicas; `/install` é a tela de instalação do PWA. Verifique se algum teste E2E abre `/design-system` sem login (`tests/`), e ajuste o teste se abrir.
Depende de: — · Libera: —
Risco e como reverter: baixo; reverter = remover o invólucro.
Precisa de aprovação humana antes do merge: não
Como verificar: `curl -s https://<host>/design-system` continua devolvendo o HTML do SPA (é uma aplicação de página única), então verifique pelo navegador: em uma janela anônima, abrir `/design-system` deve redirecionar para `/auth`. Registre o resultado observado.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 012 — Fixar o caminho de busca das cinco funções com privilégio elevado
Onda 1 / Severidade Média / Camada: banco (funções)
Achados resolvidos: BD-04
Problema hoje: `origin/contexto:docs/contexto/supabase/lints.md` aponta severidade ALTA `secdef_mutable_search_path` em `app_private.runtime_config_get(p_key text)`, `public.auto_reassign_stale_packaging_tasks()`, `public.notify_loss_risk()`, `public.trigger_auto_promotion()` e `public.trigger_send_tpm_email()`.
Causa raiz: funções criadas sem `SET search_path`, enquanto as demais 73 funções do banco já têm.
Caminho recomendado: uma migration única com `ALTER FUNCTION <nome>(<assinatura>) SET search_path TO 'public'` para as cinco (não use `CREATE OR REPLACE` com o corpo inteiro: `ALTER FUNCTION` muda só o atributo e não corre o risco de reintroduzir um corpo desatualizado). Pegue a assinatura exata em `origin/contexto:docs/contexto/supabase/functions.md`. Para `app_private.runtime_config_get`, use `SET search_path TO 'app_private, public'` se o corpo referenciar objetos dos dois esquemas — confira o corpo em `functions/app_private/`.
Arquivos e objetos a tocar: nova migration `supabase/migrations/<AAAAMMDDHHMMSS>_fix_secdef_search_path.sql`.
Não tocar / armadilhas: não altere o corpo das funções; duas delas (`auto_reassign_stale_packaging_tasks`, `trigger_auto_promotion`) rodam por agendamento/trigger — uma alteração de corpo errada pararia a reatribuição de embalagem e a promoção de fila.
Depende de: 003 · Libera: —
Risco e como reverter: baixo; reverter = `ALTER FUNCTION ... RESET search_path`.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: depois da próxima coleta da branch `contexto`, `git show origin/contexto:docs/contexto/supabase/lints.md | grep -c secdef_mutable_search_path` deve retornar **0**.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 013 — Criar o segredo do serviço de e-mail (`RESEND_API_KEY`) no projeto
Onda 1 / Severidade Crítica / Camada: edge functions / segredos
Achados resolvidos: INT-01
Problema hoje: seis funções leem `RESEND_API_KEY` (`cron-alert-email/index.ts:108`, `send-email-report/index.ts:30`, `send-tpm-email/index.ts:36`, `send-loss-risk-alert/index.ts:48`, `new-device-alert/index.ts:50`, `tpm-notifications/index.ts:66`) e o segredo **não existe** no projeto: a lista real tem 12 nomes e nenhum é `RESEND_API_KEY` (`origin/contexto:docs/contexto/supabase/edge-functions.md`, seção Secrets).
Causa raiz: o projeto foi publicado sem os segredos das integrações, e nenhuma verificação de pré-requisito impede isso.
Caminho recomendado: peça a chave ao dono e crie o segredo (`supabase secrets set RESEND_API_KEY=...` ou painel → Edge Functions → Secrets). Nunca escreva a chave em arquivo, commit, PR ou resposta. Faça esta etapa **antes** das 014–016, que dependem do envio real funcionar para serem verificadas. Confirme também que o domínio remetente está verificado no Resend, senão o envio é recusado com 403 e o sintoma vira outro.
Arquivos e objetos a tocar: segredo `RESEND_API_KEY` no projeto Supabase. Nenhum arquivo do repositório.
Não tocar / armadilhas: não reaproveite a chave em `VITE_*`; não a coloque em `.env.production` (é template versionado).
Depende de: 003 · Libera: 014, 015, 016, 019
Risco e como reverter: baixo; reverter = remover o segredo.
Precisa de aprovação humana antes do merge: sim (segredo e custo)
Como verificar: invoque `send-tpm-email` com um payload de teste e confirme no log da função o status 200 do Resend e a chegada do e-mail. Registre o id do envio (não a chave).
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 014 — Parar de registrar "e-mail enviado" quando nenhum e-mail foi enviado (alerta de rotina)
Onda 1 / Severidade Alta / Camada: edge function
Achados resolvidos: INT-01
Problema hoje: `supabase/functions/cron-alert-email/index.ts:209-220` — quando `RESEND_API_KEY` está ausente, a função apenas emite `console.warn("[cron-alert-email] RESEND_API_KEY ausente — apenas marcando envio.")` e **em seguida grava** em `push_notifications` o título "Rotina automática falhando" com o corpo "E-mail de alerta enviado sobre ..." e `status: "sent"`.
Causa raiz: a função trata a ausência de credencial como caso normal e registra sucesso de uma ação que não aconteceu.
Caminho recomendado: separe "tentou" de "conseguiu". Atenção a um detalhe que agrava o defeito: no caminho sem chave a função também grava o marcador que evita reenvio, de modo que o alerta fica registrado como já tratado e **não** é reenviado quando a chave for configurada — a função irmã `tpm-notifications/index.ts:91-96` já faz certo ("nunca marcar como enviado sem ter tentado enviar") e serve de referência. Mantenha a função operando (ela também cria notificação no app, que é útil), mas: (a) quando não houver chave ou o envio falhar, grave a notificação com texto que não afirme envio de e-mail e com um campo em `data` indicando `email_enviado: false`; (b) devolva na resposta HTTP a contagem de envios falhos; (c) registre `console.error`, não `warn`, porque é condição de configuração ausente em produção. Padrão de referência no repositório: `send-email-report/index.ts:392-399`, que devolve explicitamente `message: 'Email não enviado - RESEND_API_KEY não configurada'`. O atalho tentador é falhar a função inteira com 500 quando falta a chave: isso faria o cron acumular falhas e esconderia a notificação no app, que hoje é o único canal que chega.
Arquivos e objetos a tocar: `supabase/functions/cron-alert-email/index.ts`.
Não tocar / armadilhas: não mude o formato de `push_notifications.data` consumido pelo front sem olhar `src/features/notifications/`; não remova a notificação no app.
Depende de: 013 · Libera: —
Risco e como reverter: baixo; reverter = voltar o texto anterior.
Precisa de aprovação humana antes do merge: não
Como verificar: invoque a função com o segredo presente e confirme `email_enviado: true` na linha gravada; depois, em um ambiente sem o segredo (ou com chave inválida), confirme que a linha registra `email_enviado: false` e que o texto não afirma envio. Registre as duas linhas.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 015 — Tornar visível a recusa de envio no relatório por e-mail
Onda 1 / Severidade Média / Camada: edge function + front
Achados resolvidos: INT-01
Problema hoje: `supabase/functions/send-email-report/index.ts:392-399` devolve `success` com `message: 'Email não enviado - RESEND_API_KEY não configurada'` e um "preview" — ou seja, a resposta é de sucesso e quem chama não distingue envio de não-envio.
Causa raiz: estado de erro de configuração embutido numa resposta de sucesso.
Caminho recomendado: devolva um campo booleano explícito (`sent: false`) junto do `success`, mantendo compatibilidade, e no chamador do front mostre aviso quando `sent` for falso, em vez de confirmar envio. Localize o chamador com `grep -rn "send-email-report" src/` antes de alterar — se não houver chamador (a função consta como órfã em `baseline.json`), limite-se à função e registre isso na PR.
Arquivos e objetos a tocar: `supabase/functions/send-email-report/index.ts` e, se existir, o chamador no front.
Não tocar / armadilhas: não troque o código de status HTTP para 500 (quebraria o cron que a invoca, se houver).
Depende de: 013 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: invoque a função sem o segredo e confirme `sent: false` na resposta; com o segredo, `sent: true` e e-mail recebido.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 016 — Diferenciar canal indisponível de canal entregue nas notificações de TPM
Onda 1 / Severidade Média / Camada: edge function
Achados resolvidos: INT-01
Problema hoje: `supabase/functions/tpm-notifications/index.ts:66,93` lê `RESEND_API_KEY` e trata "integração não implementada ou e-mail sem chave configurada" no mesmo caminho de código.
Causa raiz: o registro de notificação não distingue "canal não configurado" de "entregue".
Caminho recomendado: ao gravar em `tpm_notification_logs`, use valores distintos para canal não configurado e para falha de entrega, e só marque como entregue quando o provedor responder 2xx. Confira as colunas disponíveis em `origin/contexto:docs/contexto/supabase/tables/public/tpm_notification_logs.md` antes de inventar campo novo — se não houver coluna de status adequada, registre no plano (etapa 091 em diante) em vez de criar DDL aqui.
Arquivos e objetos a tocar: `supabase/functions/tpm-notifications/index.ts`.
Não tocar / armadilhas: não crie coluna nova nesta etapa (DDL exige aprovação e muda o escopo).
Depende de: 013 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: invoque com e sem o segredo e compare as linhas gravadas em `tpm_notification_logs`.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 017 — Decidir e registrar o destino da integração com o Bitrix24 (hoje sem nenhum segredo)
Onda 1 / Severidade Alta / Camada: integração
Achados resolvidos: INT-01
Problema hoje: `bitrix24-sync` está publicada e ativa com `verify_jwt = false` (`origin/contexto:docs/contexto/supabase/edge-functions.md`), é chamada por 5 arquivos do front (`origin/contexto:docs/contexto/codigo/INDEX.md`) e lê 8 variáveis (`BITRIX24_CLIENT_ID`, `BITRIX24_CLIENT_SECRET`, `BITRIX24_ACCESS_TOKEN`, `BITRIX24_REFRESH_TOKEN`, `BITRIX24_DOMAIN`, `BITRIX24_WEBHOOK_SECRET`, `BITRIX24_WEBHOOK_TOKEN`, `BITRIX24_WEBHOOK_URL`) — **nenhuma existe** no projeto. A tabela `bitrix24_sync_history` tem ~500 linhas (`stats.md`), ou seja, já houve uso.
Causa raiz: integração desenvolvida e publicada sem as credenciais; nada no sistema sinaliza que está fora.
Caminho recomendado: é decisão do dono — pergunte se a integração com o CRM deve voltar a funcionar. Se **sim**: peça as credenciais, crie os segredos, e só então teste o fluxo de sincronização por uma chamada manual. Se **não**: desative a função (`supabase functions delete bitrix24-sync` **não**; prefira remover a chamada do front e marcar a função como inativa pelo painel) e esconda a tela `/integrations/bitrix24` do menu, para a equipe parar de olhar um painel que não sincroniza. Em qualquer dos casos, a função com `verify_jwt = false` precisa continuar validando a própria credencial por ação (ela já faz isso — confirme em `supabase/functions/bitrix24-sync/index.ts`). O atalho tentador é "deixar como está porque não dá erro": não dá erro porque ninguém olha; a tela mostra histórico velho como se fosse atual.
Arquivos e objetos a tocar: segredos do projeto; se a decisão for desativar: `src/pages/Bitrix24ConfigPage.tsx`, o item de menu correspondente em `src/components/navigation/`, e a entrada de rota em `src/routes/AppRoutes.tsx`.
Não tocar / armadilhas: não apague `bitrix24_sync_history`, `bitrix24_oauth_tokens` nem `bitrix24_field_mappings` (dado histórico); a função responde ao callback OAuth do navegador do Bitrix — mudar `verify_jwt` para `true` quebraria esse retorno (ver `PENDENCIAS.md` item 2).
Depende de: 003 · Libera: —
Risco e como reverter: médio se envolver remoção de tela; reverter = restaurar rota e menu.
Precisa de aprovação humana antes do merge: sim (decisão de negócio e segredos)
Como verificar: se ativada, uma sincronização manual grava linha nova em `bitrix24_sync_history` com `status` de sucesso; se desativada, a tela deixa de existir no menu e a chamada do front não é mais feita (confirme com `grep -rn "bitrix24-sync" src/`).
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 018 — Decidir o destino do assistente técnico (sem chave de IA configurada)
Onda 1 / Severidade Média / Camada: integração
Achados resolvidos: INT-01
Problema hoje: a função `technical-assistant` está ativa e é chamada por 2 arquivos do front (`origin/contexto:docs/contexto/codigo/INDEX.md`), mas lê `LOVABLE_API_KEY`, que não existe entre os segredos do projeto. O host `ai.gateway.lovable.dev` aparece entre as integrações do código e **não está** no `connect-src` da política de segurança de conteúdo (`vercel.json`).
Causa raiz: recurso dependente de um serviço de IA que não foi provisionado neste projeto.
Caminho recomendado: pergunte ao dono se o assistente deve funcionar. Se sim, defina qual provedor e crie o segredo correspondente, ajustando o `connect-src` do `vercel.json` para o host usado (e só para ele). Se não, remova a entrada do menu e a rota `/assistant`, mantendo o código para uso futuro. Enquanto a chave não existir, a tela responde erro a cada pergunta do usuário — o que gera registro em `error_logs` (ver BD-02).
Arquivos e objetos a tocar: segredo no projeto; `vercel.json` (apenas `connect-src`) se ativar; `src/routes/AppRoutes.tsx` e o menu se desativar.
Não tocar / armadilhas: mexer no `connect-src` sem necessidade pode derrubar chamadas legítimas — altere somente o host da IA.
Depende de: 003 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: sim (custo e segredo, e `vercel.json` é configuração de infraestrutura)
Como verificar: se ativado, uma pergunta na tela `/assistant` recebe resposta e não gera entrada em `error_logs`; se desativado, a rota responde 404 do app e o menu não mostra o item.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 019 — Conferir, uma por uma, as chaves de autorização das funções chamadas por máquina
Onda 1 / Severidade Alta / Camada: edge functions / segurança
Achados resolvidos: INT-01
Problema hoje: `CRON_API_KEY`, `WEBHOOK_API_KEY` e `BACKUP_API_KEY` são lidos pelo código (`grep -rn "CRON_API_KEY\|WEBHOOK_API_KEY\|BACKUP_API_KEY" supabase/functions`) e **não existem** entre os segredos do projeto; `CRON_SECRET` existe.
Causa raiz: duas gerações de nome de credencial convivendo (`CRON_SECRET` novo, `CRON_API_KEY` antigo), e as funções que usam o nome antigo ficam sem credencial para comparar.
Caminho recomendado: para cada uma das três chaves, leia o trecho que a consome e determine o que acontece quando ela é `undefined`: se o código compara `header === Deno.env.get('X')` e ambos forem `undefined`, a comparação pode **passar** e a rota fica aberta — esse é o cenário a procurar primeiro. Corrija recusando a requisição quando a variável não estiver definida (falhar fechado), e padronize no nome que já existe (`CRON_SECRET`) em vez de criar segredos novos. Padrão de referência: a checagem de pré-requisito do `ci.yml` ("o gate falha fechado para não sinalizar qualidade inexistente") — a mesma lógica vale aqui.
Arquivos e objetos a tocar: as funções que leem essas três variáveis (identifique com o grep acima; prováveis: `backup-scheduler`, `webhook-handler`, `cron-cleanup`).
Não tocar / armadilhas: não troque o nome da credencial usada pelo cron sem atualizar o `command` do job no banco — o comando do cron contém o cabeçalho e é redigido no snapshot, então peça ao dono a conferência antes de renomear.
Depende de: 013 · Libera: 020
Risco e como reverter: médio — recusar requisições pode parar uma rotina que hoje "funciona" por comparação de indefinidos. Reverter = voltar a comparação anterior.
Precisa de aprovação humana antes do merge: sim (segredos e rotinas automáticas)
Como verificar: para cada função, duas requisições: uma sem o cabeçalho de credencial (esperado **401**) e uma com a credencial correta (esperado 200). Registre os dois códigos por função.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 020 — Ligar o monitoramento de erros do servidor (`SENTRY_DSN` ausente)
Onda 1 / Severidade Média / Camada: observabilidade
Achados resolvidos: INT-01, CI-02
Problema hoje: o código lê `SENTRY_DSN` em funções de servidor e `VITE_SENTRY_DSN` no front (`.env.example`), e `SENTRY_DSN` não está entre os segredos do projeto. Hoje o único destino de erro do front é a tabela `error_logs` — que já é o maior objeto do banco (BD-02).
Causa raiz: observabilidade montada sobre uma tabela do próprio banco de produção, sem o serviço externo configurado.
Caminho recomendado: peça ao dono se há conta Sentry. Se houver, crie `SENTRY_DSN` (servidor) e confirme `VITE_SENTRY_DSN` nas variáveis do projeto na Vercel. Se não houver, **não invente**: registre em `05-PROGRESSO.md` que a observabilidade continua sendo só a tabela interna, e trate as etapas 026–029 como a mitigação possível. O atalho tentador é "logar mais": o problema é para onde vai o log, não o volume.
Arquivos e objetos a tocar: segredos do projeto Supabase e variáveis da Vercel. Nenhum arquivo do repositório.
Não tocar / armadilhas: DSN do Sentry em `VITE_*` é público por natureza (é o esperado), mas a chave de servidor não deve ir para o front.
Depende de: 019 · Libera: 026
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: sim (custo e segredo)
Como verificar: provoque um erro controlado numa função de teste e confirme o evento no painel do Sentry; ou registre a decisão de não usar Sentry.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 021 — Guardar o caminho do arquivo, não o link que expira
Onda 1 / Severidade Alta / Camada: front + banco (dado)
Achados resolvidos: STO-01
Problema hoje: `src/lib/storage.ts:9-29` devolve uma URL assinada com validade de 30 dias e os chamadores gravam essa URL no banco: `src/features/maintenance/components/MaintenanceExecutionModal.tsx:274,292`, `src/components/operator/ProductionRegistrationModal.tsx:153`, `src/components/traceability/LotInspectionsTab.tsx:65`, `src/hooks/useDocuments.ts:90,169`, `src/features/packaging/services/packagingService.ts:197-210`. Passados 30 dias, o link não abre mais.
Causa raiz: o identificador persistido é o link temporário, não o objeto.
Caminho recomendado: divida em duas partes para manter o diff pequeno e não quebrar o que já está gravado. Nesta etapa, mude `uploadOwnedFile` para devolver **o caminho** (`ownedPath`) além da URL (por exemplo, retornar `{ path, signedUrl }`) e ajuste os seis chamadores para gravar o caminho num campo próprio quando ele existir; onde não existir campo, mantenha a URL por enquanto e registre na PR quais campos precisam de coluna nova (vai para a etapa 022). A exibição passa a gerar a URL na hora, com `createSignedUrl` curto (minutos), no componente que mostra a imagem. Padrão de referência: `src/hooks/useDocuments.ts`, que já lida com documento por registro. O atalho tentador é só aumentar a validade da URL (um ano): empurra o problema e multiplica o risco de link vazado continuar válido.
Arquivos e objetos a tocar: `src/lib/storage.ts` e os seis chamadores listados.
Não tocar / armadilhas: não apague as URLs já gravadas (são o único ponteiro para os arquivos antigos); a migração dos registros históricos é a etapa 022. Não troque os baldes para público.
Depende de: — · Libera: 022
Risco e como reverter: médio (toca seis telas de registro). Reverter = voltar o retorno anterior.
Precisa de aprovação humana antes do merge: não
Como verificar: `npx vitest run src/features/packaging src/hooks` passa; suba uma foto numa execução de manutenção de teste e confirme no banco que o campo guarda um caminho (`<uid>/...`) e que a tela exibe a imagem.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 022 — Recuperar o acesso às evidências já gravadas com link expirado
Onda 1 / Severidade Alta / Camada: banco (dado) + script
Achados resolvidos: STO-01
Problema hoje: os registros existentes guardam URLs assinadas que já expiraram ou vão expirar; o caminho do objeto está embutido na própria URL (`/object/sign/<bucket>/<uid>/<caminho>?token=...`).
Causa raiz: idem 021.
Caminho recomendado: escreva uma migration de dado (não de schema, se o campo for texto) que extraia o caminho de dentro da URL gravada e o guarde no campo novo, mantendo a URL antiga intacta numa coluna de histórico ou simplesmente deixando-a onde está. Faça a extração com `regexp_replace`/`split_part` sobre o padrão `/object/sign/<bucket>/`, e rode primeiro um `SELECT` de amostra para conferir o resultado em 10 linhas antes de escrever qualquer `UPDATE`. Se a URL não contiver o caminho (formato diferente), não invente: registre as linhas não convertíveis em `05-PROGRESSO.md`.
Arquivos e objetos a tocar: nova migration em `supabase/migrations/`; colunas de evidência das tabelas envolvidas (identifique com `grep -rn "photo_url\|evidence_urls" src/ | head` e confirme os nomes em `origin/contexto:docs/contexto/supabase/tables/public/`).
Não tocar / armadilhas: nunca `UPDATE` sem `WHERE` restrito ao padrão esperado; não apague a coluna antiga nesta etapa.
Depende de: 021, 003 · Libera: —
Risco e como reverter: médio — é escrita em dado de produção. Reverter exige a coluna antiga preservada: por isso ela **não** é removida aqui.
Precisa de aprovação humana antes do merge: sim (alteração de dado em produção)
Como verificar: `SELECT count(*) FROM <tabela> WHERE <campo_caminho> IS NULL AND <campo_url> IS NOT NULL` deve ser 0 (ou igual ao número de linhas não convertíveis registrado); abra uma evidência antiga pela tela e confirme que a imagem aparece.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 023 — Impor limite de tamanho e de tipo nos quatro baldes de arquivo
Onda 1 / Severidade Média / Camada: storage
Achados resolvidos: STO-02
Problema hoje: `origin/contexto:docs/contexto/supabase/storage.md` mostra "limite por arquivo" e "mime permitidos" **vazios** para `execution-evidence`, `production-photos`, `technical-documents` e `tpm-evidences`.
Causa raiz: baldes criados sem restrição.
Caminho recomendado: defina por balde o limite de tamanho e a lista de tipos aceitos (imagens para os três de evidência/foto; imagens + PDF para documentos técnicos), pelo painel ou por `UPDATE storage.buckets`. O repositório já tem a dependência `file-type`, usada para checar conteúdo real no cliente — confirme com `grep -rn "file-type" src/` e reaproveite essa validação em vez de criar outra. Restrição no balde é a que vale: a do cliente é conveniência.
Arquivos e objetos a tocar: configuração dos baldes (painel ou migration); eventualmente a validação do cliente onde faltar.
Não tocar / armadilhas: confira o tamanho real dos arquivos já enviados antes de escolher o limite, para não bloquear fluxo legítimo; não torne balde público.
Depende de: 003 · Libera: —
Risco e como reverter: baixo; reverter = limpar os limites.
Precisa de aprovação humana antes do merge: sim (configuração de infraestrutura)
Como verificar: tente subir um arquivo acima do limite e um arquivo `.exe` renomeado pela tela de evidência: ambos devem ser recusados; um JPEG dentro do limite deve passar.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 024 — Limitar quem pode criar pedido de redefinição de senha
Onda 1 / Severidade Média / Camada: banco (RLS) + edge function
Achados resolvidos: SEG-02
Problema hoje: a policy `Anyone can request password reset` permite INSERT em `password_reset_requests` para `anon` exigindo apenas `status = 'pending'` (`origin/contexto:docs/contexto/supabase/tables/public/password_reset_requests.md`), com `user_email` em texto livre, sem chave estrangeira e sem limite.
Causa raiz: o pedido de reset é escrito direto pelo cliente, sem intermediário que possa limitar.
Caminho recomendado: troque a escrita direta por uma função do banco `SECURITY DEFINER` chamada pelo cliente (`rpc`), que: valida o formato do e-mail, recusa se já existir pedido `pending` para o mesmo e-mail nas últimas 24 horas, e só então insere. Depois remova o INSERT de `anon` da tabela. Esse é o padrão que o próprio repositório já usa para tracking público (`get_public_tracking`): função controlada em vez de tabela aberta. O atalho tentador é adicionar `UNIQUE(user_email)`: isso impediria um segundo pedido legítimo meses depois.
Arquivos e objetos a tocar: nova migration (função + policy); `src/` no ponto que insere o pedido (localize com `grep -rn "password_reset_requests" src/`).
Não tocar / armadilhas: não quebre a tela de aprovação do gestor (`SELECT`/`UPDATE` continuam como estão); não apague pedidos existentes.
Depende de: 003 · Libera: —
Risco e como reverter: médio — se a função tiver erro, ninguém consegue pedir reset. Teste o caminho felizes antes de remover a policy de INSERT, em duas PRs se necessário.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: `curl` anônimo com a chave publishable fazendo `POST /rest/v1/password_reset_requests` deve responder **401/403**; duas chamadas seguidas da nova RPC com o mesmo e-mail devem resultar em um pedido criado e um recusado por já existir pendente.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 025 — Impedir a varredura de pedidos pelo rastreamento público
Onda 1 / Severidade Média / Camada: banco (função pública)
Achados resolvidos: SEG-03
Problema hoje: `get_public_tracking` é `SECURITY DEFINER`, liberada a `anon`, aceita busca por `order_number` e devolve produto, prazo, status, fotos de produção e código de rastreio (`origin/contexto:docs/contexto/supabase/functions/public/get_public_tracking__3190b676b3e11018.sql`). Os números são sequenciais por convenção de uso ("Ex: OS-2024-001", `src/pages/NewJobPage.tsx:290`).
Causa raiz: identificador adivinhável usado como se fosse segredo.
Caminho recomendado: duas mudanças pequenas, nesta ordem. (1) Exigir um segundo dado que o cliente conhece e o curioso não — o mais simples é aceitar `order_number` **junto** de um código de rastreio ou das quatro últimas posições de um identificador, o que preserva a experiência de quem tem o papel na mão; decida com o dono qual dado o cliente sempre tem. (2) Registrar as consultas (tabela de telemetria já existente) e limitar chamadas por IP na borda. Não remova a busca por `order_number` sem alternativa: hoje é o único jeito de o cliente consultar. O atalho tentador é "esconder as fotos": o vazamento relevante é saber **o que** está sendo produzido e para quando.
Arquivos e objetos a tocar: nova migration redefinindo `get_public_tracking`; `src/pages/PublicTrackingPage.tsx` (campo extra no formulário).
Não tocar / armadilhas: a função é `STABLE SECURITY DEFINER` com `search_path` fixo — mantenha os três atributos; não exponha `client`, custo, notas, operador, técnica ou lotes (o comentário da função declara isso e deve continuar verdadeiro).
Depende de: 003 · Libera: —
Risco e como reverter: médio — endurecer demais tira do cliente a consulta. Reverter = restaurar a definição anterior (está no snapshot).
Precisa de aprovação humana antes do merge: sim (DDL em produção e mudança de experiência do cliente)
Como verificar: chamada anônima só com `p_order_number` deve devolver `[]`; com os dois dados corretos deve devolver o pedido. Teste 20 números em sequência e confirme que nenhum devolve dado.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 026 — Ligar a recuperação a um ponto no tempo (PITR) do banco de produção
Onda 1 / Severidade Alta / Camada: infraestrutura de banco
Achados resolvidos: BD-03
Problema hoje: `origin/contexto:docs/contexto/supabase/project-config.md` → `"pitr_enabled": false`, `PITR | não`. O banco tem 1,1 GB e é a única cópia dos dados de produção.
Causa raiz: recurso pago não habilitado.
Caminho recomendado: é decisão de custo — apresente ao dono: sem PITR, a recuperação possível volta ao backup diário, perdendo até 24 horas de apontamentos de produção; com PITR, volta-se ao minuto. Se aprovado, habilite no painel (Database → Backups) e **teste a restauração** num projeto descartável, registrando o tempo que levou. Se recusado, registre a decisão em `docs/operacoes/RUNBOOK.md` para que ninguém prometa recuperação que não existe. O atalho tentador é confiar no `backup-scheduler`: essa função está publicada, órfã e sem `BACKUP_API_KEY` configurada (ver etapa 019), ou seja, não é um plano de recuperação.
Arquivos e objetos a tocar: configuração do projeto Supabase; `docs/operacoes/RUNBOOK.md` (registro da decisão).
Não tocar / armadilhas: habilitar PITR muda a fatura; não faça sem o "sim" explícito.
Depende de: — · Libera: —
Risco e como reverter: nenhum risco técnico; reverter = desabilitar.
Precisa de aprovação humana antes do merge: sim (custo)
Como verificar: `project-config.md` da próxima coleta mostra `"pitr_enabled": true`; anexe o resultado do teste de restauração.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 027 — Descobrir o que está gerando 77 mil registros de erro por dia
Onda 1 / Severidade Alta / Camada: observabilidade / banco
Achados resolvidos: BD-02
Problema hoje: `public.error_logs` tem ~2,3 milhões de linhas e 1,0 GB — 91% do banco de 1,1 GB (`origin/contexto:docs/contexto/supabase/stats.md`) — e a purga de 30 dias funciona (`purge_old_logs` roda diariamente com sucesso, `cron-runs.md`), o que significa que todo esse volume foi criado nos últimos 30 dias.
Causa raiz: desconhecida — esta etapa é de diagnóstico. A auditoria não teve acesso de consulta ao banco para medir.
Caminho recomendado: rode (leitura) `SELECT component_name, metadata->>'level' AS nivel, left(message, 80) AS msg, count(*) FROM public.error_logs WHERE created_at > now() - interval '7 days' GROUP BY 1,2,3 ORDER BY 4 DESC LIMIT 30;` e `SELECT date_trunc('hour', created_at) h, count(*) FROM public.error_logs WHERE created_at > now() - interval '48 hours' GROUP BY 1 ORDER BY 1;`. Escreva o resultado em `05-PROGRESSO.md`. A hipótese principal é o erro 42703 de BD-01 em cada tentativa de mudar status de OS, realimentado pelo registro de erro do cliente; a segunda é a tela `/assistant` sem chave de IA (etapa 018). Só depois de saber a mensagem dominante escolha entre as etapas 028 e 029. O atalho tentador é apagar a tabela: isso remove a evidência de que o sistema está falhando.
Arquivos e objetos a tocar: nenhum (somente leitura) + `docs/qa/05-PROGRESSO.md`.
Não tocar / armadilhas: não rode `DELETE`/`TRUNCATE` aqui; `error_logs` tem policy que nega escrita direta além do INSERT do próprio usuário, então use acesso administrativo apenas para `SELECT`.
Depende de: — · Libera: 028, 029, 030
Risco e como reverter: nenhum (leitura).
Precisa de aprovação humana antes do merge: não
Como verificar: as duas consultas acima registradas com resultado, e uma frase dizendo qual mensagem responde pela maior parte do volume.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 028 — Limitar e agrupar o registro de erro do aplicativo
Onda 1 / Severidade Média / Camada: front (observabilidade)
Achados resolvidos: BD-02
Problema hoje: `src/lib/logger.ts:41-116` enfileira **uma linha por evento** (limite de 100 em memória, descarga a cada 25 eventos ou 2 segundos) e grava em `error_logs` sem nenhuma deduplicação nem limite por sessão. Uma falha que se repete 500 vezes gera 500 linhas idênticas.
Causa raiz: canal de log sem agregação.
Caminho recomendado: agrupe antes de gravar: use uma chave (`component_name` + mensagem normalizada + nível) e, dentro de uma janela (por exemplo 60 segundos), grave **uma** linha com um contador de ocorrências em `metadata`, em vez de N linhas. Mantenha o limite de fila existente. Isso preserva o diagnóstico (você continua sabendo o que falhou e quantas vezes) e corta o volume em uma ordem de magnitude. Não mexa na proteção contra recursão nem na remoção de dados pessoais já implementada (`redactString`/`redactUrl`, `logger.ts:128-175`) — são a parte boa deste arquivo. O atalho tentador é baixar o nível de log (parar de registrar `warn`): você perderia justamente o sinal de acesso negado.
Arquivos e objetos a tocar: `src/lib/logger.ts`, `src/lib/logger.test.ts`.
Não tocar / armadilhas: há um ciclo conhecido entre `client.ts` e `logger.ts` resolvido com importação dinâmica (`logger.ts:60-63`) — não transforme em importação estática.
Depende de: 027 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: `npx vitest run src/lib/logger.test.ts` passa; no app, provoque o mesmo erro 10 vezes seguidas e confirme **uma** linha em `error_logs` com contador 10.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 029 — Encurtar a retenção dos registros de erro e recuperar o espaço
Onda 1 / Severidade Média / Camada: banco
Achados resolvidos: BD-02
Problema hoje: `purge_old_logs()` apaga `error_logs` com mais de **30 dias** (`origin/contexto:docs/contexto/supabase/functions/public/purge_old_logs__12ae32cb1ec02d01.sql`), e mesmo assim a tabela acumula 1,0 GB. O espaço apagado não volta ao sistema de arquivos sozinho (`heap 892.9 MB` com poucas linhas mortas registradas).
Causa raiz: janela de retenção longa demais para o volume gerado, e `DELETE` não devolve espaço ao disco.
Caminho recomendado: faça depois de 027 e 028 (sem reduzir a geração, encurtar a retenção só adia). Reduza a retenção de `error_logs` para 7 ou 14 dias na função `purge_old_logs` (o mesmo valor já usado para `query_telemetry` e `telemetry_traces`), via migration com `CREATE OR REPLACE FUNCTION` — altere **apenas** o bloco de `error_logs`, preservando as outras dez tabelas da função. Em seguida, peça ao dono uma janela para recuperar o espaço: `VACUUM FULL public.error_logs` bloqueia a tabela e exige espaço livre equivalente, então não rode sem combinar horário. O atalho tentador é `TRUNCATE`: apaga também os erros das últimas horas, que são os úteis.
Arquivos e objetos a tocar: nova migration redefinindo `public.purge_old_logs`.
Não tocar / armadilhas: não remova nenhuma das outras tabelas tratadas pela função; mantenha o `IF to_regclass(...) IS NOT NULL` do bloco de `csp_violation_reports`.
Depende de: 027, 028, 003 · Libera: —
Risco e como reverter: baixo para a retenção; médio para o `VACUUM FULL` (bloqueio). Reverter = restaurar a função anterior.
Precisa de aprovação humana antes do merge: sim (DDL em produção e janela de manutenção)
Como verificar: na próxima execução do `purge-old-logs-daily`, `cron-runs.md` mostra sucesso; a próxima coleta de `stats.md` mostra `error_logs` menor. Registre os dois tamanhos.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 030 — Corrigir o filtro que impede o registro de falhas de consulta
Onda 1 / Severidade Média / Camada: front (observabilidade)
Achados resolvidos: CI-02
Problema hoje: `src/integrations/supabase/client.ts:31-37` só registra telemetria quando a URL contém `postgrest` ou `rpc`: `if (!isTelemetry && (urlString.includes('postgrest') || urlString.includes('rpc')))`. As URLs reais do Supabase são `https://<ref>.supabase.co/rest/v1/...` e **não contêm** "postgrest" — logo, erro 400/403/500 em consulta comum nunca é registrado, enquanto o `catch` de rede (linhas 62-73) registra tudo como crítico.
Causa raiz: o filtro foi escrito para um formato de URL que este projeto não usa.
Caminho recomendado: troque a condição por `urlString.includes('/rest/v1/')` (que cobre consultas e RPC) mantendo a exclusão de `error_logs` como está — ela é o que evita o laço de registrar o registro. Verifique também se `/auth/v1/` deve entrar (falha de login é sinal importante), e decida com base no volume medido na etapa 027: se o volume for alto, entre com a agregação da etapa 028 antes. O atalho tentador é remover o filtro inteiro: aí entra `error_logs` e volta o laço.
Arquivos e objetos a tocar: `src/integrations/supabase/client.ts`.
Não tocar / armadilhas: o arquivo tem o aviso "This file is automatically generated" no topo, mas é mantido à mão neste repositório (ele contém a instrumentação) — não o regenere; mantenha a importação dinâmica do logger (quebra de ciclo).
Depende de: 028 · Libera: —
Risco e como reverter: baixo, mas aumenta o volume de registro — faça junto da agregação.
Precisa de aprovação humana antes do merge: não
Como verificar: provoque uma consulta negada por permissão (abra uma tela de administração com conta de operador) e confirme que aparece linha nova em `error_logs` com nível `warn` e a rota correta; antes da correção, nenhuma linha aparecia.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 031 — Fazer o banco reconhecer o papel `admin` nas tabelas em que o aplicativo já o libera
Onda 1 / Severidade Alta / Camada: banco (RLS)
Achados resolvidos: AUT-05
Problema hoje: o front trata `admin` como curinga — `src/components/auth/ProtectedRoute.tsx:147-150` (`if (role === 'admin') return children`), `src/features/auth/hooks/useRBAC.tsx:185` (`if (role === 'admin') return true`), `src/features/auth/components/AuthProvider.tsx:477` (`isCoordinator: role === 'coordinator' || role === 'admin'`) — mas nenhuma policy de `jobs`, `audit_log`, `role_permissions`, `blocked_ips`, `ip_allowlist` ou `rate_limit_settings` menciona `admin`, e `app_private.has_role` compara papel por igualdade (`origin/contexto:docs/contexto/supabase/functions.md`).
Causa raiz: duas modelagens de autorização conviveram — curinga no cliente, igualdade no banco.
Caminho recomendado: **comece pela PR #256** ("banco autoritativo na autorização"), que já ataca esta causa e está aberta: leia o diff e verifique se ela cobre as seis tabelas acima. O que ela não cobrir, resolva por migration acrescentando `admin` às policies faltantes, copiando o padrão que o próprio banco já usa em `inventory_items` (`has_role(...,'admin') OR has_role(...,'manager') OR has_role(...,'coordinator')`) ou em `packaging_tasks` ("Staff manage all packaging tasks"). Não invente um papel novo e não troque `has_role` por uma função hierárquica nesta etapa — mudar a semântica de `has_role` afeta 327 policies de uma vez. O atalho tentador é tirar o bypass do front: isso "resolve" a inconsistência deixando o administrador sem poder nenhum, o oposto do que o negócio espera.
Arquivos e objetos a tocar: PR #256 (coordenar com o dono) e/ou nova migration com `CREATE POLICY`/`ALTER POLICY` nas tabelas faltantes.
Não tocar / armadilhas: as policies de `user_roles` exigem AAL2 — não relaxe isso; `audit_log` tem `Deny all changes` com `USING false` de propósito (a trilha é imutável): dar escrita ao admin ali seria um retrocesso de auditoria, dê apenas leitura.
Depende de: 003 · Libera: 032
Risco e como reverter: médio — policy mal escrita pode liberar demais. Reverter = `DROP POLICY` da policy nova.
Precisa de aprovação humana antes do merge: sim (DDL em produção e mudança de autorização)
Como verificar: com uma conta `admin` de teste, cada operação que a UI libera deve funcionar de fato: criar OS, ler trilha de auditoria, salvar permissão, bloquear IP. Liste as quatro com o resultado.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 032 — Unificar o critério de segundo fator entre a tela de login e o guarda de rota
Onda 1 / Severidade Alta / Camada: front (autenticação)
Achados resolvidos: AUT-04
Problema hoje: `src/components/auth/ProtectedRoute.tsx:124-127` barra o acesso só pelo nível da sessão (`needsMfaChallenge`), enquanto `src/pages/AuthPage.tsx:70-82` só mostra o desafio se encontrar um fator `totp` com status `verified`; `src/features/auth/hooks/useAuthenticatorAssuranceLevel.ts:58-67` apenas registra o erro de `listFactors` sem alterar a decisão. Quando a sessão exige segundo fator e a lista de fatores vem vazia ou falha, a tela devolve para `/` e o guarda devolve para `/auth`, em laço, com `replace` nos dois lados.
Causa raiz: a mesma decisão é tomada em dois lugares com dados diferentes.
Caminho recomendado: faça do hook a única fonte: exponha nele um estado de três valores — precisa de desafio / não precisa / indeterminado (erro ao consultar fatores) — e consuma esse estado nos dois lugares. Em "indeterminado", **não** redirecione: mostre mensagem de erro com botão de tentar novamente, que é o comportamento que evita o laço. Padrão de referência: `src/components/auth/ProtectedRoute.tsx` já trata estado de carregamento separadamente do de permissão; siga a mesma forma.
Arquivos e objetos a tocar: `src/features/auth/hooks/useAuthenticatorAssuranceLevel.ts`, `src/components/auth/ProtectedRoute.tsx`, `src/pages/AuthPage.tsx`.
Não tocar / armadilhas: não afrouxe a exigência de segundo fator para papéis privilegiados; as policies de `user_roles` dependem de AAL2 no banco, então remover o desafio no front criaria uma falha silenciosa de gravação.
Depende de: — · Libera: —
Risco e como reverter: médio (toca o caminho de login de todos). Reverter = voltar os três arquivos.
Precisa de aprovação humana antes do merge: não
Como verificar: `npx vitest run src/features/auth src/components/auth` passa; simule erro de `listFactors` (bloqueio de rede no navegador ou mock) e confirme que aparece mensagem de erro em vez de piscar entre telas.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 033 — Restringir a leitura de defeitos de embalagem a quem tem relação com a tarefa
Onda 1 / Severidade Baixa / Camada: banco (RLS)
Achados resolvidos: BD-05
Problema hoje: `public.packaging_defects` tem a policy `Anyone can see defects` — SELECT, `USING true`, para `authenticated` (`origin/contexto:docs/contexto/supabase/policies.md:146`). É a única policy realmente permissiva entre as 327 do banco.
Causa raiz: policy de desenvolvimento que ficou.
Caminho recomendado: remova essa policy. As outras três policies da tabela já cobrem os casos legítimos (`Operators view defects of accessible tasks`, `Authorized defect management`, `Staff manage all defects`), então a correção é só `DROP POLICY "Anyone can see defects" ON public.packaging_defects;`. Antes de remover, confirme no snapshot da tabela que as três continuam lá, para não cegar a tela de triagem. Atenção: a PR #249 (aberta) toca justamente o fluxo de defeito de embalagem — coordene para não conflitar.
Arquivos e objetos a tocar: nova migration com o `DROP POLICY`.
Não tocar / armadilhas: não remova as policies de INSERT do operador; a tabela está vazia hoje (`stats.md`), então o risco de impacto imediato é baixo, mas o fluxo é usado pelo quiosque de embalagem.
Depende de: 003 · Libera: —
Risco e como reverter: baixo; reverter = recriar a policy (definição no snapshot).
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: com conta de operador sem relação com a tarefa, `GET /rest/v1/packaging_defects?select=id` deve devolver lista vazia; com o operador da tarefa, deve devolver o defeito.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 034 — Impedir que o operador altere campos comerciais da OS
Onda 1 / Severidade Média / Camada: banco (permissão por coluna)
Achados resolvidos: RN-02
Problema hoje: a policy `Operators can update jobs on assigned machines` (`origin/contexto:docs/contexto/supabase/tables/public/jobs.md`) autoriza UPDATE da linha inteira quando a máquina é do operador; não há restrição por coluna, então `order_number`, `client`, `quantity` e `priority` ficam graváveis pelo quiosque.
Causa raiz: autorização modelada por linha, sem recorte de coluna.
Caminho recomendado: use permissão por coluna do Postgres, que é o mecanismo que resolve isso sem reescrever policy: `REVOKE UPDATE ON public.jobs FROM authenticated;` seguido de `GRANT UPDATE (status, produced_quantity, lost_pieces, started_at, finished_at, operator_id, ...) ON public.jobs TO authenticated;` — e confira com o dono a lista exata de colunas que a operação precisa mudar. Antes, levante quais colunas o front realmente atualiza: `grep -rn "from('jobs')" src/ -A3 | grep update` e a lista de campos em `src/features/jobs/services/jobsService.ts`. O atalho tentador é criar uma policy nova com `WITH CHECK` comparando colunas: policy não compara "o que mudou", então não resolve.
Arquivos e objetos a tocar: nova migration com `REVOKE`/`GRANT` por coluna em `public.jobs`.
Não tocar / armadilhas: coordenador e gestor usam a mesma role `authenticated` — o `GRANT` por coluna vale para todos; portanto a lista precisa conter também as colunas que coordenador edita, e o recorte fino entre papéis continua sendo papel da policy. Se isso ficar ambíguo, pare e pergunte ao dono em vez de adivinhar.
Depende de: 003, 031 · Libera: —
Risco e como reverter: alto se a lista de colunas ficar incompleta: a edição de OS para de funcionar. Teste em um banco descartável antes. Reverter = `GRANT UPDATE ON public.jobs TO authenticated`.
Precisa de aprovação humana antes do merge: sim (DDL em produção, risco de travar o fluxo)
Como verificar: com conta de operador, `PATCH /rest/v1/jobs?id=eq.<id>` mudando `status` deve responder 2xx; mudando `order_number` deve responder **403** (`permission denied for column`). Registre os dois.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 035 — Fazer o portão de qualidade falhar fechado
Onda 1 / Severidade Média / Camada: CI
Achados resolvidos: CI-01
Problema hoje: `.github/workflows/ci.yml:543-556` conta `skipped`, `cancelled` e `abandoned` como aprovado e trata o job `e2e` como *advisory* ("suíte em quarentena ... falhas aqui reportam, mas não bloqueiam o merge"). `Quality Gate ✅` é o único check obrigatório da `main` (`AGENTS.md`), logo é possível mergear com a suíte de ponta a ponta vermelha.
Causa raiz: a quarentena do E2E foi implementada dentro do portão, em vez de fora dele.
Caminho recomendado: duas mudanças cirúrgicas. (1) Separe "pulado porque uma run mais nova substituiu esta" de "pulado porque a dependência falhou": o primeiro caso é legítimo e dá para distinguir por `github.event.workflow_run` / pelo estado dos jobs anteriores; o segundo deve reprovar. (2) Deixe o E2E advisory, mas **visível**: publique no resumo da run uma linha explícita "E2E vermelho — merge permitido por quarentena" e abra uma issue automática, para que a quarentena não seja silenciosa. Não torne o E2E obrigatório nesta etapa: a suíte roda contra o Supabase real com MFA e limite de requisições (comentários em `ci.yml:424-443`) e passaria a bloquear merges por motivo alheio ao código. O endurecimento do E2E é a etapa 036.
Arquivos e objetos a tocar: `.github/workflows/ci.yml` (apenas o job `quality-gate`).
Não tocar / armadilhas: não mexa no `concurrency` global do E2E (serializa a suíte contra o Supabase real); não remova o check de pré-requisitos de secrets (é ele que faz o gate "falhar fechado" hoje em dois jobs).
Depende de: — · Libera: 036
Risco e como reverter: médio — um portão mais severo pode travar merges legítimos. Reverter = voltar o bloco.
Precisa de aprovação humana antes do merge: sim (CI/workflows)
Como verificar: abra uma PR de teste que force um job a falhar (por exemplo, quebrando um teste de propósito numa branch descartável) e confirme que `Quality Gate ✅` fica vermelho; confirme que uma run substituída por push mais novo continua não reprovando.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 036 — Bloquear no banco a exclusão de OS que já teve produção
Onda 1 / Severidade Crítica / Camada: banco (trigger)
Achados resolvidos: RN-04
Problema hoje: `src/pages/PendingQueue.tsx:233` executa `supabase.from('jobs').delete().in('id', Array.from(selectedJobs))` para todas as OS selecionadas, com a única barreira de um `window.confirm('Excluir permanentemente estes jobs?')` (`PendingQueue.tsx:481`). A regra declarada R1.1 (`origin/contexto:docs/contexto/regras/07-REGRAS-DE-NEGOCIO.md:20-21`) diz que "Job não pode ser excluído se `produced_quantity > 0` ou `lost_pieces > 0`, ou se `status` não for `queue`, `scheduled` ou `cancelled`" — e **nenhuma camada** aplica isso: não há trigger `BEFORE DELETE` em `jobs` (os dois triggers `BEFORE` são `validate_job_cancel_reason` e `validate_job_rework_depth`, ambos só em INSERT/UPDATE, `origin/contexto:docs/contexto/supabase/tables/public/jobs.md`). Pior: oito tabelas apontam para `jobs` com `ON DELETE CASCADE`, incluindo `shipments`, `production_losses`, `job_status_audit`, `job_status_history`, `packaging_tasks`, `qr_scan_history`, `pre_production_checklists` e `abc_job_costs`.
Causa raiz: a regra de negócio existe no documento e em nenhum lugar executável.
Caminho recomendado: crie um trigger `BEFORE DELETE` em `public.jobs` que levante exceção quando `OLD.produced_quantity > 0 OR OLD.lost_pieces > 0 OR OLD.status NOT IN ('queue','scheduled','cancelled')`, com mensagem em português que o front possa mostrar. Comece pelo banco (e não pelo front) porque há quatro caminhos de escrita e o banco é o único ponto por onde todos passam. Padrão a seguir: `public.validate_job_cancel_reason` — mesma forma, mesmo estilo de mensagem. Use `RAISE EXCEPTION ... USING ERRCODE` com um código estável para o front reconhecer.
Arquivos e objetos a tocar: nova migration `supabase/migrations/<AAAAMMDDHHMMSS>_block_delete_job_with_production.sql`.
Não tocar / armadilhas: não transforme os `ON DELETE CASCADE` nesta etapa (é a etapa 039, e mexer nos dois ao mesmo tempo torna o rollback difícil); não bloqueie a exclusão de OS em `queue` sem produção — é um fluxo legítimo de correção de cadastro.
Depende de: 003 · Libera: 037, 038, 039
Risco e como reverter: baixo; reverter = `DROP TRIGGER`.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: numa OS de teste com `produced_quantity = 5`, `DELETE FROM jobs WHERE id = '<id>'` deve falhar com a mensagem nova; numa OS em `queue` sem produção, deve apagar.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 037 — Dizer ao usuário o que a exclusão em massa vai apagar junto
Onda 1 / Severidade Alta / Camada: front
Achados resolvidos: RN-04
Problema hoje: `src/pages/PendingQueue.tsx:481` usa `window.confirm('Excluir permanentemente estes jobs?')` — um diálogo do navegador, fora do padrão visual do sistema, que não informa que a exclusão arrasta expedições, perdas de produção, tarefas de embalagem, histórico de QR e a trilha de auditoria por `ON DELETE CASCADE`.
Causa raiz: confirmação genérica para uma ação com efeito muito maior do que o texto sugere.
Caminho recomendado: substitua por `AlertDialog` (o repositório já usa `@radix-ui/react-alert-dialog`; procure um exemplo com `grep -rn "AlertDialog" src/components | head`) listando quantas OS serão apagadas, quais têm produção registrada (essas devem aparecer como impedidas, antecipando a recusa do banco da etapa 036) e um aviso explícito de que os registros ligados serão removidos. Filtre a seleção no cliente antes de enviar, para não disparar um erro do banco por OS. Mantenha a ação disponível: o objetivo é informar, não impedir.
Arquivos e objetos a tocar: `src/pages/PendingQueue.tsx`.
Não tocar / armadilhas: não mude a regra de quem pode excluir (é policy); não troque a chamada por uma função nova de banco nesta etapa.
Depende de: 036 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: selecione duas OS (uma com produção, outra sem) e confirme que o diálogo mostra a contagem, marca a primeira como impedida e só apaga a segunda. Registre o texto exibido.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 038 — Usar o arquivamento que já existe em vez de apagar OS concluída
Onda 1 / Severidade Média / Camada: banco + front
Achados resolvidos: RN-04
Problema hoje: existe a tabela `public.archived_jobs` com **0 linhas** e nenhum caminho do aplicativo escreve nela (`origin/contexto:docs/contexto/supabase/tables/public/archived_jobs.md`, `stats.md`); o único caminho de "tirar da lista" é a exclusão definitiva.
Causa raiz: recurso de arquivamento criado e nunca ligado.
Caminho recomendado: antes de escrever código, confirme com o dono o que ele espera de "arquivar" (sair das telas de operação, continuar nos relatórios). Depois, implemente o caminho mínimo: uma função no banco que copia a OS para `archived_jobs` e remove de `jobs` dentro da **mesma transação**, chamada por um botão "Arquivar" na fila. Compare as colunas das duas tabelas antes (`archived_jobs.md` vs `jobs.md`) e, se faltar coluna, registre na PR em vez de criar DDL por conta própria. O atalho tentador é marcar a OS com um status novo: isso mexe no enum `jobs_status_check`, na máquina de estados e em todos os contadores de tela.
Arquivos e objetos a tocar: nova migration (função de arquivamento), `src/pages/PendingQueue.tsx` ou o serviço de OS.
Não tocar / armadilhas: a trilha `job_status_audit`/`job_status_history` tem `ON DELETE CASCADE` — ao mover a OS, essa trilha é perdida do mesmo jeito; decida com o dono se a trilha vai junto (é o que a etapa 039 endereça).
Depende de: 036, 039 · Libera: —
Risco e como reverter: médio (escreve e remove dado). Reverter = mover de volta; por isso a operação deve ser transacional.
Precisa de aprovação humana antes do merge: sim (DDL e movimentação de dado em produção)
Como verificar: arquive uma OS de teste e confirme: linha presente em `archived_jobs`, ausente em `jobs`, e a OS fora das telas de operação mas presente no relatório que o dono indicar.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 039 — Revisar as exclusões em cascata que levam embora expedição e perdas
Onda 1 / Severidade Alta / Camada: banco (integridade)
Achados resolvidos: RN-04
Problema hoje: `origin/contexto:docs/contexto/supabase/tables/public/jobs.md` (seção "Referenciada por") mostra `ON DELETE CASCADE` em `abc_job_costs`, `job_status_audit`, `job_status_history`, `packaging_tasks`, `pre_production_checklists`, `production_losses`, `qr_scan_history` e `shipments`. Apagar uma OS apaga a expedição e o registro de perdas dela.
Causa raiz: cascata escolhida por conveniência de desenvolvimento, aplicada também a registros que são prova de operação.
Caminho recomendado: separe por natureza do dado. Para registros **derivados** (custo ABC, checklist de pré-produção, histórico de leitura de QR), a cascata é aceitável. Para registros que são **prova** (perdas de produção, trilha de status, expedição), troque para `ON DELETE RESTRICT` — assim a exclusão só acontece se não houver prova vinculada, o que é exatamente o que a regra R1.1 quer. Faça uma migration por grupo de tabelas, não uma única com oito alterações, para que uma recusa de chave não derrube o resto. Confirme com o dono antes: trocar para `RESTRICT` pode impedir exclusões que hoje a equipe faz.
Arquivos e objetos a tocar: nova migration com `ALTER TABLE ... DROP CONSTRAINT ... ADD CONSTRAINT ... ON DELETE RESTRICT` para as tabelas de prova.
Não tocar / armadilhas: `jobs_parent_job_id_fkey` é auto-referência com `SET NULL` — não mude (é o encadeamento de retrabalho); recriar chave estrangeira em tabela grande bloqueia escrita por instantes, então combine a janela.
Depende de: 036, 003 · Libera: 038
Risco e como reverter: médio. Reverter = recriar as chaves com `CASCADE`.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: tente apagar uma OS de teste que tenha expedição: deve falhar com violação de chave estrangeira; uma OS sem vínculos deve apagar.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 040 — Fazer a regra de bloqueio de exclusão valer no serviço do aplicativo
Onda 1 / Severidade Crítica / Camada: front (serviço)
Achados resolvidos: RN-04
Problema hoje: a regra R1.1 existe apenas como estado de botão: `src/components/jobs/JobDetailsModal.tsx:118` (`const canDelete = !job.produced_quantity && !job.lost_pieces && ['queue','scheduled','cancelled'].includes(job.status)`), usada só como `disabled`. Os dois caminhos de lote não checam nada: `src/pages/KanbanBoard.tsx:255` (`Promise.allSettled(Array.from(selectedJobs).map(id => jobsService.delete(id)))`) e `src/pages/PendingQueue.tsx:233` (`supabase.from('jobs').delete().in('id', ...)`).
Causa raiz: a regra foi implementada na aparência do botão, não no caminho que grava.
Caminho recomendado: mova a condição para dentro de `jobsService.delete` (`src/features/jobs/services/jobsService.ts:119-122`): busque `produced_quantity`, `lost_pieces` e `status` antes de apagar e lance erro com a mesma condição de `JobDetailsModal.tsx:118`; e faça `PendingQueue.tsx:233` passar por `jobsService.delete` em vez de chamar o cliente direto. Isso cobre os três caminhos com um único ponto de verdade. O trigger da etapa 036 é a rede de segurança; esta etapa é o que dá mensagem decente ao usuário.
Arquivos e objetos a tocar: `src/features/jobs/services/jobsService.ts`, `src/pages/PendingQueue.tsx`, `src/pages/KanbanBoard.tsx`.
Não tocar / armadilhas: não mude a policy de DELETE (continua coordinator/manager); não remova o `disabled` do modal (é bom indício visual).
Depende de: — · Libera: 037
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: `npx vitest run src/features/jobs/services/jobsService.test.ts` passa com um caso novo de recusa; na tela, selecionar uma OS com produção e tentar excluir deve mostrar erro em vez de apagar.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

---

## Onda 2 — Fluxos principais quebrados

### Etapa 041 — Religar a atualização em tempo real das tabelas que o aplicativo assina
Onda 2 / Severidade Alta / Camada: banco (publicação) 
Achados resolvidos: EST-01
Problema hoje: o aplicativo assina mudanças de **27 tabelas** (`grep -rhoE "table: '[a-z_]+'" src | sort -u`: `jobs`, `machines`, `profiles`, `push_notifications`, `maintenance_schedules`, `chat_messages`, `techniques`, `shift_handovers`, entre outras) e a publicação do banco contém **duas**: `public.packaging_tasks` e `public.packaging_defects` (`origin/contexto:docs/contexto/supabase/realtime.md`), sem a opção "all tables".
Causa raiz: a publicação foi recriada em algum momento e só as duas últimas tabelas adicionadas sobreviveram; como as migrations são somente-para-frente, nada reinseriu as demais.
Caminho recomendado: migration idempotente que adiciona à publicação **apenas** as tabelas efetivamente consumidas (não todas as 131), no padrão que o repositório já usa: bloco `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='jobs') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs; END IF; ... END $$;`. Antes, monte a lista final cruzando as 27 com o que cada assinatura realmente usa — e tire da lista as de log (`error_logs`, `query_telemetry`, `security_events`, `blocked_ips`): publicar tabela de log em tempo real multiplica tráfego sem ganho. Verifique também `replica identity` das tabelas que precisam de evento de DELETE. O atalho tentador é marcar a publicação como "all tables": isso coloca 131 tabelas no fluxo de replicação, inclusive `error_logs` com 2,3 milhões de linhas.
Arquivos e objetos a tocar: nova migration `supabase/migrations/<AAAAMMDDHHMMSS>_realtime_republish_tables.sql`.
Não tocar / armadilhas: não mexa em `supabase_realtime_messages_publication`; não adicione `error_logs` (ver BD-02).
Depende de: 003 · Libera: 042
Risco e como reverter: médio (aumenta tráfego de replicação). Reverter = `ALTER PUBLICATION ... DROP TABLE`.
Precisa de aprovação humana antes do merge: sim (DDL em produção e efeito em custo/tráfego)
Como verificar: após o deploy, `git show origin/contexto:docs/contexto/supabase/realtime.md` (próxima coleta) deve listar as tabelas adicionadas; no app, abra o Kanban em duas janelas e mova uma OS: a segunda janela deve refletir sem recarregar.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 042 — Remover ou marcar as assinaturas de tempo real que não serão religadas
Onda 2 / Severidade Média / Camada: front (hooks)
Achados resolvidos: EST-01
Problema hoje: depois da etapa 041 algumas assinaturas continuarão sem publicação (as de log, e as que o dono decidir não religar), e hoje nada no código indica que elas não funcionam — o desenvolvedor seguinte vai depender delas.
Causa raiz: assinatura sem contraparte no banco é código que parece funcionar.
Caminho recomendado: para cada tabela que ficou fora, remova a assinatura e, onde a tela depende de atualização, troque por `refetchInterval` do react-query com intervalo compatível com o uso (minutos, não segundos) — o repositório já usa esse padrão em hooks de painel; procure com `grep -rn "refetchInterval" src/ | head`. Documente a escolha num comentário curto de uma linha, para que a próxima pessoa não "conserte" de volta.
Arquivos e objetos a tocar: os hooks das tabelas excluídas (identifique pela lista da etapa 041).
Não tocar / armadilhas: não remova `useRealtimeChannel` em si (é usado pelas que ficam); não transforme tudo em `refetchInterval` curto — é o caminho mais rápido para estourar requisições.
Depende de: 041 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: `grep -rhoE "table: '[a-z_]+'" src | sort -u` passa a listar só tabelas presentes em `realtime.md`. Cole as duas listas em `05-PROGRESSO.md`.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 043 — Resolver o nome do canal antes do efeito para o WebSocket parar de cair
Onda 2 / Severidade Média / Camada: front (hooks)
Achados resolvidos: EST-05
Problema hoje: `src/lib/realtimeChannel.ts:82` aceita `name: string | (() => string)`, resolve dentro do efeito (linha 87) e declara dependência `[name]` (linha 95, com `eslint-disable-line`). Dois chamadores passam função nova a cada render: `src/features/notifications/hooks/useNotifications.ts:194-202` e `src/components/qrcode/ScanHistory.tsx:94-98` — o canal é derrubado e reaberto a cada renderização.
Causa raiz: a lista de dependências compara a referência da função, não o nome que ela produz.
Caminho recomendado: resolva o nome **fora** do efeito (`const resolvedName = typeof name === 'function' ? name() : name;`) e use `[resolvedName]` como dependência. A string é estável entre renders enquanto o identificador não muda, e a troca de usuário continua recriando o canal. Não é preciso tocar nos 28 chamadores.
Arquivos e objetos a tocar: `src/lib/realtimeChannel.ts`.
Não tocar / armadilhas: mantenha a remoção do canal no cleanup; não troque o `eslint-disable` por desativar a regra no arquivo todo.
Depende de: 041 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: com as ferramentas do navegador abertas na tela de notificações, contar as conexões WebSocket abertas antes e depois: deve parar de abrir uma nova a cada render. Registre a contagem.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 044 — Separar a chave de cache de "máquinas ativas" de "todas as máquinas"
Onda 2 / Severidade Alta / Camada: front (estado)
Achados resolvidos: EST-02
Problema hoje: `src/lib/queryConfig.ts:24` define `MACHINES: ['machines']` e três consultas diferentes usam essa mesma chave com funções incompatíveis: `src/features/jobs/hooks/useSchedulingData.ts:67-69` → `machinesService.getAll()` (sem filtro), `src/features/production/hooks/useMachines.ts:13-16` → `machinesService.getActive()` (`.eq('is_active', true)`), e `src/components/knowledge/TechnicalSheetEditor.tsx:52-59` → consulta própria. O react-query identifica a consulta só pela chave: qual função roda depende de quem montou primeiro.
Causa raiz: mesma chave para conjuntos de dados diferentes.
Caminho recomendado: siga o padrão que o próprio arquivo já usa para OS (`src/lib/queryConfig.ts:18-23`): crie `MACHINES_ALL: ['machines','all']` ao lado de `MACHINES: ['machines']` — o prefixo compartilhado mantém `invalidateQueries({ queryKey: ['machines'] })` atingindo as duas — e aponte `useSchedulingData.ts:67` para a nova chave, deixando `MACHINES` só com `getActive()`. Depois troque as consultas declaradas dentro de componentes pelos hooks (`useMachines`), para não reabrir o problema.
Arquivos e objetos a tocar: `src/lib/queryConfig.ts`, `src/features/jobs/hooks/useSchedulingData.ts`, `src/features/production/hooks/useMachines.ts`, `src/components/knowledge/TechnicalSheetEditor.tsx`.
Não tocar / armadilhas: verifique todos os pontos que invalidam `['machines']` antes de mudar (`grep -rn "QUERY_KEYS.MACHINES" src/`), para não deixar tela sem atualizar depois de salvar máquina.
Depende de: — · Libera: —
Risco e como reverter: médio (toca o cache de várias telas). Reverter = voltar a chave única.
Precisa de aprovação humana antes do merge: não
Como verificar: `npx vitest run src/features/production src/features/jobs` passa; na tela de agendamento, uma máquina inativa deve aparecer na lista completa e não na seleção de máquinas ativas, independentemente da ordem em que as telas foram abertas.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 045 — Parar de repetir consultas que foram negadas por permissão
Onda 2 / Severidade Média / Camada: front (estado)
Achados resolvidos: EST-03
Problema hoje: `src/lib/queryConfig.ts:76` classifica o erro com `if (error instanceof Error)`, mas os hooks envelopam a falha em `AppError`, que é um **objeto literal** (`src/lib/errorHandling.ts:9` declara `interface AppError` e `createAppError` devolve `{ message, code, ... }`, linhas 155-165). Resultado: a lista de códigos que não devem ser repetidos (42501 = permissão negada, PGRST301 = sessão expirada, 28000) nunca é consultada e toda consulta falha é repetida três vezes.
Causa raiz: a verificação de tipo não cobre o formato de erro que o próprio projeto cria.
Caminho recomendado: diff mínimo em `src/lib/queryConfig.ts:74-129`: antes do `if (error instanceof Error)`, trate o `AppError` pelo campo que ele já calcula — `if (error && typeof error === 'object' && 'retryable' in error) return Boolean(error.retryable);`. Isso reaproveita a lista `retryableCodes` de `src/lib/errorHandling.ts:145-153` em vez de duplicar a classificação. Não transforme `AppError` em classe nesta etapa: `AppError` é usado em dezenas de arquivos e a mudança de tipo propaga demais.
Arquivos e objetos a tocar: `src/lib/queryConfig.ts`.
Não tocar / armadilhas: não mexa em `errorHandling.ts` agora; não aumente o número de tentativas.
Depende de: — · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: `npx vitest run src/lib` passa; com conta sem permissão, abra uma tela restrita e confirme na aba de rede **uma** requisição negada em vez de quatro.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 046 — Expor no aplicativo a coluna de motivo de cancelamento que o banco exige
Onda 2 / Severidade Alta / Camada: front (tipos gerados)
Achados resolvidos: RN-05
Problema hoje: o banco tem a coluna `jobs.cancel_reason` e o trigger `trg_validate_job_cancel_reason` (habilitado, BEFORE INSERT OR UPDATE) que levanta `'cancel_reason é obrigatório ao cancelar um job'` (`origin/contexto:docs/contexto/supabase/functions/public/validate_job_cancel_reason__12ae32cb1ec02d01.sql`). No aplicativo, `grep -rn "cancel_reason" src/` **não retorna nada** e o tipo de `jobs` em `src/integrations/supabase/types.ts` não traz a coluna.
Causa raiz: a DDL foi aplicada no banco e o lado do aplicativo nunca acompanhou; o arquivo de tipos é gerado e ficou velho.
Caminho recomendado: regenere `src/integrations/supabase/types.ts` (é arquivo gerado, conforme `AGENTS.md`) e confira no diff que apenas colunas/tabelas novas entraram — se vier muito mais do que `cancel_reason`, isso por si é informação importante (a divergência de 9 tabelas registrada em `baseline.json`): registre a lista em `05-PROGRESSO.md` e mantenha o diff. Não edite o arquivo à mão.
Arquivos e objetos a tocar: `src/integrations/supabase/types.ts`.
Não tocar / armadilhas: regenerar tipos pode quebrar o typecheck em lugares que dependiam do tipo antigo — corrija só o que o compilador apontar, sem aproveitar para refatorar.
Depende de: 003 · Libera: 047
Risco e como reverter: baixo; reverter = restaurar o arquivo.
Precisa de aprovação humana antes do merge: não
Como verificar: `npx tsc --noEmit -p tsconfig.app.json` sem erro e `grep -c "cancel_reason" src/integrations/supabase/types.ts` maior que zero.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 047 — Criar a ação de cancelar OS com motivo obrigatório
Onda 2 / Severidade Alta / Camada: front (fluxo)
Achados resolvidos: RN-05
Problema hoje: `cancelled` é um estado alcançável na máquina de estados (`src/features/jobs/services/jobStateMachine.ts:9-19`) e exigido pelo banco com motivo, mas não existe nenhuma ação de cancelar na interface — qualquer tentativa de levar uma OS a `cancelled` pelos caminhos atuais falha no trigger, porque ninguém envia `cancel_reason`.
Causa raiz: metade da regra (banco) foi entregue sem a outra metade (aplicativo).
Caminho recomendado: adicione a ação no lugar onde as outras ações de OS vivem (detalhe da OS — `src/components/jobs/JobDetailsModal.tsx`), com um campo de motivo obrigatório validado **antes** da chamada, seguindo o padrão de `src/components/operator/ProductionRegistrationModal.tsx` (validação no handler + aviso de erro). A escrita deve passar por `jobsService.updateStatus`, que é o único ponto que revalida a transição. Não adicione a ação em massa agora: cancelar em lote com um motivo único é decisão de negócio.
Arquivos e objetos a tocar: `src/components/jobs/JobDetailsModal.tsx`, `src/features/jobs/services/jobsService.ts` (aceitar o motivo em `updateStatus`).
Não tocar / armadilhas: o trigger `trg_job_cancelled_hold_packaging` reage ao cancelamento e segura a tarefa de embalagem — não mexa nele; confira que o cancelamento de uma OS com embalagem em andamento se comporta como o dono espera antes de liberar.
Depende de: 046 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: cancele uma OS de teste sem motivo (deve ser impedido na tela) e com motivo (deve gravar `status='cancelled'` e `cancel_reason` preenchido). Mostre a linha resultante.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 048 — Fazer toda mudança de status de OS passar pela validação de transição
Onda 2 / Severidade Alta / Camada: front (serviço)
Achados resolvidos: RN-01
Problema hoje: só `jobsService.updateStatus` chama `assertTransition`; `jobsService.update` (`src/features/jobs/services/jobsService.ts:65-69`) grava qualquer `updates` sem validar. E quatro caminhos escrevem status direto: `src/pages/PendingQueue.tsx:239-256` (ações em massa), `src/pages/KanbanBoard.tsx:160-184` e `:215-232` (ação rápida), `src/components/dashboard/AlertScheduleModal.tsx:124`, `src/components/operator/ProductionRegistrationModal.tsx:198-222`.
Causa raiz: a regra está numa função pura amarrada a um único ponto de escrita, enquanto existem quatro.
Caminho recomendado: coloque a guarda dentro de `jobsService.update`: quando `updates.status` estiver presente, busque o status atual e chame `assertTransition` (é o que `updateStatus` já faz nas linhas 71-78). Depois troque as escritas diretas dos quatro locais por `jobsService.updateStatus`/`update` — o padrão correto já está em `src/features/jobs/hooks/useKanbanDragDrop.ts:118-120`. Faça em duas PRs se preferir: primeiro a guarda no serviço (que já corta o caminho de `JobDetailsModal` e do Kanban), depois os chamadores diretos.
Arquivos e objetos a tocar: `src/features/jobs/services/jobsService.ts`, `src/pages/PendingQueue.tsx`, `src/pages/KanbanBoard.tsx`, `src/components/dashboard/AlertScheduleModal.tsx`, `src/components/operator/ProductionRegistrationModal.tsx`.
Não tocar / armadilhas: a validação no cliente **não** substitui o banco (etapa 104); não mude as transições declaradas em `jobStateMachine.ts` nesta etapa.
Depende de: 047 · Libera: 051, 104
Risco e como reverter: médio (toca cinco telas de operação). Reverter = voltar os arquivos.
Precisa de aprovação humana antes do merge: não
Como verificar: `npx vitest run src/features/jobs` passa; tente, pela ação em massa, mover uma OS em `queue` para `finished`: deve ser recusado com a mensagem da máquina de estados.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 049 — Fazer a promoção automática de fila ler o alvo configurado, não uma constante
Onda 2 / Severidade Alta / Camada: edge function
Achados resolvidos: RN-06
Problema hoje: quem promove de verdade é a edge function, e ela usa constante: `supabase/functions/auto-promote-jobs/index.ts:5` (`const BUFFER_TARGET = 3`) e `:120` (`const neededCount = Math.max(0, BUFFER_TARGET - (readyCount || 0))`). O aplicativo, por outro lado, lê o parâmetro de negócio: `src/features/jobs/hooks/useAutoBufferPromotion.ts:19-22` (`getConfig('buffer_size', 3)`), semeado por migration com descrição "Quantidade de jobs prontos mantidos no buffer por técnica". Um terceiro lugar repete a constante: `src/components/dashboard/BufferStatusWidget.tsx:21,31`.
Causa raiz: parâmetro de negócio configurável no banco, mas congelado em código onde a decisão é tomada.
Caminho recomendado: na edge function, faça um `SELECT` em `business_config` por `key='buffer_size'` antes do laço de técnicas (ela já usa o cliente com chave de serviço), com fallback 3 se a linha não existir. Um único `SELECT` por execução — a função roda a cada 5 minutos, o custo é irrelevante. Não leia a configuração dentro do laço.
Arquivos e objetos a tocar: `supabase/functions/auto-promote-jobs/index.ts`.
Não tocar / armadilhas: a função é chamada por cron (`auto-promote-jobs-fallback`, `*/5 * * * *`) — mantenha o comportamento quando a configuração estiver ausente, senão a promoção para; não mude o critério de seleção de OS nesta etapa.
Depende de: 003 · Libera: 050
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: altere `business_config.buffer_size` para 5 num ambiente de teste, invoque a função e confirme nos logs que `neededCount` foi calculado sobre 5. Registre a saída.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 050 — Mostrar no painel o mesmo alvo de buffer que o sistema usa
Onda 2 / Severidade Média / Camada: front
Achados resolvidos: RN-06
Problema hoje: `src/components/dashboard/BufferStatusWidget.tsx:21,31` tem `const BUFFER_TARGET = 3` e calcula o progresso sobre essa constante, enquanto `BufferPromotionStatus.tsx:11` já consome o alvo do hook.
Causa raiz: constante repetida em componente em vez de consumir a configuração.
Caminho recomendado: consuma `bufferTarget` de `useAutoBufferPromotion`, exatamente como `BufferPromotionStatus.tsx:11` faz, e remova a constante local.
Arquivos e objetos a tocar: `src/components/dashboard/BufferStatusWidget.tsx`.
Não tocar / armadilhas: não mude o visual do indicador; se o hook ainda estiver carregando, mostre o estado de carregamento em vez de calcular com zero.
Depende de: 049 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: com `buffer_size` em 5, o painel deve mostrar progresso sobre 5. Registre a tela ou o valor lido.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 051 — Deixar um único lugar carimbando início e fim de produção
Onda 2 / Severidade Alta / Camada: front (serviço)
Achados resolvidos: RN-07
Problema hoje: a regra canônica está em `jobsService.updateStatus` (`src/features/jobs/services/jobsService.ts:85-100`), com as condições "só carimba o início se ainda não houver" e "preserva o início original na retomada". Três cópias repetem a lógica sem as condições completas: `src/pages/KanbanBoard.tsx:177-181` e `:225-226`, `src/pages/PendingQueue.tsx:248-251`, `src/components/operator/ProductionRegistrationModal.tsx:208-212`. Por não passarem pelo serviço, essas cópias também deixam de atribuir o operador no primeiro início.
Causa raiz: regra de carimbo duplicada em quatro lugares.
Caminho recomendado: apague as três cópias e faça esses caminhos chamarem `jobsService.updateStatus` para a parte de status (que já carimba, atribui operador e sincroniza), mantendo os campos próprios (`produced_quantity`, `lost_pieces`, notas, fotos) num `jobsService.update` separado — arranjo já usado em `src/features/jobs/hooks/useKanbanDragDrop.ts:118-120`. Faça depois da etapa 048, que já leva esses mesmos arquivos ao serviço.
Arquivos e objetos a tocar: `src/pages/KanbanBoard.tsx`, `src/pages/PendingQueue.tsx`, `src/components/operator/ProductionRegistrationModal.tsx`.
Não tocar / armadilhas: não altere a semântica de "retomada preserva o início": é ela que mantém o tempo de produção correto nos indicadores.
Depende de: 048 · Libera: —
Risco e como reverter: médio. Reverter = voltar os arquivos.
Precisa de aprovação humana antes do merge: não
Como verificar: numa OS de teste, inicie → pause → retome → conclua e confirme que `actual_start_time` é o do primeiro início e `actual_end_time` o da conclusão. Cole os valores.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 052 — Unificar, no aplicativo, quais status ocupam uma máquina
Onda 2 / Severidade Alta / Camada: front (regra)
Achados resolvidos: RN-08
Problema hoje: o aplicativo considera ocupados `['scheduled','ready','production']` (`src/features/jobs/hooks/useSchedulingConflicts.ts:35-43`; `src/components/dashboard/AlertScheduleModal.tsx:88-98`), enquanto o trigger do banco `check_job_overlap` considera **tudo que não está cancelado** (`origin/contexto:docs/contexto/supabase/functions/public/check_job_overlap__12ae32cb1ec02d01.sql:23-45`), inclusive OS já concluída. O usuário agenda sem aviso na tela e recebe `'Conflito de agendamento: A maquina % ja possui um job agendado entre % e % nesta data.'` ao salvar.
Causa raiz: a mesma regra foi escrita duas vezes com definições diferentes de "ocupa máquina".
Caminho recomendado: defina a lista única em `src/constants/index.ts` (onde os status já são constantes) e consuma nos dois pontos do aplicativo. Esta etapa alinha o aplicativo ao comportamento **atual do banco** (que é quem recusa), para o usuário ver o conflito antes de salvar; a correção do critério no banco é a etapa 053, feita depois, com decisão do dono sobre OS concluída ocupar ou não o horário.
Arquivos e objetos a tocar: `src/constants/index.ts`, `src/features/jobs/hooks/useSchedulingConflicts.ts`, `src/components/dashboard/AlertScheduleModal.tsx`.
Não tocar / armadilhas: não mude o trigger nesta etapa; não remova o aviso de conflito do aplicativo (é ele que evita a recusa no servidor).
Depende de: — · Libera: 053
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: tente agendar sobre o horário de uma OS concluída: a tela deve avisar do conflito antes de enviar, e nenhuma exceção do banco deve aparecer.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 053 — Decidir e corrigir, no banco, se OS concluída continua ocupando a máquina
Onda 2 / Severidade Média / Camada: banco (trigger)
Achados resolvidos: RN-08
Problema hoje: `check_job_overlap` bloqueia o horário para qualquer OS com `status != 'cancelled'` — ou seja, uma OS **concluída** segue reservando a máquina para sempre.
Causa raiz: filtro escrito como "tudo menos cancelado" em vez da lista de status que realmente ocupam.
Caminho recomendado: pergunte ao dono: ao reprogramar a mesma máquina no horário de uma OS já concluída, o sistema deve impedir? A resposta esperada é "não" (o trabalho terminou). Então ajuste o filtro para a mesma lista da etapa 052, por migration com `CREATE OR REPLACE FUNCTION`, mudando **apenas** a cláusula de status. Mantenha a mensagem de erro em português como está (o aplicativo a exibe).
Arquivos e objetos a tocar: nova migration redefinindo `public.check_job_overlap`.
Não tocar / armadilhas: o trigger é `BEFORE INSERT OR UPDATE` e roda em todo agendamento — um erro aqui bloqueia qualquer criação de OS; teste em banco descartável antes.
Depende de: 052, 003 · Libera: —
Risco e como reverter: médio. Reverter = restaurar a definição anterior (está no snapshot).
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: agendar no horário de uma OS concluída deve funcionar; no horário de uma OS em produção deve ser recusado. Registre os dois resultados.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 054 — Corrigir o tipo de técnica no esquema de validação de OS
Onda 2 / Severidade Média / Camada: front (validação)
Achados resolvidos: RN-09
Problema hoje: `src/features/jobs/types/job.schema.ts:15` exige `technique_id: z.string().uuid('Técnica é obrigatória')`, mas no banco `public.techniques.id` é do tipo **text** com valores em formato de slug (`'silk-textile'`, `'fiber-laser'` — `origin/contexto:docs/contexto/supabase/tables/public/techniques.md`). Como `jobsService.ts:43-50` valida **toda leitura** com esse esquema e cai num fallback silencioso (`logger.warn` e devolve a linha crua), a validação de leitura falha sempre e ninguém percebe.
Causa raiz: esquema escrito presumindo identificador em formato UUID.
Caminho recomendado: troque por `z.string().min(1, 'Técnica é obrigatória')`. É a correção de uma linha; o resto do esquema está correto. Verifique depois se o `logger.warn` do fallback para de aparecer — ele é parte do volume de registros de BD-02.
Arquivos e objetos a tocar: `src/features/jobs/types/job.schema.ts`.
Não tocar / armadilhas: não mude o tipo da coluna no banco (text é o certo aqui, e mudar afetaria todas as referências); não remova o fallback de leitura nesta etapa.
Depende de: — · Libera: 055
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: `npx vitest run src/features/jobs/services/jobsService.test.ts` passa; abra a lista de OS e confirme que não aparece mais aviso de validação no console.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 055 — Unificar os três esquemas concorrentes de OS
Onda 2 / Severidade Média / Camada: front (validação)
Achados resolvidos: RN-09
Problema hoje: existem três definições de validação para a mesma entidade: o canônico `src/features/jobs/types/job.schema.ts:9-32`, o local de criação `src/pages/NewJobPage.tsx:30-44` e o do detalhe `src/components/jobs/JobDetailsModal.tsx:53-61`. Regras divergem entre eles, e só o canônico é usado na leitura.
Causa raiz: cada tela declarou seu próprio esquema em vez de derivar do canônico.
Caminho recomendado: faça as duas telas derivarem do canônico (`jobFormSchema = jobSchema.pick({...})` / `.extend({...})`), que é o padrão correto já praticado em `src/features/packaging/types/packaging.schema.ts`, onde um esquema único serve formulário e validação. Faça **depois** da etapa 054, para não propagar o tipo errado. Compare campo a campo antes de unificar: onde a tela é mais exigente que o canônico, a diferença pode ser intencional — nesse caso mantenha via `.extend`, não apague.
Arquivos e objetos a tocar: `src/pages/NewJobPage.tsx`, `src/components/jobs/JobDetailsModal.tsx`, `src/features/jobs/types/job.schema.ts`.
Não tocar / armadilhas: não afrouxe validação de campo obrigatório para "unificar"; mudanças aqui afetam o formulário de criação, que é o fluxo de entrada do sistema.
Depende de: 054 · Libera: —
Risco e como reverter: médio. Reverter = voltar os esquemas locais.
Precisa de aprovação humana antes do merge: não
Como verificar: `npx vitest run src/features/jobs src/pages` passa; crie uma OS pelo formulário e edite outra pelo detalhe — ambos devem aceitar e recusar os mesmos valores (teste com técnica vazia e quantidade negativa).
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

---

## Onda 1 (continuação) — achados de segurança levantados na varredura de servidor

> Executar estas etapas **antes** das demais ondas: a ordem de execução é a da tabela de ondas, não a numérica.

### Etapa 056 — Tirar `user_roles` e a trilha de auditoria da lista de tabelas do túnel de banco
Onda 1 / Severidade Crítica / Camada: edge function (segurança)
Achados resolvidos: SEG-04
Problema hoje: `supabase/functions/external-db-bridge/index.ts` roda com a chave de serviço (`:241` `createClient(supabaseUrl, serviceRoleKey)`, portanto **sem RLS**), aceita as ações `insert`, `update`, `upsert` e `delete` (`:267-293`) sobre qualquer tabela de `ALLOWED_TABLES` (`:100-118`) — lista que inclui **`user_roles`**, **`audit_log`**, **`job_status_audit`** e **`security_events`** — e libera o acesso a quem tem papel `admin` **ou `manager`** (`:205`). O próprio arquivo admite a lacuna num comentário: "elevacao para AAL2 fica como [pendência]" (`:202-204`).
Causa raiz: um túnel genérico de banco com chave de serviço, cuja lista de tabelas foi montada por conveniência e inclui as tabelas que definem quem é quem e o que aconteceu.
Caminho recomendado: **remova** `user_roles`, `audit_log`, `job_status_audit` e `security_events` de `ALLOWED_TABLES` — é um diff de quatro linhas e fecha o caminho de escalada (um gerente inserindo a si mesmo como `admin`) e o de adulteração da trilha (a policy `Deny all changes to audit logs` não protege nada quando a chamada usa a chave de serviço). Em seguida, restrinja as ações de escrita a `admin` (mantendo leitura para `manager`), porque mesmo nas tabelas restantes um túnel sem RLS não deve ficar com dois papéis. Verifique antes quem chama a função: `grep -rn "external-db-bridge" src/` hoje não retorna nada (a função consta como órfã em `origin/contexto:docs/contexto/codigo/baseline.json`), então o risco de quebrar fluxo é baixo — mas confirme antes de mexer. O atalho tentador é "exigir AAL2 e pronto": AAL2 não impede o gerente de se promover, só exige que ele esteja com segundo fator.
Arquivos e objetos a tocar: `supabase/functions/external-db-bridge/index.ts` (apenas `ALLOWED_TABLES` e o gate de papel).
Não tocar / armadilhas: não remova a validação de `match` obrigatório em update/delete (`:224-233`) — é o que impede apagar tabela inteira; não mexa em `ALLOWED_RPCS` nesta etapa.
Depende de: — · Libera: 057
Risco e como reverter: baixo; reverter = recolocar as entradas.
Precisa de aprovação humana antes do merge: sim (mudança de autorização em servidor)
Como verificar: com um JWT de `manager`, chamar a função com `{"action":"insert","table":"user_roles","params":{"data":{...}}}` deve responder **400** com "table not allowed"; a mesma chamada em `jobs` com `select` deve continuar funcionando. Registre os dois códigos.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 057 — Decidir se o túnel genérico de banco deve continuar existindo
Onda 1 / Severidade Alta / Camada: edge function (arquitetura)
Achados resolvidos: SEG-04, DEP-02
Problema hoje: `external-db-bridge` está publicada e ativa (`origin/contexto:docs/contexto/supabase/edge-functions.md`, versão 136) e **nenhum arquivo do aplicativo a chama**. É um endereço público que executa consulta e escrita arbitrárias (dentro da lista) com a chave de serviço.
Causa raiz: integração planejada que não foi usada, mantida publicada.
Caminho recomendado: apresente ao dono: se nenhum sistema externo depende dela, o caminho mais seguro é desativá-la pelo painel (mantendo o código no repositório para uso futuro). Se houver dependência externa, então ela precisa de credencial própria por consumidor e lista de tabelas por consumidor — não um gate por papel de usuário. Não decida isso sozinho: a função tem cara de ponte para o ERP.
Arquivos e objetos a tocar: configuração da função no painel; `supabase/config.toml` se a decisão for remover do deploy.
Não tocar / armadilhas: desativar função publicada é operação de produção; registre o estado anterior.
Depende de: 056 · Libera: —
Risco e como reverter: baixo; reverter = reativar.
Precisa de aprovação humana antes do merge: sim (infraestrutura)
Como verificar: `curl` na URL da função deve responder 404 (desativada) ou continuar 401 sem credencial (se mantida). Registre a decisão do dono e o resultado.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 058 — Impedir que qualquer pessoa bloqueie a conta de um operador
Onda 1 / Severidade Crítica / Camada: edge function (segurança)
Achados resolvidos: SEG-05
Problema hoje: em `supabase/functions/check-login-lockout/index.ts`, a ação `record_success` exige prova de posse do e-mail (`:326-339`: valida o JWT e compara `user.email` com o e-mail enviado, com o comentário "otherwise anyone could call action=record_success for any email to reset their own (or a stranger's) failed-attempt counter"), mas a ação `record_failure` (`:442-470`) **não exige nada além do e-mail**: incrementa o contador e, ao atingir o limite, grava `locked_until` e registra evento `account_locked`. A única barreira é o 429 por IP acima de 20 tentativas (`:436-441`).
Causa raiz: o mesmo raciocínio de prova de posse foi aplicado a uma ação e esquecido na outra — e a ação esquecida é a destrutiva.
Caminho recomendado: o registro de falha de senha não deveria vir do cliente: ele é um fato que só o servidor de autenticação conhece. Use o gancho de autenticação do Supabase ("password verification attempt hook"), que roda no servidor a cada tentativa de senha e é o lugar natural para contar falhas; a função passa a ser chamada pelo gancho, não pelo navegador. Se o gancho não estiver disponível no plano, a mitigação é exigir no `record_failure` um elemento que só quem tentou de verdade possui (por exemplo, o identificador da tentativa devolvido pelo `check`, guardado no servidor com validade curta) e endurecer o limite por IP. Não deixe como está, e não "resolva" aumentando o limite de tentativas: isso só aumenta o custo do ataque, não o impede.
Arquivos e objetos a tocar: `supabase/functions/check-login-lockout/index.ts`; configuração de ganchos de autenticação no projeto; `src/features/auth/` no ponto que chama `record_failure`.
Não tocar / armadilhas: não remova o bloqueio por tentativas (é proteção real contra força bruta); cuidado para não impedir o bloqueio legítimo ao endurecer a verificação — teste os dois lados.
Depende de: — · Libera: —
Risco e como reverter: médio (toca o caminho de login). Reverter = voltar a função.
Precisa de aprovação humana antes do merge: sim (segurança e configuração de infraestrutura)
Como verificar: chame `record_failure` cinco vezes para um e-mail de teste **sem** credencial de tentativa: a conta **não** deve ficar bloqueada e a resposta deve ser de recusa; depois erre a senha cinco vezes pela tela de login e confirme que o bloqueio acontece. Registre os dois resultados.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 059 — Corrigir o cálculo de ranking que falha em toda execução
Onda 2 / Severidade Alta / Camada: edge function
Achados resolvidos: EDG-01
Problema hoje: `supabase/functions/calculate-rankings/index.ts:251-257` grava com `upsert(rankings, { onConflict: "operator_id,ranking_type,period_start" })` e um comentário afirmando que existe uma restrição única nessas três colunas. No banco, a restrição é de **quatro** colunas: `UNIQUE (operator_id, ranking_type, period_start, period_end)` (`origin/contexto:docs/contexto/supabase/tables/public/operator_rankings.md`). O PostgREST responde erro de restrição inexistente e a função lança (`:258-262`), então o ranking **nunca** é recalculado.
Causa raiz: `onConflict` com lista de colunas diferente da restrição real — a mesma classe de defeito já catalogada no projeto em `docs/pendencias/F-016-troca-de-papel-quebrada.md:17`.
Caminho recomendado: acrescente `period_end` ao `onConflict`. Uma linha, sem DDL. Corrija também o comentário acima, que está errado e induziria o próximo leitor ao mesmo engano. Não crie restrição nova no banco para casar com o código: a restrição de quatro colunas é a correta (um ranking é de um período fechado).
Arquivos e objetos a tocar: `supabase/functions/calculate-rankings/index.ts`.
Não tocar / armadilhas: depois desta correção a função passa a chegar ao bloco de limpeza, que tem outro defeito — faça a etapa 060 na sequência, senão rankings obsoletos ficam acumulados.
Depende de: 003 · Libera: 060
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: invoque a função e confirme resposta 200 com linhas gravadas em `operator_rankings`; antes, a mesma chamada devolvia 500. Cole as duas respostas.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 060 — Fazer a limpeza de rankings obsoletos realmente apagar algo
Onda 2 / Severidade Média / Camada: edge function
Achados resolvidos: EDG-02
Problema hoje: as linhas são gravadas com `period_end: periodEnd.toISOString()` (`supabase/functions/calculate-rankings/index.ts:239`), e a limpeza filtra `.gte("period_start", periodStart).lt("period_end", periodEnd)` (`:268-273`) — a condição `period_end < periodEnd` é falsa justamente para as linhas do período corrente, então nada é removido.
Causa raiz: filtro de limpeza escrito com comparação estrita sobre o mesmo valor gravado.
Caminho recomendado: troque `.lt("period_end", ...)` por `.eq("period_end", ...)`, alinhando com a restrição única de quatro colunas. Faça depois da etapa 059 — hoje este defeito está escondido porque a função morre antes de chegar aqui.
Arquivos e objetos a tocar: `supabase/functions/calculate-rankings/index.ts`.
Não tocar / armadilhas: não amplie o intervalo da limpeza (apagaria histórico de períodos anteriores, que alimenta a tela de evolução).
Depende de: 059 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: rode a função duas vezes seguidas e confirme que a contagem de linhas do período não dobra. Registre as duas contagens.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 061 — Deixar um único critério de papel no cálculo de ranking
Onda 2 / Severidade Média / Camada: edge function (autorização)
Achados resolvidos: EDG-03
Problema hoje: a função verifica papel duas vezes com listas diferentes: `supabase/functions/calculate-rankings/index.ts:58-59` aceita `['admin','manager','coordinator']` **sem** filtrar `is_active`, e `:93-104` exige `is_active = true` com outra lista. Um gerente passa no primeiro e pode ser recusado no segundo; um papel revogado (inativo) passa no primeiro.
Causa raiz: duas gerações de verificação coexistindo na mesma função.
Caminho recomendado: use o middleware comum que o projeto já tem — `authenticate()` + `requireRole(auth.ctx, [...])` de `supabase/functions/_shared/auth.ts` — e apague os dois blocos. Decida com o dono se gerente pode recalcular ranking; na dúvida, mantenha a lista mais restritiva das duas (a segunda). O filtro `is_active` tem de estar presente: sem ele, papel revogado continua valendo, o que é exatamente o problema que a PR #256 tenta resolver no aplicativo.
Arquivos e objetos a tocar: `supabase/functions/calculate-rankings/index.ts`.
Não tocar / armadilhas: não mude a assinatura da função nem o corpo da resposta (a tela de gamificação consome).
Depende de: 059 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: chamada com papel `operator` → 403; com `coordinator` ativo → 200; com `coordinator` marcado `is_active=false` → 403. Registre os três.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 062 — Resolver a autenticação da API do ERP, que aponta para uma tabela inexistente
Onda 2 / Severidade Alta / Camada: edge function
Achados resolvidos: EDG-04
Problema hoje: `supabase/functions/erp-api/index.ts:45-53` autentica consultando `erp_api_keys` por `key_hash`; essa tabela **não existe** no banco (`git show origin/contexto:docs/contexto/supabase/tables.md | grep -c erp_api_keys` → 0). Toda chamada com `x-api-key` cai no `return false` (`:55`). A função está publicada e documentada em `docs/operacoes/openapi-edge-functions.yaml:33`.
Causa raiz: metade do recurso (função + documentação) entregue sem a tabela de chaves.
Caminho recomendado: pergunte ao dono se existe (ou vai existir) um ERP consumindo esta API. Se **sim**: crie a tabela por migration (`id`, `key_hash`, `is_active`, `expires_at`, `scopes`, `last_used_at`) com RLS que só permita acesso pela chave de serviço, seguindo o fluxo de DDL de `docs/agentes/banco.md`. Se **não**: remova o caminho `x-api-key` e o texto correspondente da documentação, deixando explícito que só JWT é aceito — assim ninguém tenta integrar com um mecanismo que não existe. Não deixe o caminho morto no meio: hoje a função promete uma forma de autenticação que sempre recusa.
Arquivos e objetos a tocar: `supabase/functions/erp-api/index.ts`; nova migration (se criar a tabela); `docs/operacoes/openapi-edge-functions.yaml`.
Não tocar / armadilhas: não guarde a chave em texto puro (o código já trabalha com `key_hash` — mantenha); se criar a tabela, a RLS deve negar tudo para `authenticated`.
Depende de: 003 · Libera: —
Risco e como reverter: baixo (hoje nada funciona por esse caminho).
Precisa de aprovação humana antes do merge: sim (DDL em produção ou remoção de recurso documentado)
Como verificar: se criada, uma chamada com chave válida responde 200 e uma com chave inválida 401; se removida, a chamada com `x-api-key` responde 401 com mensagem dizendo que só JWT é aceito.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 063 — Agendar de verdade as rotinas que hoje não têm quem as dispare
Onda 2 / Severidade Alta / Camada: banco (cron)
Achados resolvidos: EDG-05
Problema hoje: o banco tem **7** agendamentos (`origin/contexto:docs/contexto/supabase/cron.md`): `snapshot-cron-health-15min`, `cron-alert-email-every-30min`, `health-monitor-every-5min`, `purge-old-logs-daily`, `rollup-cron-p95-daily`, `auto-reassign-packaging-30min` e `auto-promote-jobs-fallback`. Não há agendamento para `backup-scheduler`, `cleanup-security-logs`, `calculate-rankings`, `calculate-inventory-intelligence`, `daily-maintenance-summary`, `tpm-notifications` nem `metrics-collector` — e nenhuma dessas é chamada pelo aplicativo (`origin/contexto:docs/contexto/codigo/baseline.json` → `edges_orfas`). Documentos de operação (`docs/operacoes/RETENCAO-DE-LOGS.md:30-35`, `docs/operacoes/LGPD.md:14`) descrevem rotinas que, na prática, não rodam.
Causa raiz: funções criadas para rodar por agendamento, com o agendamento nunca versionado.
Caminho recomendado: primeiro decida com o dono **quais** dessas rotinas o negócio realmente quer (backup e limpeza de logs de segurança têm implicação legal; ranking e inteligência de estoque são de produto). Para as escolhidas, versione o agendamento em migration com `cron.schedule` + `net.http_post`, no padrão já aplicado em `supabase/migrations/20261001143100` para `auto-promote-jobs-fallback`. Faça **depois** de provisionar os segredos (etapas 013 e 019), senão a rotina passa a rodar e falhar em silêncio. Para as recusadas, remova a promessa dos documentos de operação — documento que descreve rotina inexistente é pior que documento ausente.
Arquivos e objetos a tocar: nova migration de agendamentos; `docs/operacoes/RETENCAO-DE-LOGS.md`, `docs/operacoes/LGPD.md` (ajuste do texto).
Não tocar / armadilhas: o comando do agendamento carrega o cabeçalho com o segredo — não imprima o comando em PR nem em log; não agende duas rotinas que escrevem na mesma tabela no mesmo minuto.
Depende de: 013, 019, 003 · Libera: —
Risco e como reverter: médio (rotinas passam a escrever). Reverter = `cron.unschedule`.
Precisa de aprovação humana antes do merge: sim (DDL em produção e custo)
Como verificar: depois do primeiro disparo, `cron-runs.md` da branch `contexto` deve mostrar a execução com `succeeded`; confirme também o efeito (linha nova em `backup_logs`, por exemplo). Registre os dois.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 064 — Fazer a sincronização do CRM atualizar os campos do pedido, não só o status
Onda 3 / Severidade Média / Camada: edge function (integração)
Achados resolvidos: EDG-06
Problema hoje: em `supabase/functions/bitrix24-sync/index.ts:746-755`, quando a OS já existe, a atualização grava **apenas** `status` e `updated_at` e retorna sucesso; os campos mapeados montados logo abaixo (`:764-776`: quantidade, cliente, produto, data prevista, prioridade) são ignorados. As duas chamadas não verificam o erro, então uma gravação recusada é reportada como sucesso e registrada assim em `bitrix24_sync_history`.
Causa raiz: o caminho de atualização foi escrito antes do mapeamento de campos e nunca o reaproveitou; e o resultado da gravação não é checado.
Caminho recomendado: reaproveite o `jobData` já montado também no ramo de atualização, com a lista de campos que o negócio aceita sobrescrever (pergunte ao dono: quantidade e data provavelmente sim; cliente e produto talvez não, para não desfazer correção manual). Desestruture `{ error }` nas duas chamadas e devolva `{ error: error.message }` para que `logSyncHistory` classifique como erro. O padrão de checagem está nas demais funções do mesmo arquivo.
Arquivos e objetos a tocar: `supabase/functions/bitrix24-sync/index.ts`.
Não tocar / armadilhas: faça depois da etapa 017 (decisão sobre a integração) — se o CRM for desativado, esta etapa não se aplica; não mude o mapeamento de campos de entrada.
Depende de: 017 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: dispare uma atualização de negócio no Bitrix de teste alterando quantidade e confirme que a OS no sistema reflete a nova quantidade e que `bitrix24_sync_history` registra sucesso; force um erro (quantidade negativa) e confirme registro como erro.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 065 — Validar o alvo e limitar o uso na alteração de operador
Onda 3 / Severidade Média / Camada: edge function
Achados resolvidos: EDG-07
Problema hoje: `supabase/functions/update-operator/index.ts:307-314` lê `operator_id`, `full_name` e `phone` do corpo com a única checagem `if (!operator_id)`, sem validar formato e **sem confirmar que o alvo é um operador**; em `:326-333` atualiza `profiles` com a chave de serviço. Não há limite de chamadas, ao contrário de `create-operator` (`:161-173`), que já usa `checkRateLimit`.
Causa raiz: validação de entrada e limite de uso implementados em uma função da dupla e esquecidos na outra.
Caminho recomendado: valide com Zod (`z.string().uuid()`) usando o esquema compartilhado de `supabase/functions/_shared/validation.ts`; antes do update, confirme que o alvo tem papel `operator` ativo em `user_roles`; e aplique `checkRateLimit` com o mesmo teto de `create-operator:162-169`. São três acréscimos pequenos, todos com padrão pronto no próprio repositório.
Arquivos e objetos a tocar: `supabase/functions/update-operator/index.ts`.
Não tocar / armadilhas: não altere o gate de papel de quem chama (quem edita operador é coordenador/gestor); não bloqueie a edição do próprio perfil se o sistema usar esta função para isso — confira antes.
Depende de: — · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: chamada com `operator_id` inválido → 400; com id de um gestor (não operador) → 403; com operador válido → 200 e perfil atualizado. Registre os três.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 066 — Parar de aprovar itens de segurança sem verificar nada
Onda 1 / Severidade Alta / Camada: front (painel de segurança)
Achados resolvidos: UI-09
Problema hoje: `src/features/admin/components/security/SecurityOverviewCard.tsx:52-59,68-83,87-97` declara três verificações com `status: 'pass'` **fixo** — "Senha Forte / Senha segura definida", "Email Verificado / Email confirmado" e outra — somando pontos garantidos e um score mínimo de 60 para qualquer conta, sem consultar nada.
Causa raiz: painel construído com valores de maquete e publicado como diagnóstico.
Caminho recomendado: troque os três `status: 'pass'` fixos por leitura real onde ela existe e por `'warn'` com o texto "não verificado" onde não existe. O e-mail sai de `user.email_confirmed_at`, já disponível via `useAuth()` (`src/pages/SecurityDashboard.tsx` já importa). Para "senha forte" não há como saber no navegador: deve virar "não verificado" (ou ser removido). Ajuste a pontuação para não somar pontos de item não verificado — um painel que dá 60 de score a quem não configurou nada é pior que nenhum painel.
Arquivos e objetos a tocar: `src/features/admin/components/security/SecurityOverviewCard.tsx`.
Não tocar / armadilhas: não invente nova verificação de servidor aqui; se quiser medir força de senha de verdade, isso é etapa própria e exige decisão.
Depende de: — · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: com uma conta cujo e-mail não está confirmado, o item deve aparecer como pendente e o score deve cair. Registre o score antes e depois.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 067 — Tirar do ar os indicadores inventados do quiosque de fábrica
Onda 2 / Severidade Alta / Camada: front (quiosque)
Achados resolvidos: UI-10
Problema hoje: `src/components/kiosk/KioskMode.tsx:185-205` mostra quatro números fixos no código — "OEE Estimado 94.2%", "Consumo (kWh) 1.2", "Tempo Médio 42s", "Previsão Fim 16:45" — numa tela pendurada no chão de fábrica, que a equipe usa para decidir ritmo de produção.
Causa raiz: tela de demonstração promovida a ferramenta de operação.
Caminho recomendado: **antes de qualquer alteração, confira a PR #259** ("quiosque de fábrica mostra métricas reais em vez de números fabricados"), que toca exatamente `src/components/kiosk/KioskMode.tsx` e `src/pages/KioskPage.tsx` e está aberta. Se os arquivos estiverem nela, **pare**: registre no progresso que esta etapa é coberta pela PR #259 e avise o dono para revisá-la, em vez de abrir PR concorrente (regra 3 do fluxo de git deste repositório). Só se a PR tiver sido fechada sem merge é que você implementa: nesse caso, substitua cada número por dado real (OEE do `useKPIs`, consumo do painel de energia) e, onde não houver fonte, mostre estado vazio em vez de número.
Arquivos e objetos a tocar: `src/components/kiosk/KioskMode.tsx` (só se a PR #259 não estiver mais aberta).
Não tocar / armadilhas: não mergeie nem altere a PR #259 (branch de outro agente, somente leitura).
Depende de: — · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não (mas requer a verificação da PR #259 antes de começar)
Como verificar: ou o registro de que a PR #259 cobre a etapa, ou a tela do quiosque mostrando valores que mudam conforme o banco (compare dois horários).
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 068 — Parar de mostrar 92,4% de eficiência quando não há dado
Onda 2 / Severidade Alta / Camada: front (painel)
Achados resolvidos: UI-11
Problema hoje: `src/pages/DigitalTwin.tsx:28` usa `const oee = kpiData?.productivityByTechnique?.[0]?.occupancyRate || 92.4;`, renderizado sob o título "Eficiência Global (OEE)" com o veredito `{oee > 90 ? 'Excelente' : 'Abaixo da Meta'}` (`:92-94`). Sem dado, a tela afirma "Excelente". A mesma tela rotula contagem de OS como "Frota Ativa" (`:50-52`) e exibe alertas fixos (`:120-154`).
Causa raiz: valor de reserva escolhido para "ficar bonito" em vez de estado vazio.
Caminho recomendado: troque `|| 92.4` por `?? null` e renderize estado vazio quando não houver dado — o padrão honesto já existe em `src/components/dashboard/PredictiveAnalyticsWidget.tsx:47-51`. Corrija o rótulo "Frota Ativa" para o que o número realmente é, e trate os alertas fixos como o item 069. Não invente cálculo novo de OEE aqui: existe `useKPIs` e há uma tela dedicada (`/oee`).
Arquivos e objetos a tocar: `src/pages/DigitalTwin.tsx`.
Não tocar / armadilhas: não mexa em `src/features/analytics/hooks/useKPIs.ts` nesta etapa; `|| 0` também não serve (zero também é afirmação).
Depende de: — · Libera: 069
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: com a base sem dado de ocupação, a tela deve mostrar "sem dado" em vez de 92,4% e não deve exibir veredito. Registre a tela.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 069 — Remover os alertas fixos do Gêmeo Digital
Onda 4 / Severidade Média / Camada: front (painel)
Achados resolvidos: UI-11
Problema hoje: `src/pages/DigitalTwin.tsx:120-154` exibe alertas escritos no código, ao lado de indicadores que vêm do banco — o usuário não tem como distinguir.
Causa raiz: blocos de maquete deixados na tela.
Caminho recomendado: remova os blocos. Se o dono quiser manter a área, ligue-a à fonte real de alertas que já existe (`src/features/notifications/` / tabela `maintenance_alerts`), mas isso é etapa de funcionalidade e precisa de decisão — nesse caso registre em "Achados novos" e apenas remova agora.
Arquivos e objetos a tocar: `src/pages/DigitalTwin.tsx`.
Não tocar / armadilhas: não apague a seção inteira da tela se ela contiver também dado real — confira cada bloco.
Depende de: 068 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: a tela não exibe mais alerta sem origem no banco. Liste os blocos removidos.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 070 — Calcular a projeção de prazo do BI com dados reais
Onda 2 / Severidade Alta / Camada: front (análise)
Achados resolvidos: UI-12
Problema hoje: `src/features/analytics/components/bi/BIAIInsights.tsx:57-60` projeta prazo com duas constantes inventadas: `const avgPiecesPerHour = 52; const totalRemainingPieces = biMetrics.toDoJobs * 85;` e divide por `7.5` horas de jornada — o resultado é exibido como previsão de dias para zerar a fila.
Causa raiz: projeção construída com números de exemplo.
Caminho recomendado: some `quantity` das OS pendentes (a lista já está disponível em `biMetrics.periodJobsList`, ver `src/pages/BIDashboard.tsx:175`) e derive a cadência da produção concluída no período em vez da constante. Se não houver histórico suficiente para a cadência, mostre "sem base para projeção" — é melhor do que um número que o gestor vai usar para prometer prazo ao cliente.
Arquivos e objetos a tocar: `src/features/analytics/components/bi/BIAIInsights.tsx`.
Não tocar / armadilhas: não mude o visual do cartão; a jornada de 7,5 horas deve sair de configuração de negócio se existir (`business_config`) — verifique antes de manter a constante.
Depende de: — · Libera: 071
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: compare a projeção com um cálculo manual sobre as OS pendentes do período; os números devem coincidir. Mostre a conta.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 071 — Tirar a eficiência fixa de 95% dos dados do BI e do arquivo exportado
Onda 3 / Severidade Média / Camada: front (dados de relatório)
Achados resolvidos: UI-13
Problema hoje: `src/pages/BIDashboard.tsx:175` injeta `efficiency: '95%'` em **todas** as OS (`periodJobsList: filteredJobs.map(j => ({ ...j, efficiency: '95%' }))`) e `:168-169` fixa `avgEfficiency: '95%'` e `lossImpact: periodLostPieces * 15`. Esse array inteiro vai para a exportação (`src/features/admin/hooks/useBIExport.ts:45,64-85`), ou seja, o número falso sai em planilha.
Causa raiz: campo de exemplo adicionado ao objeto de dados em vez de calculado.
Caminho recomendado: remova `efficiency: '95%'` da linha 175 (os consumidores de tela recalculam) e remova `avgEfficiency`/`lossImpact` fixos das linhas 168-169 junto com as colunas correspondentes na exportação. O multiplicador 15 de `lossImpact` é um custo por peça: se o negócio quiser essa conta, o valor deve vir de `business_config`, não do código — registre isso em "Achados novos" se o dono quiser manter a coluna.
Arquivos e objetos a tocar: `src/pages/BIDashboard.tsx`, `src/features/admin/hooks/useBIExport.ts`.
Não tocar / armadilhas: não remova colunas da exportação sem conferir quem usa a planilha; confirme com o dono se a coluna sai ou vira "não calculado".
Depende de: 070 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: exporte o relatório e confirme que nenhuma linha traz 95% fixo. Anexe a primeira linha do arquivo.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 072 — Corrigir o filtro por Studio do BI, que aponta para técnicas inexistentes
Onda 3 / Severidade Alta / Camada: front (filtro)
Achados resolvidos: UI-14
Problema hoje: `src/pages/BIDashboard.tsx:91-97` mapeia Studios para identificadores de técnica (`'Studio Beta': ['uv-print','sublimation']`, etc.) que **não existem** entre as técnicas semeadas no banco (`origin/contexto:docs/contexto/supabase/tables/public/techniques.md` — os identificadores reais são slugs como `silk-textile`, `fiber-laser`). O mesmo de-para está duplicado em `src/constants/biConstants.ts:34-47` e usado em `FuturisticBI.tsx:86-90,110-119`. Selecionar "Studio Beta" ou "Studio Gamma" zera a tela.
Causa raiz: de-para escrito a partir de nomes imaginados, duplicado em dois arquivos.
Caminho recomendado: confirme com o dono se a segmentação por Studio existe no negócio. Se sim, corrija o de-para para os identificadores reais e deixe **um** único lugar (`src/constants/biConstants.ts`), consumido pelas três telas. Se não, remova o filtro das três telas. Não "resolva" criando técnicas novas no banco para casar com o código.
Arquivos e objetos a tocar: `src/constants/biConstants.ts`, `src/pages/BIDashboard.tsx`, `src/features/analytics/components/bi/FuturisticBI.tsx`.
Não tocar / armadilhas: não altere a tabela `techniques`; confira os identificadores reais com `git show origin/contexto:docs/contexto/supabase/tables/public/techniques.md`.
Depende de: — · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: selecione cada Studio e confirme que a tela mostra OS correspondentes (ou que o filtro não existe mais). Liste os identificadores usados.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 073 — Resolver o painel de "IA" que inventa diagnósticos com nome de operador
Onda 4 / Severidade Alta / Camada: front
Achados resolvidos: UI-15
Problema hoje: `src/components/operators/AIWorkforceAdvisor.tsx:7-32` traz recomendações escritas no código, com nome próprio: "O operador Ricardo Silva demonstra alta aptidão em Laser. Sugerimos certificação em Gravação UV..." e "alocação de 3 operadores extras na Sexta-feira...". O componente é exibido em `src/pages/OperatorProductivityPage.tsx:137`, e blocos equivalentes aparecem em `src/pages/LogisticsPage.tsx:379-384,396-404`.
Causa raiz: maquete de apresentação deixada em telas de uso.
Caminho recomendado: duas saídas, nesta ordem de preferência: (a) remover os blocos das páginas — é código de maquete, não funcionalidade pela metade; (b) se o dono quiser manter como vitrine, aplicar `DemoDataBadge` (`src/components/ui/demo-data-badge.tsx`, que já existe exatamente para isso) deixando explícito na tela que é exemplo. Nunca deixe como está: há nome de pessoa num diagnóstico inventado, o que pode gerar conversa de desempenho baseada em nada.
Arquivos e objetos a tocar: `src/pages/OperatorProductivityPage.tsx`, `src/pages/LogisticsPage.tsx`, e `src/components/operators/AIWorkforceAdvisor.tsx` (se a opção for remover, exclua também o componente, que não terá outro uso).
Não tocar / armadilhas: confira se `AIWorkforceAdvisor` é usado em outra tela antes de apagar (`grep -rn "AIWorkforceAdvisor" src/`).
Depende de: — · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: a tela de produtividade não exibe mais recomendação sem origem, ou exibe com o selo de exemplo. Registre qual opção o dono escolheu.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 074 — Decidir o destino do painel de Qualidade de Código, hoje inteiramente fixo
Onda 4 / Severidade Média / Camada: front
Achados resolvidos: UI-16
Problema hoje: `src/features/admin/hooks/useCodeQualityMetrics.ts:69-81,114,155-172` devolve listas e números escritos no código, com comentários que já não valem: "No test files currently exist in the project" (o repositório tem 124 arquivos de teste) e `const HOOKS_WITH_TESTS: string[] = []`. A rota `/code-quality` (`src/routes/AppRoutes.tsx:263`) publica isso como painel.
Causa raiz: painel que depende de informação do repositório, montado com valores fixos porque o navegador não tem acesso a ela.
Caminho recomendado: esses números não são obteníveis no navegador. Duas saídas: (a) remover a rota e o painel por ora; (b) publicar um artefato JSON gerado no CI (o repositório já gera métricas em `scripts/check-any-baseline.mjs` e `graphify`) e fazer o painel ler esse arquivo. (a) é diff pequeno e honesto; (b) é funcionalidade nova e precisa de decisão do dono. Não tente "estimar" as métricas no cliente.
Arquivos e objetos a tocar: `src/routes/AppRoutes.tsx`, `src/pages/CodeQualityDashboard.tsx`, `src/features/admin/hooks/useCodeQualityMetrics.ts` (conforme a opção).
Não tocar / armadilhas: se remover a rota, remova também a entrada no menu, senão vira link quebrado (ver NAV-01).
Depende de: — · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: a rota deixa de existir (404 do app) ou o painel passa a refletir o artefato do CI. Registre a opção.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 075 — Tirar os indicadores de desempenho fixos do painel de telemetria
Onda 4 / Severidade Média / Camada: front
Achados resolvidos: UI-17
Problema hoje: `src/pages/AdminTelemetriaPage.tsx:495-510` mostra "LCP 1.2s", "FID 12ms", "CLS ..." como valores fixos, e o próprio texto da tela afirma que são amostras reais.
Causa raiz: bloco de exemplo com texto de procedência.
Caminho recomendado: o projeto já tem `web-vitals` como dependência: ou ligue o bloco à coleta real (há tabela de telemetria no banco — `telemetry_traces`), ou remova o bloco e a frase de procedência. Se mantiver como vitrine, aplique `DemoDataBadge`, como já faz `src/components/technical-assistant/TechnicalTelemetryPanel.tsx:47-51` para o mesmo problema. A frase que afirma procedência é o pior pedaço: remova-a de qualquer forma.
Arquivos e objetos a tocar: `src/pages/AdminTelemetriaPage.tsx`.
Não tocar / armadilhas: não remova o resto da página (há dado real de telemetria nela).
Depende de: — · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: a tela não afirma mais que valores fixos são amostras reais. Registre o trecho final.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 076 — Corrigir o gráfico do simulador, que mostra zero em todos os cenários
Onda 4 / Severidade Média / Camada: front
Achados resolvidos: UI-18
Problema hoje: `src/pages/SimulationDashboard.tsx:10-11` avalia `generateScenarios()` uma vez na carga do módulo e `:44-48` agrega os resultados por um identificador gerado a cada execução (`src/lib/simulation.ts:58-87,94`), de modo que a agregação nunca casa e o gráfico exibe 0 aprovados e 0 falhas para todos os cenários, independentemente do que a simulação devolveu.
Causa raiz: agregação por identificador instável.
Caminho recomendado: agregue pelo cenário base: inclua um campo estável no resultado (o `base.id` já conhecido em `src/lib/simulation.ts:82`) e agrupe o gráfico por ele. Alternativa equivalente: fazer `runMassiveSimulation` devolver o agrupamento pronto. Não mude a lógica da simulação em si.
Arquivos e objetos a tocar: `src/lib/simulation.ts`, `src/pages/SimulationDashboard.tsx`.
Não tocar / armadilhas: `generateScenarios()` na carga do módulo também torna o conjunto fixo por sessão — se o dono quiser variação, é outra etapa.
Depende de: — · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: rode a simulação e confirme que o gráfico mostra contagens diferentes de zero e coerentes com o resumo numérico da mesma tela.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

---

## Onda 5 — Robustez: erros, estados e concorrência

### Etapa 077 — Fazer a falha de leitura de dados aparecer para o usuário
Onda 5 / Severidade Alta / Camada: front (estado)
Achados resolvidos: UI-19
Problema hoje: 39 das 56 páginas não leem o estado de erro das consultas e não existe tratamento global: `src/lib/queryConfig.ts:146-159` cria o cliente de consultas **sem** `queryCache` com `onError`. Hooks até expõem o erro — `src/features/jobs/hooks/useSchedulingData.ts:295` devolve `error: jobsQuery.error || techniquesQuery.error || machinesQuery.error` — mas nenhum consumidor o usa (`grep -rn "useSchedulingData" src/ | grep error` não retorna nada); `src/pages/AlertsDashboard.tsx:38` descarta o erro ao desestruturar.
Causa raiz: o projeto tratou erro de **mutação** (há `createMutationErrorHandler`) e nunca tratou erro de **leitura**.
Caminho recomendado: comece pela camada global, que cobre as 39 páginas de uma vez: em `createQueryClient()` (`src/lib/queryConfig.ts:146`), adicione `queryCache: new QueryCache({ onError })` reaproveitando `createMutationErrorHandler` de `src/lib/errorHandling.ts` — é o mesmo padrão já usado nas mutações (`src/features/jobs/hooks/useJobs.ts:68`), então a mensagem sai no formato que o usuário já conhece. Só depois, nas páginas de decisão (etapas 078-080), acrescente o estado de erro na própria tela. Não adicione `onError` consulta por consulta: são 196 hooks.
Arquivos e objetos a tocar: `src/lib/queryConfig.ts`.
Não tocar / armadilhas: cuidado com avalanche de avisos quando várias consultas falham juntas (sessão expirada) — reaproveite a deduplicação do tratador existente ou limite por código de erro; faça depois da etapa 045, senão cada falha vira quatro avisos por causa das repetições.
Depende de: 045 · Libera: 078, 079, 080
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: desligue a rede e abra uma tela de painel: deve aparecer aviso de falha. Com a rede ligada, nenhum aviso. Registre as duas situações.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 078 — Mostrar erro e opção de tentar de novo nas telas de operação
Onda 5 / Severidade Alta / Camada: front
Achados resolvidos: UI-19
Problema hoje: nas telas que a fábrica usa para decidir o que produzir (`src/pages/KanbanBoard.tsx`, `src/pages/PendingQueue.tsx`, `src/pages/OperatorView.tsx`, `src/pages/DailyCalendar.tsx`, `src/pages/WeeklyCalendar.tsx`, `src/pages/MonthlyCalendar.tsx`), uma falha de leitura resulta em tela vazia — indistinguível de "não há OS hoje".
Causa raiz: estado de erro não representado na interface.
Caminho recomendado: em cada uma dessas seis telas, leia o estado de erro do hook (os hooks já o expõem) e renderize um bloco de erro com ação de tentar novamente, usando o componente de estado vazio/erro que já existe (`src/components/ui/empty-state.tsx`) no formato de `src/pages/OperatorView.tsx:169-170`. Uma tela vazia por falha de rede faz o operador concluir que não há trabalho — é o pior desfecho possível nessas telas.
Arquivos e objetos a tocar: as seis páginas listadas.
Não tocar / armadilhas: não troque o estado vazio legítimo pelo de erro; são dois estados diferentes e ambos precisam existir.
Depende de: 077 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: com a rede desligada, cada uma das seis telas mostra erro com botão de recarregar; com dados vazios, mostra "nada para hoje". Registre as duas telas de um exemplo.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 079 — Mostrar erro nos painéis de gestão
Onda 5 / Severidade Média / Camada: front
Achados resolvidos: UI-19
Problema hoje: mesmo defeito da etapa 078 nos painéis de decisão gerencial: `src/pages/AlertsDashboard.tsx:38` (descarta o erro na desestruturação), `src/pages/MachineComparisonPage.tsx:29`, `src/pages/OperatorHistoryPage.tsx:44`, `src/pages/KPIDashboard.tsx`, `src/pages/OEEDashboard.tsx`, `src/pages/ExecutiveDashboard.tsx`.
Causa raiz: idem.
Caminho recomendado: mesmo tratamento da etapa 078, nessas seis telas. Faça como etapa separada para manter cada PR pequena e revisável.
Arquivos e objetos a tocar: as seis páginas listadas.
Não tocar / armadilhas: não acrescente lógica de recálculo; apenas o estado de erro.
Depende de: 077 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: idem etapa 078, nas seis telas.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 080 — Mostrar erro nas telas restantes que hoje ficam em branco
Onda 5 / Severidade Baixa / Camada: front
Achados resolvidos: UI-19
Problema hoje: as demais páginas da lista de 39 (inventário, logística, rastreabilidade, documentos, TPM, gamificação, SPC, energia, ABC, simulação, status, monitoramento) seguem sem estado de erro.
Causa raiz: idem.
Caminho recomendado: aplique o mesmo bloco em lotes de quatro a cinco páginas por PR, pela ordem de uso que o dono indicar. Esta etapa pode ser repetida; registre no progresso quais páginas foram cobertas em cada rodada, para não perder a conta.
Arquivos e objetos a tocar: as páginas restantes de `src/pages/` sem tratamento de erro (liste com `grep -L "isError\|error" src/pages/*.tsx`).
Não tocar / armadilhas: não mude layout nem adicione dependência.
Depende de: 077 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: `grep -L "isError" src/pages/*.tsx` encolhe a cada rodada; cole a contagem antes e depois.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 081 — Remover o botão que diz ter enviado parâmetros para a máquina
Onda 2 / Severidade Alta / Camada: front
Achados resolvidos: UI-20
Problema hoje: `src/components/technical-assistant/TechnicalArtifacts.tsx:101-108` — `<button onClick={() => { toast.success("Todos os parâmetros enviados para a máquina"); }}>Sincronizar Tudo</button>`: o handler é só o aviso de sucesso, não há gravação, chamada de função nem envio. Não existe tabela nem função de parametrização de máquina no banco (`origin/contexto:docs/contexto/supabase/tables.md`).
Causa raiz: aviso de sucesso usado como simulação de comportamento.
Caminho recomendado: remova o botão. O botão "Copiar" ao lado (mesma barra, `handleCopy`) já entrega o valor real ao operador, que é o que o fluxo consegue fazer hoje. Não substitua por um aviso de "em breve": o operador pode achar que a máquina foi configurada e rodar o trabalho errado.
Arquivos e objetos a tocar: `src/components/technical-assistant/TechnicalArtifacts.tsx`.
Não tocar / armadilhas: não remova a barra inteira (o "Copiar" é útil).
Depende de: — · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: o botão não existe mais na tela; `grep -n "enviados para a máquina" src/` não retorna nada.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 082 — Ligar ou remover os botões de ação dos alertas preditivos
Onda 4 / Severidade Alta / Camada: front
Achados resolvidos: UI-21
Problema hoje: `src/features/analytics/components/oee/PredictiveAlerts.tsx:65,68` — "Agendar Manutenção" e "Ignorar" são botões habilitados **sem** `onClick`.
Causa raiz: ações desenhadas e não implementadas.
Caminho recomendado: "Agendar Manutenção" tem destino óbvio: abra o modal de agendamento que já existe (`src/features/maintenance/`, procure `CreateScheduleModal`) com a máquina pré-selecionada. "Ignorar" deve marcar o alerta como dispensado usando a mutação que já existe em `useTPMAlertMutations` (há tratamento de dispensa manual lá, conforme o histórico de commits). Se qualquer um dos dois não tiver caminho pronto, **remova o botão** em vez de deixá-lo inerte. Padrão de referência do formato correto: `src/pages/ShiftHandoverPage.tsx:360-375` (`onClick` + `mutation.mutate` + `disabled={mutation.isPending}`).
Arquivos e objetos a tocar: `src/features/analytics/components/oee/PredictiveAlerts.tsx`.
Não tocar / armadilhas: não crie tabela nova de "alerta ignorado" — confira primeiro o que `maintenance_alerts` já tem (`origin/contexto:docs/contexto/supabase/tables/public/maintenance_alerts.md`).
Depende de: — · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: clique nos dois botões: um abre o agendamento com a máquina certa, o outro remove o alerta da lista e persiste (recarregue para confirmar).
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 083 — Ligar ou remover os botões das abas de sequenciamento e balanceamento
Onda 4 / Severidade Alta / Camada: front
Achados resolvidos: UI-21
Problema hoje: `src/features/analytics/components/efficiency/SequencingTab.tsx:54` e `src/features/analytics/components/efficiency/BalancingTab.tsx:71` têm botões de aplicar sugestão sem `onClick`.
Causa raiz: idem.
Caminho recomendado: o sequenciamento inteligente já existe como hook (`src/features/jobs/hooks/useSmartSequencingWithActions.ts`) — ligue o botão à ação de lá. O balanceamento não tem ação equivalente: remova o botão e registre em "Achados novos" que a funcionalidade não existe, para o dono decidir. Nunca deixe o botão aplicando "nada" com aviso de sucesso.
Arquivos e objetos a tocar: `src/features/analytics/components/efficiency/SequencingTab.tsx`, `src/features/analytics/components/efficiency/BalancingTab.tsx`.
Não tocar / armadilhas: `useSmartSequencingWithActions` grava com upsert parcial (ver etapa 100) — faça a etapa 100 antes de ligar o botão, ou a ação vai falhar.
Depende de: 100 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: a ação de sequenciamento aplica e persiste (recarregue e confira a ordem); o botão de balanceamento não existe mais.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 084 — Varrer e resolver os demais botões sem ação
Onda 4 / Severidade Média / Camada: front
Achados resolvidos: UI-21
Problema hoje: a varredura confirmou **17 locais** com botão habilitado e sem handler; as etapas 082 e 083 cobrem quatro. Os demais estão em telas executivas e de inventário (entre eles `src/pages/InventoryPage.tsx:240`, `src/features/analytics/components/executive/ExecutiveNorthStar.tsx:15`, `ExecutiveChartsRow1.tsx:12`).
Causa raiz: interface desenhada antes das ações.
Caminho recomendado: liste os 17 com `grep -rn "<Button" src/ -A3 | grep -B2 ">" | grep -v onClick` (refine conforme necessário) e resolva em lotes de quatro por PR, decidindo um por um entre ligar e remover. Para cada botão removido, anote no progresso o que o dono perde — é a informação que ele usará para pedir a funcionalidade depois.
Arquivos e objetos a tocar: conforme o lote.
Não tocar / armadilhas: botão desabilitado com explicação é aceitável; botão habilitado que não faz nada não é.
Depende de: — · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: a contagem de botões sem handler cai a cada rodada; registre a lista restante.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 085 — Fazer as duas configurações que não têm efeito funcionarem (ou sair da tela)
Onda 4 / Severidade Média / Camada: front
Achados resolvidos: UI-22
Problema hoje: `src/pages/SettingsPage.tsx:67-70` grava qualquer chave em `localStorage` (`app-settings-<uid>`) e avisa "Configuração salva automaticamente"; mas "Atualização Automática" (`src/components/settings/SettingsGeneralTab.tsx:53`) e "Notificações Visuais" (`src/components/settings/SettingsNotificationsTab.tsx:53`) **nunca são lidas** em nenhum outro lugar.
Causa raiz: tela de configurações construída antes dos pontos de leitura.
Caminho recomendado: ligue as duas, que têm ponto de leitura natural: "Notificações Visuais" no invólucro de avisos do aplicativo (mesmo padrão de desligar som já implementado em `src/lib/soundFeedback.ts:58-63`, que lê a mesma chave de `localStorage`); "Atualização Automática" em `createQueryClient()` (`src/lib/queryConfig.ts`), controlando `refetchOnWindowFocus`/`refetchInterval`. Se o dono não quiser uma delas, remova o item da aba — configuração que não faz nada é pior que ausência de configuração.
Arquivos e objetos a tocar: `src/lib/queryConfig.ts`, o invólucro de avisos, `src/components/settings/SettingsGeneralTab.tsx`, `src/components/settings/SettingsNotificationsTab.tsx`.
Não tocar / armadilhas: a chave é por usuário (`app-settings-<uid>`) — não leia sem o identificador; não transforme isso em configuração de banco nesta etapa.
Depende de: 077 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: desligue "Notificações Visuais" e confirme que nenhum aviso aparece; desligue "Atualização Automática" e confirme que a tela não recarrega sozinha ao voltar o foco.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

---

## Onda 1 (continuação) — achados de controle de acesso no banco

### Etapa 086 — Fazer `is_staff()` respeitar papel desativado
Onda 1 / Severidade Alta / Camada: banco (função de autorização)
Achados resolvidos: BD-07
Problema hoje: `origin/contexto:docs/contexto/supabase/functions/public/is_staff__12ae32cb1ec02d01.sql` é `SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('coordinator','manager','admin'));` — **sem** `AND is_active = true`, ao contrário de `app_private.has_role`, que filtra. A função é usada em policies como `Staff can view all profiles` (`policies.md:178`) e `Staff can view all user_roles` (`:316`).
Causa raiz: duas funções de autorização com critérios diferentes; a mais antiga não acompanhou a introdução de `is_active`.
Caminho recomendado: recrie `is_staff()` com `AND is_active = true`, na mesma forma de `app_private.has_role`, por migration. Antes, meça o impacto: `SELECT count(*) FROM user_roles WHERE is_active = false AND role IN ('coordinator','manager','admin')` — se houver gente nessa situação, ela perde acesso no deploy, e isso é exatamente o que se quer, mas o dono precisa saber. Não apague as policies que usam a função nesta etapa.
Arquivos e objetos a tocar: nova migration redefinindo `public.is_staff`.
Não tocar / armadilhas: a função é usada em mais de uma policy — confira a lista completa (`grep -n "is_staff" policies.md`) antes, para prever o que muda; não troque `is_staff` por `has_role` em massa (semânticas diferentes).
Depende de: 003 · Libera: —
Risco e como reverter: médio (pode remover acesso). Reverter = restaurar a função anterior (está no snapshot).
Precisa de aprovação humana antes do merge: sim (DDL em produção e mudança de autorização)
Como verificar: com um papel marcado `is_active = false`, uma consulta a `profiles` deve devolver apenas o próprio perfil; com o papel ativo, todos. Registre os dois resultados.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 087 — Separar por operação as policies amplas que hoje liberam apagar dado
Onda 1 / Severidade Alta / Camada: banco (RLS)
Achados resolvidos: BD-08
Problema hoje: doze tabelas têm uma policy `ALL` com `has_any_active_role()` que convive com policies finas: por exemplo `public.shift_occurrences | Active roles can manage occurrences | ALL | PERMISSIVE | authenticated | has_any_active_role()` ao lado de `Handover participants can insert occurrences` (`origin/contexto:docs/contexto/supabase/policies.md:54,97,100,214,...`). Em Postgres, policies permissivas se somam: a ampla **anula** a fina, e qualquer pessoa com papel ativo pode apagar registros dessas tabelas (ocorrências de turno, inspeções de lote, paradas de máquina, alertas de energia, entre outras).
Causa raiz: policy "guarda-chuva" criada para destravar desenvolvimento e mantida ao lado das regras finas.
Caminho recomendado: troque cada `ALL ... has_any_active_role()` por policies por comando: SELECT com `has_any_active_role()`, INSERT/UPDATE restritos ao autor/participante, DELETE só para `coordinator`/`manager`/`admin` — exatamente o arranjo que o banco já usa em `packaging_tasks`. Faça **uma tabela por PR**, começando pelas que têm dado de operação (`machine_downtime`, `lot_quality_inspections`, `shift_occurrences`), e **antes de cada uma** confira os hooks do aplicativo que escrevem nessa tabela (`grep -rn "from('<tabela>')" src/`): estreitar sem conferir derruba tela em produção. O atalho tentador é apagar a policy ampla e ver o que quebra.
Arquivos e objetos a tocar: uma migration por tabela.
Não tocar / armadilhas: não remova a policy ampla e as finas no mesmo passo sem substituto — a tabela ficaria sem leitura; teste em banco descartável.
Depende de: 003 · Libera: —
Risco e como reverter: alto se feito em bloco; baixo tabela a tabela. Reverter = recriar a policy ampla.
Precisa de aprovação humana antes do merge: sim (DDL em produção e mudança de autorização)
Como verificar: por tabela: com conta de operador, SELECT funciona, INSERT do próprio registro funciona, DELETE é recusado; com coordenador, DELETE funciona. Registre os quatro resultados por tabela.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 088 — Exigir papel ativo (e não apenas estar logado) para escrever nas três tabelas abertas
Onda 1 / Severidade Alta / Camada: banco (RLS)
Achados resolvidos: BD-09
Problema hoje: três policies autorizam INSERT apenas por `auth.uid() IS NOT NULL`: `public.error_logs | Users can insert error logs`, `public.shift_handovers | Authenticated users can create handovers`, `public.telemetry_traces` (`origin/contexto:docs/contexto/supabase/policies.md:60,214,269`). Como o cadastro público está aberto no projeto (`disable_signup: false`, `auth.md`), qualquer pessoa cria conta e passa a poder gravar nessas três tabelas — inclusive inflar `error_logs`, que já é 91% do banco.
Causa raiz: predicado de "qualquer usuário autenticado" num sistema cujo cadastro não é fechado.
Caminho recomendado: troque o predicado por `has_any_active_role()` nas três; em `shift_handovers`, exija além disso que o autor seja um dos operadores da passagem (`outgoing_operator_id = auth.uid() OR incoming_operator_id = auth.uid()` ou papel elevado). Faça **junto** com a etapa 010 (fechar o cadastro público): as duas atacam a mesma exposição por lados diferentes, e qualquer uma sozinha deixa metade do caminho aberto.
Arquivos e objetos a tocar: nova migration com as três policies.
Não tocar / armadilhas: `error_logs` é gravada pelo registro de erro do aplicativo — se o usuário não tiver papel ativo, erros dele deixam de ser registrados; isso é aceitável, mas registre a decisão (um usuário sem papel não usa o sistema).
Depende de: 010, 003 · Libera: —
Risco e como reverter: médio. Reverter = restaurar os predicados.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: com uma conta sem papel, INSERT nas três tabelas deve ser recusado; com papel ativo, aceito. Registre os seis resultados.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 089 — Recriar o índice anti-repetição de pedido de senha que não existe no banco
Onda 1 / Severidade Alta / Camada: banco (integridade)
Achados resolvidos: BD-10
Problema hoje: existe migration no repositório criando `CREATE UNIQUE INDEX IF NOT EXISTS idx_password_reset_requests_one_pending_per_email ON public.password_reset_requests (user_email) WHERE (status = 'pending')`, e essa versão consta como **aplicada** em `origin/contexto:docs/contexto/supabase/migrations.md` — mas o índice **não está** na tabela real (`origin/contexto:docs/contexto/supabase/indexes.md` e a seção de índices de `tables/public/password_reset_requests.md` não o listam).
Causa raiz: divergência entre o histórico de migrations e o estado do banco — exatamente o risco que `AGENTS.md` alerta ("migration no repo é histórico, não estado").
Caminho recomendado: crie uma migration **nova** (não reaproveite a versão antiga, que já consta aplicada) com o mesmo `CREATE UNIQUE INDEX ... WHERE status = 'pending'`. Antes, confira se há duplicatas que impediriam a criação: `SELECT user_email, count(*) FROM password_reset_requests WHERE status='pending' GROUP BY 1 HAVING count(*) > 1`. Observação importante: o índice impede dois pedidos pendentes do **mesmo** e-mail, mas não limita volume de e-mails distintos — por isso ele é complemento, não substituto, da etapa 024.
Arquivos e objetos a tocar: nova migration.
Não tocar / armadilhas: não apague pedidos pendentes para "limpar o caminho" sem falar com o dono; use `CONCURRENTLY` se a tabela crescer (hoje tem 0 linhas, então não é necessário).
Depende de: 003 · Libera: —
Risco e como reverter: baixo; reverter = `DROP INDEX`.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: dois pedidos pendentes para o mesmo e-mail → o segundo deve ser recusado pelo banco; `indexes.md` da próxima coleta deve listar o índice.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 090 — Fechar os privilégios padrão do banco que liberam tudo para visitante
Onda 1 / Severidade Média / Camada: banco (permissões)
Achados resolvidos: BD-11
Problema hoje: `origin/contexto:docs/contexto/supabase/grants.md:454,456` mostra privilégios padrão do schema `public` concedendo DML completo a `anon` e `authenticated` em **tabelas novas** (`anon=arwdDxtm`) e EXECUTE em **funções novas** — e os lints registram 13 funções executáveis por `anon` (`lints.md:88-101`). Hoje a RLS é o que segura; qualquer tabela criada sem RLS fica aberta de imediato.
Causa raiz: privilégios padrão herdados da configuração inicial do projeto.
Caminho recomendado: por migration, `ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;` e o equivalente para funções (`REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon`), passando a conceder privilégio explícito por objeto. **Atenção**: isso afeta apenas objetos **novos**; os existentes continuam com o grant atual, então não há quebra imediata — e é justamente por isso que a mudança é segura e vale a pena. Não revogue grants dos objetos existentes nesta etapa: isso derrubaria o sistema. Em seguida, revise as 13 funções executáveis por `anon` uma a uma (a RPC pública de rastreamento deve continuar; as outras provavelmente não).
Arquivos e objetos a tocar: nova migration com `ALTER DEFAULT PRIVILEGES`.
Não tocar / armadilhas: não inclua `REVOKE ... ON ALL TABLES IN SCHEMA public` — é a linha que derruba a aplicação inteira; o fluxo de DDL do projeto usa a chave de serviço, que não é afetada.
Depende de: 003 · Libera: —
Risco e como reverter: baixo se restrito a privilégios padrão. Reverter = `ALTER DEFAULT PRIVILEGES ... GRANT`.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: crie uma tabela de teste no schema public e confirme que `anon` não consegue selecionar nela sem grant explícito; confirme que o sistema continua funcionando normalmente. Apague a tabela de teste depois.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 091 — Tirar do cliente a gravação das trilhas de segurança
Onda 1 / Severidade Média / Camada: banco (RLS)
Achados resolvidos: BD-12
Problema hoje: seis tabelas de registro de segurança aceitam INSERT do cliente: `security_events`, `login_audit`, `geo_blocking_logs`, `query_telemetry`, `rate_limit_logs`, `tpm_notification_logs` (`origin/contexto:docs/contexto/supabase/policies.md:208,90,66,...`), e em quatro delas o predicado inclui o ramo `user_id IS NULL`, que permite inserir registro sem dono.
Causa raiz: trilha de auditoria alimentada pelo próprio cliente que ela deveria vigiar.
Caminho recomendado: mova a gravação dessas trilhas para funções de servidor com chave de serviço (já existem `cleanup-security-logs` e `security-alert` em `supabase/functions/`) e remova a policy de INSERT do cliente. Se isso for grande, o passo mínimo é remover o ramo `user_id IS NULL` das quatro policies, o que já elimina a inserção anônima de registro forjado. Uma trilha que o investigado pode escrever não serve como prova.
Arquivos e objetos a tocar: nova migration; eventualmente os pontos do aplicativo que gravam essas tabelas (`grep -rn "from('security_events')\|from('login_audit')" src/`).
Não tocar / armadilhas: `login_audit` é gravada no fluxo de login, antes de haver papel — confira o caminho antes de fechar, senão o registro de acesso deixa de existir (pior que registro forjável).
Depende de: 003 · Libera: —
Risco e como reverter: médio. Reverter = restaurar as policies.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: tentativa de INSERT direto em `security_events` com conta de operador deve ser recusada; o registro legítimo de evento (gerado pelo fluxo) deve continuar aparecendo. Registre os dois.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 092 — Completar as permissões de arquivo dos baldes de fotos e documentos
Onda 3 / Severidade Média / Camada: storage (RLS)
Achados resolvidos: STO-04
Problema hoje: contando as policies de `storage.objects` por balde (`origin/contexto:docs/contexto/supabase/policies.md:319-334`): `execution-evidence` tem 4 (INSERT/SELECT/UPDATE/DELETE), `tpm-evidences` 4, `tpm_signatures` 4 (balde inexistente), mas `production-photos` tem **2** e `technical-documents` **2** — só envio e leitura. Não há como corrigir nem remover um arquivo enviado por engano nesses dois baldes.
Causa raiz: policies criadas por balde, em momentos diferentes, sem fechar o conjunto.
Caminho recomendado: migration acrescentando UPDATE e DELETE para os dois baldes, copiando literalmente a forma já usada em `Owners and staff can update execution-evidence` / `... delete execution-evidence` (`policies.md:331-332`) — dono do arquivo ou papel elevado. Não invente critério novo.
Arquivos e objetos a tocar: nova migration.
Não tocar / armadilhas: cuidado para não permitir que o operador apague documento técnico publicado — se o negócio exigir retenção, deixe DELETE apenas para papel elevado nesse balde.
Depende de: 003 · Libera: —
Risco e como reverter: baixo; reverter = `DROP POLICY`.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: envie um arquivo de teste a cada balde e, como dono, substitua e apague: as duas operações devem funcionar; como outro operador, devem ser recusadas.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 093 — Transformar as policies de bloqueio em restritivas de verdade
Onda 3 / Severidade Baixa / Camada: banco (RLS)
Achados resolvidos: BD-13
Problema hoje: cinco policies de bloqueio foram escritas como PERMISSIVE com expressão `false`: `audit_log | Deny all changes to audit logs`, `job_status_audit | Deny direct client writes`, `login_lockouts`, e outras (`origin/contexto:docs/contexto/supabase/policies.md:18,80,92,...`). Policies permissivas se **somam**: uma policy `false` não bloqueia nada; ela apenas não autoriza. O bloqueio hoje funciona por ausência de outra policy — se alguém acrescentar uma permissiva, a proteção desaparece sem aviso.
Causa raiz: confusão entre "não autorizar" e "proibir".
Caminho recomendado: recrie as cinco com `AS RESTRICTIVE`, seguindo `supabase/migrations/20260910120000_user_roles_writes_require_aal2.sql`, que já faz exatamente isso para `user_roles` e explica o porquê no comentário. Mudança de intenção, não de comportamento atual — então o risco é baixo e o ganho é durar.
Arquivos e objetos a tocar: nova migration.
Não tocar / armadilhas: policy restritiva se aplica **a todas** as outras: confirme que as policies de leitura legítima continuam funcionando (a restritiva deve cobrir só os comandos de escrita).
Depende de: 003 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: leitura da trilha por coordenador continua funcionando; INSERT/UPDATE/DELETE direto continua recusado. Depois, como teste de intenção, crie (em banco descartável) uma policy permissiva de INSERT e confirme que a restritiva ainda barra.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 094 — Remover as policies do balde de arquivos que não existe
Onda 8 / Severidade Baixa / Camada: storage (higiene)
Achados resolvidos: STO-03
Problema hoje: quatro policies de `storage.objects` referenciam o balde `tpm_signatures` (`origin/contexto:docs/contexto/supabase/policies.md:323,327,330,333`), que não está entre os quatro baldes existentes (`storage.md`) e não aparece em nenhum lugar do código (`grep -rn "tpm_signatures" src/`).
Causa raiz: recurso de assinatura que mudou de rumo, deixando as policies.
Caminho recomendado: migration com `DROP POLICY` das quatro, no mesmo formato de `supabase/migrations/20260719150000_drop_orphaned_storage_policies.sql`, que já fez essa limpeza antes. Confirme por grep que nada no código referencia o balde.
Arquivos e objetos a tocar: nova migration.
Não tocar / armadilhas: não apague policies dos baldes que existem; confirme o nome exato (com sublinhado, não hífen).
Depende de: 003 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: `policies.md` da próxima coleta não traz mais `tpm_signatures`; o envio de evidência de manutenção continua funcionando.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 095 — Não expulsar o usuário quando a leitura do papel demora
Onda 2 / Severidade Alta / Camada: front (autenticação)
Achados resolvidos: AUT-06
Problema hoje: `src/features/auth/components/AuthProvider.tsx:19` define `const USER_DATA_TIMEOUT_MS = 6000;` e envolve a leitura de perfil e papéis num tempo-limite (`:116-131`); no `catch` (`:156-160`) faz `setRole(null)` e registra aviso. Com `role` nulo, `src/components/auth/ProtectedRoute.tsx:152-160` manda o usuário para a página inicial — e as rotas com papel exigido (quase todas, `src/routes/AppRoutes.tsx:198-267`) ficam inacessíveis.
Causa raiz: "não consegui carregar o papel" é tratado como "não tem papel".
Caminho recomendado: distinga os dois estados: acrescente um sinal de falha de carregamento (por exemplo `roleLoadFailed`) no `catch` do `AuthProvider` e, em `ProtectedRoute`, mostre erro com ação de tentar novamente em vez de redirecionar. Seis segundos é pouco para uma rede de fábrica — considere também aumentar o limite, mas a correção principal é não rebaixar o usuário em caso de falha.
Arquivos e objetos a tocar: `src/features/auth/components/AuthProvider.tsx`, `src/components/auth/ProtectedRoute.tsx`.
Não tocar / armadilhas: não remova o tempo-limite (sem ele, a tela trava carregando); não confunda com o caso legítimo de usuário sem papel atribuído, que deve continuar vendo a mensagem de acesso não liberado.
Depende de: 032 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: simule lentidão (limitação de rede no navegador) e confirme que aparece erro com "tentar novamente" em vez de voltar para a home; depois, com rede normal, o acesso funciona.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 096 — Corrigir os dois links que levam a página inexistente
Onda 2 / Severidade Alta / Camada: front (navegação)
Achados resolvidos: NAV-01
Problema hoje: `src/components/kanban/KanbanFiltersBar.tsx:149` navega para `/jobs/new`, mas a rota real é `/new-job` (`src/routes/AppRoutes.tsx:206`); `src/features/notifications/hooks/useWebPushNotifications.ts:197` navega para `/seguranca`, e a rota é `/security`. Ambos caem na página de erro 404.
Causa raiz: caminho escrito à mão, divergente do registro de rotas.
Caminho recomendado: corrija as duas strings. É a correção de duas linhas e desbloqueia o botão de criar OS a partir do Kanban, que é um caminho de uso diário.
Arquivos e objetos a tocar: `src/components/kanban/KanbanFiltersBar.tsx`, `src/features/notifications/hooks/useWebPushNotifications.ts`.
Não tocar / armadilhas: não renomeie as rotas para casar com os links (outros lugares usam os nomes atuais).
Depende de: — · Libera: 097
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: clique no botão do Kanban: deve abrir o formulário de nova OS; a notificação de segurança deve abrir o painel de segurança.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 097 — Resolver os três links que apontam para um detalhe de OS que não existe
Onda 4 / Severidade Média / Camada: front (navegação)
Achados resolvidos: NAV-01
Problema hoje: `src/features/analytics/components/bi/drilldown/DrillDownDialog.tsx:130`, `src/features/analytics/components/bi/losses/LossesTable.tsx:100` e um terceiro ponto do mesmo módulo navegam para `/job/${job.id}` — rota que não existe no registro de rotas.
Causa raiz: tela planejada (detalhe de OS por URL) que nunca foi criada; os links ficaram.
Caminho recomendado: use o que já existe em vez de criar rota: `LossesTable.tsx:100` já tem o retorno `onShowDetail`, que abre o diálogo de detalhe da OS. Faça os três pontos abrirem esse diálogo. Criar a rota `/job/:id` é alternativa legítima, mas é funcionalidade nova (tela, carregamento, permissão) e não cabe numa etapa de correção — se o dono quiser, registre em "Achados novos".
Arquivos e objetos a tocar: os três arquivos do módulo de BI listados.
Não tocar / armadilhas: não adicione a rota "só para não dar 404" apontando para a lista: o usuário clicou esperando um detalhe.
Depende de: 096 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: clique nos três pontos e confirme que abre o detalhe da OS correta (compare o número da OS).
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 098 — Filtrar a busca rápida (Ctrl+K) pelo papel do usuário
Onda 3 / Severidade Média / Camada: front (navegação)
Achados resolvidos: NAV-02
Problema hoje: `src/components/navigation/CommandPaletteCommands.tsx:20-60` monta a lista de comandos sem receber papel (`BuildCommandsArgs` não tem `role` nem `allowedRoles`) e `CommandPaletteAdvanced.tsx:92-122` exibe tudo. Um operador vê na busca rápida todas as telas restritas (segurança, auditoria, permissões, integração) e, ao escolher, é barrado pela rota.
Causa raiz: a paleta foi construída a partir da lista de rotas, não da lista de rotas **permitidas**.
Caminho recomendado: acrescente `allowedRoles?: AppRole[]` ao tipo de item e filtre por papel antes de montar os grupos, reaproveitando os conjuntos já definidos em `src/components/layout/sidebar/sidebarNavConfig.ts:12-16` — o menu lateral já faz esse filtro; a paleta deve usar a mesma fonte, não duplicar a lista.
Arquivos e objetos a tocar: `src/components/navigation/CommandPaletteCommands.tsx`, `src/components/navigation/CommandPaletteAdvanced.tsx`.
Não tocar / armadilhas: não transforme isso em autorização (a autorização é da rota e do banco) — aqui é só não oferecer o que a pessoa não pode usar.
Depende de: — · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: com conta de operador, abra a busca rápida e confirme que nenhuma tela administrativa aparece; com coordenador, aparecem. Liste os itens vistos nos dois casos.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 099 — Dar entrada na interface (ou remover) as quatro telas acessíveis só por URL
Onda 4 / Severidade Média / Camada: front (navegação)
Achados resolvidos: NAV-03
Problema hoje: `/logistics`, `/simulation`, `/status` e `/admin/monitoring` estão registradas (`src/routes/AppRoutes.tsx:243,265,266,267`) e **nenhuma** é referenciada em qualquer lugar da interface — nem menu, nem busca rápida, nem link (busca em todo `src/`, excluindo o registro de rotas e testes).
Causa raiz: telas entregues sem porta de entrada.
Caminho recomendado: decida tela por tela com o dono: publicar em `navGroups`/`adminNavItems` (`src/components/layout/sidebar/sidebarNavConfig.ts`), no formato `{ icon, label, href, allowedRoles }` já usado nas linhas 59-66, ou remover a rota junto com a página. Logística tem dado real (há tabelas `shipments`/`shipping_providers`), então provavelmente entra no menu; `/status` e `/admin/monitoring` podem ficar em uma seção administrativa.
Arquivos e objetos a tocar: `src/components/layout/sidebar/sidebarNavConfig.ts` e, se remover, `src/routes/AppRoutes.tsx` + a página.
Não tocar / armadilhas: ao publicar no menu, defina `allowedRoles` — do contrário a tela aparece para operador e é barrada na entrada.
Depende de: — · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: cada uma das quatro telas tem entrada visível para o papel correto, ou não existe mais. Liste a decisão por tela.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 100 — Trocar os três `upsert` parciais de OS por atualização por identificador
Onda 3 / Severidade Média / Camada: front (gravação)
Achados resolvidos: RN-10
Problema hoje: `src/features/jobs/hooks/useKanbanDragDrop.ts:84-95` monta `{ id, sort_order, updated_at }` e chama `supabase.from('jobs').upsert(updates, { onConflict: 'id' })`; `src/features/jobs/hooks/useSmartSequencingWithActions.ts:101-108,143-151` faz o mesmo com `{ id, start_time, end_time }` e um `as never`. Em `jobs` há colunas obrigatórias (`order_number`, `client`, `product`, `quantity`, `technique_id` — `origin/contexto:docs/contexto/supabase/tables/public/jobs.md`), e o `upsert` do PostgREST gera `INSERT ... ON CONFLICT`, avaliando as restrições sobre a tupla montada.
Causa raiz: uso de `upsert` para o que é uma atualização.
Caminho recomendado: **primeiro confirme o sintoma** (este achado está marcado como hipótese: não foi possível executar a chamada nesta auditoria). Reproduza arrastando um cartão no Kanban e observe a resposta da requisição. Se vier erro 23502 (coluna obrigatória nula), troque os três `upsert` por `update` por identificador — padrão já usado em `src/features/jobs/services/jobsService.ts:66` — em laço ou via função de banco que receba a lista de pares. Se **não** der erro, registre no progresso que o comportamento atual é aceitável e remova apenas o `as never`, que esconde o tipo.
Arquivos e objetos a tocar: `src/features/jobs/hooks/useKanbanDragDrop.ts`, `src/features/jobs/hooks/useSmartSequencingWithActions.ts`.
Não tocar / armadilhas: um laço de `update` para 50 cartões gera 50 requisições — se a reordenação for grande, prefira uma função de banco que receba o lote; não use `upsert` com objeto completo (sobrescreveria campos editados por outra pessoa).
Depende de: — · Libera: 083
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: arraste um cartão e confirme na aba de rede resposta 2xx e a nova ordem persistida após recarregar. Cole o código de resposta antes e depois.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 101 — Impedir resgate de recompensa além do saldo
Onda 3 / Severidade Alta / Camada: banco + front
Achados resolvidos: EST-04
Problema hoje: `src/hooks/useGamification.ts:216-246` verifica o saldo com dois `SELECT` (pontos ganhos e pontos gastos), calcula `currentBalance` e só então insere em `reward_redemptions`. Entre a leitura e a gravação não há nada: dois cliques, duas abas ou dois aparelhos leem o mesmo saldo, ambos aprovam e ambos gravam.
Causa raiz: validação de invariante feita no cliente, em duas etapas, sem transação nem restrição no banco.
Caminho recomendado: mova a validação para o banco, no padrão que o próprio projeto já usa para estoque: `inventory_items` tem `CHECK (current_stock >= 0)` e gatilhos `BEFORE INSERT` que validam movimento (`origin/contexto:docs/contexto/supabase/tables/public/inventory_items.md`). Aqui, crie uma função `SECURITY DEFINER` que calcule o saldo e insira o resgate na **mesma** transação, recusando se não houver saldo, e faça o aplicativo chamá-la. Manter a checagem no cliente é útil para mensagem imediata, mas não é ela que garante.
Arquivos e objetos a tocar: nova migration (função + permissão), `src/hooks/useGamification.ts`.
Não tocar / armadilhas: não "resolva" desabilitando o botão durante a chamada: isso não cobre duas abas nem dois aparelhos; não apague resgates existentes.
Depende de: 003 · Libera: —
Risco e como reverter: médio (DDL). Reverter = remover a função e voltar o cliente.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: com saldo para um resgate, dispare dois resgates simultâneos (duas abas): um deve ser aceito e o outro recusado por saldo. Mostre as duas respostas.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 102 — Não transformar erro de leitura de favoritos em "favoritos padrão"
Onda 5 / Severidade Média / Camada: front (hooks)
Achados resolvidos: EST-06
Problema hoje: `src/hooks/useQuickFavorites.ts:69-72` e `:80-83` criam o erro e **o descartam**, devolvendo `DEFAULT_FAVORITES`: a consulta termina com sucesso aparente. Como as mutações recalculam a lista inteira a partir desse estado e gravam por substituição (`:180-238`), a primeira edição depois de uma falha de leitura **sobrescreve** os favoritos reais da pessoa.
Causa raiz: erro engolido e substituído por valor padrão indistinguível de "usuário sem favoritos".
Caminho recomendado: lance o erro em vez de devolver o padrão, no mesmo formato de `src/hooks/technical-sheets/useTechnicalSheetsQueries.ts:37-39` (`throw createAppError(...)`), e derive a lista exibida de `dbFavorites ?? DEFAULT_FAVORITES` **apenas quando a consulta tiver sucesso** — assim adicionar/remover favorito nunca parte de um estado inventado.
Arquivos e objetos a tocar: `src/hooks/useQuickFavorites.ts`.
Não tocar / armadilhas: mantenha os favoritos padrão para quem nunca salvou nada (é experiência legítima); o que não pode é confundir os dois casos.
Depende de: 077 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: simule falha na leitura (bloqueie a requisição no navegador), edite os favoritos e confirme que a lista real **não** foi sobrescrita depois que a rede volta.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 103 — Fazer o registro de erro guardar quem teve o erro (e o painel voltar a mostrar algo)
Onda 5 / Severidade Alta / Camada: front + banco
Achados resolvidos: BD-14
Problema hoje: `public.error_logs` tem a coluna `user_id` (nullable, sem chave estrangeira, sem índice) e a policy de leitura é `USING ((SELECT auth.uid()) = user_id)` (`origin/contexto:docs/contexto/supabase/tables/public/error_logs.md`), mas o registro de erro do aplicativo **nunca preenche** `user_id` (`src/lib/logger.ts:101-111` monta a linha sem esse campo). Resultado: a tabela tem 2,3 milhões de linhas e **ninguém consegue ler nenhuma** pela interface — nem o painel de monitoramento (`src/features/admin/hooks/useMonitoringData.ts:44`).
Causa raiz: policy de leitura por dono numa tabela cujo gravador não informa o dono.
Caminho recomendado: três passos no mesmo PR: (1) passe `user_id` no registro (o logger já alcança a sessão pelo mesmo caminho dinâmico que usa para o cliente; `src/components/ui/error-boundary.tsx:67` já faz `user_id: user?.id`); (2) acrescente uma policy de leitura para papel elevado (coordenador/gestor), senão o painel de monitoramento continua vazio para quem precisa dele; (3) crie índice em `user_id` (hoje só existem o da chave primária e o de data). Faça depois das etapas 028 e 029, para não indexar uma tabela de 1 GB que vai encolher.
Arquivos e objetos a tocar: `src/lib/logger.ts`; nova migration (policy + índice).
Não tocar / armadilhas: não torne `user_id` obrigatório — erro antes do login não tem usuário; não exponha `error_logs` a todos os autenticados (o campo `stack` pode conter dados).
Depende de: 028, 029 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: provoque um erro logado e confirme a linha nova com `user_id` preenchido; abra o painel de monitoramento com conta de coordenador e confirme que a lista de erros aparece (antes vinha vazia).
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 104 — Reescrever a verificação de saúde das rotinas, que é a consulta mais caras do banco
Onda 6 / Severidade Alta / Camada: banco (performance)
Achados resolvidos: BD-15
Problema hoje: `origin/contexto:docs/contexto/supabase/stats.md:183` registra `select public.snapshot_cron_health()` com ~7,8 mil execuções e **1.255 segundos** de tempo total, e `:187` registra `get_cron_health()` com **3.565 segundos** — somadas, cerca de 3,2 horas de processamento do banco, as duas consultas mais caras do sistema. As funções varrem `cron.job_run_details` com ordenação por job, em laço.
Causa raiz: varredura ordenada por job dentro de laço, sobre uma tabela de histórico que só cresce.
Caminho recomendado: reescreva as duas para **uma única passada** com `DISTINCT ON (jobid) ... ORDER BY jobid, start_time DESC` sobre `cron.job_run_details` filtrada por janela (`WHERE start_time > now() - interval '7 days'`), em vez do laço por job. Acrescente a poda do histórico de execuções na rotina de limpeza diária que já existe (`purge_old_logs`), senão o custo volta a crescer. A função roda a cada 15 minutos — o ganho é imediato e visível no próximo `stats.md`.
Arquivos e objetos a tocar: nova migration redefinindo `public.snapshot_cron_health` e `public.get_cron_health`.
Não tocar / armadilhas: não mude o formato de retorno (a tela de monitoramento consome); `cron.job_run_details` é tabela do agendador — apague histórico com cuidado e só o antigo.
Depende de: 003 · Libera: —
Risco e como reverter: médio. Reverter = restaurar as funções (estão no snapshot).
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: compare o tempo médio por execução antes e depois no `stats.md` das coletas seguintes, e confirme que a tela de saúde das rotinas mostra os mesmos dados. Cole as duas linhas de `stats.md`.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 105 — Fechar o domínio do tipo de movimento de estoque
Onda 3 / Severidade Alta / Camada: banco (integridade)
Achados resolvidos: BD-16
Problema hoje: `public.inventory_movements.type` é texto não-nulo **sem nenhum CHECK** (a tabela só tem três chaves estrangeiras e a primária — `origin/contexto:docs/contexto/supabase/tables/public/inventory_movements.md`), e `public.update_inventory_stock` só reage a valores conhecidos (`IF (NEW.type = ...)`), ignorando em silêncio qualquer outro. Além disso `item_id` é nullable, então existe movimento sem item.
Causa raiz: domínio de valores mantido apenas por convenção do código.
Caminho recomendado: migration com `CHECK (type IN (...))` — levante os valores realmente usados antes (`SELECT DISTINCT type FROM inventory_movements`) e inclua todos, senão a migration falha — e `ALTER COLUMN item_id SET NOT NULL` (a tabela tem 0 linhas hoje, segundo `stats.md`, então é barato). Siga o padrão de domínio que `jobs` já usa (`jobs_status_check`). Um movimento com tipo desconhecido hoje passa pelo gatilho sem alterar estoque: o registro existe e o saldo não muda, o que é a pior combinação para inventário.
Arquivos e objetos a tocar: nova migration.
Não tocar / armadilhas: não altere a função de estoque nesta etapa; se houver valores legados fora do domínio, converta-os em migration de dado separada e registre no progresso.
Depende de: 003 · Libera: —
Risco e como reverter: baixo (tabela vazia). Reverter = `DROP CONSTRAINT`.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: `INSERT` com `type='XPTO'` deve ser recusado; com tipo válido deve ser aceito e alterar o estoque. Registre os dois.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 106 — Impedir duas expedições para a mesma OS
Onda 3 / Severidade Média / Camada: banco (integridade)
Achados resolvidos: BD-17
Problema hoje: `public.shipments` não tem `UNIQUE (job_id)` nem CHECK em `status` (`origin/contexto:docs/contexto/supabase/tables/public/shipments.md`), enquanto `packaging_tasks` tem os dois. O gatilho `on_packaging_ready_create_shipment` cria a expedição quando a embalagem fica pronta — sem unicidade, uma reexecução gera expedições duplicadas para o mesmo pedido.
Causa raiz: restrições aplicadas numa tabela do fluxo e esquecidas na seguinte.
Caminho recomendado: migration com `ALTER TABLE shipments ADD CONSTRAINT shipments_job_id_key UNIQUE (job_id)` e um CHECK de domínio para `status`, levantando antes os valores em uso (`SELECT DISTINCT status FROM shipments`; hoje a tabela tem 0 linhas, então é barato). Copie a forma do CHECK de `packaging_tasks`.
Arquivos e objetos a tocar: nova migration.
Não tocar / armadilhas: se o negócio admitir reenvio (segunda expedição do mesmo pedido), `UNIQUE(job_id)` é errado — **pergunte ao dono** antes; nesse caso use unicidade parcial (`WHERE status <> 'cancelled'`).
Depende de: 003 · Libera: —
Risco e como reverter: baixo. Reverter = `DROP CONSTRAINT`.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: dispare duas vezes a criação de expedição para a mesma OS: a segunda deve ser recusada. Registre a mensagem.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 107 — Remover índices e restrições duplicados
Onda 8 / Severidade Baixa / Camada: banco (higiene)
Achados resolvidos: BD-18
Problema hoje: `origin/contexto:docs/contexto/supabase/indexes.md:35-38` mostra **três** índices idênticos em `audit_log` sobre `(entity_type, entity_id, created_at)`: `audit_log_entity_idx`, `idx_audit_log_entity` e `idx_audit_log_entity_created` — dois deles sem uso registrado (`stats.md:155-156`). Há também restrição duplicada em `inventory_items`.
Causa raiz: migrations repetidas criando o mesmo objeto com nomes diferentes.
Caminho recomendado: migration com `DROP INDEX IF EXISTS` nos dois sem uso (mantendo `audit_log_entity_idx`, o único com uso registrado) e `ALTER TABLE ... DROP CONSTRAINT IF EXISTS` na restrição duplicada. Cada índice extra custa escrita em toda gravação de auditoria — e auditoria é gravada em cada mudança de OS.
Arquivos e objetos a tocar: nova migration.
Não tocar / armadilhas: confirme no `stats.md` qual índice tem uso **antes** de escolher qual manter; não remova índice único nem o que sustenta chave estrangeira.
Depende de: 003 · Libera: —
Risco e como reverter: baixo; reverter = recriar o índice.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: `indexes.md` da próxima coleta mostra um único índice nessas colunas; nenhuma consulta de auditoria fica mais lenta (compare o tempo da tela de trilha antes e depois).
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 108 — Consolidar as quatro trilhas de auditoria da OS em uma
Onda 3 / Severidade Média / Camada: banco (arquitetura de dados)
Achados resolvidos: BD-06
Problema hoje: `public.jobs` tem **quatro** gatilhos de auditoria habilitados, gravando em três tabelas diferentes (`origin/contexto:docs/contexto/supabase/tables/public/jobs.md`): `audit_jobs` → `audit_trigger_func` (grava em `audit_log`), `tr_audit_job_changes` → `audit_job_changes` (grava em `job_status_audit`), `tr_audit_job_status` → `audit_job_status_change` (grava em `audit_log`), `trigger_log_job_status_change` → `log_job_status_change` (grava em `job_status_history`).
Causa raiz: cada migration histórica somou uma trilha nova sem remover a anterior.
Caminho recomendado: faça **depois** da etapa 004 (com as funções corrigidas) e com decisão do dono sobre qual trilha é a oficial. A recomendação técnica é manter `audit_log` (tem encadeamento de hash e função de verificação — `compute_audit_hash`/`verify_audit_chain`) como trilha única e descontinuar as outras duas tabelas, mantendo o histórico já gravado. Remova um gatilho por PR, verificando a cada passo que as telas que leem a trilha continuam funcionando (`grep -rn "job_status_audit\|job_status_history" src/`). Não apague tabela com dado histórico; apenas pare de escrever nela.
Arquivos e objetos a tocar: uma migration por gatilho removido; eventualmente as telas que leem as tabelas descontinuadas.
Não tocar / armadilhas: não remova `audit_jobs` antes de confirmar que `audit_job_status_change` cobre o mesmo evento; a tela de histórico de status (`src/features/jobs/hooks/useJobStatusHistory.ts`) lê uma dessas tabelas — se remover a escrita, a tela esvazia.
Depende de: 004 · Libera: —
Risco e como reverter: médio. Reverter = recriar o gatilho.
Precisa de aprovação humana antes do merge: sim (DDL em produção e decisão de arquitetura)
Como verificar: após cada remoção, mude o status de uma OS de teste e confirme que a trilha oficial registrou e que nenhuma tela ficou vazia. Registre o antes/depois por tela.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 109 — Resolver os dois estados de OS que nunca acontecem
Onda 8 / Severidade Baixa / Camada: front (regra)
Achados resolvidos: RN-11
Problema hoje: `buffer` e `packaging` existem no CHECK do banco, na máquina de estados (`src/features/jobs/services/jobStateMachine.ts:16-18`) e nos contadores de tela (`src/features/jobs/hooks/useSchedulingData.ts:196`, `src/features/production/hooks/useOperatorDashboardData.ts:109`, `src/pages/KanbanBoard.tsx:39-50`), mas **nada** grava esses valores em `jobs` — a embalagem é uma tabela própria (`packaging_tasks`, criada por gatilho quando a OS vai para `finished`).
Causa raiz: desenho antigo (estado da OS) convivendo com o atual (tabela de tarefas).
Caminho recomendado: decida com o dono se a etapa de embalagem deve aparecer como estado da OS. Se **não**: remova `buffer` e `packaging` da máquina de estados e dos contadores, deixando o CHECK do banco como histórico (não vale uma migration só para isso). Se **sim**: faça `packagingService` mover a OS via `jobsService.updateStatus` e acrescente as colunas no Kanban. Não amplie o escopo além da opção escolhida.
Arquivos e objetos a tocar: `src/features/jobs/services/jobStateMachine.ts`, `src/features/jobs/hooks/useSchedulingData.ts`, `src/features/production/hooks/useOperatorDashboardData.ts`, `src/pages/KanbanBoard.tsx`.
Não tocar / armadilhas: não mexa no CHECK do banco; `finished → packaging` está declarado como transição automática na máquina de estados — remova a declaração junto, senão fica regra para estado inexistente.
Depende de: 048 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: `grep -rn "'buffer'\|'packaging'" src/features/jobs src/pages/KanbanBoard.tsx` retorna só o que a decisão manda manter; os contadores do Kanban somam o total de OS corretamente.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 110 — Dar estado vazio às seis tabelas que hoje mostram só o cabeçalho
Onda 7 / Severidade Baixa / Camada: front
Achados resolvidos: UI-23
Problema hoje: seis listas renderizam apenas o cabeçalho quando não há dado, sem nenhuma mensagem: `src/pages/EnergyDashboard.tsx:148-170`, `src/features/analytics/components/bi/BINormalView.tsx:344`, `src/features/analytics/components/bi/BIComparisonView.tsx:136`, `src/features/analytics/components/bi/executive/KPIMachinesTab.tsx:85` e outras duas do mesmo módulo.
Causa raiz: estado vazio não previsto nessas telas.
Caminho recomendado: use o componente que já existe (`src/components/ui/empty-state.tsx`) no formato de `src/pages/OperatorView.tsx:169-170`, ou uma linha única de tabela com `colSpan` e mensagem. Mantenha o texto específico ("Nenhuma leitura registrada neste período") em vez de genérico — o usuário precisa saber se é período sem dado ou falta de cadastro.
Arquivos e objetos a tocar: os seis arquivos listados.
Não tocar / armadilhas: não confunda com o estado de erro das etapas 077-080; os dois coexistem.
Depende de: 077 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: filtre um período sem dado em cada tela e confirme a mensagem. Liste as seis telas verificadas.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 111 — Corrigir o botão dentro de link em toda a navegação
Onda 7 / Severidade Baixa / Camada: front (acessibilidade)
Achados resolvidos: UI-24
Problema hoje: `src/components/layout/sidebar/NavButton.tsx:39-41` (usado por **todos** os itens do menu lateral) envolve `<Button>` dentro de `<Link>` sem `asChild`, gerando `<a><button>` no HTML — estrutura inválida que faz o leitor de tela anunciar o rótulo duas vezes. Mesmo padrão em `src/components/layout/MainLayout.tsx:174-176,202-204`, `src/components/layout/AppSidebar.tsx:198-211`, `src/components/dashboard/QuickActions.tsx:24-25`.
Causa raiz: composição de componentes sem `asChild`.
Caminho recomendado: troque por `<Button asChild><Link to=...>…</Link></Button>` e mantenha **um** único `aria-label` (o do link), removendo o duplicado do botão. Comece por `NavButton.tsx:39`, que é o único componente de item de menu e corrige a navegação inteira de uma vez — depois os quatro pontos restantes.
Arquivos e objetos a tocar: `src/components/layout/sidebar/NavButton.tsx` e, em PR seguinte, os outros quatro.
Não tocar / armadilhas: `asChild` passa as propriedades ao filho — confira que as classes visuais continuam aplicadas (compare a aparência do menu antes e depois).
Depende de: — · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: inspecione o HTML do menu e confirme que não há `<button>` dentro de `<a>`; a aparência do menu não muda. Se o repositório tiver verificação de acessibilidade no E2E (`@axe-core/playwright`), rode-a.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 112 — Alinhar os títulos de página em português ao rótulo do menu
Onda 7 / Severidade Baixa / Camada: front (consistência)
Achados resolvidos: UI-25
Problema hoje: quatro páginas têm título em inglês numa interface em português, divergindo do próprio menu: `src/pages/EnergyDashboard.tsx:62` ("Sustainable Intelligence 10/10" enquanto o menu diz "Energia", `sidebarNavConfig.ts:62`), `src/pages/TraceabilityPage.tsx:308-311`, `src/pages/OperatorProductivityPage.tsx:91`, `src/pages/MasterAPIPage.tsx:48-50`.
Causa raiz: títulos escritos durante a construção e não revisados.
Caminho recomendado: use como título o mesmo `label` do menu em `src/components/layout/sidebar/sidebarNavConfig.ts` (que também alimenta a trilha de navegação) — quatro linhas, uma por página. Remova também os sufixos "10/10" e "12/10" (também em `src/pages/DigitalTwin.tsx:45`): são notas internas de desenvolvimento aparecendo para o usuário.
Arquivos e objetos a tocar: as quatro páginas e `src/pages/DigitalTwin.tsx`.
Não tocar / armadilhas: não mexa nas chaves de tradução (`src/i18n/`) nesta etapa; apenas no texto fixo das páginas.
Depende de: — · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: cada uma das cinco telas mostra título em português igual ao item de menu. Liste os cinco títulos novos.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 113 — Fazer a tela de permissões refletir o que o sistema realmente verifica
Onda 2 / Severidade Alta / Camada: front (autorização)
Achados resolvidos: AUT-07
Problema hoje: a tela oferece um vocabulário de permissões (`src/features/auth/types/auth.types.ts:37-49`: `admin:all`, `jobs:view`, `jobs:create`, `production:register`, `telemetry:view`, `settings:manage`, ...) que **não** é o que o aplicativo verifica (`src/features/auth/hooks/useRBAC.tsx:7-89` usa outro conjunto), e `useRBAC.tsx:164-173` faz a união do que vem do banco com um mapa fixo por papel — por isso **revogar** permissão não tem efeito. É a pendência F-007, registrada como aberta em `docs/pendencias/F-007-permissionmanager-in-cuo.md`.
Causa raiz: três vocabulários de permissão (tela, código, banco) e uma união que impede revogação.
Caminho recomendado: **esta etapa é a PR #256**, que está aberta e ataca exatamente isso ("banco autoritativo na autorização — revogação de permissão real"). Não abra PR paralela: leia o diff dela, confira se cobre (a) remover a união com o mapa fixo em `useRBAC.tsx:166-172`, deixando o banco autoritativo com o mapa só como reserva em caso de falha de leitura, e (b) alinhar o vocabulário da tela ao que o banco guarda em `role_permissions`. Se cobrir, avise o dono para aprovar; se faltar parte, continue **na mesma branch** apenas se você a criou — caso contrário, registre o que falta no progresso e avise.
Arquivos e objetos a tocar: nenhum nesta sessão (coordenação com a PR #256).
Não tocar / armadilhas: nunca edite a branch da PR #256 se não foi você que a criou.
Depende de: 031 · Libera: 114
Risco e como reverter: médio (muda autorização). Reverter = reverter a PR.
Precisa de aprovação humana antes do merge: sim (autorização)
Como verificar: revogue uma permissão de um papel na tela e confirme que o usuário daquele papel perde o acesso correspondente **sem** precisar sair e entrar de novo (ou após o próximo carregamento, conforme a PR definir). Registre o teste.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 114 — Remover o mapa de permissões por rota que não corresponde a nenhuma rota
Onda 8 / Severidade Baixa / Camada: front (código morto)
Achados resolvidos: NAV-04
Problema hoje: `src/features/auth/hooks/useRBAC.tsx:91-110` define `ROUTE_PERMISSIONS` com sete chaves que **não são rotas** do sistema (`/jobs`, `/reports`, `/maintenance`, `/quality`, `/technical-sheets`, `/shifts`, `/bitrix`), e `canAccessRoute` (`:119,207-218,224`) não é usado em nenhum lugar; `src/contexts/PermissionsContext.tsx:8-23` está na mesma situação.
Causa raiz: tentativa anterior de autorização por rota, abandonada sem remoção.
Caminho recomendado: remova `ROUTE_PERMISSIONS`, `canAccessRoute` e `src/contexts/PermissionsContext.tsx`. Faça **depois** da etapa 113, para não conflitar com a PR #256, que mexe no mesmo arquivo. Se o dono quiser autorização por rota de verdade, isso é funcionalidade nova e deve nascer com os caminhos reais do registro de rotas — registre em "Achados novos" em vez de reaproveitar o mapa velho.
Arquivos e objetos a tocar: `src/features/auth/hooks/useRBAC.tsx`, `src/contexts/PermissionsContext.tsx` (remoção).
Não tocar / armadilhas: confirme que ninguém importa o contexto antes de apagar (`grep -rn "PermissionsContext" src/`); não remova `ROLE_PERMISSIONS` (usado como reserva pela PR #256).
Depende de: 113 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: `npx tsc --noEmit -p tsconfig.app.json` limpo e `grep -rn "canAccessRoute\|PermissionsContext" src/` sem resultado.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 115 — Decidir o destino das dez funções de servidor publicadas e sem uso
Onda 8 / Severidade Média / Camada: edge functions (higiene)
Achados resolvidos: DEP-02
Problema hoje: catorze funções constam como órfãs (`origin/contexto:docs/contexto/codigo/baseline.json` → `edges_orfas`); descontando as que o agendador chama, sobram dez publicadas e **ativas** sem nenhum chamador: `backup-scheduler`, `cleanup-security-logs`, `erp-api`, `excel-export`, `external-db-bridge`, `image-optimizer`, `metrics-collector`, `security-alert`, `send-email-report`, `validate-login-ip`.
Causa raiz: funções criadas para planos não concluídos e nunca retiradas.
Caminho recomendado: liste as dez para o dono com uma linha cada ("o que faria, quem deveria chamar") e separe em três grupos: **agendar** (as que o negócio quer — vai para a etapa 063), **desativar** (as que não serão usadas), **manter** (as que têm consumidor externo previsto, como `erp-api`). Desative pelo painel, mantendo o código no repositório. Cada função publicada é um endereço aberto na internet: quanto menos houver sem dono, menor a chance de uma delas virar porta de entrada.
Arquivos e objetos a tocar: configuração das funções no painel; `supabase/functions/REGISTRY.md` (atualizar o registro).
Não tocar / armadilhas: não desative `csp-report` (recebe relatórios do navegador) nem as chamadas por gatilho do banco (`send-tpm-email`, `send-loss-risk-alert`); confira em `origin/contexto:docs/contexto/supabase/cron.md` e nos gatilhos antes.
Depende de: 057, 063 · Libera: —
Risco e como reverter: baixo; reverter = reativar.
Precisa de aprovação humana antes do merge: sim (infraestrutura)
Como verificar: a lista de funções ativas no painel passa a conter apenas as com dono conhecido; `REGISTRY.md` reflete a decisão. Cole a lista final.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 116 — Resolver a rotina de backup que grava numa tabela inexistente
Onda 1 / Severidade Alta / Camada: edge function + banco
Achados resolvidos: BD-19
Problema hoje: `supabase/functions/backup-scheduler/index.ts:77` grava `.from("backups")` — tabela que **não existe** no banco (`git show origin/contexto:docs/contexto/supabase/tables.md | grep -c backups` → 0; existe `backup_logs`, que é outra coisa). A função não tem agendamento nem chamador, e a credencial que ela espera (`BACKUP_API_KEY`) não está entre os segredos do projeto. Ou seja: **não existe rotina de backup própria funcionando**, e o projeto está sem recuperação a um ponto no tempo (etapa 026).
Causa raiz: recurso de backup escrito pela metade, nunca ligado, e a ausência nunca apareceu porque nada o executa.
Caminho recomendado: trate como decisão de risco, não como correção de código. Apresente ao dono: hoje a única proteção é o backup diário do plano Supabase; o PITR está desligado (etapa 026) e esta função não funciona. Se o dono quiser backup próprio (exportação periódica para fora do Supabase), então: crie a tabela de controle por migration, provisione a credencial, agende (etapa 063) e **teste uma restauração**. Se não quiser, remova a função e ajuste `docs/operacoes/RUNBOOK.md` para não prometer o que não existe. Não deixe como está: um painel que lista "backup_logs" vazio parece "nenhum backup recente", não "rotina inexistente".
Arquivos e objetos a tocar: `supabase/functions/backup-scheduler/index.ts`; nova migration (se criar a tabela); `docs/operacoes/RUNBOOK.md`.
Não tocar / armadilhas: não confunda `backups` com `backup_logs` (esta existe e tem policy de leitura para gestor); não implemente exportação de dados sem falar de custo e de onde o arquivo vai ficar.
Depende de: 026 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: sim (custo, infraestrutura e possivelmente DDL)
Como verificar: ou a rotina roda e grava registro de backup com arquivo verificável, ou a função sai e o documento de operação passa a dizer qual é a proteção real. Registre a decisão e a evidência.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 117 — Limpar do arquivo de tipos as oito tabelas que não existem no banco
Onda 8 / Severidade Baixa / Camada: front (tipos gerados)
Achados resolvidos: CI-04
Problema hoje: `src/integrations/supabase/types.ts` declara oito tabelas ausentes do banco real: `email_verification_tokens`, `gamification_settings`, `packaging_equipment`, `packaging_waste`, `shipment_costs`, `tpm_execution_checklist`, `webauthn_challenges`, `webauthn_credentials` (`origin/contexto:docs/contexto/codigo/baseline.json` → `tabelas_so_no_types`). Nenhuma é usada no código (verificado: zero chamadas `from('<tabela>')`), então hoje é ruído — mas é ruído que faz o próximo agente achar que a funcionalidade existe.
Causa raiz: arquivo gerado a partir de um estado antigo do banco (ou de outro projeto) e nunca regenerado.
Caminho recomendado: regenere o arquivo (é gerado, conforme `AGENTS.md`) — a etapa 046 já faz isso por outro motivo, então **faça as duas juntas** se ainda não tiver feito a 046. Confira no diff que as oito saem e que nada mais sai por engano. Nove outras tabelas aparecem com divergência entre migration e tipos (`tabelas_com_drift_migration_vs_types`): a regeneração resolve as duas listas de uma vez.
Arquivos e objetos a tocar: `src/integrations/supabase/types.ts`.
Não tocar / armadilhas: não apague entradas à mão (o arquivo é gerado e seria sobrescrito); se o typecheck quebrar, corrija só o que o compilador apontar.
Depende de: 046 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: `grep -c "webauthn_credentials" src/integrations/supabase/types.ts` → 0 e typecheck limpo.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 118 — Corrigir o item de menu que não leva a lugar nenhum
Onda 7 / Severidade Baixa / Camada: front (navegação)
Achados resolvidos: NAV-05
Problema hoje: há um item de navegação apontando para `#` (`origin/contexto:docs/contexto/codigo/baseline.json` → `menu_sem_destino`: "Voltar -> #").
Causa raiz: link de voltar implementado como âncora vazia.
Caminho recomendado: localize o item (`grep -rn "href=\"#\"\|to=\"#\"" src/components`) e troque por navegação de histórico (`navigate(-1)`) ou pelo destino correto. Clique em "Voltar" que não volta é o tipo de defeito que o usuário atribui a lentidão do sistema.
Arquivos e objetos a tocar: o componente de navegação encontrado.
Não tocar / armadilhas: `navigate(-1)` na primeira tela da sessão não tem para onde ir — nesse caso aponte para a tela inicial.
Depende de: — · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: o botão "Voltar" retorna à tela anterior; na primeira tela, leva à inicial.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 119 — Remover os trinta componentes que ninguém usa
Onda 8 / Severidade Baixa / Camada: front (código morto)
Achados resolvidos: CI-05
Problema hoje: trinta componentes não são importados em lugar algum (`origin/contexto:docs/contexto/codigo/baseline.json` → `componentes_orfaos`), entre eles `src/components/auth/AuthSignupForm.tsx`, `src/components/navigation/GlobalSearch.tsx`, `src/components/machines/MachineDetailsModal.tsx`, `src/components/traceability/CreateLotModal.tsx`, `src/components/dashboard/QuickActions.tsx` e dez componentes de biblioteca de interface (`accordion`, `carousel`, `drawer`, `sidebar`, `stepper`, ...).
Causa raiz: componentes criados para telas que mudaram de rumo, e arquivos da biblioteca de interface instalados por padrão.
Caminho recomendado: separe em dois grupos e trate em PRs diferentes. **Grupo 1 — componentes de domínio** (os 20 com nome de negócio): cada um pode ser funcionalidade esquecida, não lixo — antes de apagar, verifique se existe fluxo que deveria usá-lo (`CreateLotModal` e `MachineDetailsModal` são candidatos óbvios a "funcionalidade incompleta") e registre em "Achados novos" quando for o caso; apague só os que forem claramente substituídos. **Grupo 2 — biblioteca de interface** (`src/components/ui/*`): apague sem cerimônia, são arquivos de catálogo. Não apague tudo de uma vez: um deles pode estar sendo usado por via dinâmica.
Arquivos e objetos a tocar: os arquivos do grupo escolhido em cada PR.
Não tocar / armadilhas: confirme com `grep -rn "<NomeDoComponente"` **e** `grep -rn "NomeDoArquivo"` (importação por caminho); `sidebar.tsx` da biblioteca pode ser importado por outro componente da própria biblioteca.
Depende de: — · Libera: —
Risco e como reverter: baixo (arquivos recuperáveis pelo histórico).
Precisa de aprovação humana antes do merge: não
Como verificar: build e typecheck limpos; a contagem de `componentes_orfaos` na próxima coleta da branch `contexto` deve cair. Registre a contagem antes e depois.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 120 — Quebrar os nove ciclos de importação
Onda 8 / Severidade Baixa / Camada: front (arquitetura)
Achados resolvidos: CI-06
Problema hoje: há nove ciclos de importação no código (`origin/contexto:docs/contexto/codigo/baseline.json` → `ciclos_de_import`), um deles entre o cliente do banco e o registro de erro, hoje contornado com importação dinâmica (`src/lib/logger.ts:60-63`, com comentário explicando o motivo).
Causa raiz: arquivos de índice (`index.ts`) reexportando módulos que importam de volta o próprio índice.
Caminho recomendado: liste os ciclos com a ferramenta de grafo do próprio repositório (`npm run graph:build` e depois `npm run graph:query -- "ciclos de import" --budget 1500`) e resolva um por PR, importando o arquivo específico em vez do índice. Não troque a importação dinâmica do registro de erro por estática: ela existe justamente para quebrar um ciclo real.
Arquivos e objetos a tocar: conforme o ciclo tratado.
Não tocar / armadilhas: ciclo entre tipos (`import type`) é inofensivo em execução — priorize os que envolvem valor em tempo de execução.
Depende de: — · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: a contagem de `ciclos_de_import` cai na próxima coleta; build limpo. Registre a contagem.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 121 — Corrigir a medição de dívida que engana quem planeja
Onda 8 / Severidade Média / Camada: ferramentas de apoio
Achados resolvidos: CI-03
Problema hoje: o gerador de contexto publica, em `origin/contexto:docs/contexto/codigo/baseline.json` → `qualidade`, os números `any: 171` e `console_log: 177`. Medido no escopo que importa, os valores reais são **outros**: `grep -rn "console\.log" src --include=*.ts --include=*.tsx | grep -v '\.test\.' | wc -l` → **1**; e a própria trava oficial do projeto registra `{"baseline": 2}` em `.any-baseline.json`. A diferença vem de a métrica contar ocorrências em `scripts/` e `supabase/functions/` (onde `console` **é** o canal de registro legítimo) e a palavra "any" fora de posição de tipo.
Causa raiz: métrica de qualidade calculada sobre todo o repositório, sem separar o código do aplicativo das ferramentas e funções de servidor.
Caminho recomendado: ajuste o gerador (`scripts/ai-context/gerar.mjs`, seção que monta `qualidade`) para contar `console.log` e `any` **apenas** em `src/`, excluindo arquivos de teste, e para reaproveitar a contagem oficial de `any` que `scripts/check-any-baseline.mjs` já faz (em vez de uma segunda heurística). Publique os dois números separados: aplicativo e ferramentas. Esta etapa não melhora o código do produto — ela evita que o próximo agente (ou o próximo plano) gaste dias atacando uma dívida que não existe, como aconteceu nesta auditoria antes da conferência.
Arquivos e objetos a tocar: `scripts/ai-context/gerar.mjs`.
Não tocar / armadilhas: não mexa em `scripts/check-any-baseline.mjs` (é a trava que funciona); não altere o valor de `.any-baseline.json`.
Depende de: — · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: rode `node scripts/ai-context/gerar.mjs` e confirme que `qualidade.console_log` passa a refletir a contagem de `src/` (hoje 1) e `qualidade.any` passa a bater com `.any-baseline.json` (hoje 2). Cole os dois números antes e depois.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 122 — Decidir o que fazer com os 28 arquivos acima de 500 linhas
Onda 8 / Severidade Baixa / Camada: front (organização)
Achados resolvidos: CI-03
Problema hoje: 28 arquivos passam de 500 linhas (`origin/contexto:docs/contexto/codigo/baseline.json` → `qualidade.arquivos_acima_500_linhas`), e vários deles são justamente os que esta auditoria apontou com defeito em mais de um ponto (`src/pages/PendingQueue.tsx`, `src/pages/KanbanBoard.tsx`, `supabase/functions/bitrix24-sync/index.ts`).
Causa raiz: telas que acumularam responsabilidades (lista, filtro, ações em massa, modal) num único arquivo.
Caminho recomendado: **não faça uma força-tarefa de refatoração** — o repositório proíbe reescrita sem pedido, e dividir arquivo sem motivo gera risco sem ganho. Em vez disso: registre a lista em `05-PROGRESSO.md` e combine a regra de que, **quando uma etapa deste plano tocar um desses arquivos**, o executor extrai apenas o trecho que precisou mudar (por exemplo, o diálogo de confirmação da etapa 037 sai de `PendingQueue.tsx` para um componente próprio). Assim a organização melhora como efeito de correções já necessárias, sem PR de refatoração pura.
Arquivos e objetos a tocar: `docs/qa/05-PROGRESSO.md` (registro da lista e da regra).
Não tocar / armadilhas: não abra PR que só move código; não divida `src/integrations/supabase/types.ts` (é gerado).
Depende de: — · Libera: —
Risco e como reverter: nenhum (é registro).
Precisa de aprovação humana antes do merge: não
Como verificar: a lista dos 28 arquivos está no progresso com a regra escrita. Cole a lista.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 123 — Deixar uma única verificação de assinatura no webhook do CRM
Onda 2 / Severidade Alta / Camada: edge function (integração)
Achados resolvidos: INT-02
Problema hoje: `supabase/functions/bitrix24-sync/index.ts` verifica o webhook **duas vezes, com segredos diferentes, no mesmo parâmetro**: em `:875-878` compara `x-bitrix-webhook-secret` ou `token` com `BITRIX24_WEBHOOK_SECRET`, e em `:990-1006` compara de novo com `BITRIX24_WEBHOOK_TOKEN`. Como o Bitrix envia um único valor, ele nunca satisfaz as duas portas — e nenhum dos dois segredos existe no projeto (`origin/contexto:docs/contexto/supabase/edge-functions.md`).
Causa raiz: duas gerações de verificação somadas em vez de substituídas.
Caminho recomendado: mantenha **uma** verificação: remova o bloco `:990-1006` (o de `BITRIX24_WEBHOOK_TOKEN`) e deixe só `verifyBitrixWebhookSecret`, que já falha fechado e já roda no gate por ação (`:900-907`). Faça depois da etapa 017 (decisão sobre a integração) e junto do provisionamento do segredo, senão o webhook continua recusando tudo.
Arquivos e objetos a tocar: `supabase/functions/bitrix24-sync/index.ts`.
Não tocar / armadilhas: não remova a verificação que **fica** (a função é pública, `verify_jwt=false`); não aceite o segredo por parâmetro de URL se puder exigir cabeçalho (parâmetro de URL vai para registro de acesso).
Depende de: 017 · Libera: 124, 125
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: chamada de webhook sem o segredo → 401; com o segredo correto no cabeçalho → 200. Registre os dois.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 124 — Parar de registrar sincronização bem-sucedida quando a gravação falhou
Onda 2 / Severidade Alta / Camada: edge function (integração)
Achados resolvidos: INT-03
Problema hoje: em quatro pontos de `supabase/functions/bitrix24-sync/index.ts` (`:639-652`, `:746-779`) as chamadas de `insert`/`update` em `jobs` são feitas **sem** checar o retorno de erro, e o resultado é empurrado para a lista de sincronizados; `bitrix24_sync_history` (`:1011-1020`) registra `success` mesmo quando nada foi gravado.
Causa raiz: resultado da gravação ignorado.
Caminho recomendado: desestruture `{ error }` nas quatro chamadas e, no erro, empurre para a lista de erros em vez da de sincronizados (no caminho de webhook, devolva `{ error }`), deixando o registro de histórico cair em `error`. A tabela `bitrix24_sync_history` tem ~500 linhas (`origin/contexto:docs/contexto/supabase/stats.md`) — ou seja, há histórico que hoje pode estar mentindo.
Arquivos e objetos a tocar: `supabase/functions/bitrix24-sync/index.ts`.
Não tocar / armadilhas: não interrompa o laço no primeiro erro (um negócio inválido não deve parar a importação dos outros); acumule e reporte.
Depende de: 123 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: force um erro (negócio com quantidade inválida) e confirme que `bitrix24_sync_history` registra `error` com a mensagem; um negócio válido continua registrando `success`.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 125 — Limitar as chamadas ao webhook público do CRM
Onda 2 / Severidade Alta / Camada: edge function (segurança)
Achados resolvidos: INT-04
Problema hoje: `bitrix24-sync` é a única função pública do sistema com acesso de serviço (`verify_jwt = não` em `origin/contexto:docs/contexto/supabase/edge-functions.md`; usa a chave de serviço internamente) e **não tem limite de requisições** (`:882-924`, `:1214-1258`).
Causa raiz: função pública sem contenção de volume.
Caminho recomendado: aplique `checkRateLimit` de `supabase/functions/_shared/rateLimit.ts` logo depois de criar o cliente e **antes** do roteamento por ação, exatamente como `supabase/functions/webhook-handler/index.ts:24-36` já faz (limite por endereço de origem). Mantenha o limite generoso para não derrubar sincronização legítima, e registre a recusa.
Arquivos e objetos a tocar: `supabase/functions/bitrix24-sync/index.ts`.
Não tocar / armadilhas: o retorno do fluxo de autorização do CRM chega do navegador do usuário — não limite tão baixo que atrapalhe a reconexão; não mude `verify_jwt` (quebra o retorno, ver `PENDENCIAS.md` item 2).
Depende de: 123 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: dispare chamadas acima do limite e confirme resposta 429; abaixo do limite, 200. Registre os dois.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 126 — Importar todas as páginas de negócios do CRM, não só a primeira
Onda 3 / Severidade Alta / Camada: edge function (integração)
Achados resolvidos: INT-05
Problema hoje: `supabase/functions/bitrix24-sync/index.ts:596-601` chama `crm.deal.list` **sem** parâmetro de início de página e usa `result.result || []` (`:657-659`), ignorando o indicador de próxima página que a API devolve. O Bitrix24 devolve 50 registros por página: tudo além disso é descartado silenciosamente.
Causa raiz: paginação da API externa não implementada.
Caminho recomendado: laço de paginação enviando o deslocamento e repetindo enquanto a resposta indicar próxima página, acumulando os negócios, com um teto de páginas para não estourar o tempo da função. Use o total informado pela API para registrar quantos vieram de quantos — assim o histórico de sincronização passa a mostrar se a importação foi completa.
Arquivos e objetos a tocar: `supabase/functions/bitrix24-sync/index.ts`.
Não tocar / armadilhas: função de servidor tem tempo máximo de execução — com muitos negócios, prefira processar em blocos e guardar o ponto de parada em vez de tentar tudo numa chamada.
Depende de: 124 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: com mais de 50 negócios no período, confirme que a contagem importada corresponde ao total informado pela API. Cole os dois números.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 127 — Enviar e-mail com remetente do domínio da empresa
Onda 2 / Severidade Alta / Camada: edge function (integração)
Achados resolvidos: INT-06
Problema hoje: seis funções enviam com remetente de um domínio de teste do provedor: `grep -rn "resend.dev" supabase/functions/*/index.ts` mostra `cron-alert-email/index.ts:26` (`"Fast Gravações <alertas@resend.dev>"`), `new-device-alert/index.ts:171`, `send-email-report/index.ts:347`, `send-loss-risk-alert/index.ts:177`, `send-tpm-email/index.ts:135` e outra. Esse domínio não pertence à empresa.
Causa raiz: remetente de exemplo escrito em cada função.
Caminho recomendado: centralize o remetente num helper que lê um segredo (`RESEND_FROM`), com reserva para o domínio verificado, e troque as seis ocorrências — mesmo padrão que a etapa 007 aplica a `APP_URL`. Faça junto da etapa 008 (SMTP/domínio verificado): sem domínio verificado no provedor, o envio com remetente próprio é recusado. Com remetente de domínio de teste, a mensagem tende a cair em caixa de spam e não pode ser respondida.
Arquivos e objetos a tocar: `supabase/functions/_shared/` (novo helper), as seis funções.
Não tocar / armadilhas: não invente um endereço (`naoresponda@...`) sem combinar com o dono; confira o domínio verificado antes.
Depende de: 008, 013 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: sim (segredo e identidade de comunicação)
Como verificar: um envio de teste chega com remetente do domínio da empresa e sem aviso de domínio não verificado. Cole o cabeçalho do remetente.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 128 — Limitar o uso do assistente técnico, que custa por pergunta
Onda 5 / Severidade Média / Camada: edge function
Achados resolvidos: INT-07
Problema hoje: `supabase/functions/technical-assistant/index.ts:421-435` exige usuário autenticado — o próprio comentário explica o motivo ("cada chamada vai para um serviço pago") — mas **não** há limite por usuário; `:497-515` chama o serviço externo a cada pergunta.
Causa raiz: proteção de custo feita só por autenticação.
Caminho recomendado: aplique `checkRateLimit` de `supabase/functions/_shared/rateLimit.ts` com identidade por usuário, logo após a autenticação, no formato de `supabase/functions/webhook-handler/index.ts:24-36`. Combine o teto com o dono (por exemplo, algumas dezenas de perguntas por hora por pessoa). Hoje o risco é teórico porque a chave do serviço de IA não está configurada (etapa 018) — faça esta etapa **antes** de ligar a chave, não depois.
Arquivos e objetos a tocar: `supabase/functions/technical-assistant/index.ts`.
Não tocar / armadilhas: não limite por endereço de origem (vários operadores saem pelo mesmo endereço na fábrica); use o usuário.
Depende de: 018 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: faça chamadas acima do teto com a mesma conta e confirme 429; com outra conta, 200. Registre os dois.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 129 — Não contar notificação como enviada quando o envio não acontece
Onda 5 / Severidade Média / Camada: edge function
Achados resolvidos: INT-08
Problema hoje: `supabase/functions/send-push-notification/index.ts:336-355,371-391` tem um caminho de reserva: sem as chaves de notificação configuradas, apenas registra no console que "enviaria" e segue contando sucesso. (Hoje as chaves **existem** no projeto — `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` —, então o caminho não dispara; o defeito é a armadilha deixada para quando elas faltarem, por exemplo em outro ambiente.)
Causa raiz: caminho de reserva que simula sucesso.
Caminho recomendado: falhe explícito: sem as chaves, devolva erro de configuração **antes** de buscar as inscrições, ou no mínimo não incremente o contador de sucesso e grave a notificação com estado de falha. Mesmo princípio da etapa 014.
Arquivos e objetos a tocar: `supabase/functions/send-push-notification/index.ts`.
Não tocar / armadilhas: não quebre o fluxo quando o usuário simplesmente não tem inscrição de notificação (caso legítimo, diferente de chave ausente).
Depende de: — · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: em ambiente sem as chaves, a chamada deve responder erro de configuração; com as chaves, envio normal. Registre os dois.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 130 — Corrigir a página Master API, que mostra chave no cliente e documenta endereços inexistentes
Onda 3 / Severidade Média / Camada: front
Achados resolvidos: INT-09
Problema hoje: `src/pages/MasterAPIPage.tsx:27` lê `import.meta.env.VITE_MASTER_API_DISPLAY_KEY` e a exibe, copiável, sob o rótulo "API Secret Key" (`:74-99`) — e tudo em `VITE_*` vai para o pacote público do site. Além disso, os endereços anunciados na tela (`:35-40`) não correspondem ao que a função de API realmente serve (`supabase/functions/erp-api/index.ts:91-137`).
Causa raiz: tela de vitrine com nome de "chave secreta" e documentação desatualizada.
Caminho recomendado: (1) pare de exibir qualquer valor vindo de `VITE_*` como segredo: se a tela precisa mostrar uma chave, ela deve vir de uma chamada autenticada ao servidor, nunca do pacote do site; o mais simples é remover o campo e instruir o gestor a obter a chave pelo canal adequado. (2) Alinhe a lista de endereços ao que `erp-api` serve de fato. Esta dívida também está registrada em `docs/plano-190-etapas-261122.md:665-667`, com verificação definida; use a mesma verificação. Confirme antes se a variável está de fato configurada na Vercel — se não estiver, a tela já mostra vazio e o risco é só de confusão.
Arquivos e objetos a tocar: `src/pages/MasterAPIPage.tsx`.
Não tocar / armadilhas: nunca registre o valor da chave em PR, commit ou mensagem; se a variável existir na Vercel, peça ao dono a **rotação** depois da remoção (o valor pode ter sido publicado).
Depende de: 062 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: sim (envolve segredo possivelmente exposto e sua rotação)
Como verificar: `grep -o VITE_MASTER_API_DISPLAY_KEY dist/assets/*.js` após o build deve retornar vazio; a tela não exibe campo de chave. Registre a saída do comando.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 131 — Corrigir o monitor de saúde, que grava em colunas inexistentes
Onda 2 / Severidade Alta / Camada: edge function
Achados resolvidos: EDG-08
Problema hoje: `supabase/functions/health-monitor/index.ts:103-107` insere em `security_events` os campos `description` e `metadata`, que **não existem** nessa tabela (`origin/contexto:docs/contexto/supabase/tables/public/security_events.md`); a função `security-alert/index.ts:84-91` usa o contrato correto. O monitor roda a cada 5 minutos pelo agendador (`health-monitor-every-5min`, `origin/contexto:docs/contexto/supabase/cron.md`), então a gravação falha a cada ciclo — e a degradação das funções de servidor nunca é registrada.
Causa raiz: duas gerações de esquema da tabela de eventos de segurança; o monitor ficou na antiga.
Caminho recomendado: troque o insert para o contrato real, copiando `supabase/functions/security-alert/index.ts:84-91` (mesmo projeto, mesma tabela, forma correta). Verifique também se o retorno de erro está sendo checado — se não estiver, acrescente, senão o próximo desencontro de esquema volta a passar em silêncio.
Arquivos e objetos a tocar: `supabase/functions/health-monitor/index.ts`.
Não tocar / armadilhas: não altere a tabela `security_events` para casar com o código; o contrato certo é o da tabela.
Depende de: 003 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: force uma degradação (ou invoque a função manualmente) e confirme linha nova em `security_events` com `event_type='HEALTH_DEGRADED'`. Cole a linha.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 132 — Decidir o destino da fila de notificações de manutenção, que não tem quem a alimente
Onda 4 / Severidade Alta / Camada: edge function + produto
Achados resolvidos: EDG-09
Problema hoje: `supabase/functions/tpm-notifications/index.ts:37-53` tem o laço que **deveria** gerar as notificações, e ele não gera nada (o trecho está marcado como pendente no próprio código); a tabela `tpm_notification_queue` existe e a função consumidora também, mas nada produz item para a fila. A tela correspondente (`src/features/maintenance/components/TPMNotifications*`) mostra, portanto, uma fila sempre vazia.
Causa raiz: produtor da fila nunca implementado; o consumidor foi entregue.
Caminho recomendado: pergunte ao dono se o aviso de manutenção deve sair por essa fila ou pelo caminho que **já funciona** (`daily-maintenance-summary`, que roda e envia resumo). Se a fila morre: remova a função consumidora, a tela e a tabela do fluxo (mantendo a tabela no banco), e registre a decisão. Se a fila vive: implemente o enfileiramento no ponto marcado, usando as colunas que já existem e os modelos de mensagem já escritos — e só então agende a rotina (etapa 063). Duas rotas de notificação de manutenção meio-feitas é pior do que uma inteira.
Arquivos e objetos a tocar: `supabase/functions/tpm-notifications/index.ts`; eventualmente a tela de TPM.
Não tocar / armadilhas: não apague `tpm_notification_logs` nem a fila (histórico); confira antes se `send-tpm-email` (chamada por gatilho) já cobre o caso de uso.
Depende de: 063 · Libera: 133
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: sim (decisão de produto)
Como verificar: se implementada, um agendamento vencido gera item na fila e o consumidor o processa; se descontinuada, a tela deixa de prometer a fila. Registre a decisão e a evidência.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 133 — Fazer a fila de notificações reprocessar o que falhou
Onda 5 / Severidade Média / Camada: edge function
Achados resolvidos: EDG-10
Problema hoje: `supabase/functions/tpm-notifications/index.ts:56-62` busca apenas itens com `status = 'pending'`, mas o caminho de falha grava `status = 'failed'` (`:115-129`) — ou seja, item que falhou **nunca** é tentado de novo, apesar de existirem colunas de controle de tentativa e um índice no banco preparado para isso.
Causa raiz: estado de falha gravado fora do conjunto que a consulta busca.
Caminho recomendado: alinhe a consulta ao que o banco já suporta: busque `status in ('pending','failed')` e compare a contagem de tentativas com a coluna de limite (em vez do número fixo 3). Faça depois da etapa 132 — se a fila for descontinuada, esta etapa não se aplica.
Arquivos e objetos a tocar: `supabase/functions/tpm-notifications/index.ts`.
Não tocar / armadilhas: garanta o respeito ao intervalo entre tentativas, senão a rotina reenvia em laço; não reprocesse item já entregue.
Depende de: 132 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: marque um item como falho manualmente em ambiente de teste e confirme que a execução seguinte o tenta novamente, respeitando o limite de tentativas.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 134 — Calcular o relatório por e-mail no banco, não sobre uma fatia das OS
Onda 3 / Severidade Alta / Camada: edge function
Achados resolvidos: EDG-11
Problema hoje: `supabase/functions/send-email-report/index.ts:134-151` monta a consulta que alimenta **todos** os números do relatório sem `limit` nem paginação, e soma em memória. O PostgREST corta a resposta no limite do projeto (`max_rows: 1000`, `origin/contexto:docs/contexto/supabase/project-config.md`): acima disso, o relatório é calculado sobre uma fatia e apresentado como total. O mesmo padrão aparece em `metrics-collector/index.ts:32-34` e `excel-export/index.ts:8x`.
Causa raiz: agregação feita no cliente da função sobre resultado paginado pelo servidor.
Caminho recomendado: troque por agregação no banco: uma função `SECURITY DEFINER` que receba período e filtros e devolva os totais somados — decisão que o projeto já tomou em outros pontos. Enquanto a base é pequena (hoje `jobs` tem ~390 linhas, `stats.md`) o erro não aparece; ele aparece justamente quando o negócio cresce, e aí o número errado já estará circulando por e-mail. Se preferir um passo intermediário, pagine explicitamente com `range` em laço — mas a agregação no banco é mais simples e mais barata.
Arquivos e objetos a tocar: nova migration (função de agregação), `supabase/functions/send-email-report/index.ts`.
Não tocar / armadilhas: não aumente `max_rows` do projeto para "resolver" (afeta toda a API); confira se `excel-export` e `metrics-collector` precisam do mesmo tratamento e registre como etapa própria se precisarem.
Depende de: 003 · Libera: —
Risco e como reverter: médio (DDL). Reverter = voltar a consulta.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: com mais de 1000 OS no período (ou reduzindo artificialmente o limite em ambiente de teste), compare o total do relatório com `SELECT count(*)`: devem bater. Cole os dois números.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 135 — Mostrar horário de Brasília nos e-mails e na ordem de serviço impressa
Onda 3 / Severidade Média / Camada: edge function
Achados resolvidos: EDG-12
Problema hoje: três pontos formatam data e hora com `toLocaleString('pt-BR')` **sem** fuso horário, e o ambiente das funções de servidor roda em UTC: `supabase/functions/pdf-generator/index.ts:121`, `send-tpm-email/index.ts:119`, `send-loss-risk-alert/index.ts:151`. Há também cálculo de início de dia com `setHours(0,0,0,0)` em `metrics-collector`. Resultado: horário três horas adiantado na ordem de serviço impressa e nos avisos.
Causa raiz: formatação de data sem fuso num ambiente que não é o fuso do usuário.
Caminho recomendado: passe `{ timeZone: 'America/Sao_Paulo' }` no `toLocaleString` dos três pontos de exibição — `new-device-alert/index.ts:164-168` já faz exatamente isso e serve de referência. Em `metrics-collector`, derive os limites do dia no fuso de São Paulo e converta para UTC na consulta (o aplicativo já tem esse cuidado desde a correção de fuso do commit `ca42441b`, que trata o mesmo problema no front).
Arquivos e objetos a tocar: `supabase/functions/pdf-generator/index.ts`, `supabase/functions/send-tpm-email/index.ts`, `supabase/functions/send-loss-risk-alert/index.ts`, `supabase/functions/metrics-collector/index.ts`.
Não tocar / armadilhas: não troque o fuso do ambiente da função (afeta tudo); não altere datas gravadas no banco (devem continuar em UTC).
Depende de: 003 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: gere uma ordem de serviço em PDF às 21h de Brasília e confirme que a data impressa é a do dia corrente, não a do dia seguinte. Cole o texto gerado.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 136 — Usar gravação idempotente no registro de envio do relatório
Onda 5 / Severidade Média / Camada: edge function
Achados resolvidos: EDG-13
Problema hoje: `supabase/functions/send-email-report/index.ts:368-379` registra o envio com `insert` simples em `daily_summaries`, tabela que tem índice único por data e tipo; o retorno de erro não é checado. Um segundo envio no mesmo dia falha em silêncio. A função irmã faz certo: `daily-maintenance-summary/index.ts:214-225` usa gravação com resolução de conflito.
Causa raiz: duas funções escrevendo na mesma tabela com estratégias diferentes.
Caminho recomendado: copie o padrão da função irmã (gravação com `onConflict` por data e tipo) e capture o erro com registro. Se o negócio precisar guardar **cada** envio separadamente, então a tabela é a errada — nesse caso registre em "Achados novos" e não mude a tabela por conta própria.
Arquivos e objetos a tocar: `supabase/functions/send-email-report/index.ts`.
Não tocar / armadilhas: não remova o índice único para fazer o `insert` passar.
Depende de: 013 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: envie o relatório duas vezes no mesmo dia e confirme que a segunda execução atualiza o registro em vez de falhar. Cole as duas respostas.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 137 — Não deixar a máquina sem previsão quando a gravação da predição falha
Onda 5 / Severidade Média / Camada: edge function
Achados resolvidos: EDG-14
Problema hoje: `supabase/functions/ml-predictions/index.ts:229-235` **desativa** as predições anteriores da máquina e só depois insere a nova (`:236-255`), sem transação e sem checar o retorno da desativação. Se a inserção falhar, a máquina fica sem nenhuma previsão ativa — e a tela de manutenção preditiva mostra vazio como se não houvesse risco.
Causa raiz: duas escritas dependentes sem transação.
Caminho recomendado: mova as duas escritas para uma função de banco transacional (`SECURITY DEFINER`, com caminho de busca fixo) que desative as anteriores e insira a nova na mesma transação, e chame-a da função de servidor. Alternativa de menor diff: inserir primeiro e desativar depois (invertendo a ordem), o que no pior caso deixa duas previsões ativas em vez de nenhuma — degradação preferível. Escolha a transacional se for fazer uma vez só.
Arquivos e objetos a tocar: nova migration (função transacional) e `supabase/functions/ml-predictions/index.ts`; ou apenas a função, se optar pela inversão de ordem.
Não tocar / armadilhas: a tela de predições filtra por ativo — se houver duas ativas, confirme como ela escolhe (pode mostrar a mais antiga).
Depende de: 003 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: sim, se criar função no banco; não, se apenas inverter a ordem
Como verificar: force erro na inserção (payload inválido) e confirme que a máquina continua com a previsão anterior ativa. Cole o estado antes e depois.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

---

## Onda 8 — Infraestrutura, CI e observabilidade

### Etapa 138 — Fazer o site esperar o banco antes de ir ao ar
Onda 2 / Severidade Alta / Camada: infraestrutura de publicação
Achados resolvidos: INF-01
Problema hoje: o site (Vercel) e o backend (migrations + funções de servidor) sobem por caminhos **independentes**, sem nenhuma ordenação: `.github/workflows/deploy.yml:3-6` dispara em `push` na `main` (sem esperar a CI) e o `vercel.json` não tem nenhum comando de espera. Na prática, um merge que precisa de coluna nova pode publicar a interface **antes** da migration — e a tela quebra para quem estiver usando.
Causa raiz: duas publicações disparadas pelo mesmo evento, sem dependência entre elas.
Caminho recomendado: use `ignoreCommand` no `vercel.json` apontando para um script que só libera o build de produção quando o `deploy.yml` daquele commit terminou — o padrão de espera por execução de workflow já existe no repositório (`.github/workflows/inventario-estado-semanal.yml`). Alternativa: tirar o deploy do front do gatilho automático e disparar por workflow após o backend. A primeira opção é menos invasiva. Combine com o dono: durante o ajuste, o deploy do site fica mais lento.
Arquivos e objetos a tocar: `vercel.json`, novo script em `scripts/ci/`.
Não tocar / armadilhas: não quebre o deploy de pré-visualização das PRs (o comando de espera deve valer só para produção); teste o script fora do caminho crítico antes.
Depende de: 003 · Libera: —
Risco e como reverter: médio (pode travar deploy do site). Reverter = remover o `ignoreCommand`.
Precisa de aprovação humana antes do merge: sim (CI/infraestrutura)
Como verificar: faça um merge e observe a ordem: o build de produção do site só inicia depois do `Deploy` concluído. Cole os dois horários.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 139 — Deixar um único arquivo de travamento de dependências
Onda 8 / Severidade Alta / Camada: infraestrutura
Achados resolvidos: INF-02
Problema hoje: há três arquivos de travamento versionados e **divergentes** — `bun.lock`, `bun.lockb` e `package-lock.json` (`git ls-files | grep lock`), com versões diferentes do mesmo pacote (por exemplo `@supabase/supabase-js` 2.87.1 no `bun.lock` contra 2.119.0 no `package-lock.json`) — e nada fixa qual gerenciador vale. Nenhum workflow usa bun (`grep -rn "bun" .github/workflows/` não retorna nada), mas o ambiente de build do site pode escolher o que encontrar primeiro.
Causa raiz: migração de gerenciador de pacotes feita pela metade.
Caminho recomendado: apague `bun.lock` e `bun.lockb`, declare `"packageManager": "npm@<versão>"` no `package.json` e fixe o comando de instalação no `vercel.json` (`npm ci --legacy-peer-deps`), que é o mesmo que a CI usa (`AGENTS.md`). Isso elimina a chance de o site ser construído com versões diferentes das testadas. Não "unifique" convertendo tudo para bun: o projeto inteiro (CI, documentação, scripts) é npm.
Arquivos e objetos a tocar: `bun.lock` e `bun.lockb` (remoção), `package.json`, `vercel.json`.
Não tocar / armadilhas: `deno.lock` é das funções de servidor — **não** remova; confirme com o dono que ninguém roda bun localmente.
Depende de: — · Libera: 140
Risco e como reverter: baixo (arquivos recuperáveis pelo histórico).
Precisa de aprovação humana antes do merge: sim (infraestrutura de build)
Como verificar: um build de produção após a mudança deve instalar com npm e produzir pacote equivalente; `git ls-files | grep lock` deve listar apenas `package-lock.json` e `deno.lock`.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 140 — Verificar o estado do sistema depois do deploy do backend
Onda 2 / Severidade Alta / Camada: infraestrutura de publicação
Achados resolvidos: INF-03
Problema hoje: `.github/workflows/deploy.yml:148-171` aplica as migrations e `:173-236` publica as funções de servidor **depois**; se a segunda etapa falhar, o banco fica com o esquema novo e as funções na versão anterior — e **nada** verifica isso: o workflow termina sem checar nada.
Causa raiz: publicação em duas etapas sem verificação final.
Caminho recomendado: acrescente ao fim do trabalho de publicação das funções um passo que invoque `health-check` e falhe com mensagem explícita nomeando o estado parcial ("esquema aplicado, funções na versão anterior"), no formato dos passos de verificação que o próprio workflow já usa. Com a verificação, o dono recebe o aviso no mesmo lugar em que acompanha o deploy, em vez de descobrir por um erro de usuário.
Arquivos e objetos a tocar: `.github/workflows/deploy.yml`.
Não tocar / armadilhas: não transforme a verificação em bloqueio de nova tentativa (ela deve reportar, não travar); mantenha a repetição de tentativas que já existe para o limite do registro de imagens (`PENDENCIAS.md` item 3).
Depende de: 003 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: sim (CI/workflows)
Como verificar: um deploy normal termina com o passo de verificação verde; force uma falha (nome de função inválido em ambiente de teste) e confirme a mensagem de estado parcial.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 141 — Fazer o portão de qualidade rodar os testes dos próprios scripts de CI
Onda 8 / Severidade Média / Camada: CI
Achados resolvidos: INF-04
Problema hoje: `vitest.config.ts:34` exclui `**/scripts/**` da execução de testes e os comandos `test:scripts` e `ci:test` (que rodam os 15 arquivos de teste dos scripts de CI) **não** são chamados por nenhum trabalho do `ci.yml`. O comando `quality:gate` do `package.json:17` os inclui, mas esse comando não é o que a CI executa.
Causa raiz: duas definições de "portão": a do `package.json` e a do workflow, que divergiram.
Caminho recomendado: acrescente dois passos ao trabalho `lint` do `.github/workflows/ci.yml` (que já é dependência de todos os outros) chamando `npm run test:scripts` e `npm run ci:test`, no mesmo formato do passo `npm run quality:any` que já está lá. Esses scripts são os que guardam o próprio portão (verificação de integridade do `AGENTS.md`, geração de documentação de workflow, limites de referência) — hoje ninguém os executa automaticamente.
Arquivos e objetos a tocar: `.github/workflows/ci.yml`.
Não tocar / armadilhas: se algum desses testes estiver vermelho hoje (herdado), **não** os desative: registre em "Achados novos" e trate em etapa própria.
Depende de: 035 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: sim (CI/workflows)
Como verificar: na próxima execução, o trabalho `lint` mostra os dois passos com contagem de testes. Cole o resumo.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 142 — Renomear os arquivos de ambiente versionados para modelo
Onda 8 / Severidade Média / Camada: infraestrutura
Achados resolvidos: INF-05
Problema hoje: `.env.production` e `.env.staging` estão **versionados**, apesar de `.gitignore:27-30` declarar explicitamente "Production/staging env files may contain real secrets — never commit them" e listar os dois nomes. Hoje o conteúdo é só modelo com valores de exemplo (auditado nesta sessão: todos os valores são do tipo `your-p...`), então **não há segredo exposto** — mas o arquivo está no caminho exato onde alguém vai colar o valor real um dia.
Causa raiz: arquivo de modelo com o nome do arquivo real.
Caminho recomendado: renomeie para `.env.production.example` e `.env.staging.example` (o que o próprio comentário do `.gitignore` manda e o que `.env.example` já faz) e mantenha as entradas de `.gitignore` como estão. Diff de dois renomes.
Arquivos e objetos a tocar: `.env.production` → `.env.production.example`, `.env.staging` → `.env.staging.example`.
Não tocar / armadilhas: confirme que nenhum script ou documento referencia os nomes antigos (`grep -rn "env.production" --include=*.md --include=*.mjs --include=*.yml .`); se algum build local depender do nome, documente a mudança.
Depende de: — · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: `git ls-files | grep -E "^\.env"` lista apenas arquivos terminados em `.example`.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 143 — Corrigir o cache do aplicativo, que entrega arquivo velho para sempre
Onda 6 / Severidade Média / Camada: front (PWA)
Achados resolvidos: INF-06
Problema hoje: `public/sw.js:1` define `const CACHE_NAME = 'fast-grava-v2';` — nome fixo, sem versão de build. A limpeza em `:27-29` apaga apenas caches com nome **diferente** do atual, e como o nome nunca muda, nada é apagado; e a estratégia de `:62-78` serve do cache primeiro. Resultado: arquivos estáticos sem código de versão no nome (por exemplo `/manifest.json`, ícones, `/sw.js` em alguns navegadores) podem nunca atualizar no dispositivo de quem já abriu o aplicativo.
Causa raiz: nome de cache constante com estratégia que prioriza o cache.
Caminho recomendado: duas mudanças pequenas no mesmo arquivo: (1) versione o nome do cache (sufixo gerado no build) para que a limpeza passe a funcionar de verdade; (2) troque a estratégia de "cache primeiro" por "cache enquanto revalida" (devolve o cache e busca a versão nova em segundo plano). Teste em um dispositivo que já tenha o aplicativo instalado — é esse o caso que importa.
Arquivos e objetos a tocar: `public/sw.js` e, se precisar do sufixo, o passo de build correspondente.
Não tocar / armadilhas: não desligue o funcionamento offline (o quiosque de fábrica depende dele); mudanças em serviço de segundo plano demoram um ciclo para valer — verifique com recarregamento forçado.
Depende de: — · Libera: —
Risco e como reverter: médio (pode servir conteúdo velho durante a transição). Reverter = voltar o arquivo.
Precisa de aprovação humana antes do merge: não
Como verificar: publique uma alteração visível, abra o aplicativo já instalado e confirme que a mudança aparece no segundo acesso (hoje pode não aparecer nunca). Registre o teste no dispositivo.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 144 — Fixar as versões das dependências das funções de servidor
Onda 8 / Severidade Média / Camada: edge functions
Achados resolvidos: INF-07
Problema hoje: 24 importações de `npm:@supabase/supabase-js` e 5 de `npm:zod` **sem versão** (`grep -rhoE 'from "(npm:|https://|jsr:)[^"]+"' supabase/functions/ --include=*.ts | sort | uniq -c`), enquanto a biblioteca padrão do Deno é importada com versão fixa em 16 pontos (`https://deno.land/std@0.224.0/...`). O deploy não envia arquivo de travamento, então cada publicação pode pegar uma versão diferente.
Causa raiz: especificadores sem versão num ambiente que resolve na hora da publicação.
Caminho recomendado: fixe as versões no `supabase/functions/import_map.json` e nos imports diretos, usando as versões que o projeto já declara no `package.json` (`@supabase/supabase-js@2.119.0`, `zod@4.6.7`) — mesmo cuidado que já existe para a biblioteca padrão. Depois confirme que o `deno.lock` versionado cobre essas resoluções.
Arquivos e objetos a tocar: `supabase/functions/import_map.json`, os arquivos com import direto sem versão, `deno.lock`.
Não tocar / armadilhas: subir versão de biblioteca junto com a fixação transforma a etapa em migração — fixe **na versão atual**; rode a verificação de tipos das funções (trabalho `Edge Functions (Deno)` da CI) antes de publicar.
Depende de: — · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: o trabalho `Edge Functions (Deno)` continua verde e `grep -c 'npm:@supabase/supabase-js"' supabase/functions -r` → 0 (todas com versão).
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 145 — Corrigir os endereços de compartilhamento do site
Onda 7 / Severidade Baixa / Camada: front
Achados resolvidos: INF-08
Problema hoje: `index.html:53,57,60,65,68` aponta endereço canônico e imagens de compartilhamento para uma URL de pré-visualização da plataforma de desenvolvimento (`https://id-preview--...lovable.app/`), não para o endereço de produção.
Causa raiz: metadados gerados pela ferramenta de scaffolding e nunca atualizados.
Caminho recomendado: troque as cinco URLs para o endereço de produção definido na etapa 005 e aponte as imagens de compartilhamento para um arquivo do próprio repositório (`public/logo.png` já existe e é servido na raiz). Cinco linhas num arquivo.
Arquivos e objetos a tocar: `index.html`.
Não tocar / armadilhas: não mexa na política de segurança de conteúdo que também está no `index.html`/`vercel.json`; faça depois da etapa 005, para usar o endereço certo.
Depende de: 005 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: compartilhe o endereço em um aplicativo de mensagens e confirme que aparece o nome e o logotipo da empresa, não a pré-visualização. Cole o resultado.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 146 — Validar o arquivo enviado na foto de defeito de embalagem
Onda 1 / Severidade Alta / Camada: front (upload)
Achados resolvidos: SEG-06
Problema hoje: `src/features/packaging/services/packagingService.ts:197-211` envia o arquivo direto para o balde, **sem** verificar o conteúdo real, o tipo ou o tamanho; o formulário que chama (`src/features/packaging/components/DefectTriageForm.tsx:42-54`) também não valida. O repositório **já tem** a função de verificação de assinatura de arquivo (`validateFileMagicBytes`), usada em `src/components/traceability/LotInspectionsTab.tsx`.
Causa raiz: validação implementada em um ponto de upload e não reaproveitada nos outros.
Caminho recomendado: chame `validateFileMagicBytes(file)` antes do envio e aborte com o erro retornado, exatamente como o ponto que já faz certo; acrescente limite de tamanho coerente com o que a etapa 023 definir no balde. Validar no cliente é conveniência — a restrição do balde (etapa 023) é a que vale —, então faça as duas.
Arquivos e objetos a tocar: `src/features/packaging/services/packagingService.ts`, `src/features/packaging/components/DefectTriageForm.tsx`.
Não tocar / armadilhas: verifique se há outros pontos de upload sem validação (`grep -rn "\.upload(" src/` ) e trate em etapa própria se houver; não bloqueie formatos legítimos de foto de celular (HEIC).
Depende de: 023 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: tente enviar um arquivo `.exe` renomeado para `.jpg`: deve ser recusado com mensagem clara; uma foto real deve passar.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 147 — Parar de entregar link de foto de produção a visitante anônimo
Onda 1 / Severidade Média / Camada: front + banco
Achados resolvidos: SEG-07
Problema hoje: as fotos de produção são gravadas como URL assinada válida por 30 dias (`src/lib/storage.ts:13,24-29`) no campo que a função pública de rastreamento devolve (`get_public_tracking` entrega `production_photos`) — ou seja, qualquer visitante que consulte um pedido recebe um link direto ao arquivo, válido por um mês, que funciona fora do sistema e pode ser repassado.
Causa raiz: a mesma de STO-01 (link assinado persistido), com o agravante de a rota pública expor o campo.
Caminho recomendado: resolva junto da etapa 021 (guardar o caminho, não o link). Enquanto a etapa 021 não estiver pronta, o passo imediato é **remover `production_photos` do retorno da função pública** (migration que redefine `get_public_tracking` sem esse campo) — o cliente continua vendo status e prazo, que é o que a tela promete, e nenhuma foto sai para fora. Decida com o dono: se mostrar foto ao cliente for requisito, então a função deve gerar um link curto (minutos) no momento da consulta, depois da etapa 021.
Arquivos e objetos a tocar: nova migration redefinindo `public.get_public_tracking`; `src/pages/PublicTrackingPage.tsx` se a tela exibir as fotos.
Não tocar / armadilhas: não torne o balde público; não quebre o contrato da tela sem ajustar o componente.
Depende de: 025 · Libera: 021
Risco e como reverter: baixo. Reverter = restaurar a definição anterior.
Precisa de aprovação humana antes do merge: sim (DDL em produção e mudança no que o cliente vê)
Como verificar: consulta anônima de rastreamento não traz mais nenhum endereço de arquivo. Cole a resposta da chamada.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 148 — Ligar o limitador de requisições que já existe e ninguém usa
Onda 5 / Severidade Média / Camada: front
Achados resolvidos: SEG-08
Problema hoje: `src/lib/rateLimiter.ts:66-73` define três limitadores prontos (`apiLimiter`, `searchLimiter` e outro), exportados em `src/lib/index.ts:15` — e **nenhum** é usado. A busca da rota pública de rastreamento (`src/pages/PublicTrackingPage.tsx:52-109`) é o caso mais exposto: qualquer visitante pode disparar consultas em sequência.
Causa raiz: utilitário criado e nunca conectado.
Caminho recomendado: ligue `searchLimiter.tryAcquire()` no início do tratador de busca da tela pública e `apiLimiter` nas buscas globais. Deixe claro no próprio código (um comentário de uma linha) que isso é conveniência de interface: proteção de verdade contra abuso exige limite no servidor (ver etapas 024 e 025). Não invista em mais que isso aqui — é o uso correto desse utilitário.
Arquivos e objetos a tocar: `src/pages/PublicTrackingPage.tsx` e o componente de busca global.
Não tocar / armadilhas: não limite o fluxo do operador no quiosque (uso legítimo intenso); teste com um usuário real antes de escolher o teto.
Depende de: 025 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: dispare dez buscas em sequência na tela pública e confirme que as excedentes recebem aviso de "aguarde" em vez de chamar o servidor. Registre o comportamento.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 149 — Parar de guardar os valores de filtro das consultas no registro de erro
Onda 1 / Severidade Média / Camada: front (privacidade)
Achados resolvidos: SEG-09
Problema hoje: `src/integrations/supabase/client.ts:38-48` monta o registro de erro com a **URL inteira** da chamada (`url: urlString`), incluindo a cadeia de consulta com os valores dos filtros (identificadores, e-mails, números de pedido); esse registro vai para `error_logs` e para o webhook externo de alerta. O projeto **tem** a função de limpeza (`redactUrl`, `src/lib/logger.ts:254-262`), mas ela é aplicada à URL da página, não à URL da chamada.
Causa raiz: limpeza de dados aplicada a um campo e esquecida no outro.
Caminho recomendado: aplique a limpeza na origem: em `src/integrations/supabase/client.ts`, troque `urlString` por uma versão sem cadeia de consulta nas quatro montagens de registro (`:46,:48,:52,:66`), mantendo caminho e código de status, que é o que serve para diagnosticar. Faça junto da etapa 030 (correção do filtro), que mexe nas mesmas linhas.
Arquivos e objetos a tocar: `src/integrations/supabase/client.ts`.
Não tocar / armadilhas: não remova o caminho da URL (sem ele o registro perde utilidade); não mexa em `redactUrl`, que já está correto.
Depende de: 030 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: provoque um erro em consulta com filtro por e-mail e confirme que o registro guarda `/rest/v1/profiles` sem a cadeia de consulta. Cole a linha gravada.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

---

## Onda 6 — Performance

### Etapa 150 — Reduzir o custo das 71 policies que reavaliam a identidade linha por linha
Onda 6 / Severidade Média / Camada: banco (performance)
Achados resolvidos: BD-20
Problema hoje: `origin/contexto:docs/contexto/supabase/lints.md` registra **71** ocorrências de `policy_auth_fn_not_wrapped`: policies que chamam `auth.uid()`/`auth.jwt()` diretamente, sem envolver em subconsulta, o que faz o Postgres reavaliar a função **para cada linha** examinada. As tabelas afetadas incluem as mais usadas em listagem (`jobs` por via de policies vizinhas, `packaging_tasks`, `maintenance_*`, `user_roles`, `profiles`).
Causa raiz: policies escritas em momentos diferentes; parte já foi corrigida (há migration de referência no repositório: `20260620000001_optimize_rls_select_auth_uid.sql`), parte não.
Caminho recomendado: aplique o mesmo padrão da migration de referência — envolver a chamada em `(select auth.uid())` — em lotes por tabela, começando pelas de maior volume de leitura (`user_roles`, que acumula ~31 milhões de varreduras sequenciais segundo `origin/contexto:docs/contexto/supabase/stats.md`, e `profiles`). É mudança mecânica, mas é DDL em produção: um lote por PR, com o `lints.md` da coleta seguinte como prova. Não mude a lógica das policies — só a forma da chamada.
Arquivos e objetos a tocar: uma migration por lote de tabelas.
Não tocar / armadilhas: `(select auth.uid())` dentro de policy de INSERT com `WITH CHECK` precisa do mesmo cuidado; conferir que o predicado continua equivalente (um erro aqui muda quem acessa o quê).
Depende de: 003 · Libera: —
Risco e como reverter: médio (toca autorização). Reverter = restaurar as policies do lote.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: a contagem de `policy_auth_fn_not_wrapped` em `lints.md` cai a cada lote; e um teste de acesso por papel continua dando o mesmo resultado de antes. Cole a contagem e o teste.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 151 — Criar os três índices que faltam em chaves estrangeiras
Onda 6 / Severidade Baixa / Camada: banco (performance)
Achados resolvidos: BD-21
Problema hoje: `origin/contexto:docs/contexto/supabase/lints.md` aponta `fk_without_index` em `public.packaging_defects.reported_by`, `public.packaging_task_checklist.checked_by` e `public.packaging_task_checklist.item_id` — chaves estrangeiras sem índice, o que deixa lento tanto o join quanto a remoção/alteração na tabela referenciada.
Causa raiz: índices de chave estrangeira não criados junto das chaves.
Caminho recomendado: uma migration com três `CREATE INDEX`. As duas tabelas estão vazias hoje (`origin/contexto:docs/contexto/supabase/stats.md`), então a criação é instantânea — é o melhor momento para fazer. Use a nomenclatura dos índices existentes no mesmo esquema (`idx_<tabela>_<coluna>`).
Arquivos e objetos a tocar: nova migration.
Não tocar / armadilhas: não crie índice em coluna que já tem um composto começando por ela (verifique em `indexes.md`).
Depende de: 003 · Libera: —
Risco e como reverter: baixo; reverter = `DROP INDEX`.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: `lints.md` da coleta seguinte não traz mais `fk_without_index` para essas três colunas.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 152 — Completar a identidade de réplica das tabelas em tempo real
Onda 6 / Severidade Baixa / Camada: banco (realtime)
Achados resolvidos: BD-22
Problema hoje: `origin/contexto:docs/contexto/supabase/lints.md` registra `realtime_replica_identity` para `public.packaging_defects` e `public.packaging_tasks`: estão publicadas em tempo real **sem** identidade de réplica completa, então os eventos de alteração e remoção não trazem o estado anterior do registro.
Causa raiz: tabela adicionada à publicação sem o ajuste de identidade.
Caminho recomendado: `ALTER TABLE ... REPLICA IDENTITY FULL` nas duas, por migration. Faça junto da etapa 041 (que vai adicionar outras tabelas à publicação) e aplique o mesmo cuidado às novas — assim a tela que depende do estado anterior (por exemplo, para saber de onde para onde a tarefa mudou) funciona. Atenção: identidade completa aumenta o volume de replicação; não aplique a tabelas de log.
Arquivos e objetos a tocar: nova migration (ou a mesma da etapa 041).
Não tocar / armadilhas: não aplique a `error_logs` nem às tabelas de telemetria.
Depende de: 041 · Libera: —
Risco e como reverter: baixo; reverter = `REPLICA IDENTITY DEFAULT`.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: `lints.md` da coleta seguinte não traz mais o alerta; um evento de alteração recebido pelo aplicativo passa a conter o registro anterior.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 153 — Mover a extensão de rede para o esquema recomendado
Onda 8 / Severidade Baixa / Camada: banco (higiene)
Achados resolvidos: BD-23
Problema hoje: `origin/contexto:docs/contexto/supabase/lints.md` aponta `extension_in_public` para `pg_net`: a extensão está instalada no esquema público, enquanto a recomendação é o esquema de extensões.
Causa raiz: extensão instalada com o padrão antigo.
Caminho recomendado: `ALTER EXTENSION pg_net SET SCHEMA extensions` por migration. **Atenção**: as rotinas agendadas chamam `net.http_post` (`origin/contexto:docs/contexto/supabase/cron.md`) — confirme que o caminho de busca das funções agendadas inclui o esquema novo (o projeto tem `extra_search_path = public, extensions`, `project-config.md`, o que ajuda) e teste uma rotina depois da mudança. Se houver qualquer dúvida, **não faça**: o ganho é de organização e o risco é parar as rotinas que disparam funções de servidor.
Arquivos e objetos a tocar: nova migration.
Não tocar / armadilhas: três das sete rotinas agendadas dependem de `net.http_post`; faça num horário de baixo movimento e verifique a execução seguinte.
Depende de: 003, 063 · Libera: —
Risco e como reverter: médio (pode parar rotinas). Reverter = mover de volta.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: `cron-runs.md` da coleta seguinte mostra as três rotinas que usam rede com `succeeded` após a mudança. Cole as linhas.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

---

## Onda 1 (continuação) — estreitar, tabela por tabela, as doze policies amplas

> Estas doze etapas desdobram a etapa 087. Cada uma é uma PR com uma migration, verificável sozinha. Execute **nesta ordem** (as primeiras guardam registro de prova de operação) e, antes de cada uma, confira os pontos do aplicativo que escrevem na tabela.

### Etapa 154 — Separar por operação a policy ampla de `energy_alerts`
Onda 1 / Severidade Alta / Camada: banco (RLS)
Achados resolvidos: BD-08
Problema hoje: `public.energy_alerts` tem a policy `Active roles can manage energy alerts` com comando **ALL** e predicado `has_any_active_role()` para `authenticated` (`origin/contexto:docs/contexto/supabase/policies.md`). Como policies permissivas se somam, essa policy anula qualquer regra fina da mesma tabela: **qualquer** usuário com papel ativo pode inserir, alterar e **apagar** alertas de consumo de energia.
Causa raiz: policy guarda-chuva criada para destravar desenvolvimento e mantida ao lado das regras finas.
Caminho recomendado: antes de escrever a migration, levante como o aplicativo usa a tabela: `grep -rn "from('energy_alerts')" src/` — anote quem lê, quem insere e quem altera. Depois troque a policy ampla por três policies por comando: SELECT com `has_any_active_role()`, INSERT/UPDATE restritos ao autor ou participante (use a coluna de autoria que a tabela tiver; confira em `origin/contexto:docs/contexto/supabase/tables/public/energy_alerts.md`), e DELETE apenas para `coordinator`/`manager`/`admin`. Copie a forma das policies de `packaging_tasks`, que já seguem esse arranjo. Crie as novas **antes** de remover a ampla, no mesmo arquivo de migration, para a tabela nunca ficar sem leitura.
Arquivos e objetos a tocar: nova migration `supabase/migrations/<AAAAMMDDHHMMSS>_rls_energy_alerts_por_operacao.sql`.
Não tocar / armadilhas: não mexa em outras tabelas nesta etapa; se a tabela não tiver coluna de autoria, **pare** e registre no progresso em vez de inventar critério (pode ser que a regra correta seja só papel elevado para escrita).
Depende de: 087, 003 · Libera: —
Risco e como reverter: médio — estreitar sem conferir o aplicativo derruba tela em produção. Reverter = recriar a policy ampla (definição exata no snapshot).
Precisa de aprovação humana antes do merge: sim (DDL em produção e mudança de autorização)
Como verificar: com conta de operador: SELECT funciona, INSERT do próprio registro funciona, DELETE é recusado; com coordenador, DELETE funciona. Registre os quatro resultados e confirme na tela correspondente que nada quebrou.
Impacto no negócio desta tabela: o painel de energia perde/ganha registros sem rastro.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 155 — Separar por operação a policy ampla de `lot_quality_inspections`
Onda 1 / Severidade Alta / Camada: banco (RLS)
Achados resolvidos: BD-08
Problema hoje: `public.lot_quality_inspections` tem a policy `Active roles can manage inspections` com comando **ALL** e predicado `has_any_active_role()` para `authenticated` (`origin/contexto:docs/contexto/supabase/policies.md`). Como policies permissivas se somam, essa policy anula qualquer regra fina da mesma tabela: **qualquer** usuário com papel ativo pode inserir, alterar e **apagar** inspeções de qualidade de lote.
Causa raiz: policy guarda-chuva criada para destravar desenvolvimento e mantida ao lado das regras finas.
Caminho recomendado: antes de escrever a migration, levante como o aplicativo usa a tabela: `grep -rn "from('lot_quality_inspections')" src/` — anote quem lê, quem insere e quem altera. Depois troque a policy ampla por três policies por comando: SELECT com `has_any_active_role()`, INSERT/UPDATE restritos ao autor ou participante (use a coluna de autoria que a tabela tiver; confira em `origin/contexto:docs/contexto/supabase/tables/public/lot_quality_inspections.md`), e DELETE apenas para `coordinator`/`manager`/`admin`. Copie a forma das policies de `packaging_tasks`, que já seguem esse arranjo. Crie as novas **antes** de remover a ampla, no mesmo arquivo de migration, para a tabela nunca ficar sem leitura.
Arquivos e objetos a tocar: nova migration `supabase/migrations/<AAAAMMDDHHMMSS>_rls_lot_quality_inspections_por_operacao.sql`.
Não tocar / armadilhas: não mexa em outras tabelas nesta etapa; se a tabela não tiver coluna de autoria, **pare** e registre no progresso em vez de inventar critério (pode ser que a regra correta seja só papel elevado para escrita).
Depende de: 087, 003 · Libera: —
Risco e como reverter: médio — estreitar sem conferir o aplicativo derruba tela em produção. Reverter = recriar a policy ampla (definição exata no snapshot).
Precisa de aprovação humana antes do merge: sim (DDL em produção e mudança de autorização)
Como verificar: com conta de operador: SELECT funciona, INSERT do próprio registro funciona, DELETE é recusado; com coordenador, DELETE funciona. Registre os quatro resultados e confirme na tela correspondente que nada quebrou.
Impacto no negócio desta tabela: a prova de inspeção de qualidade pode ser apagada por qualquer pessoa com papel ativo.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 156 — Separar por operação a policy ampla de `machine_downtime`
Onda 1 / Severidade Alta / Camada: banco (RLS)
Achados resolvidos: BD-08
Problema hoje: `public.machine_downtime` tem a policy `Active roles can manage machine downtime` com comando **ALL** e predicado `has_any_active_role()` para `authenticated` (`origin/contexto:docs/contexto/supabase/policies.md`). Como policies permissivas se somam, essa policy anula qualquer regra fina da mesma tabela: **qualquer** usuário com papel ativo pode inserir, alterar e **apagar** paradas de máquina.
Causa raiz: policy guarda-chuva criada para destravar desenvolvimento e mantida ao lado das regras finas.
Caminho recomendado: antes de escrever a migration, levante como o aplicativo usa a tabela: `grep -rn "from('machine_downtime')" src/` — anote quem lê, quem insere e quem altera. Depois troque a policy ampla por três policies por comando: SELECT com `has_any_active_role()`, INSERT/UPDATE restritos ao autor ou participante (use a coluna de autoria que a tabela tiver; confira em `origin/contexto:docs/contexto/supabase/tables/public/machine_downtime.md`), e DELETE apenas para `coordinator`/`manager`/`admin`. Copie a forma das policies de `packaging_tasks`, que já seguem esse arranjo. Crie as novas **antes** de remover a ampla, no mesmo arquivo de migration, para a tabela nunca ficar sem leitura.
Arquivos e objetos a tocar: nova migration `supabase/migrations/<AAAAMMDDHHMMSS>_rls_machine_downtime_por_operacao.sql`.
Não tocar / armadilhas: não mexa em outras tabelas nesta etapa; se a tabela não tiver coluna de autoria, **pare** e registre no progresso em vez de inventar critério (pode ser que a regra correta seja só papel elevado para escrita).
Depende de: 087, 003 · Libera: —
Risco e como reverter: médio — estreitar sem conferir o aplicativo derruba tela em produção. Reverter = recriar a policy ampla (definição exata no snapshot).
Precisa de aprovação humana antes do merge: sim (DDL em produção e mudança de autorização)
Como verificar: com conta de operador: SELECT funciona, INSERT do próprio registro funciona, DELETE é recusado; com coordenador, DELETE funciona. Registre os quatro resultados e confirme na tela correspondente que nada quebrou.
Impacto no negócio desta tabela: o histórico de paradas, que alimenta o indicador de eficiência, pode ser apagado.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 157 — Separar por operação a policy ampla de `maintenance_item_responses`
Onda 1 / Severidade Alta / Camada: banco (RLS)
Achados resolvidos: BD-08
Problema hoje: `public.maintenance_item_responses` tem a policy `Active roles can manage item responses` com comando **ALL** e predicado `has_any_active_role()` para `authenticated` (`origin/contexto:docs/contexto/supabase/policies.md`). Como policies permissivas se somam, essa policy anula qualquer regra fina da mesma tabela: **qualquer** usuário com papel ativo pode inserir, alterar e **apagar** respostas do checklist de manutenção.
Causa raiz: policy guarda-chuva criada para destravar desenvolvimento e mantida ao lado das regras finas.
Caminho recomendado: antes de escrever a migration, levante como o aplicativo usa a tabela: `grep -rn "from('maintenance_item_responses')" src/` — anote quem lê, quem insere e quem altera. Depois troque a policy ampla por três policies por comando: SELECT com `has_any_active_role()`, INSERT/UPDATE restritos ao autor ou participante (use a coluna de autoria que a tabela tiver; confira em `origin/contexto:docs/contexto/supabase/tables/public/maintenance_item_responses.md`), e DELETE apenas para `coordinator`/`manager`/`admin`. Copie a forma das policies de `packaging_tasks`, que já seguem esse arranjo. Crie as novas **antes** de remover a ampla, no mesmo arquivo de migration, para a tabela nunca ficar sem leitura.
Arquivos e objetos a tocar: nova migration `supabase/migrations/<AAAAMMDDHHMMSS>_rls_maintenance_item_responses_por_operacao.sql`.
Não tocar / armadilhas: não mexa em outras tabelas nesta etapa; se a tabela não tiver coluna de autoria, **pare** e registre no progresso em vez de inventar critério (pode ser que a regra correta seja só papel elevado para escrita).
Depende de: 087, 003 · Libera: —
Risco e como reverter: médio — estreitar sem conferir o aplicativo derruba tela em produção. Reverter = recriar a policy ampla (definição exata no snapshot).
Precisa de aprovação humana antes do merge: sim (DDL em produção e mudança de autorização)
Como verificar: com conta de operador: SELECT funciona, INSERT do próprio registro funciona, DELETE é recusado; com coordenador, DELETE funciona. Registre os quatro resultados e confirme na tela correspondente que nada quebrou.
Impacto no negócio desta tabela: a evidência do que foi conferido na manutenção pode ser alterada depois.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 158 — Separar por operação a policy ampla de `shift_handover_checklist`
Onda 1 / Severidade Alta / Camada: banco (RLS)
Achados resolvidos: BD-08
Problema hoje: `public.shift_handover_checklist` tem a policy `Active roles can manage handover checklist` com comando **ALL** e predicado `has_any_active_role()` para `authenticated` (`origin/contexto:docs/contexto/supabase/policies.md`). Como policies permissivas se somam, essa policy anula qualquer regra fina da mesma tabela: **qualquer** usuário com papel ativo pode inserir, alterar e **apagar** checklist da passagem de turno.
Causa raiz: policy guarda-chuva criada para destravar desenvolvimento e mantida ao lado das regras finas.
Caminho recomendado: antes de escrever a migration, levante como o aplicativo usa a tabela: `grep -rn "from('shift_handover_checklist')" src/` — anote quem lê, quem insere e quem altera. Depois troque a policy ampla por três policies por comando: SELECT com `has_any_active_role()`, INSERT/UPDATE restritos ao autor ou participante (use a coluna de autoria que a tabela tiver; confira em `origin/contexto:docs/contexto/supabase/tables/public/shift_handover_checklist.md`), e DELETE apenas para `coordinator`/`manager`/`admin`. Copie a forma das policies de `packaging_tasks`, que já seguem esse arranjo. Crie as novas **antes** de remover a ampla, no mesmo arquivo de migration, para a tabela nunca ficar sem leitura.
Arquivos e objetos a tocar: nova migration `supabase/migrations/<AAAAMMDDHHMMSS>_rls_shift_handover_checklist_por_operacao.sql`.
Não tocar / armadilhas: não mexa em outras tabelas nesta etapa; se a tabela não tiver coluna de autoria, **pare** e registre no progresso em vez de inventar critério (pode ser que a regra correta seja só papel elevado para escrita).
Depende de: 087, 003 · Libera: —
Risco e como reverter: médio — estreitar sem conferir o aplicativo derruba tela em produção. Reverter = recriar a policy ampla (definição exata no snapshot).
Precisa de aprovação humana antes do merge: sim (DDL em produção e mudança de autorização)
Como verificar: com conta de operador: SELECT funciona, INSERT do próprio registro funciona, DELETE é recusado; com coordenador, DELETE funciona. Registre os quatro resultados e confirme na tela correspondente que nada quebrou.
Impacto no negócio desta tabela: o que foi passado entre turnos pode ser reescrito por terceiros.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 159 — Separar por operação a policy ampla de `shift_occurrences`
Onda 1 / Severidade Alta / Camada: banco (RLS)
Achados resolvidos: BD-08
Problema hoje: `public.shift_occurrences` tem a policy `Active roles can manage occurrences` com comando **ALL** e predicado `has_any_active_role()` para `authenticated` (`origin/contexto:docs/contexto/supabase/policies.md`). Como policies permissivas se somam, essa policy anula qualquer regra fina da mesma tabela: **qualquer** usuário com papel ativo pode inserir, alterar e **apagar** ocorrências de turno.
Causa raiz: policy guarda-chuva criada para destravar desenvolvimento e mantida ao lado das regras finas.
Caminho recomendado: antes de escrever a migration, levante como o aplicativo usa a tabela: `grep -rn "from('shift_occurrences')" src/` — anote quem lê, quem insere e quem altera. Depois troque a policy ampla por três policies por comando: SELECT com `has_any_active_role()`, INSERT/UPDATE restritos ao autor ou participante (use a coluna de autoria que a tabela tiver; confira em `origin/contexto:docs/contexto/supabase/tables/public/shift_occurrences.md`), e DELETE apenas para `coordinator`/`manager`/`admin`. Copie a forma das policies de `packaging_tasks`, que já seguem esse arranjo. Crie as novas **antes** de remover a ampla, no mesmo arquivo de migration, para a tabela nunca ficar sem leitura.
Arquivos e objetos a tocar: nova migration `supabase/migrations/<AAAAMMDDHHMMSS>_rls_shift_occurrences_por_operacao.sql`.
Não tocar / armadilhas: não mexa em outras tabelas nesta etapa; se a tabela não tiver coluna de autoria, **pare** e registre no progresso em vez de inventar critério (pode ser que a regra correta seja só papel elevado para escrita).
Depende de: 087, 003 · Libera: —
Risco e como reverter: médio — estreitar sem conferir o aplicativo derruba tela em produção. Reverter = recriar a policy ampla (definição exata no snapshot).
Precisa de aprovação humana antes do merge: sim (DDL em produção e mudança de autorização)
Como verificar: com conta de operador: SELECT funciona, INSERT do próprio registro funciona, DELETE é recusado; com coordenador, DELETE funciona. Registre os quatro resultados e confirme na tela correspondente que nada quebrou.
Impacto no negócio desta tabela: o registro de ocorrência (quebra, acidente, atraso) pode ser apagado por quem não participou do turno.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 160 — Separar por operação a policy ampla de `shift_pending_tasks`
Onda 1 / Severidade Alta / Camada: banco (RLS)
Achados resolvidos: BD-08
Problema hoje: `public.shift_pending_tasks` tem a policy `Active roles can manage pending tasks` com comando **ALL** e predicado `has_any_active_role()` para `authenticated` (`origin/contexto:docs/contexto/supabase/policies.md`). Como policies permissivas se somam, essa policy anula qualquer regra fina da mesma tabela: **qualquer** usuário com papel ativo pode inserir, alterar e **apagar** pendências de turno.
Causa raiz: policy guarda-chuva criada para destravar desenvolvimento e mantida ao lado das regras finas.
Caminho recomendado: antes de escrever a migration, levante como o aplicativo usa a tabela: `grep -rn "from('shift_pending_tasks')" src/` — anote quem lê, quem insere e quem altera. Depois troque a policy ampla por três policies por comando: SELECT com `has_any_active_role()`, INSERT/UPDATE restritos ao autor ou participante (use a coluna de autoria que a tabela tiver; confira em `origin/contexto:docs/contexto/supabase/tables/public/shift_pending_tasks.md`), e DELETE apenas para `coordinator`/`manager`/`admin`. Copie a forma das policies de `packaging_tasks`, que já seguem esse arranjo. Crie as novas **antes** de remover a ampla, no mesmo arquivo de migration, para a tabela nunca ficar sem leitura.
Arquivos e objetos a tocar: nova migration `supabase/migrations/<AAAAMMDDHHMMSS>_rls_shift_pending_tasks_por_operacao.sql`.
Não tocar / armadilhas: não mexa em outras tabelas nesta etapa; se a tabela não tiver coluna de autoria, **pare** e registre no progresso em vez de inventar critério (pode ser que a regra correta seja só papel elevado para escrita).
Depende de: 087, 003 · Libera: —
Risco e como reverter: médio — estreitar sem conferir o aplicativo derruba tela em produção. Reverter = recriar a policy ampla (definição exata no snapshot).
Precisa de aprovação humana antes do merge: sim (DDL em produção e mudança de autorização)
Como verificar: com conta de operador: SELECT funciona, INSERT do próprio registro funciona, DELETE é recusado; com coordenador, DELETE funciona. Registre os quatro resultados e confirme na tela correspondente que nada quebrou.
Impacto no negócio desta tabela: tarefa deixada para o turno seguinte pode desaparecer.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 161 — Separar por operação a policy ampla de `tpm_execution_alerts`
Onda 1 / Severidade Alta / Camada: banco (RLS)
Achados resolvidos: BD-08
Problema hoje: `public.tpm_execution_alerts` tem a policy `Active roles can manage tpm execution alerts` com comando **ALL** e predicado `has_any_active_role()` para `authenticated` (`origin/contexto:docs/contexto/supabase/policies.md`). Como policies permissivas se somam, essa policy anula qualquer regra fina da mesma tabela: **qualquer** usuário com papel ativo pode inserir, alterar e **apagar** alertas de execução de manutenção.
Causa raiz: policy guarda-chuva criada para destravar desenvolvimento e mantida ao lado das regras finas.
Caminho recomendado: antes de escrever a migration, levante como o aplicativo usa a tabela: `grep -rn "from('tpm_execution_alerts')" src/` — anote quem lê, quem insere e quem altera. Depois troque a policy ampla por três policies por comando: SELECT com `has_any_active_role()`, INSERT/UPDATE restritos ao autor ou participante (use a coluna de autoria que a tabela tiver; confira em `origin/contexto:docs/contexto/supabase/tables/public/tpm_execution_alerts.md`), e DELETE apenas para `coordinator`/`manager`/`admin`. Copie a forma das policies de `packaging_tasks`, que já seguem esse arranjo. Crie as novas **antes** de remover a ampla, no mesmo arquivo de migration, para a tabela nunca ficar sem leitura.
Arquivos e objetos a tocar: nova migration `supabase/migrations/<AAAAMMDDHHMMSS>_rls_tpm_execution_alerts_por_operacao.sql`.
Não tocar / armadilhas: não mexa em outras tabelas nesta etapa; se a tabela não tiver coluna de autoria, **pare** e registre no progresso em vez de inventar critério (pode ser que a regra correta seja só papel elevado para escrita).
Depende de: 087, 003 · Libera: —
Risco e como reverter: médio — estreitar sem conferir o aplicativo derruba tela em produção. Reverter = recriar a policy ampla (definição exata no snapshot).
Precisa de aprovação humana antes do merge: sim (DDL em produção e mudança de autorização)
Como verificar: com conta de operador: SELECT funciona, INSERT do próprio registro funciona, DELETE é recusado; com coordenador, DELETE funciona. Registre os quatro resultados e confirme na tela correspondente que nada quebrou.
Impacto no negócio desta tabela: alerta de risco pode ser removido sem registro.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 162 — Separar por operação a policy ampla de `tpm_execution_parts`
Onda 1 / Severidade Alta / Camada: banco (RLS)
Achados resolvidos: BD-08
Problema hoje: `public.tpm_execution_parts` tem a policy `Active roles can manage tpm parts` com comando **ALL** e predicado `has_any_active_role()` para `authenticated` (`origin/contexto:docs/contexto/supabase/policies.md`). Como policies permissivas se somam, essa policy anula qualquer regra fina da mesma tabela: **qualquer** usuário com papel ativo pode inserir, alterar e **apagar** peças usadas na manutenção.
Causa raiz: policy guarda-chuva criada para destravar desenvolvimento e mantida ao lado das regras finas.
Caminho recomendado: antes de escrever a migration, levante como o aplicativo usa a tabela: `grep -rn "from('tpm_execution_parts')" src/` — anote quem lê, quem insere e quem altera. Depois troque a policy ampla por três policies por comando: SELECT com `has_any_active_role()`, INSERT/UPDATE restritos ao autor ou participante (use a coluna de autoria que a tabela tiver; confira em `origin/contexto:docs/contexto/supabase/tables/public/tpm_execution_parts.md`), e DELETE apenas para `coordinator`/`manager`/`admin`. Copie a forma das policies de `packaging_tasks`, que já seguem esse arranjo. Crie as novas **antes** de remover a ampla, no mesmo arquivo de migration, para a tabela nunca ficar sem leitura.
Arquivos e objetos a tocar: nova migration `supabase/migrations/<AAAAMMDDHHMMSS>_rls_tpm_execution_parts_por_operacao.sql`.
Não tocar / armadilhas: não mexa em outras tabelas nesta etapa; se a tabela não tiver coluna de autoria, **pare** e registre no progresso em vez de inventar critério (pode ser que a regra correta seja só papel elevado para escrita).
Depende de: 087, 003 · Libera: —
Risco e como reverter: médio — estreitar sem conferir o aplicativo derruba tela em produção. Reverter = recriar a policy ampla (definição exata no snapshot).
Precisa de aprovação humana antes do merge: sim (DDL em produção e mudança de autorização)
Como verificar: com conta de operador: SELECT funciona, INSERT do próprio registro funciona, DELETE é recusado; com coordenador, DELETE funciona. Registre os quatro resultados e confirme na tela correspondente que nada quebrou.
Impacto no negócio desta tabela: o consumo de peças, que vira custo, pode ser alterado por qualquer um.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 163 — Separar por operação a policy ampla de `tpm_execution_supplies`
Onda 1 / Severidade Alta / Camada: banco (RLS)
Achados resolvidos: BD-08
Problema hoje: `public.tpm_execution_supplies` tem a policy `Active roles can manage execution supplies` com comando **ALL** e predicado `has_any_active_role()` para `authenticated` (`origin/contexto:docs/contexto/supabase/policies.md`). Como policies permissivas se somam, essa policy anula qualquer regra fina da mesma tabela: **qualquer** usuário com papel ativo pode inserir, alterar e **apagar** insumos usados na manutenção.
Causa raiz: policy guarda-chuva criada para destravar desenvolvimento e mantida ao lado das regras finas.
Caminho recomendado: antes de escrever a migration, levante como o aplicativo usa a tabela: `grep -rn "from('tpm_execution_supplies')" src/` — anote quem lê, quem insere e quem altera. Depois troque a policy ampla por três policies por comando: SELECT com `has_any_active_role()`, INSERT/UPDATE restritos ao autor ou participante (use a coluna de autoria que a tabela tiver; confira em `origin/contexto:docs/contexto/supabase/tables/public/tpm_execution_supplies.md`), e DELETE apenas para `coordinator`/`manager`/`admin`. Copie a forma das policies de `packaging_tasks`, que já seguem esse arranjo. Crie as novas **antes** de remover a ampla, no mesmo arquivo de migration, para a tabela nunca ficar sem leitura.
Arquivos e objetos a tocar: nova migration `supabase/migrations/<AAAAMMDDHHMMSS>_rls_tpm_execution_supplies_por_operacao.sql`.
Não tocar / armadilhas: não mexa em outras tabelas nesta etapa; se a tabela não tiver coluna de autoria, **pare** e registre no progresso em vez de inventar critério (pode ser que a regra correta seja só papel elevado para escrita).
Depende de: 087, 003 · Libera: —
Risco e como reverter: médio — estreitar sem conferir o aplicativo derruba tela em produção. Reverter = recriar a policy ampla (definição exata no snapshot).
Precisa de aprovação humana antes do merge: sim (DDL em produção e mudança de autorização)
Como verificar: com conta de operador: SELECT funciona, INSERT do próprio registro funciona, DELETE é recusado; com coordenador, DELETE funciona. Registre os quatro resultados e confirme na tela correspondente que nada quebrou.
Impacto no negócio desta tabela: idem às peças: custo de manutenção sem controle de quem alterou.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 164 — Separar por operação a policy ampla de `tpm_notification_queue`
Onda 1 / Severidade Alta / Camada: banco (RLS)
Achados resolvidos: BD-08
Problema hoje: `public.tpm_notification_queue` tem a policy `Active roles can access tpm notification queue` com comando **ALL** e predicado `has_any_active_role()` para `authenticated` (`origin/contexto:docs/contexto/supabase/policies.md`). Como policies permissivas se somam, essa policy anula qualquer regra fina da mesma tabela: **qualquer** usuário com papel ativo pode inserir, alterar e **apagar** fila de notificações de manutenção.
Causa raiz: policy guarda-chuva criada para destravar desenvolvimento e mantida ao lado das regras finas.
Caminho recomendado: antes de escrever a migration, levante como o aplicativo usa a tabela: `grep -rn "from('tpm_notification_queue')" src/` — anote quem lê, quem insere e quem altera. Depois troque a policy ampla por três policies por comando: SELECT com `has_any_active_role()`, INSERT/UPDATE restritos ao autor ou participante (use a coluna de autoria que a tabela tiver; confira em `origin/contexto:docs/contexto/supabase/tables/public/tpm_notification_queue.md`), e DELETE apenas para `coordinator`/`manager`/`admin`. Copie a forma das policies de `packaging_tasks`, que já seguem esse arranjo. Crie as novas **antes** de remover a ampla, no mesmo arquivo de migration, para a tabela nunca ficar sem leitura.
Arquivos e objetos a tocar: nova migration `supabase/migrations/<AAAAMMDDHHMMSS>_rls_tpm_notification_queue_por_operacao.sql`.
Não tocar / armadilhas: não mexa em outras tabelas nesta etapa; se a tabela não tiver coluna de autoria, **pare** e registre no progresso em vez de inventar critério (pode ser que a regra correta seja só papel elevado para escrita).
Depende de: 087, 003 · Libera: —
Risco e como reverter: médio — estreitar sem conferir o aplicativo derruba tela em produção. Reverter = recriar a policy ampla (definição exata no snapshot).
Precisa de aprovação humana antes do merge: sim (DDL em produção e mudança de autorização)
Como verificar: com conta de operador: SELECT funciona, INSERT do próprio registro funciona, DELETE é recusado; com coordenador, DELETE funciona. Registre os quatro resultados e confirme na tela correspondente que nada quebrou.
Impacto no negócio desta tabela: qualquer pessoa com papel ativo pode apagar avisos pendentes antes de serem enviados.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 165 — Separar por operação a policy ampla de `tpm_severity_configs`
Onda 1 / Severidade Alta / Camada: banco (RLS)
Achados resolvidos: BD-08
Problema hoje: `public.tpm_severity_configs` tem a policy `Active roles can manage severity configs` com comando **ALL** e predicado `has_any_active_role()` para `authenticated` (`origin/contexto:docs/contexto/supabase/policies.md`). Como policies permissivas se somam, essa policy anula qualquer regra fina da mesma tabela: **qualquer** usuário com papel ativo pode inserir, alterar e **apagar** configuração de severidade de manutenção.
Causa raiz: policy guarda-chuva criada para destravar desenvolvimento e mantida ao lado das regras finas.
Caminho recomendado: antes de escrever a migration, levante como o aplicativo usa a tabela: `grep -rn "from('tpm_severity_configs')" src/` — anote quem lê, quem insere e quem altera. Depois troque a policy ampla por três policies por comando: SELECT com `has_any_active_role()`, INSERT/UPDATE restritos ao autor ou participante (use a coluna de autoria que a tabela tiver; confira em `origin/contexto:docs/contexto/supabase/tables/public/tpm_severity_configs.md`), e DELETE apenas para `coordinator`/`manager`/`admin`. Copie a forma das policies de `packaging_tasks`, que já seguem esse arranjo. Crie as novas **antes** de remover a ampla, no mesmo arquivo de migration, para a tabela nunca ficar sem leitura.
Arquivos e objetos a tocar: nova migration `supabase/migrations/<AAAAMMDDHHMMSS>_rls_tpm_severity_configs_por_operacao.sql`.
Não tocar / armadilhas: não mexa em outras tabelas nesta etapa; se a tabela não tiver coluna de autoria, **pare** e registre no progresso em vez de inventar critério (pode ser que a regra correta seja só papel elevado para escrita).
Depende de: 087, 003 · Libera: —
Risco e como reverter: médio — estreitar sem conferir o aplicativo derruba tela em produção. Reverter = recriar a policy ampla (definição exata no snapshot).
Precisa de aprovação humana antes do merge: sim (DDL em produção e mudança de autorização)
Como verificar: com conta de operador: SELECT funciona, INSERT do próprio registro funciona, DELETE é recusado; com coordenador, DELETE funciona. Registre os quatro resultados e confirme na tela correspondente que nada quebrou.
Impacto no negócio desta tabela: a régua que define o que é crítico pode ser mudada por qualquer operador.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

---

## Onda 5 (continuação) — estado de erro, página por página

> Desdobramento da etapa 080. A lista foi levantada por `grep -L "isError\\|error\\b" src/pages/*.tsx` no commit auditado (24 arquivos, dos quais foram excluídos os que não fazem consulta: `DesignSystemPage`, `NotFound`, `InstallAppPage`, `MfaEnrollmentPage` e arquivos de teste). As páginas de operação e de gestão já estão nas etapas 078 e 079.

### Etapa 166 — Estado de erro em ABCCostingDashboard, BIDashboard, DocumentsPage
Onda 5 / Severidade Baixa / Camada: front
Achados resolvidos: UI-19
Problema hoje: nenhuma dessas três páginas lê o estado de erro das consultas que faz (`src/pages/ABCCostingDashboard.tsx`, `src/pages/BIDashboard.tsx`, `src/pages/DocumentsPage.tsx`); uma falha de leitura deixa a tela em branco, indistinguível de "não há dado" — e as telas tratam de custos por atividade, inteligência de negócio e documentos técnicos.
Causa raiz: estado de erro não representado na interface (ver UI-19).
Caminho recomendado: em cada página, leia o estado de erro do hook de consulta e renderize bloco de erro com ação de tentar novamente, usando `src/components/ui/empty-state.tsx` no formato de `src/pages/OperatorView.tsx:169-170`. Não altere o conteúdo nem o layout da página além desse bloco. Se a página já tiver estado vazio, mantenha os dois (vazio e erro são diferentes).
Arquivos e objetos a tocar: `src/pages/ABCCostingDashboard.tsx`, `src/pages/BIDashboard.tsx`, `src/pages/DocumentsPage.tsx`.
Não tocar / armadilhas: não mexa nos cálculos nem nos componentes de gráfico; se a página consome vários hooks, mostre um único bloco de erro (não um por consulta).
Depende de: 077 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: com a rede desligada (ou bloqueando a chamada no navegador), cada uma das três páginas mostra erro com ação de recarregar; com dados vazios, mostra estado vazio. Registre as três telas.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 167 — Estado de erro em EfficiencyDashboard, MLPredictionsDashboard, PackagingDashboard
Onda 5 / Severidade Baixa / Camada: front
Achados resolvidos: UI-19
Problema hoje: nenhuma dessas três páginas lê o estado de erro das consultas que faz (`src/pages/EfficiencyDashboard.tsx`, `src/pages/MLPredictionsDashboard.tsx`, `src/pages/PackagingDashboard.tsx`); uma falha de leitura deixa a tela em branco, indistinguível de "não há dado" — e as telas tratam de eficiência, manutenção preditiva e embalagem.
Causa raiz: estado de erro não representado na interface (ver UI-19).
Caminho recomendado: em cada página, leia o estado de erro do hook de consulta e renderize bloco de erro com ação de tentar novamente, usando `src/components/ui/empty-state.tsx` no formato de `src/pages/OperatorView.tsx:169-170`. Não altere o conteúdo nem o layout da página além desse bloco. Se a página já tiver estado vazio, mantenha os dois (vazio e erro são diferentes).
Arquivos e objetos a tocar: `src/pages/EfficiencyDashboard.tsx`, `src/pages/MLPredictionsDashboard.tsx`, `src/pages/PackagingDashboard.tsx`.
Não tocar / armadilhas: não mexa nos cálculos nem nos componentes de gráfico; se a página consome vários hooks, mostre um único bloco de erro (não um por consulta).
Depende de: 077 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: com a rede desligada (ou bloqueando a chamada no navegador), cada uma das três páginas mostra erro com ação de recarregar; com dados vazios, mostra estado vazio. Registre as três telas.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 168 — Estado de erro em LogisticsPage, OperatorsPage, OperatorProductivityPage
Onda 5 / Severidade Baixa / Camada: front
Achados resolvidos: UI-19
Problema hoje: nenhuma dessas três páginas lê o estado de erro das consultas que faz (`src/pages/LogisticsPage.tsx`, `src/pages/OperatorsPage.tsx`, `src/pages/OperatorProductivityPage.tsx`); uma falha de leitura deixa a tela em branco, indistinguível de "não há dado" — e as telas tratam de expedição, cadastro de operadores e produtividade.
Causa raiz: estado de erro não representado na interface (ver UI-19).
Caminho recomendado: em cada página, leia o estado de erro do hook de consulta e renderize bloco de erro com ação de tentar novamente, usando `src/components/ui/empty-state.tsx` no formato de `src/pages/OperatorView.tsx:169-170`. Não altere o conteúdo nem o layout da página além desse bloco. Se a página já tiver estado vazio, mantenha os dois (vazio e erro são diferentes).
Arquivos e objetos a tocar: `src/pages/LogisticsPage.tsx`, `src/pages/OperatorsPage.tsx`, `src/pages/OperatorProductivityPage.tsx`.
Não tocar / armadilhas: não mexa nos cálculos nem nos componentes de gráfico; se a página consome vários hooks, mostre um único bloco de erro (não um por consulta).
Depende de: 077 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: com a rede desligada (ou bloqueando a chamada no navegador), cada uma das três páginas mostra erro com ação de recarregar; com dados vazios, mostra estado vazio. Registre as três telas.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 169 — Estado de erro em QRScannerPage, SystemMonitoringPage, DigitalTwin
Onda 5 / Severidade Baixa / Camada: front
Achados resolvidos: UI-19
Problema hoje: nenhuma dessas três páginas lê o estado de erro das consultas que faz (`src/pages/QRScannerPage.tsx`, `src/pages/SystemMonitoringPage.tsx`, `src/pages/DigitalTwin.tsx`); uma falha de leitura deixa a tela em branco, indistinguível de "não há dado" — e as telas tratam de leitura de QR, monitoramento do sistema e gêmeo digital.
Causa raiz: estado de erro não representado na interface (ver UI-19).
Caminho recomendado: em cada página, leia o estado de erro do hook de consulta e renderize bloco de erro com ação de tentar novamente, usando `src/components/ui/empty-state.tsx` no formato de `src/pages/OperatorView.tsx:169-170`. Não altere o conteúdo nem o layout da página além desse bloco. Se a página já tiver estado vazio, mantenha os dois (vazio e erro são diferentes).
Arquivos e objetos a tocar: `src/pages/QRScannerPage.tsx`, `src/pages/SystemMonitoringPage.tsx`, `src/pages/DigitalTwin.tsx`.
Não tocar / armadilhas: não mexa nos cálculos nem nos componentes de gráfico; se a página consome vários hooks, mostre um único bloco de erro (não um por consulta).
Depende de: 077 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: com a rede desligada (ou bloqueando a chamada no navegador), cada uma das três páginas mostra erro com ação de recarregar; com dados vazios, mostra estado vazio. Registre as três telas.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

---

## Onda 4 (continuação) — botão por botão, ligar ou remover

> Desdobramento da etapa 084. Os 17 locais foram confirmados por varredura de árvore sintática em `src/pages`, `src/features` e `src/components` (candidatos descartados por clique no elemento ancestral ou por estarem dentro de link foram excluídos pelo auditor). As etapas 082 e 083 cobrem quatro deles.

Para **cada** etapa abaixo, a decisão é a mesma e deve ser tomada com o dono, botão por botão: **ligar** à ação real (se existir hook/serviço/função que faça aquilo) ou **remover** o botão. Botão habilitado que não faz nada é o pior dos três estados; botão desabilitado com explicação é aceitável.

### Etapa 170 — Resolver os dois botões do painel de eficiência
Onda 4 / Severidade Média / Camada: front
Achados resolvidos: UI-21
Problema hoje: `src/pages/EfficiencyDashboard.tsx:65`, `src/pages/EfficiencyDashboard.tsx:67` — as duas ações do cabeçalho do painel de eficiência renderiza(m) `<Button>` habilitado **sem** `onClick`.
Causa raiz: interface desenhada antes das ações (ver UI-21).
Caminho recomendado: para cada botão, procure a ação correspondente no módulo (`grep -rn "use[A-Z].*Mutation\|Service\." <pasta do módulo>`): se existir, ligue no formato de `src/pages/ShiftHandoverPage.tsx:360-375` (`onClick` + `mutation.mutate` + desabilitar enquanto grava); se não existir, **remova o botão** e registre em `05-PROGRESSO.md`, em "Achados novos", o que o dono perde — é essa anotação que vira o pedido de funcionalidade depois. Não crie a funcionalidade nesta etapa.
Arquivos e objetos a tocar: `src/pages/EfficiencyDashboard.tsx:65`, `src/pages/EfficiencyDashboard.tsx:67`.
Não tocar / armadilhas: não troque o botão por um aviso de "em breve" (mesma mentira, outra forma); se o botão estiver dentro de um bloco com dados fabricados (ver UI-09 a UI-18), resolva primeiro a etapa daquele painel.
Depende de: — · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: clique em cada botão tratado: ou executa a ação e persiste (recarregue para confirmar), ou não existe mais na tela. Registre o resultado por botão.
Impacto no negócio: o gestor clica esperando exportar/aplicar e nada acontece.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 171 — Resolver os três botões do Gêmeo Digital
Onda 4 / Severidade Média / Camada: front
Achados resolvidos: UI-21
Problema hoje: `src/pages/DigitalTwin.tsx:53`, `src/pages/DigitalTwin.tsx:57`, `src/pages/DigitalTwin.tsx:132` — “Resetar Simulação”, “Iniciar What-If” e a ação do bloco de alertas renderiza(m) `<Button>` habilitado **sem** `onClick`.
Causa raiz: interface desenhada antes das ações (ver UI-21).
Caminho recomendado: para cada botão, procure a ação correspondente no módulo (`grep -rn "use[A-Z].*Mutation\|Service\." <pasta do módulo>`): se existir, ligue no formato de `src/pages/ShiftHandoverPage.tsx:360-375` (`onClick` + `mutation.mutate` + desabilitar enquanto grava); se não existir, **remova o botão** e registre em `05-PROGRESSO.md`, em "Achados novos", o que o dono perde — é essa anotação que vira o pedido de funcionalidade depois. Não crie a funcionalidade nesta etapa.
Arquivos e objetos a tocar: `src/pages/DigitalTwin.tsx:53`, `src/pages/DigitalTwin.tsx:57`, `src/pages/DigitalTwin.tsx:132`.
Não tocar / armadilhas: não troque o botão por um aviso de "em breve" (mesma mentira, outra forma); se o botão estiver dentro de um bloco com dados fabricados (ver UI-09 a UI-18), resolva primeiro a etapa daquele painel.
Depende de: — · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: clique em cada botão tratado: ou executa a ação e persiste (recarregue para confirmar), ou não existe mais na tela. Registre o resultado por botão.
Impacto no negócio: a tela promete simulação interativa e não faz nada.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 172 — Resolver os dois botões da visão executiva de indicadores
Onda 4 / Severidade Média / Camada: front
Achados resolvidos: UI-21
Problema hoje: `src/features/analytics/components/bi/executive/KPIOverviewTab.tsx:43`, `src/features/analytics/components/bi/executive/KPIOverviewTab.tsx:83` — as ações de detalhar indicador renderiza(m) `<Button>` habilitado **sem** `onClick`.
Causa raiz: interface desenhada antes das ações (ver UI-21).
Caminho recomendado: para cada botão, procure a ação correspondente no módulo (`grep -rn "use[A-Z].*Mutation\|Service\." <pasta do módulo>`): se existir, ligue no formato de `src/pages/ShiftHandoverPage.tsx:360-375` (`onClick` + `mutation.mutate` + desabilitar enquanto grava); se não existir, **remova o botão** e registre em `05-PROGRESSO.md`, em "Achados novos", o que o dono perde — é essa anotação que vira o pedido de funcionalidade depois. Não crie a funcionalidade nesta etapa.
Arquivos e objetos a tocar: `src/features/analytics/components/bi/executive/KPIOverviewTab.tsx:43`, `src/features/analytics/components/bi/executive/KPIOverviewTab.tsx:83`.
Não tocar / armadilhas: não troque o botão por um aviso de "em breve" (mesma mentira, outra forma); se o botão estiver dentro de um bloco com dados fabricados (ver UI-09 a UI-18), resolva primeiro a etapa daquele painel.
Depende de: — · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: clique em cada botão tratado: ou executa a ação e persiste (recarregue para confirmar), ou não existe mais na tela. Registre o resultado por botão.
Impacto no negócio: o diretor tenta abrir o detalhe do indicador e a tela não responde.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 173 — Resolver o botão de detalhes da passagem de turno
Onda 4 / Severidade Média / Camada: front
Achados resolvidos: UI-21
Problema hoje: `src/pages/ShiftHandoverPage.tsx:377` — “Ver detalhes”, ao lado de “Aceitar Turno” (que funciona) renderiza(m) `<Button>` habilitado **sem** `onClick`.
Causa raiz: interface desenhada antes das ações (ver UI-21).
Caminho recomendado: para cada botão, procure a ação correspondente no módulo (`grep -rn "use[A-Z].*Mutation\|Service\." <pasta do módulo>`): se existir, ligue no formato de `src/pages/ShiftHandoverPage.tsx:360-375` (`onClick` + `mutation.mutate` + desabilitar enquanto grava); se não existir, **remova o botão** e registre em `05-PROGRESSO.md`, em "Achados novos", o que o dono perde — é essa anotação que vira o pedido de funcionalidade depois. Não crie a funcionalidade nesta etapa.
Arquivos e objetos a tocar: `src/pages/ShiftHandoverPage.tsx:377`.
Não tocar / armadilhas: não troque o botão por um aviso de "em breve" (mesma mentira, outra forma); se o botão estiver dentro de um bloco com dados fabricados (ver UI-09 a UI-18), resolva primeiro a etapa daquele painel.
Depende de: — · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: clique em cada botão tratado: ou executa a ação e persiste (recarregue para confirmar), ou não existe mais na tela. Registre o resultado por botão.
Impacto no negócio: o operador não consegue ver o que está aceitando.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 174 — Resolver o botão do assistente de otimização do calendário
Onda 4 / Severidade Média / Camada: front
Achados resolvidos: UI-21
Problema hoje: `src/components/calendar/OptimizationAssistant.tsx:120` — a ação de aplicar a sugestão de otimização renderiza(m) `<Button>` habilitado **sem** `onClick`.
Causa raiz: interface desenhada antes das ações (ver UI-21).
Caminho recomendado: para cada botão, procure a ação correspondente no módulo (`grep -rn "use[A-Z].*Mutation\|Service\." <pasta do módulo>`): se existir, ligue no formato de `src/pages/ShiftHandoverPage.tsx:360-375` (`onClick` + `mutation.mutate` + desabilitar enquanto grava); se não existir, **remova o botão** e registre em `05-PROGRESSO.md`, em "Achados novos", o que o dono perde — é essa anotação que vira o pedido de funcionalidade depois. Não crie a funcionalidade nesta etapa.
Arquivos e objetos a tocar: `src/components/calendar/OptimizationAssistant.tsx:120`.
Não tocar / armadilhas: não troque o botão por um aviso de "em breve" (mesma mentira, outra forma); se o botão estiver dentro de um bloco com dados fabricados (ver UI-09 a UI-18), resolva primeiro a etapa daquele painel.
Depende de: — · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: clique em cada botão tratado: ou executa a ação e persiste (recarregue para confirmar), ou não existe mais na tela. Registre o resultado por botão.
Impacto no negócio: a sugestão de melhor sequência não pode ser aplicada.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 175 — Resolver os botões do widget preditivo e das recomendações de eficiência
Onda 4 / Severidade Média / Camada: front
Achados resolvidos: UI-21
Problema hoje: `src/components/dashboard/PredictiveAnalyticsWidget.tsx:95`, `src/features/analytics/components/oee/OEERecommendations.tsx:100` — as ações de agir sobre a previsão e sobre a recomendação renderiza(m) `<Button>` habilitado **sem** `onClick`.
Causa raiz: interface desenhada antes das ações (ver UI-21).
Caminho recomendado: para cada botão, procure a ação correspondente no módulo (`grep -rn "use[A-Z].*Mutation\|Service\." <pasta do módulo>`): se existir, ligue no formato de `src/pages/ShiftHandoverPage.tsx:360-375` (`onClick` + `mutation.mutate` + desabilitar enquanto grava); se não existir, **remova o botão** e registre em `05-PROGRESSO.md`, em "Achados novos", o que o dono perde — é essa anotação que vira o pedido de funcionalidade depois. Não crie a funcionalidade nesta etapa.
Arquivos e objetos a tocar: `src/components/dashboard/PredictiveAnalyticsWidget.tsx:95`, `src/features/analytics/components/oee/OEERecommendations.tsx:100`.
Não tocar / armadilhas: não troque o botão por um aviso de "em breve" (mesma mentira, outra forma); se o botão estiver dentro de um bloco com dados fabricados (ver UI-09 a UI-18), resolva primeiro a etapa daquele painel.
Depende de: — · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: clique em cada botão tratado: ou executa a ação e persiste (recarregue para confirmar), ou não existe mais na tela. Registre o resultado por botão.
Impacto no negócio: o sistema aponta o que fazer e não deixa fazer.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 176 — Resolver os botões de logística e da página Master API
Onda 4 / Severidade Média / Camada: front
Achados resolvidos: UI-21
Problema hoje: `src/pages/LogisticsPage.tsx:222`, `src/pages/MasterAPIPage.tsx:157` — a ação de expedição e a ação da página de API renderiza(m) `<Button>` habilitado **sem** `onClick`.
Causa raiz: interface desenhada antes das ações (ver UI-21).
Caminho recomendado: para cada botão, procure a ação correspondente no módulo (`grep -rn "use[A-Z].*Mutation\|Service\." <pasta do módulo>`): se existir, ligue no formato de `src/pages/ShiftHandoverPage.tsx:360-375` (`onClick` + `mutation.mutate` + desabilitar enquanto grava); se não existir, **remova o botão** e registre em `05-PROGRESSO.md`, em "Achados novos", o que o dono perde — é essa anotação que vira o pedido de funcionalidade depois. Não crie a funcionalidade nesta etapa.
Arquivos e objetos a tocar: `src/pages/LogisticsPage.tsx:222`, `src/pages/MasterAPIPage.tsx:157`.
Não tocar / armadilhas: não troque o botão por um aviso de "em breve" (mesma mentira, outra forma); se o botão estiver dentro de um bloco com dados fabricados (ver UI-09 a UI-18), resolva primeiro a etapa daquele painel.
Depende de: — · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: clique em cada botão tratado: ou executa a ação e persiste (recarregue para confirmar), ou não existe mais na tela. Registre o resultado por botão.
Impacto no negócio: quem opera expedição precisa fazer por fora do sistema.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

---

## Onda 6 (continuação) — performance medida com dados reais do banco

### Etapa 177 — Parar a consulta de 41 minutos de processamento que nunca devolve linha
Onda 6 / Severidade Alta / Camada: front + banco
Achados resolvidos: PERF-01, BD-14
Problema hoje: os painéis de administração leem `error_logs` (`src/features/admin/hooks/useMonitoringData.ts:43-48`, `src/pages/AdminTelemetriaPage.tsx:174-181`) e, como o registro nunca grava `user_id` (`src/lib/logger.ts:98-111`) enquanto a policy de leitura exige `auth.uid() = user_id`, o banco varre 2,3 milhões de linhas e devolve **zero**. A consulta aparece em `origin/contexto:docs/contexto/supabase/stats.md` com ~320 execuções e **2.490 segundos** de tempo total — mais de 40 minutos de processamento gastos para não mostrar nada.
Causa raiz: a mesma de BD-14 (gravador não informa o dono), com o agravante do custo de varredura.
Caminho recomendado: faça a etapa 103 (preencher `user_id`, criar policy para papel elevado, indexar) — ela resolve as duas faces. Em seguida, nesta etapa, acrescente `limit` explícito nas duas consultas dos painéis (hoje não há) e filtro por período, para que o painel nunca mais peça a tabela inteira. Enquanto 103 não estiver aplicada, o `limit` sozinho já corta a varredura.
Arquivos e objetos a tocar: `src/features/admin/hooks/useMonitoringData.ts`, `src/pages/AdminTelemetriaPage.tsx`.
Não tocar / armadilhas: não remova a policy de leitura por dono (ela protege o conteúdo do erro, que pode ter dado sensível); não aumente o limite do projeto.
Depende de: 103 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: compare o tempo da consulta em `stats.md` nas coletas seguintes (deve cair de centenas de segundos para unidades) e confirme que o painel passa a listar erros. Cole as duas linhas de `stats.md`.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 178 — Espaçar as consultas do painel de monitoramento ao custo real delas
Onda 6 / Severidade Alta / Camada: front (estado)
Achados resolvidos: PERF-02
Problema hoje: `src/pages/SystemMonitoringPage.tsx:82,218-221` mantém quatro consultas em repetição automática ao mesmo tempo, uma delas a função `get_cron_health`, que custa 3,57 segundos por execução (`origin/contexto:docs/contexto/supabase/stats.md`: ~520 execuções, 3.565 segundos). Com repetição de 60 segundos (`src/features/admin/hooks/useCronHealth.ts:29-31`), cada aba aberta consome cerca de 8,5 segundos de banco por minuto — e o painel costuma ficar aberto em tela de parede.
Causa raiz: intervalo de atualização escolhido sem relação com o custo da consulta.
Caminho recomendado: alinhe o intervalo ao custo: `get_cron_health` deve ir para 5 minutos, o mesmo que `useCronHealthHistory.ts:66` já usa. Faça **junto** da etapa 104 (que reescreve a função e derruba o custo): com a função barata, o intervalo pode voltar a ser curto se o dono quiser. Enquanto a função é caras, o intervalo longo é a única proteção.
Arquivos e objetos a tocar: `src/features/admin/hooks/useCronHealth.ts`, `src/pages/SystemMonitoringPage.tsx`.
Não tocar / armadilhas: não desligue a atualização automática (o painel existe para vigiar); não aumente o intervalo das consultas baratas junto — só da cara.
Depende de: 104 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: com o painel aberto por 10 minutos, a contagem de execuções de `get_cron_health` em `stats.md` deve crescer ~2 (em vez de ~10). Cole a contagem antes e depois.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 179 — Corrigir o gráfico de tendência que usa dados cortados sem avisar
Onda 3 / Severidade Alta / Camada: front (dados)
Achados resolvidos: PERF-03
Problema hoje: `src/features/admin/hooks/useCronHealthHistory.ts:70-78` pede `.limit(2000)` numa tabela com ~42,7 mil linhas (`origin/contexto:docs/contexto/supabase/stats.md`), mas o limite de linhas do projeto é **1000** (`project-config.md`: `max_rows: 1000`). A resposta vem truncada em 1000 e o gráfico de tendência é calculado sobre essa fatia, sem nenhum aviso de que faltam dados.
Causa raiz: limite pedido pelo cliente acima do limite imposto pelo servidor, sem verificação do corte.
Caminho recomendado: use o utilitário que o próprio repositório já tem para isso — `fetchAllRowsByCursor` de `src/lib/fetchAllRows.ts`, já usado em `src/features/admin/hooks/useDataExport.ts` — ou agregue no banco (a tabela já tem rotina de consolidação diária: `rollup_cron_p95_daily`, e a tabela `cron_p95_daily` existe com ~520 linhas, o que é o tamanho certo para um gráfico). A segunda opção é melhor: o gráfico passa a ler dados já consolidados, e o custo cai junto.
Arquivos e objetos a tocar: `src/features/admin/hooks/useCronHealthHistory.ts`.
Não tocar / armadilhas: não suba `max_rows` do projeto; se usar a tabela consolidada, confira que ela cobre o período que o gráfico mostra.
Depende de: — · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: compare o total de pontos do gráfico com `SELECT count(*)` do período: devem bater (hoje para em 1000). Cole os dois números.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 180 — Paginar a listagem de ordens de serviço
Onda 6 / Severidade Alta / Camada: front (consulta)
Achados resolvidos: PERF-04
Problema hoje: `src/features/jobs/services/jobsService.ts:25-36` busca a tabela `jobs` **inteira** com junções aninhadas (`select('*, machines(name, code), techniques:technique_id(*)')`), sem `limit` nem faixa; é a consulta de maior custo do aplicativo em `origin/contexto:docs/contexto/supabase/stats.md`. Além disso, o retorno de tempo real dispara **três** invalidações por evento (`src/features/jobs/hooks/useJobs.ts:43-47`), e cada uma refaz a consulta completa.
Causa raiz: listagem sem paginação, com atualização em tempo real multiplicando a consulta.
Caminho recomendado: duas mudanças, nesta ordem. (1) Reduza as invalidações: use uma única chave e deixe o gerenciador de estado derivar, ou agrupe os três eventos num intervalo curto — isso corta dois terços das consultas sem tocar na busca. (2) Pagine: o repositório **já tem** `usePaginatedJobs` (`src/features/jobs/hooks/usePaginatedJobs.ts`) — faça as telas de lista usarem esse hook em vez de `getAll()`, mantendo `getAll` apenas onde o conjunto completo é necessário (por exemplo, no planejamento semanal) e, nesse caso, com `select` enxuto (sem `techniques:technique_id(*)`, que traz a técnica inteira por OS). Hoje a tabela tem ~390 linhas, então o sintoma é pequeno — mas é a consulta que cresce com o negócio.
Arquivos e objetos a tocar: `src/features/jobs/hooks/useJobs.ts`, `src/features/jobs/services/jobsService.ts`, as telas de lista que usam `useJobs`.
Não tocar / armadilhas: o Kanban e os calendários dependem do conjunto do período — pagine por período, não por página fixa, nessas telas; não mude a forma da resposta sem ajustar os consumidores.
Depende de: 044 · Libera: —
Risco e como reverter: médio (toca as telas de lista). Reverter = voltar a `getAll`.
Precisa de aprovação humana antes do merge: não
Como verificar: na aba de rede, um evento de tempo real deve gerar **uma** requisição (hoje três); o tempo da consulta em `stats.md` deve cair. Cole as duas evidências.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 181 — Tirar as bibliotecas de PDF e imagem do carregamento da tela inicial
Onda 6 / Severidade Média / Camada: front (pacote)
Achados resolvidos: PERF-05
Problema hoje: `src/components/dashboard/DashboardExport.tsx:4-5` importa `html2canvas` e `jspdf` de forma estática, e o componente é importado estaticamente em `src/pages/Index.tsx:45` (no meio de treze importações preguiçosas, linhas 30-43) — então as duas bibliotecas entram no pacote da rota inicial, que todo mundo abre, para um recurso que poucos usam. Mesmo padrão em `src/features/maintenance/components/TPMReports.tsx:11-13`.
Causa raiz: importação estática de biblioteca pesada em componente de uso ocasional.
Caminho recomendado: mova as duas importações para **dentro** dos tratadores, com importação dinâmica — exatamente como `src/features/admin/hooks/useDataExport.ts:194-195` já faz — e torne o próprio componente de exportação preguiçoso em `Index.tsx`. O repositório tem orçamento de pacote por rota (`bundle-budget.json`) e relatório automático: use-os como evidência.
Arquivos e objetos a tocar: `src/components/dashboard/DashboardExport.tsx`, `src/pages/Index.tsx`, `src/features/maintenance/components/TPMReports.tsx`.
Não tocar / armadilhas: a exportação precisa continuar funcionando offline se já estiver em cache — teste depois; não mexa em `vite.config.ts` (divisão manual de pacotes) nesta etapa.
Depende de: — · Libera: 182
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: `npm run build && npm run bundle:report` e compare o tamanho do pacote da rota `/` antes e depois; a exportação deve continuar gerando o arquivo. Cole os dois tamanhos.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 182 — Fazer o orçamento de pacote por rota somar o que a rota realmente carrega
Onda 8 / Severidade Média / Camada: CI
Achados resolvidos: PERF-06
Problema hoje: `scripts/bundle-report.mjs:79-107` casa os pedaços do pacote **por nome** e não percorre o grafo de importações estáticas, então o orçamento por rota (`bundle-budget.json:30-42`) ignora tudo o que a rota arrasta por importação — o caso da etapa 181 passa pelo portão sem acusar nada.
Causa raiz: métrica de orçamento baseada em nome de arquivo, não em dependência.
Caminho recomendado: calcule o fechamento transitivo das importações estáticas a partir dos pedaços casados, usando o campo de importações do manifesto do empacotador (ou a saída do visualizador que já está configurado em `vite.config.ts`). Faça **depois** da etapa 181: com a correção aplicada, o novo cálculo tem um número honesto para comparar. Sem isso, o orçamento de pacote é um portão que não mede o que diz medir.
Arquivos e objetos a tocar: `scripts/bundle-report.mjs`, eventualmente `bundle-budget.json` (reajustar os tetos ao número real).
Não tocar / armadilhas: ao corrigir o cálculo, os valores vão **subir** — reajuste os tetos no mesmo PR, senão o portão fecha para todo mundo; não troque a ferramenta de medição.
Depende de: 181 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: sim (CI/portão de qualidade)
Como verificar: rode o relatório antes e depois numa rota conhecida (por exemplo `/`) e confirme que o valor novo inclui as dependências importadas; o portão deve continuar passando com os tetos reajustados.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 183 — Comprimir as fotos antes de enviar
Onda 6 / Severidade Média / Camada: front (upload)
Achados resolvidos: PERF-07
Problema hoje: as fotos vão para o balde **sem compressão**, em baldes **sem limite de tamanho** (`origin/contexto:docs/contexto/supabase/storage.md`) e enviadas uma a uma em série (`src/components/operator/ProductionRegistrationModal.tsx:141-159`, `src/features/maintenance/components/execution/RegulagemSection.tsx:104`). Uma foto de celular moderno tem vários megabytes; o operador registra produção pelo telefone, na rede da fábrica.
Causa raiz: upload direto do arquivo original, sem preparação.
Caminho recomendado: redimensione e recomprima no navegador antes do envio (desenho em `canvas` + `toBlob`, com teto de lado maior e qualidade), mantendo a validação de conteúdo que já existe; e envie em paralelo com um teto de concorrência. Combine com a etapa 023, que impõe o limite no balde — o cliente comprime, o servidor garante.
Arquivos e objetos a tocar: `src/lib/storage.ts` (ou um utilitário novo de compressão), `src/components/operator/ProductionRegistrationModal.tsx`, `src/features/maintenance/components/execution/RegulagemSection.tsx`.
Não tocar / armadilhas: não comprima documento técnico em PDF (só imagem); mantenha a resolução suficiente para a foto servir de prova — combine o teto com o dono.
Depende de: 023 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: envie a mesma foto antes e depois e compare o tamanho do objeto no balde; a foto deve continuar legível para o uso (confirme com o dono). Cole os dois tamanhos.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

---

## Onda 6 (continuação) — envolver a identidade em subconsulta, por módulo

> Desdobramento da etapa 150. Cada etapa é uma migration com um grupo de tabelas, para que uma recusa não derrube o resto. A lista exata de policies por tabela está em `git show origin/contexto:docs/contexto/supabase/lints.md | grep policy_auth_fn_not_wrapped`.

Em todas: a mudança é **de forma, não de lógica** — trocar `auth.uid()` por `(select auth.uid())` (idem `auth.jwt()`) dentro do predicado, mantendo tudo o mais igual. A migration de referência do próprio repositório é `supabase/migrations/20260620000001_optimize_rls_select_auth_uid.sql`.

### Etapa 184 — Otimizar as cinco policies de `user_roles`
Onda 6 / Severidade Média / Camada: banco (performance)
Achados resolvidos: BD-20
Problema hoje: public.user_roles responde(m) por **5** dos 71 alertas `policy_auth_fn_not_wrapped` do catálogo (`origin/contexto:docs/contexto/supabase/lints.md`): a identidade do usuário é reavaliada linha a linha em cada consulta. Esse grupo é prioritário porque é a tabela mais consultada do banco (~31 milhões de varreduras sequenciais, `stats.md`), porque quase toda policy do sistema pergunta a ela quem é o usuário.
Causa raiz: policies escritas antes da otimização adotada no repositório (ver BD-20).
Caminho recomendado: liste as policies exatas do grupo com `git show origin/contexto:docs/contexto/supabase/lints.md | grep policy_auth_fn_not_wrapped | grep <tabela>`, pegue a definição atual de cada uma em `origin/contexto:docs/contexto/supabase/tables/public/<tabela>.md` e recrie **com o mesmo predicado**, apenas envolvendo as chamadas de identidade em subconsulta. Confirme cada predicado caractere a caractere antes de aplicar: um erro aqui muda quem acessa o quê.
Arquivos e objetos a tocar: uma migration `supabase/migrations/<AAAAMMDDHHMMSS>_rls_subselect_<grupo>.sql`.
Não tocar / armadilhas: não aproveite para "melhorar" a regra de acesso; não misture grupos na mesma migration.
Depende de: 150, 003 · Libera: —
Risco e como reverter: médio (toca autorização). Reverter = restaurar as policies do grupo (definições no snapshot).
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: a contagem de `policy_auth_fn_not_wrapped` para essas tabelas vai a zero em `lints.md` na coleta seguinte, **e** um teste de acesso por papel (um que deve ver, um que não deve) continua dando o mesmo resultado de antes. Registre as duas evidências.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 185 — Otimizar as policies de embalagem (`packaging_defects`, `packaging_tasks`, `packaging_task_checklist`, `packaging_settings`, `packaging_checklist_items`, `packaging_sla_overrides`)
Onda 6 / Severidade Média / Camada: banco (performance)
Achados resolvidos: BD-20
Problema hoje: as seis tabelas de embalagem responde(m) por **13** dos 71 alertas `policy_auth_fn_not_wrapped` do catálogo (`origin/contexto:docs/contexto/supabase/lints.md`): a identidade do usuário é reavaliada linha a linha em cada consulta. Esse grupo é prioritário porque é o módulo com mais policies afetadas (13 das 71) e o que o quiosque de embalagem consulta a cada ação.
Causa raiz: policies escritas antes da otimização adotada no repositório (ver BD-20).
Caminho recomendado: liste as policies exatas do grupo com `git show origin/contexto:docs/contexto/supabase/lints.md | grep policy_auth_fn_not_wrapped | grep <tabela>`, pegue a definição atual de cada uma em `origin/contexto:docs/contexto/supabase/tables/public/<tabela>.md` e recrie **com o mesmo predicado**, apenas envolvendo as chamadas de identidade em subconsulta. Confirme cada predicado caractere a caractere antes de aplicar: um erro aqui muda quem acessa o quê.
Arquivos e objetos a tocar: uma migration `supabase/migrations/<AAAAMMDDHHMMSS>_rls_subselect_<grupo>.sql`.
Não tocar / armadilhas: não aproveite para "melhorar" a regra de acesso; não misture grupos na mesma migration.
Depende de: 150, 003 · Libera: —
Risco e como reverter: médio (toca autorização). Reverter = restaurar as policies do grupo (definições no snapshot).
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: a contagem de `policy_auth_fn_not_wrapped` para essas tabelas vai a zero em `lints.md` na coleta seguinte, **e** um teste de acesso por papel (um que deve ver, um que não deve) continua dando o mesmo resultado de antes. Registre as duas evidências.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 186 — Otimizar as policies de turno (`shift_occurrences`, `shift_pending_tasks`)
Onda 6 / Severidade Média / Camada: banco (performance)
Achados resolvidos: BD-20
Problema hoje: as duas tabelas de turno responde(m) por **6** dos 71 alertas `policy_auth_fn_not_wrapped` do catálogo (`origin/contexto:docs/contexto/supabase/lints.md`): a identidade do usuário é reavaliada linha a linha em cada consulta. Esse grupo é prioritário porque são lidas a cada abertura da passagem de turno, três vezes ao dia por turno.
Causa raiz: policies escritas antes da otimização adotada no repositório (ver BD-20).
Caminho recomendado: liste as policies exatas do grupo com `git show origin/contexto:docs/contexto/supabase/lints.md | grep policy_auth_fn_not_wrapped | grep <tabela>`, pegue a definição atual de cada uma em `origin/contexto:docs/contexto/supabase/tables/public/<tabela>.md` e recrie **com o mesmo predicado**, apenas envolvendo as chamadas de identidade em subconsulta. Confirme cada predicado caractere a caractere antes de aplicar: um erro aqui muda quem acessa o quê.
Arquivos e objetos a tocar: uma migration `supabase/migrations/<AAAAMMDDHHMMSS>_rls_subselect_<grupo>.sql`.
Não tocar / armadilhas: não aproveite para "melhorar" a regra de acesso; não misture grupos na mesma migration.
Depende de: 150, 003 · Libera: —
Risco e como reverter: médio (toca autorização). Reverter = restaurar as policies do grupo (definições no snapshot).
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: a contagem de `policy_auth_fn_not_wrapped` para essas tabelas vai a zero em `lints.md` na coleta seguinte, **e** um teste de acesso por papel (um que deve ver, um que não deve) continua dando o mesmo resultado de antes. Registre as duas evidências.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 187 — Otimizar as policies de manutenção (`tpm_executions`, `maintenance_schedules`, `maintenance_alerts`, `maintenance_records`, `tpm_parameter_alerts`, `tpm_notification_logs`, `machine_predictions`, `machine_health_metrics`)
Onda 6 / Severidade Média / Camada: banco (performance)
Achados resolvidos: BD-20
Problema hoje: as oito tabelas de manutenção responde(m) por **12** dos 71 alertas `policy_auth_fn_not_wrapped` do catálogo (`origin/contexto:docs/contexto/supabase/lints.md`): a identidade do usuário é reavaliada linha a linha em cada consulta. Esse grupo é prioritário porque alimentam o painel de TPM e os alertas de máquina.
Causa raiz: policies escritas antes da otimização adotada no repositório (ver BD-20).
Caminho recomendado: liste as policies exatas do grupo com `git show origin/contexto:docs/contexto/supabase/lints.md | grep policy_auth_fn_not_wrapped | grep <tabela>`, pegue a definição atual de cada uma em `origin/contexto:docs/contexto/supabase/tables/public/<tabela>.md` e recrie **com o mesmo predicado**, apenas envolvendo as chamadas de identidade em subconsulta. Confirme cada predicado caractere a caractere antes de aplicar: um erro aqui muda quem acessa o quê.
Arquivos e objetos a tocar: uma migration `supabase/migrations/<AAAAMMDDHHMMSS>_rls_subselect_<grupo>.sql`.
Não tocar / armadilhas: não aproveite para "melhorar" a regra de acesso; não misture grupos na mesma migration.
Depende de: 150, 003 · Libera: —
Risco e como reverter: médio (toca autorização). Reverter = restaurar as policies do grupo (definições no snapshot).
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: a contagem de `policy_auth_fn_not_wrapped` para essas tabelas vai a zero em `lints.md` na coleta seguinte, **e** um teste de acesso por papel (um que deve ver, um que não deve) continua dando o mesmo resultado de antes. Registre as duas evidências.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 188 — Otimizar as policies de `storage.objects`
Onda 6 / Severidade Média / Camada: banco (performance)
Achados resolvidos: BD-20
Problema hoje: as seis policies de arquivos responde(m) por **6** dos 71 alertas `policy_auth_fn_not_wrapped` do catálogo (`origin/contexto:docs/contexto/supabase/lints.md`): a identidade do usuário é reavaliada linha a linha em cada consulta. Esse grupo é prioritário porque toda exibição de foto ou documento passa por elas.
Causa raiz: policies escritas antes da otimização adotada no repositório (ver BD-20).
Caminho recomendado: liste as policies exatas do grupo com `git show origin/contexto:docs/contexto/supabase/lints.md | grep policy_auth_fn_not_wrapped | grep <tabela>`, pegue a definição atual de cada uma em `origin/contexto:docs/contexto/supabase/tables/public/<tabela>.md` e recrie **com o mesmo predicado**, apenas envolvendo as chamadas de identidade em subconsulta. Confirme cada predicado caractere a caractere antes de aplicar: um erro aqui muda quem acessa o quê.
Arquivos e objetos a tocar: uma migration `supabase/migrations/<AAAAMMDDHHMMSS>_rls_subselect_<grupo>.sql`.
Não tocar / armadilhas: não aproveite para "melhorar" a regra de acesso; não misture grupos na mesma migration.
Depende de: 150, 003 · Libera: —
Risco e como reverter: médio (toca autorização). Reverter = restaurar as policies do grupo (definições no snapshot).
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: a contagem de `policy_auth_fn_not_wrapped` para essas tabelas vai a zero em `lints.md` na coleta seguinte, **e** um teste de acesso por papel (um que deve ver, um que não deve) continua dando o mesmo resultado de antes. Registre as duas evidências.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 189 — Otimizar as policies das tabelas de registro e telemetria (`security_events`, `login_audit`, `query_telemetry`, `rate_limit_logs`, `geo_blocking_logs`, `csp_violation_reports`, `edge_health_history`, `cron_p95_daily`, `system_metrics`, `push_notifications`, `technical_sheet_audit_logs`)
Onda 6 / Severidade Média / Camada: banco (performance)
Achados resolvidos: BD-20
Problema hoje: as onze tabelas de registro responde(m) por **11** dos 71 alertas `policy_auth_fn_not_wrapped` do catálogo (`origin/contexto:docs/contexto/supabase/lints.md`): a identidade do usuário é reavaliada linha a linha em cada consulta. Esse grupo é prioritário porque são as que mais crescem em número de linhas, então o custo por linha pesa mais aqui.
Causa raiz: policies escritas antes da otimização adotada no repositório (ver BD-20).
Caminho recomendado: liste as policies exatas do grupo com `git show origin/contexto:docs/contexto/supabase/lints.md | grep policy_auth_fn_not_wrapped | grep <tabela>`, pegue a definição atual de cada uma em `origin/contexto:docs/contexto/supabase/tables/public/<tabela>.md` e recrie **com o mesmo predicado**, apenas envolvendo as chamadas de identidade em subconsulta. Confirme cada predicado caractere a caractere antes de aplicar: um erro aqui muda quem acessa o quê.
Arquivos e objetos a tocar: uma migration `supabase/migrations/<AAAAMMDDHHMMSS>_rls_subselect_<grupo>.sql`.
Não tocar / armadilhas: não aproveite para "melhorar" a regra de acesso; não misture grupos na mesma migration.
Depende de: 150, 003 · Libera: —
Risco e como reverter: médio (toca autorização). Reverter = restaurar as policies do grupo (definições no snapshot).
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: a contagem de `policy_auth_fn_not_wrapped` para essas tabelas vai a zero em `lints.md` na coleta seguinte, **e** um teste de acesso por papel (um que deve ver, um que não deve) continua dando o mesmo resultado de antes. Registre as duas evidências.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 190 — Otimizar as policies restantes (`profiles`, `inventory_items`, `shipments`, `shipping_providers`, `spc_measurements`, `spc_capability_history`, `efficiency_alert_history`, `bitrix24_sync_history`, `password_reset_requests`, `geo_blocking_rules`, `geo_blocking_settings`, `business_config`, `archived_jobs`, `backup_logs`, `cron_health_history`, `inventory_items`)
Onda 6 / Severidade Média / Camada: banco (performance)
Achados resolvidos: BD-20
Problema hoje: as tabelas restantes da lista responde(m) por **18** dos 71 alertas `policy_auth_fn_not_wrapped` do catálogo (`origin/contexto:docs/contexto/supabase/lints.md`): a identidade do usuário é reavaliada linha a linha em cada consulta. Esse grupo é prioritário porque fecha a lista dos 71 alertas.
Causa raiz: policies escritas antes da otimização adotada no repositório (ver BD-20).
Caminho recomendado: liste as policies exatas do grupo com `git show origin/contexto:docs/contexto/supabase/lints.md | grep policy_auth_fn_not_wrapped | grep <tabela>`, pegue a definição atual de cada uma em `origin/contexto:docs/contexto/supabase/tables/public/<tabela>.md` e recrie **com o mesmo predicado**, apenas envolvendo as chamadas de identidade em subconsulta. Confirme cada predicado caractere a caractere antes de aplicar: um erro aqui muda quem acessa o quê.
Arquivos e objetos a tocar: uma migration `supabase/migrations/<AAAAMMDDHHMMSS>_rls_subselect_<grupo>.sql`.
Não tocar / armadilhas: não aproveite para "melhorar" a regra de acesso; não misture grupos na mesma migration.
Depende de: 150, 003 · Libera: —
Risco e como reverter: médio (toca autorização). Reverter = restaurar as policies do grupo (definições no snapshot).
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: a contagem de `policy_auth_fn_not_wrapped` para essas tabelas vai a zero em `lints.md` na coleta seguinte, **e** um teste de acesso por papel (um que deve ver, um que não deve) continua dando o mesmo resultado de antes. Registre as duas evidências.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

---

## Onda 4 (continuação) — funcionalidades entregues pela metade

### Etapa 191 — Mostrar as notificações reais na central de notificações
Onda 4 / Severidade Alta / Camada: front
Achados resolvidos: FUN-01
Problema hoje: `src/pages/NotificationsPage.tsx:97-102` monta a lista a partir de apenas três fontes (alertas de manutenção, previsões e resumos) e **não inclui** `push_notifications` — que é a tabela onde o sistema grava as notificações de verdade (ela tem ~1,5 mil linhas, `origin/contexto:docs/contexto/supabase/stats.md`). O contador do menu lateral (`src/components/layout/AppSidebar.tsx:49`), porém, conta as notificações reais: o usuário vê "3 novas" e abre uma lista onde elas não estão.
Causa raiz: a central foi construída antes da tabela de notificações e nunca a incorporou.
Caminho recomendado: inclua `push_notifications` na montagem da lista, consumindo o array já pronto de `useNotifications` (que entrega os itens no formato certo), e some-as às contagens das abas. Mantenha o "marcar todas como lidas" funcionando para a fonte nova — esse é o ponto de atenção: hoje ele trata só os prefixos das três fontes antigas.
Arquivos e objetos a tocar: `src/pages/NotificationsPage.tsx`.
Não tocar / armadilhas: o item de resumo diário tem regra de leitura diferente (ver `PENDENCIAS.md`); não mude o comportamento dele nesta etapa.
Depende de: — · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: com uma notificação real gravada, o número do menu e a quantidade de itens da lista devem bater; marcar todas como lidas deve zerar os dois. Cole os dois números antes e depois.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 192 — Aplicar o prazo por cliente e técnica que hoje é cadastrado e ignorado
Onda 3 / Severidade Alta / Camada: front (regra de negócio)
Achados resolvidos: FUN-02
Problema hoje: existe cadastro de exceções de prazo por cliente e por técnica — tela (`src/features/packaging/components/PackagingSlaOverridesManager.tsx`), hook (`src/features/packaging/hooks/usePackagingSlaOverrides.ts`) e tabela no banco (`packaging_sla_overrides`, com policies próprias) — e a função que resolve o prazo efetivo (`resolveEffectiveSlaSettings`, `:107-145`) **não é chamada por nenhum componente**: todos os cálculos de prazo usam só a configuração global.
Causa raiz: a função de resolução foi escrita e a ligação com as telas de cálculo nunca foi feita.
Caminho recomendado: nos componentes que calculam prazo (os que chamam `computeSla`), carregue `usePackagingSlaOverrides()` junto de `usePackagingSettings()` e passe o retorno de `resolveEffectiveSlaSettings({ technique_id, client }, ...)` em vez da configuração global. Comece pelo componente que o operador vê (a tarefa de embalagem), depois os painéis. Verifique com o dono quais clientes têm exceção cadastrada hoje — se nenhum, o efeito é só futuro, mas a tela já promete.
Arquivos e objetos a tocar: os cinco componentes que calculam prazo de embalagem (liste com `grep -rn "computeSla" src/`).
Não tocar / armadilhas: não mude a regra global; a exceção deve apenas sobrepor quando existir.
Depende de: — · Libera: —
Risco e como reverter: médio (muda prazo mostrado). Reverter = voltar à configuração global.
Precisa de aprovação humana antes do merge: não
Como verificar: cadastre uma exceção para um cliente, abra uma tarefa desse cliente e confirme que o prazo exibido segue a exceção; outra tarefa, sem exceção, segue o global. Cole os dois prazos.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 193 — Fazer a exportação do painel de indicadores entregar os dados
Onda 4 / Severidade Alta / Camada: front
Achados resolvidos: FUN-03
Problema hoje: `src/pages/KPIDashboard.tsx:57` chama o utilitário de exportação com a lista **fixada em vazio**: `useBIExport({ periodJobsList: [] })`; o hook (`src/features/admin/hooks/useBIExport.ts:46,56-64`) então cai no ramo que gera arquivo sem linhas. O botão de exportar existe e produz um arquivo vazio.
Causa raiz: parâmetro provisório deixado no código.
Caminho recomendado: passe a lista real das OS do período — a página já usa `useKPIs`; exponha de lá a lista do período e repasse, como `FuturisticBI.tsx:41` já faz. Verifique no arquivo gerado que as colunas correspondem ao que a tela mostra.
Arquivos e objetos a tocar: `src/pages/KPIDashboard.tsx` e, se necessário, `src/features/analytics/hooks/useKPIs.ts` (apenas para expor a lista já calculada).
Não tocar / armadilhas: não duplique a consulta (a lista já existe no hook); se o período for grande, respeite a paginação da etapa 180.
Depende de: 071 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: exporte e abra o arquivo: deve conter uma linha por OS do período, batendo com o total exibido na tela. Cole as duas contagens.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 194 — Permitir cadastrar e editar itens de estoque
Onda 4 / Severidade Alta / Camada: front (fluxo incompleto)
Achados resolvidos: FUN-04
Problema hoje: o catálogo de estoque é **somente leitura**: `src/features/inventory/hooks/useInventory.ts:56` apenas lê, e `src/pages/InventoryPage.tsx:129-130` traz o comentário explícito "Botão 'Novo Item' removido: não havia ação/modal de criação implementado — reintroduzir quando o formulário existir". Não há criar, editar nem excluir item pela interface, embora a tabela exista com policies de escrita.
Causa raiz: módulo entregue com a leitura pronta e a escrita pendente.
Caminho recomendado: implemente criar, editar e desativar seguindo o padrão de CRUD que o repositório já tem com validação e formulário (`src/features/packaging/components/PackagingSlaOverridesManager.tsx` + o esquema de validação correspondente). Faça em **duas** PRs: primeiro criar (com o formulário e a validação), depois editar/desativar. Confirme com o dono se "excluir" deve existir ou se item sai de catálogo por desativação — para um catálogo com movimentações ligadas, desativar costuma ser o certo.
Arquivos e objetos a tocar: `src/features/inventory/hooks/useInventory.ts`, `src/pages/InventoryPage.tsx`, novo componente de formulário.
Não tocar / armadilhas: há gatilhos de estoque no banco (`update_inventory_stock`) — não altere saldo direto pelo formulário; o saldo vem das movimentações.
Depende de: 105 · Libera: —
Risco e como reverter: médio (escreve em catálogo). Reverter = esconder a ação.
Precisa de aprovação humana antes do merge: não
Como verificar: crie um item, edite o nome e desative: as três operações devem persistir (recarregue) e respeitar a permissão (operador não deve conseguir). Cole os três resultados.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 195 — Fazer o botão de etiqueta de lote abrir a etiqueta
Onda 4 / Severidade Alta / Camada: front
Achados resolvidos: FUN-05
Problema hoje: `src/pages/TraceabilityPage.tsx:78` descarta deliberadamente o estado (`const [, setLabelLots] = useState<ProductionLot[]>([])`) e o tratador em `:322-327` apenas valida a seleção; o componente de etiqueta (`src/components/traceability/LotLabelPrint.tsx`) **nunca é montado**. O botão "QR Lote" valida, não reclama e não mostra nada.
Causa raiz: componente de impressão criado e nunca ligado à tela.
Caminho recomendado: restaure o acesso ao estado e monte o componente de etiqueta com os lotes selecionados, abrindo quando houver seleção. É uma correção de poucas linhas, e o componente de impressão já existe pronto (hoje aparece como órfão na lista de componentes sem uso — CI-05).
Arquivos e objetos a tocar: `src/pages/TraceabilityPage.tsx`.
Não tocar / armadilhas: confira o formato do código de barras/QR esperado pelo leitor usado na fábrica antes de dar por pronto (há histórico de incompatibilidade entre gerador e leitor no projeto — `docs/pendencias/F-014`).
Depende de: — · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: selecione dois lotes, clique em "QR Lote" e confirme que a etiqueta abre com os dois; imprima em PDF e confira os códigos. Cole o resultado.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 196 — Permitir editar e desativar um agendamento de manutenção
Onda 4 / Severidade Alta / Camada: front (fluxo incompleto)
Achados resolvidos: FUN-06
Problema hoje: `src/features/maintenance/hooks/useTPMLifecycleMutations.ts:270-274` devolve apenas `createSchedule`, `startMaintenance` e `completeMaintenance`; não há editar, excluir nem desativar agendamento. A lista (`src/features/maintenance/components/TPMScheduleList.tsx:89-96`) não oferece essas ações. Um agendamento criado com data errada fica para sempre gerando alerta.
Causa raiz: fluxo de manutenção entregue só com o caminho de criação e execução.
Caminho recomendado: acrescente `updateSchedule` e `deactivateSchedule` (alterando o campo de ativo) ao hook, exponha no retorno e ligue as ações na linha da lista, reaproveitando o modal de criação já existente em modo de edição. Desativar é preferível a excluir: o histórico de execuções aponta para o agendamento.
Arquivos e objetos a tocar: `src/features/maintenance/hooks/useTPMLifecycleMutations.ts`, `src/features/maintenance/components/TPMScheduleList.tsx`.
Não tocar / armadilhas: alterar a data de vencimento afeta os alertas já gerados — confira o comportamento com o dono (pode ser necessário encerrar alertas pendentes ao reagendar, como o sistema já faz em outra situação).
Depende de: — · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: edite a data de um agendamento de teste e desative outro: a lista deve refletir, o alerta correspondente deve parar de aparecer. Cole os dois resultados.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 197 — Guardar a meta do painel executivo
Onda 4 / Severidade Média / Camada: front
Achados resolvidos: FUN-07
Problema hoje: `src/pages/ExecutiveDashboard.tsx:96-104` guarda a meta apenas no estado da tela e mostra "Meta salva", mas o valor volta a 85% a cada recarregamento (`:43`).
Causa raiz: ação de salvar que não persiste.
Caminho recomendado: grave em `business_config` usando `src/features/admin/hooks/useBusinessConfig.ts`, que já faz leitura e gravação nessa tabela, e inicialize a meta a partir dela, mantendo 85 como reserva. Confirme com o dono se a meta é única para a empresa (é o que a tela sugere) ou por técnica — no segundo caso, pare e registre, porque muda o modelo.
Arquivos e objetos a tocar: `src/pages/ExecutiveDashboard.tsx`, `src/features/analytics/components/executive/ExecutiveGoalDialog.tsx`.
Não tocar / armadilhas: `business_config` tem policy de escrita para gestor — confirme que o papel que usa o painel pode gravar, senão a tela vai falhar em silêncio (e aí vale mostrar o erro, etapa 077).
Depende de: 077 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: altere a meta, recarregue e confirme que o valor permanece; verifique a linha em `business_config`. Cole o valor gravado.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 198 — Escolher um único mecanismo de preferências de notificação
Onda 4 / Severidade Média / Camada: front
Achados resolvidos: FUN-08
Problema hoje: existem **dois** mecanismos de preferência de notificação, ambos órfãos: `src/features/notifications/hooks/useNotificationPreferences.ts:79-183` (mais completo, com o filtro `shouldNotify`) e `src/features/notifications/components/PushNotificationManager.tsx:11-37`. Nenhum é usado por nenhuma tela, e os dois usam a mesma chave de armazenamento com formatos incompatíveis — ou seja, se ambos fossem ligados, um corromperia o do outro.
Causa raiz: duas tentativas de resolver o mesmo problema, nenhuma concluída.
Caminho recomendado: escolha `useNotificationPreferences` (é o mais completo e tem o portão de decisão), monte-o como seção dentro da aba de notificações das configurações (`src/components/settings/SettingsNotificationsTab.tsx`) e **remova** o outro mecanismo para não deixar a armadilha de chave compartilhada. Ligue o filtro `shouldNotify` ao ponto onde as notificações são exibidas.
Arquivos e objetos a tocar: `src/components/settings/SettingsNotificationsTab.tsx`, `src/features/notifications/hooks/useNotificationPreferences.ts`, remoção de `src/features/notifications/components/PushNotificationManager.tsx`.
Não tocar / armadilhas: faça junto da etapa 085 (que trata das chaves de configuração sem efeito) para não criar uma terceira fonte de verdade.
Depende de: 085 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: desligue uma categoria de notificação e confirme que ela deixa de aparecer; recarregue e confirme que a preferência persiste. Cole o teste.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 199 — Decidir, item a item, o destino dos treze hooks e quatro componentes nunca integrados
Onda 8 / Severidade Média / Camada: front (código morto ou funcionalidade perdida)
Achados resolvidos: FUN-09
Problema hoje: treze hooks e quatro componentes de módulo estão exportados e **sem nenhum consumidor** (varredura cruzada de exportações e usos, ignorando barris e testes), entre eles `useDataImport` (`src/features/admin/hooks/useDataImport.ts:43,106`), `useSavedFilters`, `useDashboardSettings`, `useProductionLot`, `useSearchLots` e a gravação em `spc_capability_history`.
Causa raiz: trabalho entregue na camada de dados sem a camada de tela.
Caminho recomendado: um PR por decisão, com o dono. Dois casos merecem integração clara: **importação de dados** (`useDataImport`), que casa com a exportação já existente na tela de auditoria, e a **gravação de capacidade do processo** (`spc_capability_history`), que hoje só é lida. Os demais, remova — cada hook órfão é uma promessa que ninguém vai cumprir. Registre no progresso o que foi removido, para o dono poder pedir de volta.
Arquivos e objetos a tocar: conforme a decisão de cada item.
Não tocar / armadilhas: verifique duas vezes antes de remover (`grep` pelo nome **e** pelo caminho do arquivo); um hook pode ser usado por um componente também órfão, e aí os dois saem juntos (ver CI-05).
Depende de: 119 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: `npx tsc --noEmit -p tsconfig.app.json` limpo e a lista de hooks sem consumidor encolhendo. Cole a lista restante.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

---

## Onda 2 (continuação) — agendar cada rotina, uma por vez

> Desdobramento da etapa 063. Faça **uma por PR**, e só depois de provisionar o segredo correspondente (etapas 013 e 019) — uma rotina agendada que falha em silêncio é pior do que rotina ausente, porque passa a parecer que existe.

### Etapa 200 — Agendar a rotina `cleanup-security-logs`
Onda 2 / Severidade Alta / Camada: banco (cron)
Achados resolvidos: EDG-05
Problema hoje: a função `cleanup-security-logs` está publicada e ativa (`origin/contexto:docs/contexto/supabase/edge-functions.md`), **não** é chamada pelo aplicativo (`origin/contexto:docs/contexto/codigo/baseline.json` → `edges_orfas`) e **não** tem agendamento: `origin/contexto:docs/contexto/supabase/cron.md` lista sete rotinas, e nenhuma é esta. Ou seja, limpeza dos registros de segurança antigos nunca acontece. Consequência: documentos de operação (`docs/operacoes/RETENCAO-DE-LOGS.md`, `docs/operacoes/LGPD.md`) descrevem uma retenção que hoje ninguém executa — o que é promessa de conformidade sem lastro.
Causa raiz: função criada para rodar por agendamento, com o agendamento nunca versionado (ver EDG-05).
Caminho recomendado: confirme com o dono que o negócio quer esta rotina e com que frequência (sugestão: diário, de madrugada). Versione o agendamento em migration com `cron.schedule` + `net.http_post`, no padrão já aplicado em `supabase/migrations/20261001143100` para `auto-promote-jobs-fallback`, usando o segredo de autorização que a função espera. Antes de agendar, **invoque a função manualmente uma vez** e confirme que ela responde 200 — agendar uma função que falha só enche o histórico de execuções com erro.
Arquivos e objetos a tocar: nova migration `supabase/migrations/<AAAAMMDDHHMMSS>_cron_cleanup_security_logs.sql`.
Não tocar / armadilhas: o comando do agendamento carrega o segredo no cabeçalho — não cole o comando em PR nem em registro; evite colocar duas rotinas que escrevem na mesma tabela no mesmo minuto; se a função depender de segredo ausente, **pare** e faça antes a etapa 013/019.
Depende de: 063, 013, 019 · Libera: —
Risco e como reverter: baixo; reverter = `cron.unschedule`.
Precisa de aprovação humana antes do merge: sim (DDL em produção e custo de execução)
Como verificar: depois do primeiro disparo, `origin/contexto:docs/contexto/supabase/cron-runs.md` mostra a execução com `succeeded` **e** o efeito aparece no dado (linha nova na tabela que a função escreve). Cole as duas evidências.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 201 — Agendar a rotina `calculate-rankings`
Onda 2 / Severidade Alta / Camada: banco (cron)
Achados resolvidos: EDG-05
Problema hoje: a função `calculate-rankings` está publicada e ativa (`origin/contexto:docs/contexto/supabase/edge-functions.md`), **não** é chamada pelo aplicativo (`origin/contexto:docs/contexto/codigo/baseline.json` → `edges_orfas`) e **não** tem agendamento: `origin/contexto:docs/contexto/supabase/cron.md` lista sete rotinas, e nenhuma é esta. Ou seja, recálculo do ranking de operadores nunca acontece. Consequência: a tela de gamificação mostra ranking congelado; e a função só volta a funcionar depois da etapa 059.
Causa raiz: função criada para rodar por agendamento, com o agendamento nunca versionado (ver EDG-05).
Caminho recomendado: confirme com o dono que o negócio quer esta rotina e com que frequência (sugestão: diário ou semanal, conforme o dono). Versione o agendamento em migration com `cron.schedule` + `net.http_post`, no padrão já aplicado em `supabase/migrations/20261001143100` para `auto-promote-jobs-fallback`, usando o segredo de autorização que a função espera. Antes de agendar, **invoque a função manualmente uma vez** e confirme que ela responde 200 — agendar uma função que falha só enche o histórico de execuções com erro.
Arquivos e objetos a tocar: nova migration `supabase/migrations/<AAAAMMDDHHMMSS>_cron_calculate_rankings.sql`.
Não tocar / armadilhas: o comando do agendamento carrega o segredo no cabeçalho — não cole o comando em PR nem em registro; evite colocar duas rotinas que escrevem na mesma tabela no mesmo minuto; se a função depender de segredo ausente, **pare** e faça antes a etapa 013/019.
Depende de: 063, 013, 019 · Libera: —
Risco e como reverter: baixo; reverter = `cron.unschedule`.
Precisa de aprovação humana antes do merge: sim (DDL em produção e custo de execução)
Como verificar: depois do primeiro disparo, `origin/contexto:docs/contexto/supabase/cron-runs.md` mostra a execução com `succeeded` **e** o efeito aparece no dado (linha nova na tabela que a função escreve). Cole as duas evidências.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 202 — Agendar a rotina `calculate-inventory-intelligence`
Onda 2 / Severidade Alta / Camada: banco (cron)
Achados resolvidos: EDG-05
Problema hoje: a função `calculate-inventory-intelligence` está publicada e ativa (`origin/contexto:docs/contexto/supabase/edge-functions.md`), **não** é chamada pelo aplicativo (`origin/contexto:docs/contexto/codigo/baseline.json` → `edges_orfas`) e **não** tem agendamento: `origin/contexto:docs/contexto/supabase/cron.md` lista sete rotinas, e nenhuma é esta. Ou seja, recálculo das sugestões de estoque nunca acontece. Consequência: as sugestões de compra/reposição ficam desatualizadas sem ninguém perceber.
Causa raiz: função criada para rodar por agendamento, com o agendamento nunca versionado (ver EDG-05).
Caminho recomendado: confirme com o dono que o negócio quer esta rotina e com que frequência (sugestão: diário). Versione o agendamento em migration com `cron.schedule` + `net.http_post`, no padrão já aplicado em `supabase/migrations/20261001143100` para `auto-promote-jobs-fallback`, usando o segredo de autorização que a função espera. Antes de agendar, **invoque a função manualmente uma vez** e confirme que ela responde 200 — agendar uma função que falha só enche o histórico de execuções com erro.
Arquivos e objetos a tocar: nova migration `supabase/migrations/<AAAAMMDDHHMMSS>_cron_calculate_inventory_intelligence.sql`.
Não tocar / armadilhas: o comando do agendamento carrega o segredo no cabeçalho — não cole o comando em PR nem em registro; evite colocar duas rotinas que escrevem na mesma tabela no mesmo minuto; se a função depender de segredo ausente, **pare** e faça antes a etapa 013/019.
Depende de: 063, 013, 019 · Libera: —
Risco e como reverter: baixo; reverter = `cron.unschedule`.
Precisa de aprovação humana antes do merge: sim (DDL em produção e custo de execução)
Como verificar: depois do primeiro disparo, `origin/contexto:docs/contexto/supabase/cron-runs.md` mostra a execução com `succeeded` **e** o efeito aparece no dado (linha nova na tabela que a função escreve). Cole as duas evidências.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 203 — Agendar a rotina `metrics-collector`
Onda 2 / Severidade Alta / Camada: banco (cron)
Achados resolvidos: EDG-05
Problema hoje: a função `metrics-collector` está publicada e ativa (`origin/contexto:docs/contexto/supabase/edge-functions.md`), **não** é chamada pelo aplicativo (`origin/contexto:docs/contexto/codigo/baseline.json` → `edges_orfas`) e **não** tem agendamento: `origin/contexto:docs/contexto/supabase/cron.md` lista sete rotinas, e nenhuma é esta. Ou seja, coleta das métricas do sistema nunca acontece. Consequência: `system_metrics` deixa de receber pontos e os gráficos de tendência ficam vazios.
Causa raiz: função criada para rodar por agendamento, com o agendamento nunca versionado (ver EDG-05).
Caminho recomendado: confirme com o dono que o negócio quer esta rotina e com que frequência (sugestão: de hora em hora). Versione o agendamento em migration com `cron.schedule` + `net.http_post`, no padrão já aplicado em `supabase/migrations/20261001143100` para `auto-promote-jobs-fallback`, usando o segredo de autorização que a função espera. Antes de agendar, **invoque a função manualmente uma vez** e confirme que ela responde 200 — agendar uma função que falha só enche o histórico de execuções com erro.
Arquivos e objetos a tocar: nova migration `supabase/migrations/<AAAAMMDDHHMMSS>_cron_metrics_collector.sql`.
Não tocar / armadilhas: o comando do agendamento carrega o segredo no cabeçalho — não cole o comando em PR nem em registro; evite colocar duas rotinas que escrevem na mesma tabela no mesmo minuto; se a função depender de segredo ausente, **pare** e faça antes a etapa 013/019.
Depende de: 063, 013, 019 · Libera: —
Risco e como reverter: baixo; reverter = `cron.unschedule`.
Precisa de aprovação humana antes do merge: sim (DDL em produção e custo de execução)
Como verificar: depois do primeiro disparo, `origin/contexto:docs/contexto/supabase/cron-runs.md` mostra a execução com `succeeded` **e** o efeito aparece no dado (linha nova na tabela que a função escreve). Cole as duas evidências.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 204 — Agendar a rotina `daily-maintenance-summary`
Onda 2 / Severidade Alta / Camada: banco (cron)
Achados resolvidos: EDG-05
Problema hoje: a função `daily-maintenance-summary` está publicada e ativa (`origin/contexto:docs/contexto/supabase/edge-functions.md`), **não** é chamada pelo aplicativo (`origin/contexto:docs/contexto/codigo/baseline.json` → `edges_orfas`) e **não** tem agendamento: `origin/contexto:docs/contexto/supabase/cron.md` lista sete rotinas, e nenhuma é esta. Ou seja, resumo diário de manutenção nunca acontece. Consequência: o resumo que o time de manutenção usa para planejar o dia depende hoje de alguém chamar a função pela tela.
Causa raiz: função criada para rodar por agendamento, com o agendamento nunca versionado (ver EDG-05).
Caminho recomendado: confirme com o dono que o negócio quer esta rotina e com que frequência (sugestão: diário, no início do expediente). Versione o agendamento em migration com `cron.schedule` + `net.http_post`, no padrão já aplicado em `supabase/migrations/20261001143100` para `auto-promote-jobs-fallback`, usando o segredo de autorização que a função espera. Antes de agendar, **invoque a função manualmente uma vez** e confirme que ela responde 200 — agendar uma função que falha só enche o histórico de execuções com erro.
Arquivos e objetos a tocar: nova migration `supabase/migrations/<AAAAMMDDHHMMSS>_cron_daily_maintenance_summary.sql`.
Não tocar / armadilhas: o comando do agendamento carrega o segredo no cabeçalho — não cole o comando em PR nem em registro; evite colocar duas rotinas que escrevem na mesma tabela no mesmo minuto; se a função depender de segredo ausente, **pare** e faça antes a etapa 013/019.
Depende de: 063, 013, 019 · Libera: —
Risco e como reverter: baixo; reverter = `cron.unschedule`.
Precisa de aprovação humana antes do merge: sim (DDL em produção e custo de execução)
Como verificar: depois do primeiro disparo, `origin/contexto:docs/contexto/supabase/cron-runs.md` mostra a execução com `succeeded` **e** o efeito aparece no dado (linha nova na tabela que a função escreve). Cole as duas evidências.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso


---

## Onda 3 (continuação) — reduzir as quatro trilhas de auditoria a uma

> Desdobramento da etapa 108. Uma remoção por PR, verificando a cada passo que nenhuma tela ficou vazia. A trilha que **fica** é `tr_audit_job_status` → `audit_log` (tem encadeamento de hash e função de verificação), depois de corrigida na etapa 004.

### Etapa 205 — Descontinuar o gatilho `tr_audit_job_changes`
Onda 3 / Severidade Média / Camada: banco (auditoria)
Achados resolvidos: BD-06
Problema hoje: `public.jobs` tem quatro gatilhos de auditoria habilitados (`origin/contexto:docs/contexto/supabase/tables/public/jobs.md`); este, `tr_audit_job_changes`, chama `public.audit_job_changes` e grava em `job_status_audit`. Cada alteração de OS escreve em três tabelas diferentes, encarecendo a operação e criando versões concorrentes da mesma história. Este gatilho é a trilha mais antiga e grava num formato próprio, separado da trilha com encadeamento de hash.
Causa raiz: trilhas somadas por migrations sucessivas, nunca consolidadas (ver BD-06).
Caminho recomendado: antes de remover, confirme que a trilha que fica (`audit_log`, via `tr_audit_job_status`) registra o mesmo evento com a mesma informação — compare os dois corpos de função no snapshot. Depois, na migration, apenas `DROP TRIGGER tr_audit_job_changes ON public.jobs` (mantenha a função e a tabela: o histórico já gravado continua legível). Verifique as telas que leem `job_status_audit` (`grep -rn "job_status_audit" src/`): se alguma depender, ajuste-a para ler a trilha oficial **no mesmo PR**, senão a tela esvazia.
Arquivos e objetos a tocar: nova migration; eventualmente a tela que lê `job_status_audit`.
Não tocar / armadilhas: não apague a tabela nem a função; não remova dois gatilhos na mesma PR.
Depende de: 004, 108 · Libera: —
Risco e como reverter: médio (perda de registro se feito na ordem errada). Reverter = recriar o gatilho.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: mude o status de uma OS de teste e confirme: a trilha oficial registrou, nenhuma tela ficou vazia, e `job_status_audit` parou de receber linhas novas. Cole as três evidências.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 206 — Descontinuar o gatilho `trigger_log_job_status_change`
Onda 3 / Severidade Média / Camada: banco (auditoria)
Achados resolvidos: BD-06
Problema hoje: `public.jobs` tem quatro gatilhos de auditoria habilitados (`origin/contexto:docs/contexto/supabase/tables/public/jobs.md`); este, `trigger_log_job_status_change`, chama `public.log_job_status_change` e grava em `job_status_history`. Cada alteração de OS escreve em três tabelas diferentes, encarecendo a operação e criando versões concorrentes da mesma história. Este gatilho é a trilha que a tela de histórico de status consome — confirme o consumidor antes de remover (`grep -rn "job_status_history" src/`).
Causa raiz: trilhas somadas por migrations sucessivas, nunca consolidadas (ver BD-06).
Caminho recomendado: antes de remover, confirme que a trilha que fica (`audit_log`, via `tr_audit_job_status`) registra o mesmo evento com a mesma informação — compare os dois corpos de função no snapshot. Depois, na migration, apenas `DROP TRIGGER trigger_log_job_status_change ON public.jobs` (mantenha a função e a tabela: o histórico já gravado continua legível). Verifique as telas que leem `job_status_history` (`grep -rn "job_status_history" src/`): se alguma depender, ajuste-a para ler a trilha oficial **no mesmo PR**, senão a tela esvazia.
Arquivos e objetos a tocar: nova migration; eventualmente a tela que lê `job_status_history`.
Não tocar / armadilhas: não apague a tabela nem a função; não remova dois gatilhos na mesma PR.
Depende de: 004, 108 · Libera: —
Risco e como reverter: médio (perda de registro se feito na ordem errada). Reverter = recriar o gatilho.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: mude o status de uma OS de teste e confirme: a trilha oficial registrou, nenhuma tela ficou vazia, e `job_status_history` parou de receber linhas novas. Cole as três evidências.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 207 — Descontinuar o gatilho `audit_jobs`
Onda 3 / Severidade Média / Camada: banco (auditoria)
Achados resolvidos: BD-06
Problema hoje: `public.jobs` tem quatro gatilhos de auditoria habilitados (`origin/contexto:docs/contexto/supabase/tables/public/jobs.md`); este, `audit_jobs`, chama `public.audit_trigger_func` e grava em `audit_log`. Cada alteração de OS escreve em três tabelas diferentes, encarecendo a operação e criando versões concorrentes da mesma história. Este gatilho é a trilha genérica, que também cobre outras cinco tabelas — remover aqui afeta **apenas** `jobs`, mas confirme isso no corpo da função antes.
Causa raiz: trilhas somadas por migrations sucessivas, nunca consolidadas (ver BD-06).
Caminho recomendado: antes de remover, confirme que a trilha que fica (`audit_log`, via `tr_audit_job_status`) registra o mesmo evento com a mesma informação — compare os dois corpos de função no snapshot. Depois, na migration, apenas `DROP TRIGGER audit_jobs ON public.jobs` (mantenha a função e a tabela: o histórico já gravado continua legível). Verifique as telas que leem `audit_log` (`grep -rn "audit_log" src/`): se alguma depender, ajuste-a para ler a trilha oficial **no mesmo PR**, senão a tela esvazia.
Arquivos e objetos a tocar: nova migration; eventualmente a tela que lê `audit_log`.
Não tocar / armadilhas: não apague a tabela nem a função; não remova dois gatilhos na mesma PR.
Depende de: 004, 108 · Libera: —
Risco e como reverter: médio (perda de registro se feito na ordem errada). Reverter = recriar o gatilho.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: mude o status de uma OS de teste e confirme: a trilha oficial registrou, nenhuma tela ficou vazia, e `audit_log` parou de receber linhas novas. Cole as três evidências.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

---

## Onda 8 (continuação) — testes que não testam e observabilidade que não observa

### Etapa 208 — Executar os testes de função de servidor que hoje ninguém roda
Onda 8 / Severidade Alta / Camada: CI
Achados resolvidos: TST-01
Problema hoje: `.github/workflows/ci.yml:220` roda `deno test ... supabase/functions/_shared/*.test.ts` — o padrão alcança **apenas** a pasta compartilhada. Os testes das funções em si (entre eles `supabase/functions/external-db-bridge/index.test.ts`, com 628 linhas, e o de `webhook-handler`) somam cerca de 705 linhas e **nunca são executados**; `vitest.config.ts:34` também exclui `supabase/functions`.
Causa raiz: padrão de busca restrito a uma pasta.
Caminho recomendado: amplie o comando para `supabase/functions/**/*.test.ts`, mantendo as permissões mínimas que o comando já usa. Rode localmente antes: é provável que algum teste esteja vermelho (ninguém o executa há tempo) — nesse caso **não** o desative: corrija no mesmo PR se for erro do teste, ou registre em "Achados novos" se apontar defeito real de código.
Arquivos e objetos a tocar: `.github/workflows/ci.yml`.
Não tocar / armadilhas: alguns testes podem exigir variáveis de ambiente; prefira dar valores de teste no próprio comando a enfraquecer a verificação.
Depende de: 141 · Libera: 209
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: sim (CI/workflows)
Como verificar: a execução do trabalho `Edge Functions (Deno)` passa a reportar a contagem de testes das funções (hoje reporta só os compartilhados). Cole o resumo antes e depois.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 209 — Fazer o teste do túnel de banco testar o código de verdade
Onda 8 / Severidade Alta / Camada: testes
Achados resolvidos: TST-02
Problema hoje: `supabase/functions/external-db-bridge/index.test.ts:21` declara `// Re-implement the pure logic functions here to test them in isolation` — o arquivo de 628 linhas valida uma **cópia** da lógica escrita dentro do próprio teste, não o código que roda. A cópia do validador nem sequer conhece a lista de tabelas permitidas do módulo real (`index.ts:100`). Na prática: o teste mais longo do repositório não protege nada — inclusive não pegou o problema crítico SEG-04.
Causa raiz: lógica não exportada, contornada com cópia no teste.
Caminho recomendado: exporte do módulo as funções puras que o teste quer verificar (`validateRequest`, `validateColumns` e a lista de tabelas) e faça o teste importá-las. Depois acrescente um caso que **falhe** se `user_roles` ou `audit_log` voltarem à lista permitida — assim o teste passa a defender a correção da etapa 056. Faça esta etapa junto ou logo depois da 208, senão o teste corrigido continua sem rodar.
Arquivos e objetos a tocar: `supabase/functions/external-db-bridge/index.ts` (apenas exportações), `supabase/functions/external-db-bridge/index.test.ts`.
Não tocar / armadilhas: não exporte o tratador inteiro só para testar; exporte as funções puras.
Depende de: 056, 208 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: adicione temporariamente `user_roles` de volta à lista e confirme que o teste **falha**; remova e confirme que passa. Cole as duas execuções.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 210 — Enviar os erros para o monitoramento externo (hoje nenhum chega)
Onda 8 / Severidade Alta / Camada: observabilidade
Achados resolvidos: OBS-01
Problema hoje: o projeto declara a dependência de monitoramento e a inicializa (`src/main.tsx:16-62`), mas **nenhuma exceção é enviada**: `grep -rn "captureException" src/` não retorna nada; os limites de erro da interface (`src/components/error/GlobalErrorBoundary.tsx:27-36`, `src/components/auth/AuthErrorBoundary.tsx:26-45`) gravam na tabela interna e no console, e só. Somado a `SENTRY_DSN` ausente nos segredos do projeto (INT-01), o monitoramento externo é decorativo.
Causa raiz: biblioteca instalada e inicializada, sem nenhum ponto de envio.
Caminho recomendado: chame o envio de exceção nos dois limites de erro da interface e no tratador global de erro do aplicativo, passando o contexto que já é montado para a tabela interna (sem dados pessoais — reaproveite a limpeza que `src/lib/logger.ts` já faz). Faça **depois** da etapa 020 (decisão sobre o serviço): se o dono não quiser monitoramento externo, esta etapa vira remoção da dependência, e aí o `error_logs` corrigido (etapa 103) é o canal oficial — mas isso precisa estar escrito, não suposto.
Arquivos e objetos a tocar: `src/components/error/GlobalErrorBoundary.tsx`, `src/components/auth/AuthErrorBoundary.tsx`, `src/main.tsx`.
Não tocar / armadilhas: não envie o conteúdo de formulário nem identificadores de pessoa; não envie o mesmo erro duas vezes (uma por limite e outra pelo tratador global).
Depende de: 020, 103 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: provoque um erro controlado numa tela e confirme o evento no painel do serviço (ou, na opção de remoção, que a dependência saiu do pacote). Cole a evidência.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 211 — Fazer os testes de ponta a ponta reprovarem quando o acesso é negado
Onda 8 / Severidade Média / Camada: testes
Achados resolvidos: TST-03
Problema hoje: várias verificações de ponta a ponta aceitam como sucesso **tanto** a tela carregada **quanto** a mensagem de acesso negado: `tests/e2e/dashboard.spec.ts:13-17`, `tests/e2e/maintenance.spec.ts:13-17`, `tests/e2e/system-status.spec.ts:38-43`, `tests/e2e/packaging*.spec.ts`. Ou seja, se a conta de teste perder a permissão (ou se uma regra de acesso quebrar), a suíte continua verde — exatamente o cenário que ela deveria denunciar.
Causa raiz: verificação escrita de forma tolerante para a suíte parar de oscilar.
Caminho recomendado: separe em dois casos por tela: um com a conta que **deve** ver (espera o conteúdo) e outro com a conta de operador que **não** deve ver (espera a negação). O repositório já tem as duas contas configuradas (`E2E_EMAIL` e `E2E_OPERATOR_EMAIL`, `.github/workflows/ci.yml`). Isso transforma a tolerância atual em cobertura real de autorização — justamente o que falta ao sistema (AUT-05, AUT-07).
Arquivos e objetos a tocar: os arquivos de verificação listados.
Não tocar / armadilhas: enquanto a suíte for advisory (CI-01), a correção não bloqueia merge — ainda vale, porque o relatório passa a dizer a verdade; não acrescente espera fixa por tempo para "estabilizar".
Depende de: 035 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: rode a suíte com a conta de operador e confirme que os casos de negação passam e os de conteúdo falham (e vice-versa com a conta completa). Cole o resultado das duas execuções.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 212 — Cobrir com teste o serviço de embalagem
Onda 8 / Severidade Alta / Camada: testes
Achados resolvidos: TST-04
Problema hoje: `find src/features/packaging -name "*.test.*" | wc -l` → **0**, para um módulo com 20 componentes, 13 hooks, um serviço de 212 linhas e um esquema de validação de 138 linhas — e é o módulo onde esta auditoria encontrou uma corrida de dado (`packagingService.ts:190-193`, a mesma da PR #249) e um upload sem validação (SEG-06).
Causa raiz: módulo entregue sem teste, num repositório que tem 124 arquivos de teste em outras áreas.
Caminho recomendado: comece pelo que protege dinheiro e dado: testes do serviço (`packagingService`) para o registro de defeito e a atualização de quantidade rejeitada, e do esquema de validação. Use como referência um teste de serviço existente (`src/features/jobs/services/jobsService.test.ts`). Não persiga cobertura do módulo inteiro nesta etapa — o objetivo é travar o comportamento que as etapas 146 e a PR #249 corrigem.
Arquivos e objetos a tocar: novos `src/features/packaging/services/packagingService.test.ts` e `src/features/packaging/types/packaging.schema.test.ts`.
Não tocar / armadilhas: não escreva teste que valide uma cópia da lógica (o erro de TST-02); importe o código real.
Depende de: 146 · Libera: —
Risco e como reverter: nenhum (só acrescenta teste).
Precisa de aprovação humana antes do merge: não
Como verificar: `npx vitest run src/features/packaging` passa com os casos novos, e um deles falha se a validação de upload for removida. Cole a saída.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 213 — Cobrir a cadeia de alerta das rotinas automáticas
Onda 8 / Severidade Média / Camada: testes
Achados resolvidos: TST-05
Problema hoje: não existe teste para `cron-alert-email` nem para `health-monitor` — as duas funções que deveriam avisar quando as rotinas automáticas falham. E, pelo que esta auditoria encontrou, as duas têm defeito: a primeira marca alerta como enviado sem enviar (INT-01, etapa 014) e a segunda grava em colunas inexistentes (EDG-08, etapa 131). O mecanismo de alerta não consegue alertar sobre a própria falha.
Causa raiz: as funções de vigilância ficaram fora da cobertura.
Caminho recomendado: depois de corrigidas (etapas 014 e 131), escreva testes que travem o comportamento corrigido: sem credencial de e-mail, a função **não** marca como enviado; com erro na gravação do evento, a função reporta falha. Use o estilo dos testes de função de servidor que já existem (`supabase/functions/_shared/*.test.ts`) e garanta que rodam (etapa 208).
Arquivos e objetos a tocar: novos testes em `supabase/functions/cron-alert-email/` e `supabase/functions/health-monitor/`.
Não tocar / armadilhas: não chame o serviço de e-mail real no teste.
Depende de: 014, 131, 208 · Libera: —
Risco e como reverter: nenhum.
Precisa de aprovação humana antes do merge: não
Como verificar: os testes novos aparecem na contagem do trabalho `Edge Functions (Deno)` e falham se a correção for revertida. Cole a saída.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 214 — Estender a trava de tipo solto às funções de servidor
Onda 8 / Severidade Média / Camada: CI
Achados resolvidos: TST-06, CI-03
Problema hoje: `scripts/check-any-baseline.mjs:30` varre **apenas** `src/` (`const SRC_DIR = join(ROOT, 'src')`), e por isso o número de referência do projeto é 2 (`.any-baseline.json`). As 33 funções de servidor ficam fora da trava, e nelas há 54 ocorrências de tipo solto — inclusive no túnel de banco que esta auditoria apontou como crítico (SEG-04), onde o resultado da consulta é tratado sem tipo.
Causa raiz: trava criada para o código do aplicativo e nunca estendida ao servidor.
Caminho recomendado: inclua `supabase/functions/` na varredura e registre o número atual como referência (sem corrigir nada ainda) — assim a dívida para de crescer e fica visível. A redução vem depois, por etapa própria, começando pelas funções que gravam dado. Faça junto da etapa 121, que corrige a outra métrica enganosa.
Arquivos e objetos a tocar: `scripts/check-any-baseline.mjs`, `.any-baseline.json`.
Não tocar / armadilhas: não transforme a trava em bloqueio retroativo (ela deve congelar, não reprovar o que já existe); confirme que os testes do próprio script (`scripts/*.test.mjs`) continuam passando — e lembre que eles só rodam na CI depois da etapa 141.
Depende de: 121, 141 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: sim (CI/portão de qualidade)
Como verificar: `npm run quality:any` passa com o número novo; acrescente um `any` numa função de servidor e confirme que o portão reprova. Cole as duas execuções.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

---

## Onda 8 (continuação) — remoção de código morto, em lotes verificáveis

> Desdobramento da etapa 119. A lista completa está em `origin/contexto:docs/contexto/codigo/baseline.json` → `componentes_orfaos`. Antes de remover qualquer arquivo, confirme com **duas** buscas: pelo nome do componente (`grep -rn "<Nome" src/`) e pelo caminho do arquivo (`grep -rn "nome-do-arquivo" src/`).

### Etapa 215 — Resolver os dez componentes de biblioteca de interface sem uso
Onda 8 / Severidade Baixa / Camada: front (código morto)
Achados resolvidos: CI-05
Problema hoje: `src/components/ui/accordion.tsx`, `carousel.tsx`, `drawer.tsx`, `input-otp.tsx`, `resizable.tsx`, `responsive-table.tsx`, `sidebar.tsx`, `stepper.tsx`, `toggle-group.tsx` e o restante da lista em `src/components/ui/` não são importados em lugar algum (`origin/contexto:docs/contexto/codigo/baseline.json` → `componentes_orfaos`, apuração do commit `ca42441b`). São arquivos de catálogo instalados por padrão pela biblioteca de componentes, não funcionalidade do produto.
Causa raiz: componentes criados para telas que mudaram de rumo, ou instalados por padrão pela biblioteca de interface.
Caminho recomendado: remova; o risco é mínimo e o ganho é um diretório de interface que corresponde ao que o produto usa. Para cada arquivo removido, anote em `05-PROGRESSO.md` o nome e uma linha do que ele fazia — é essa anotação que permite ao dono pedir de volta mais tarde.
Arquivos e objetos a tocar: os listados acima, conforme a decisão de cada um.
Não tocar / armadilhas: atenção a importações internas entre componentes da própria biblioteca (um deles pode usar outro) — remova em um único PR e confie no compilador. Nunca remova e corrija outra coisa no mesmo PR.
Depende de: 119 · Libera: —
Risco e como reverter: baixo (tudo recuperável pelo histórico do repositório).
Precisa de aprovação humana antes do merge: não
Como verificar: `npx tsc --noEmit -p tsconfig.app.json` e `npm run build` limpos; a contagem de componentes órfãos na próxima coleta da branch `contexto` cai pelo número removido. Cole a contagem antes e depois.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 216 — Resolver os componentes órfãos de operação e cadastro
Onda 8 / Severidade Baixa / Camada: front (código morto)
Achados resolvidos: CI-05
Problema hoje: `src/components/machines/MachineDetailsModal.tsx`, `src/components/traceability/CreateLotModal.tsx`, `src/components/traceability/LotLabelPrint.tsx`, `src/components/operators/OperatorCardDetailed.tsx`, `src/components/operators/OperatorStatCard.tsx` não são importados em lugar algum (`origin/contexto:docs/contexto/codigo/baseline.json` → `componentes_orfaos`, apuração do commit `ca42441b`). Cada um parece ser **funcionalidade perdida**, não lixo: detalhe de máquina, criação de lote e etiqueta de lote são fluxos que o sistema promete.
Causa raiz: componentes criados para telas que mudaram de rumo, ou instalados por padrão pela biblioteca de interface.
Caminho recomendado: **não remova antes de perguntar**: leve a lista ao dono e pergunte, um a um, se o fluxo deveria existir. `LotLabelPrint` já tem destino certo na etapa 195. Para cada arquivo removido, anote em `05-PROGRESSO.md` o nome e uma linha do que ele fazia — é essa anotação que permite ao dono pedir de volta mais tarde.
Arquivos e objetos a tocar: os listados acima, conforme a decisão de cada um.
Não tocar / armadilhas: remover um componente que era a metade pronta de um fluxo transforma dívida visível em funcionalidade esquecida. Nunca remova e corrija outra coisa no mesmo PR.
Depende de: 119 · Libera: —
Risco e como reverter: baixo (tudo recuperável pelo histórico do repositório).
Precisa de aprovação humana antes do merge: não
Como verificar: `npx tsc --noEmit -p tsconfig.app.json` e `npm run build` limpos; a contagem de componentes órfãos na próxima coleta da branch `contexto` cai pelo número removido. Cole a contagem antes e depois.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 217 — Resolver os componentes órfãos de apoio e acessibilidade
Onda 8 / Severidade Baixa / Camada: front (código morto)
Achados resolvidos: CI-05
Problema hoje: `src/components/accessibility/AccessibleIconButton.tsx`, `src/components/accessibility/FocusTrap.tsx`, `src/components/alerts/AlertCard.tsx`, `src/components/alerts/AlertSummaryStats.tsx`, `src/components/calendar/CalendarSkeleton.tsx`, `src/components/feedback/CelebrationMoment.tsx`, `src/components/layout/ResponsiveContainer.tsx`, `src/components/mobile/PullToRefresh.tsx`, `src/components/dashboard/QuickActions.tsx`, `src/components/navigation/GlobalSearch.tsx`, `src/components/technical-assistant/BiometricSecurity.tsx`, `src/features/admin/components/audit/AuditTrailDrawer.tsx`, `src/features/analytics/components/bi/AIInsights.tsx`, `src/features/analytics/components/bi/delays/DelaysAnalysis.tsx`, `src/features/notifications/components/NotificationCard.tsx` não são importados em lugar algum (`origin/contexto:docs/contexto/codigo/baseline.json` → `componentes_orfaos`, apuração do commit `ca42441b`). São componentes de apoio: dois deles (`AccessibleIconButton`, `FocusTrap`) resolveriam problemas de acessibilidade que esta auditoria encontrou (UI-24); `BiometricSecurity` aponta para um recurso de biometria cujas tabelas **não existem** no banco (CI-04).
Causa raiz: componentes criados para telas que mudaram de rumo, ou instalados por padrão pela biblioteca de interface.
Caminho recomendado: decida em três grupos: **aproveite** os de acessibilidade na etapa 111; **remova** os que dependem de recurso inexistente (biometria); **pergunte** sobre os demais. Para cada arquivo removido, anote em `05-PROGRESSO.md` o nome e uma linha do que ele fazia — é essa anotação que permite ao dono pedir de volta mais tarde.
Arquivos e objetos a tocar: os listados acima, conforme a decisão de cada um.
Não tocar / armadilhas: `GlobalSearch` pode ser a busca que a paleta de comandos substituiu — confirme antes de remover. Nunca remova e corrija outra coisa no mesmo PR.
Depende de: 119 · Libera: —
Risco e como reverter: baixo (tudo recuperável pelo histórico do repositório).
Precisa de aprovação humana antes do merge: não
Como verificar: `npx tsc --noEmit -p tsconfig.app.json` e `npm run build` limpos; a contagem de componentes órfãos na próxima coleta da branch `contexto` cai pelo número removido. Cole a contagem antes e depois.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

---

## Onda 1 (continuação) — tirar do cliente a escrita das trilhas, uma tabela por vez

> Desdobramento da etapa 091. Todas têm a mesma policy — `Users can insert own log entries` — e a mesma correção; separadas porque cada uma tem um gravador diferente no código, e é esse gravador que precisa ser movido antes de fechar a porta.

### Etapa 218 — Fechar a escrita direta de `security_events`
Onda 1 / Severidade Média / Camada: banco (RLS)
Achados resolvidos: BD-12
Problema hoje: `public.security_events` aceita INSERT do cliente pela policy `Users can insert own log entries` (`origin/contexto:docs/contexto/supabase/policies.md`), e em parte das tabelas o predicado ainda admite registro sem dono. A tabela guarda eventos de segurança (bloqueio de conta, acesso negado, atividade suspeita) — é a trilha que um invasor mais gostaria de poder escrever.
Causa raiz: trilha alimentada pelo próprio cliente que ela deveria vigiar (ver BD-12).
Caminho recomendado: primeiro mova a gravação: `supabase/functions/security-alert/` e `check-login-lockout/` já gravam nela com chave de serviço. Só depois remova a policy de INSERT do cliente, na mesma migration ou na seguinte. Antes de mexer, levante quem grava hoje: `grep -rn "from('security_events')" src/ supabase/`. Se o gravador for o próprio navegador e não houver função de servidor equivalente, o passo mínimo desta etapa é **remover o ramo que permite registro sem dono** e exigir papel ativo (como na etapa 088), deixando a mudança maior registrada no progresso.
Arquivos e objetos a tocar: nova migration; o ponto do código que grava, se for movido.
Não tocar / armadilhas: não apague registro existente; verifique se alguma tela lê a tabela antes de mudar o formato do que é gravado.
Depende de: 091, 003 · Libera: —
Risco e como reverter: médio (pode interromper a gravação da trilha). Reverter = restaurar a policy.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: tentativa de INSERT direto com conta de operador deve ser recusada (**403**), e o evento legítimo, gerado pelo fluxo normal, deve continuar aparecendo na tabela. Cole as duas evidências.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 219 — Fechar a escrita direta de `login_audit`
Onda 1 / Severidade Média / Camada: banco (RLS)
Achados resolvidos: BD-12
Problema hoje: `public.login_audit` aceita INSERT do cliente pela policy `Users can insert own log entries` (`origin/contexto:docs/contexto/supabase/policies.md`), e em parte das tabelas o predicado ainda admite registro sem dono. A tabela guarda registro de entradas no sistema — registro de acesso ausente é pior que registro forjável.
Causa raiz: trilha alimentada pelo próprio cliente que ela deveria vigiar (ver BD-12).
Caminho recomendado: primeiro mova a gravação: a gravação acontece no fluxo de login, **antes** de o usuário ter papel — por isso esta é a mais delicada: feche a porta só depois de mover a gravação para a função de servidor, senão o registro de acesso deixa de existir. Só depois remova a policy de INSERT do cliente, na mesma migration ou na seguinte. Antes de mexer, levante quem grava hoje: `grep -rn "from('login_audit')" src/ supabase/`. Se o gravador for o próprio navegador e não houver função de servidor equivalente, o passo mínimo desta etapa é **remover o ramo que permite registro sem dono** e exigir papel ativo (como na etapa 088), deixando a mudança maior registrada no progresso.
Arquivos e objetos a tocar: nova migration; o ponto do código que grava, se for movido.
Não tocar / armadilhas: não apague registro existente; verifique se alguma tela lê a tabela antes de mudar o formato do que é gravado.
Depende de: 091, 003 · Libera: —
Risco e como reverter: médio (pode interromper a gravação da trilha). Reverter = restaurar a policy.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: tentativa de INSERT direto com conta de operador deve ser recusada (**403**), e o evento legítimo, gerado pelo fluxo normal, deve continuar aparecendo na tabela. Cole as duas evidências.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 220 — Fechar a escrita direta de `geo_blocking_logs`
Onda 1 / Severidade Média / Camada: banco (RLS)
Achados resolvidos: BD-12
Problema hoje: `public.geo_blocking_logs` aceita INSERT do cliente pela policy `Users can insert own log entries` (`origin/contexto:docs/contexto/supabase/policies.md`), e em parte das tabelas o predicado ainda admite registro sem dono. A tabela guarda tentativas bloqueadas por país/região — sem isso, a trilha de bloqueio geográfico pode ser poluída por qualquer conta.
Causa raiz: trilha alimentada pelo próprio cliente que ela deveria vigiar (ver BD-12).
Caminho recomendado: primeiro mova a gravação: `supabase/functions/check-login-lockout/` já resolve o país e pode gravar. Só depois remova a policy de INSERT do cliente, na mesma migration ou na seguinte. Antes de mexer, levante quem grava hoje: `grep -rn "from('geo_blocking_logs')" src/ supabase/`. Se o gravador for o próprio navegador e não houver função de servidor equivalente, o passo mínimo desta etapa é **remover o ramo que permite registro sem dono** e exigir papel ativo (como na etapa 088), deixando a mudança maior registrada no progresso.
Arquivos e objetos a tocar: nova migration; o ponto do código que grava, se for movido.
Não tocar / armadilhas: não apague registro existente; verifique se alguma tela lê a tabela antes de mudar o formato do que é gravado.
Depende de: 091, 003 · Libera: —
Risco e como reverter: médio (pode interromper a gravação da trilha). Reverter = restaurar a policy.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: tentativa de INSERT direto com conta de operador deve ser recusada (**403**), e o evento legítimo, gerado pelo fluxo normal, deve continuar aparecendo na tabela. Cole as duas evidências.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 221 — Fechar a escrita direta de `query_telemetry`
Onda 1 / Severidade Média / Camada: banco (RLS)
Achados resolvidos: BD-12
Problema hoje: `public.query_telemetry` aceita INSERT do cliente pela policy `Users can insert own log entries` (`origin/contexto:docs/contexto/supabase/policies.md`), e em parte das tabelas o predicado ainda admite registro sem dono. A tabela guarda medições de desempenho das consultas — telemetria forjada distorce a leitura de desempenho, mas não é dado de negócio.
Causa raiz: trilha alimentada pelo próprio cliente que ela deveria vigiar (ver BD-12).
Caminho recomendado: primeiro mova a gravação: a gravação vem do próprio cliente (é telemetria de navegador); aqui a decisão pode ser manter, **desde que** com papel ativo (etapa 088) e com limite de volume. Só depois remova a policy de INSERT do cliente, na mesma migration ou na seguinte. Antes de mexer, levante quem grava hoje: `grep -rn "from('query_telemetry')" src/ supabase/`. Se o gravador for o próprio navegador e não houver função de servidor equivalente, o passo mínimo desta etapa é **remover o ramo que permite registro sem dono** e exigir papel ativo (como na etapa 088), deixando a mudança maior registrada no progresso.
Arquivos e objetos a tocar: nova migration; o ponto do código que grava, se for movido.
Não tocar / armadilhas: não apague registro existente; verifique se alguma tela lê a tabela antes de mudar o formato do que é gravado.
Depende de: 091, 003 · Libera: —
Risco e como reverter: médio (pode interromper a gravação da trilha). Reverter = restaurar a policy.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: tentativa de INSERT direto com conta de operador deve ser recusada (**403**), e o evento legítimo, gerado pelo fluxo normal, deve continuar aparecendo na tabela. Cole as duas evidências.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 222 — Fechar a escrita direta de `rate_limit_logs`
Onda 1 / Severidade Média / Camada: banco (RLS)
Achados resolvidos: BD-12
Problema hoje: `public.rate_limit_logs` aceita INSERT do cliente pela policy `Users can insert own log entries` (`origin/contexto:docs/contexto/supabase/policies.md`), e em parte das tabelas o predicado ainda admite registro sem dono. A tabela guarda registro de limite de requisições atingido — é a trilha que mede abuso: deixá-la aberta a quem abusa anula a medida.
Causa raiz: trilha alimentada pelo próprio cliente que ela deveria vigiar (ver BD-12).
Caminho recomendado: primeiro mova a gravação: quem deve escrever é o servidor; um cliente que escreve o próprio registro de limite pode mascarar o abuso. Só depois remova a policy de INSERT do cliente, na mesma migration ou na seguinte. Antes de mexer, levante quem grava hoje: `grep -rn "from('rate_limit_logs')" src/ supabase/`. Se o gravador for o próprio navegador e não houver função de servidor equivalente, o passo mínimo desta etapa é **remover o ramo que permite registro sem dono** e exigir papel ativo (como na etapa 088), deixando a mudança maior registrada no progresso.
Arquivos e objetos a tocar: nova migration; o ponto do código que grava, se for movido.
Não tocar / armadilhas: não apague registro existente; verifique se alguma tela lê a tabela antes de mudar o formato do que é gravado.
Depende de: 091, 003 · Libera: —
Risco e como reverter: médio (pode interromper a gravação da trilha). Reverter = restaurar a policy.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: tentativa de INSERT direto com conta de operador deve ser recusada (**403**), e o evento legítimo, gerado pelo fluxo normal, deve continuar aparecendo na tabela. Cole as duas evidências.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 223 — Fechar a escrita direta de `tpm_notification_logs`
Onda 1 / Severidade Média / Camada: banco (RLS)
Achados resolvidos: BD-12
Problema hoje: `public.tpm_notification_logs` aceita INSERT do cliente pela policy `Users can insert own log entries` (`origin/contexto:docs/contexto/supabase/policies.md`), e em parte das tabelas o predicado ainda admite registro sem dono. A tabela guarda registro de notificações de manutenção enviadas — registro de envio escrito pelo cliente não prova entrega.
Causa raiz: trilha alimentada pelo próprio cliente que ela deveria vigiar (ver BD-12).
Caminho recomendado: primeiro mova a gravação: `supabase/functions/tpm-notifications/` e `send-tpm-email/` são os gravadores naturais. Só depois remova a policy de INSERT do cliente, na mesma migration ou na seguinte. Antes de mexer, levante quem grava hoje: `grep -rn "from('tpm_notification_logs')" src/ supabase/`. Se o gravador for o próprio navegador e não houver função de servidor equivalente, o passo mínimo desta etapa é **remover o ramo que permite registro sem dono** e exigir papel ativo (como na etapa 088), deixando a mudança maior registrada no progresso.
Arquivos e objetos a tocar: nova migration; o ponto do código que grava, se for movido.
Não tocar / armadilhas: não apague registro existente; verifique se alguma tela lê a tabela antes de mudar o formato do que é gravado.
Depende de: 091, 003 · Libera: —
Risco e como reverter: médio (pode interromper a gravação da trilha). Reverter = restaurar a policy.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: tentativa de INSERT direto com conta de operador deve ser recusada (**403**), e o evento legítimo, gerado pelo fluxo normal, deve continuar aparecendo na tabela. Cole as duas evidências.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 224 — Completar as permissões de arquivo do balde `production-photos`
Onda 3 / Severidade Média / Camada: storage (RLS)
Achados resolvidos: STO-04
Problema hoje: o balde `production-photos` (fotos de produção e de defeito de embalagem) tem **duas** policies em `storage.objects` — envio e leitura — e nenhuma de alteração ou remoção (`origin/contexto:docs/contexto/supabase/policies.md:319-334`), enquanto `execution-evidence` e `tpm-evidences` têm as quatro. Um arquivo enviado por engano fica lá para sempre.
Causa raiz: policies criadas por balde, em momentos diferentes, sem fechar o conjunto (ver STO-04).
Caminho recomendado: migration acrescentando UPDATE e DELETE para este balde, copiando literalmente a forma de `Owners and staff can update execution-evidence` / `... delete execution-evidence` — dono do arquivo ou papel elevado. Para `technical-documents`, confirme com o dono se documento publicado pode ser apagado pelo autor ou só por papel elevado (pode haver exigência de retenção).
Arquivos e objetos a tocar: nova migration.
Não tocar / armadilhas: não mude as policies dos baldes que já estão completos; não torne o balde público.
Depende de: 092, 003 · Libera: —
Risco e como reverter: baixo; reverter = `DROP POLICY`.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: como dono do arquivo, substitua e apague um arquivo de teste neste balde (as duas operações devem funcionar); como outro operador, as duas devem ser recusadas. Cole os quatro resultados.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 225 — Completar as permissões de arquivo do balde `technical-documents`
Onda 3 / Severidade Média / Camada: storage (RLS)
Achados resolvidos: STO-04
Problema hoje: o balde `technical-documents` (documentos técnicos e fichas) tem **duas** policies em `storage.objects` — envio e leitura — e nenhuma de alteração ou remoção (`origin/contexto:docs/contexto/supabase/policies.md:319-334`), enquanto `execution-evidence` e `tpm-evidences` têm as quatro. Um arquivo enviado por engano fica lá para sempre.
Causa raiz: policies criadas por balde, em momentos diferentes, sem fechar o conjunto (ver STO-04).
Caminho recomendado: migration acrescentando UPDATE e DELETE para este balde, copiando literalmente a forma de `Owners and staff can update execution-evidence` / `... delete execution-evidence` — dono do arquivo ou papel elevado. Para `technical-documents`, confirme com o dono se documento publicado pode ser apagado pelo autor ou só por papel elevado (pode haver exigência de retenção).
Arquivos e objetos a tocar: nova migration.
Não tocar / armadilhas: não mude as policies dos baldes que já estão completos; não torne o balde público.
Depende de: 092, 003 · Libera: —
Risco e como reverter: baixo; reverter = `DROP POLICY`.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: como dono do arquivo, substitua e apague um arquivo de teste neste balde (as duas operações devem funcionar); como outro operador, as duas devem ser recusadas. Cole os quatro resultados.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

---

## Onda 3 (continuação) — transformar cada bloqueio em restrição de verdade

> Desdobramento da etapa 093. Em Postgres, policies permissivas se **somam**: uma policy `PERMISSIVE` com expressão `false` não proíbe nada — ela apenas não autoriza. Hoje o bloqueio funciona por **ausência** de outra policy permissiva; basta alguém acrescentar uma para a proteção desaparecer sem aviso. A forma correta é `AS RESTRICTIVE`, como `supabase/migrations/20260910120000_user_roles_writes_require_aal2.sql` já faz para `user_roles`.

### Etapa 226 — Tornar restritiva a policy de bloqueio de `audit_log`
Onda 3 / Severidade Baixa / Camada: banco (RLS)
Achados resolvidos: BD-13
Problema hoje: `public.audit_log` tem a policy `Deny all changes to audit logs` como **PERMISSIVE** com expressão `false` (`origin/contexto:docs/contexto/supabase/policies.md`). A tabela guarda a trilha de auditoria com encadeamento de hash — é o registro que o negócio usaria para explicar o que aconteceu com um pedido.
Causa raiz: confusão entre "não autorizar" e "proibir" (ver BD-13).
Caminho recomendado: recrie a policy com `AS RESTRICTIVE`, cobrindo apenas os comandos de escrita (INSERT/UPDATE/DELETE), seguindo a migration de referência citada acima. É mudança de intenção, não de comportamento atual — então a verificação é justamente provar que a intenção passou a valer. Observação específica desta tabela: convive com uma policy de leitura para coordenador/gestor, que deve continuar funcionando.
Arquivos e objetos a tocar: nova migration.
Não tocar / armadilhas: policy restritiva se aplica a **todas** as outras — se cobrir SELECT por engano, a leitura legítima para; confirme que a escrita feita por gatilho/função com chave de serviço continua funcionando (a chave de serviço ignora RLS, mas gatilho `SECURITY DEFINER` roda como dono, não como serviço).
Depende de: 093, 003 · Libera: —
Risco e como reverter: baixo. Reverter = recriar a policy anterior (definição no snapshot).
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: duas provas. (1) A leitura e a escrita legítimas continuam funcionando (teste pelo fluxo normal do sistema). (2) Em banco descartável, crie uma policy permissiva de INSERT nessa tabela e confirme que a restritiva **ainda** barra a escrita — é isso que hoje não acontece. Cole as duas evidências.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 227 — Tornar restritiva a policy de bloqueio de `job_status_audit`
Onda 3 / Severidade Baixa / Camada: banco (RLS)
Achados resolvidos: BD-13
Problema hoje: `public.job_status_audit` tem a policy `Deny direct client writes to job_status_audit` como **PERMISSIVE** com expressão `false` (`origin/contexto:docs/contexto/supabase/policies.md`). A tabela guarda o histórico de mudanças de status das ordens de serviço.
Causa raiz: confusão entre "não autorizar" e "proibir" (ver BD-13).
Caminho recomendado: recrie a policy com `AS RESTRICTIVE`, cobrindo apenas os comandos de escrita (INSERT/UPDATE/DELETE), seguindo a migration de referência citada acima. É mudança de intenção, não de comportamento atual — então a verificação é justamente provar que a intenção passou a valer. Observação específica desta tabela: é escrita por gatilho do banco, não pelo cliente — a policy restritiva não pode bloquear o gatilho (ele roda como dono da função).
Arquivos e objetos a tocar: nova migration.
Não tocar / armadilhas: policy restritiva se aplica a **todas** as outras — se cobrir SELECT por engano, a leitura legítima para; confirme que a escrita feita por gatilho/função com chave de serviço continua funcionando (a chave de serviço ignora RLS, mas gatilho `SECURITY DEFINER` roda como dono, não como serviço).
Depende de: 093, 003 · Libera: —
Risco e como reverter: baixo. Reverter = recriar a policy anterior (definição no snapshot).
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: duas provas. (1) A leitura e a escrita legítimas continuam funcionando (teste pelo fluxo normal do sistema). (2) Em banco descartável, crie uma policy permissiva de INSERT nessa tabela e confirme que a restritiva **ainda** barra a escrita — é isso que hoje não acontece. Cole as duas evidências.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 228 — Tornar restritiva a policy de bloqueio de `bitrix24_oauth_tokens`
Onda 3 / Severidade Baixa / Camada: banco (RLS)
Achados resolvidos: BD-13
Problema hoje: `public.bitrix24_oauth_tokens` tem a policy `Service role only access` como **PERMISSIVE** com expressão `false` (`origin/contexto:docs/contexto/supabase/policies.md`). A tabela guarda os tokens de acesso ao CRM — se vazarem, dão acesso ao sistema do cliente.
Causa raiz: confusão entre "não autorizar" e "proibir" (ver BD-13).
Caminho recomendado: recrie a policy com `AS RESTRICTIVE`, cobrindo apenas os comandos de escrita (INSERT/UPDATE/DELETE), seguindo a migration de referência citada acima. É mudança de intenção, não de comportamento atual — então a verificação é justamente provar que a intenção passou a valer. Observação específica desta tabela: nada no aplicativo lê essa tabela; só funções de servidor com chave de serviço.
Arquivos e objetos a tocar: nova migration.
Não tocar / armadilhas: policy restritiva se aplica a **todas** as outras — se cobrir SELECT por engano, a leitura legítima para; confirme que a escrita feita por gatilho/função com chave de serviço continua funcionando (a chave de serviço ignora RLS, mas gatilho `SECURITY DEFINER` roda como dono, não como serviço).
Depende de: 093, 003 · Libera: —
Risco e como reverter: baixo. Reverter = recriar a policy anterior (definição no snapshot).
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: duas provas. (1) A leitura e a escrita legítimas continuam funcionando (teste pelo fluxo normal do sistema). (2) Em banco descartável, crie uma policy permissiva de INSERT nessa tabela e confirme que a restritiva **ainda** barra a escrita — é isso que hoje não acontece. Cole as duas evidências.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 229 — Tornar restritiva a policy de bloqueio de `bitrix24_oauth_states`
Onda 3 / Severidade Baixa / Camada: banco (RLS)
Achados resolvidos: BD-13
Problema hoje: `public.bitrix24_oauth_states` tem a policy `Service role only access` como **PERMISSIVE** com expressão `false` (`origin/contexto:docs/contexto/supabase/policies.md`). A tabela guarda os estados temporários do fluxo de autorização do CRM.
Causa raiz: confusão entre "não autorizar" e "proibir" (ver BD-13).
Caminho recomendado: recrie a policy com `AS RESTRICTIVE`, cobrindo apenas os comandos de escrita (INSERT/UPDATE/DELETE), seguindo a migration de referência citada acima. É mudança de intenção, não de comportamento atual — então a verificação é justamente provar que a intenção passou a valer. Observação específica desta tabela: idem: só servidor.
Arquivos e objetos a tocar: nova migration.
Não tocar / armadilhas: policy restritiva se aplica a **todas** as outras — se cobrir SELECT por engano, a leitura legítima para; confirme que a escrita feita por gatilho/função com chave de serviço continua funcionando (a chave de serviço ignora RLS, mas gatilho `SECURITY DEFINER` roda como dono, não como serviço).
Depende de: 093, 003 · Libera: —
Risco e como reverter: baixo. Reverter = recriar a policy anterior (definição no snapshot).
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: duas provas. (1) A leitura e a escrita legítimas continuam funcionando (teste pelo fluxo normal do sistema). (2) Em banco descartável, crie uma policy permissiva de INSERT nessa tabela e confirme que a restritiva **ainda** barra a escrita — é isso que hoje não acontece. Cole as duas evidências.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 230 — Tornar restritiva a policy de bloqueio de `login_lockouts`
Onda 3 / Severidade Baixa / Camada: banco (RLS)
Achados resolvidos: BD-13
Problema hoje: `public.login_lockouts` tem a policy `os bloqueios de conta por tentativa de senha` como **PERMISSIVE** com expressão `false` (`origin/contexto:docs/contexto/supabase/policies.md`). A tabela guarda é a tabela que decide se alguém está bloqueado: poder escrever nela é poder se desbloquear (ou bloquear outro).
Causa raiz: confusão entre "não autorizar" e "proibir" (ver BD-13).
Caminho recomendado: recrie a policy com `AS RESTRICTIVE`, cobrindo apenas os comandos de escrita (INSERT/UPDATE/DELETE), seguindo a migration de referência citada acima. É mudança de intenção, não de comportamento atual — então a verificação é justamente provar que a intenção passou a valer. Observação específica desta tabela: é escrita pela função `check-login-lockout` com chave de serviço.
Arquivos e objetos a tocar: nova migration.
Não tocar / armadilhas: policy restritiva se aplica a **todas** as outras — se cobrir SELECT por engano, a leitura legítima para; confirme que a escrita feita por gatilho/função com chave de serviço continua funcionando (a chave de serviço ignora RLS, mas gatilho `SECURITY DEFINER` roda como dono, não como serviço).
Depende de: 093, 003 · Libera: —
Risco e como reverter: baixo. Reverter = recriar a policy anterior (definição no snapshot).
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: duas provas. (1) A leitura e a escrita legítimas continuam funcionando (teste pelo fluxo normal do sistema). (2) Em banco descartável, crie uma policy permissiva de INSERT nessa tabela e confirme que a restritiva **ainda** barra a escrita — é isso que hoje não acontece. Cole as duas evidências.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

---

## Onda 1 (continuação) — proteções de acesso que só existem no navegador

### Etapa 231 — Mover o bloqueio de login para o servidor
Onda 1 / Severidade Crítica / Camada: autenticação
Achados resolvidos: AUT-08
Problema hoje: o bloqueio por tentativas, o bloqueio por endereço de origem e o bloqueio por região são verificados **no navegador, antes** da chamada de autenticação: `src/features/auth/components/AuthProvider.tsx:355` faz `const lockoutStatus = await AuthService.checkLockout(email)` e só então, se passar, chama `supabase.auth.signInWithPassword` (`src/features/auth/services/authService.ts:20-24`). Quem chama o endereço de autenticação do Supabase diretamente — com a chave publishable, que é pública — **não passa por nenhuma dessas verificações**.
Causa raiz: proteção implementada como etapa anterior no cliente, em vez de regra no servidor de autenticação.
Caminho recomendado: habilite o gancho de autenticação do Supabase para tentativa de verificação de senha, apontando para uma função de servidor que reaproveite a lógica que já existe em `supabase/functions/check-login-lockout/index.ts` — assim a decisão passa a valer para **qualquer** caminho de login. Faça junto da etapa 058, que corrige a outra ponta do mesmo mecanismo (quem pode registrar falha). Mantenha a verificação no cliente: ela dá mensagem imediata ao usuário; o que muda é que ela deixa de ser a única. Atenção: as pendências `F-004`, `F-005` e `F-006` estão registradas como resolvidas no repositório — elas resolveram a interface e o registro, não a aplicação no servidor; atualize esses dossiês no mesmo PR.
Arquivos e objetos a tocar: configuração de ganchos de autenticação no projeto; `supabase/functions/check-login-lockout/index.ts`; `docs/pendencias/F-004*.md`, `F-005*.md`, `F-006*.md`.
Não tocar / armadilhas: um gancho com erro **impede todo login** — teste em projeto descartável antes e tenha o caminho de desligar à mão; não remova a verificação do cliente.
Depende de: 058 · Libera: —
Risco e como reverter: alto (toca o login de todos). Reverter = desligar o gancho.
Precisa de aprovação humana antes do merge: sim (infraestrutura de autenticação)
Como verificar: com uma conta bloqueada, chame `POST /auth/v1/token?grant_type=password` **direto** (fora do aplicativo) e confirme a recusa; antes da correção, o login passava. Cole as duas respostas.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 232 — Limpar os dados do usuário anterior em toda saída de sessão
Onda 1 / Severidade Alta / Camada: front (sessão)
Achados resolvidos: AUT-09
Problema hoje: só a saída feita pelo botão limpa os dados locais: `src/features/auth/components/AuthProvider.tsx:455-460` chama `queryClient.clear()` e `offlineStorage.clearAll()`. As outras saídas — expiração por inatividade (`src/features/auth/hooks/useSessionTimeout.ts`), expiração do token, e qualquer `SIGNED_OUT` vindo do próprio serviço — passam pelo tratador de mudança de estado (`:241-246`) e **não** limpam: o cache de consultas e o banco local do navegador seguem com os dados do usuário anterior.
Causa raiz: limpeza colocada na função de saída, não no evento de saída.
Caminho recomendado: mova `queryClient.clear()`, `offlineStorage.clearAll()` e a limpeza de rascunhos de formulário para dentro do ramo `SIGNED_OUT` do tratador de mudança de estado (`:241-246`), que é a única porta por onde **todas** as saídas passam; a função de saída continua chamando a saída do serviço. Isso importa especialmente no quiosque de fábrica, onde o mesmo aparelho é usado por vários operadores no mesmo turno.
Arquivos e objetos a tocar: `src/features/auth/components/AuthProvider.tsx`.
Não tocar / armadilhas: não limpe em `TOKEN_REFRESHED` (perderia o cache a cada renovação); confirme que a limpeza do banco local não quebra o modo offline de quem continua logado.
Depende de: — · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: entre com o usuário A, deixe a sessão expirar (ou force `SIGNED_OUT`), entre com o usuário B no mesmo navegador e confirme que nenhuma tela mostra dado do A; repita com o botão de sair. Cole os dois testes.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 233 — Exigir senha de novo nas ações sensíveis (mecanismo já existe e está desligado)
Onda 1 / Severidade Alta / Camada: front (segurança)
Achados resolvidos: AUT-10
Problema hoje: `src/contexts/ReauthContext.tsx` implementa re-autenticação para ações sensíveis (trocar senha, trocar e-mail, configurar ou desativar segundo fator, ação administrativa, exclusão de dado) e expõe `useReauth`/`withReauth` (`:210-219`); o provedor está montado (`src/providers/AppProviders.tsx:9,86`) e **nenhuma tela chama** `requireReauth`. Ou seja: quem senta num computador com sessão aberta pode trocar a senha, desativar o segundo fator e mexer em papéis sem provar que é o dono da conta.
Causa raiz: mecanismo construído e nunca ligado às ações.
Caminho recomendado: ligue o `requireReauth` que já existe nas ações sensíveis das telas de configuração e de segurança (troca de senha, desativar segundo fator, gestão de usuários e papéis), seguindo o padrão de uso que o próprio contexto documenta. Comece pelas duas de maior risco (desativar segundo fator e gestão de papéis) numa PR e as demais em outra.
Arquivos e objetos a tocar: `src/pages/SettingsPage.tsx` e componentes de `src/components/settings/`, `src/features/admin/components/security/` (ações sensíveis), sem alterar `ReauthContext`.
Não tocar / armadilhas: não exija re-autenticação em ações comuns (viraria atrito inútil); as policies de `user_roles` já exigem segundo fator no banco — esta etapa cobre o lado do aplicativo, não o substitui.
Depende de: — · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: com sessão aberta, tente desativar o segundo fator: deve pedir a senha; com a senha errada, a ação não acontece. Cole os dois resultados.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 234 — Fazer o banco ser a autoridade das permissões (remover a união com o mapa fixo)
Onda 1 / Severidade Alta / Camada: front (autorização)
Achados resolvidos: AUT-07
Problema hoje: `src/features/auth/hooks/useRBAC.tsx:166-172` faz a **união** das permissões vindas do banco com um mapa fixo no código (`ROLE_PERMISSIONS`, `:7-89`), com o comentário "Union com o mapa estático garante zero regressão". Consequência direta: **revogar** uma permissão na tela não tem efeito, porque o mapa fixo devolve de volta.
Causa raiz: estratégia de transição (união) mantida como estado final.
Caminho recomendado: esta é a mesma correção da **PR #256** (aberta). Confira o diff dela: o caminho certo é usar só o banco quando houver resposta do banco (sem união) e semear `role_permissions` com o conteúdo do mapa fixo por migration, para não haver regressão — a migration de seed é justamente a `20261122010000` que esta auditoria encontrou aplicada em produção e ausente no repositório (DEP-01, etapas 001-002). Ou seja: as três coisas se amarram, e a ordem é 002 → 234/113. Não abra PR paralela à #256.
Arquivos e objetos a tocar: coordenação com a PR #256 (`src/features/auth/hooks/useRBAC.tsx` e a migration de seed).
Não tocar / armadilhas: não remova o mapa fixo do código — ele deve ficar como reserva para falha de leitura do banco; se o seed não estiver completo, a remoção da união **tira** permissões de quem trabalha.
Depende de: 002, 113 · Libera: —
Risco e como reverter: médio (muda autorização). Reverter = reverter a PR.
Precisa de aprovação humana antes do merge: sim (autorização)
Como verificar: revogue uma permissão de um papel, recarregue com um usuário desse papel e confirme que a ação correspondente deixou de estar disponível; conceda de volta e confirme que voltou. Cole os dois testes.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 235 — Elevar o mínimo de senha e ligar a proteção contra robôs
Onda 1 / Severidade Média / Camada: configuração de autenticação
Achados resolvidos: AUT-11
Problema hoje: o projeto aceita senha de **6 caracteres** e não tem proteção contra robôs: `origin/contexto:docs/contexto/supabase/auth.md` → `"password_min_length": 6`, `"security_captcha_enabled": false`. Com o cadastro público aberto (etapa 010) e o limite de e-mails em 2 por hora (etapa 008), é a combinação que permite criar contas em série e tentar senhas curtas.
Causa raiz: configuração padrão nunca endurecida.
Caminho recomendado: no painel do Supabase, eleve o mínimo de senha (10 a 12 caracteres é o usual hoje) e ative a verificação de robô para os fluxos de autenticação. Combine com o dono: elevar o mínimo **não** invalida senhas existentes, mas afeta troca de senha e criação de operador — avise a equipe antes. O projeto já consulta a base de senhas vazadas (`api.pwnedpasswords.com` está na política de conteúdo), então o ganho aqui é no comprimento e no robô.
Arquivos e objetos a tocar: configuração do projeto Supabase. Nenhum arquivo do repositório.
Não tocar / armadilhas: a verificação de robô exige chave do provedor e ajuste no cliente — se não houver chave, deixe apenas o comprimento e registre o resto; não ative sem testar o login depois.
Depende de: 010 · Libera: —
Risco e como reverter: baixo; reverter = voltar os valores.
Precisa de aprovação humana antes do merge: sim (configuração de infraestrutura e impacto na equipe)
Como verificar: tente definir uma senha de 6 caracteres: deve ser recusada; o login normal continua funcionando. Cole os dois testes.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 236 — Revogar a execução anônima das funções de papel
Onda 1 / Severidade Baixa / Camada: banco (permissões)
Achados resolvidos: BD-11, AUT-12
Problema hoje: `origin/contexto:docs/contexto/supabase/lints.md` lista como executáveis por visitante anônimo, entre outras, `public.get_user_role(_user_id uuid)`, `public.has_role(_user_id uuid, _role app_role)`, `public.has_any_active_role()` e `public.is_staff()` — funções com privilégio elevado que respondem perguntas sobre quem tem qual papel.
Causa raiz: o Supabase concede execução a `anon` por padrão (ver BD-11), e essas funções nunca tiveram o privilégio revogado.
Caminho recomendado: `REVOKE EXECUTE ... FROM anon` nessas quatro funções, por migration. As policies continuam funcionando: elas são avaliadas com o privilégio do dono da policy, não do chamador. Faça **depois** da etapa 090 (privilégios padrão), para não reintroduzir o problema em funções novas. Deixe `get_public_tracking` como está — essa é pública por projeto.
Arquivos e objetos a tocar: nova migration.
Não tocar / armadilhas: confirme que nenhuma chamada do aplicativo usa essas funções **antes** do login (`grep -rn "rpc('get_user_role'\|rpc('has_role'\|rpc('is_staff'" src/`); revogar de `authenticated` quebraria o sistema — revogue só de `anon`.
Depende de: 090, 003 · Libera: —
Risco e como reverter: baixo; reverter = `GRANT EXECUTE`.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: chamada anônima a `/rest/v1/rpc/get_user_role` deve responder **401/403**; o login e a verificação de papel do aplicativo continuam funcionando. Cole os dois resultados.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

---

## Onda 5 (continuação) — concorrência na gravação de OS

### Etapa 237 — Impedir que duas pessoas sobrescrevam a mesma OS sem aviso
Onda 5 / Severidade Média / Camada: front + banco
Achados resolvidos: RN-03
Problema hoje: `src/features/jobs/services/jobsService.ts:66` grava com `update(updates).eq('id', id)` sem comparar nenhuma marca de versão. Dois operadores (ou duas abas, ou o quiosque e o Kanban) concluindo a mesma OS sobrescrevem um ao outro em silêncio — e o valor que vale é o do último clique, inclusive para `produced_quantity` e `lost_pieces`, que alimentam custo e perdas.
Causa raiz: gravação sem controle de concorrência otimista.
Caminho recomendado: use a coluna `updated_at`, que já existe e é mantida por gatilho (`update_jobs_updated_at`): leia o valor junto do registro, mande-o na condição da gravação (`.eq('updated_at', valorLido)`) e, quando a gravação não afetar nenhuma linha, mostre ao usuário "esta OS foi alterada por outra pessoa — recarregue" em vez de sucesso. É a mudança de menor diff e não exige coluna nova. O atalho tentador é bloquear a tela por tempo: não resolve duas pessoas em dois aparelhos.
Arquivos e objetos a tocar: `src/features/jobs/services/jobsService.ts` e os pontos que mostram o resultado da gravação.
Não tocar / armadilhas: a promoção automática roda no servidor e **não** deve ser bloqueada por essa condição — trate o caminho do cron separadamente; não compare `updated_at` em gravações de campos independentes (ordenação do Kanban, por exemplo), senão o usuário vê conflito onde não há.
Depende de: 048 · Libera: —
Risco e como reverter: médio (pode gerar aviso de conflito indevido). Reverter = remover a condição.
Precisa de aprovação humana antes do merge: não
Como verificar: abra a mesma OS em duas abas, conclua em uma e tente concluir na outra: a segunda deve avisar conflito em vez de sobrescrever. Cole as duas telas.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso


---

## Onda 8 (continuação) — decidir, função por função, o destino das dez funções de servidor sem dono

> Desdobramento da etapa 115. Cada função publicada é um endereço aberto na internet; cada etapa aqui fecha ou justifica um deles. Antes de cada decisão, confirme o estado atual: `git show origin/contexto:docs/contexto/supabase/edge-functions.md` (está ativa?) e `grep -rn "<nome>" src/ supabase/migrations/` (alguém chama?).

### Etapa 238 — Decidir o destino de `backup-scheduler`
Onda 8 / Severidade Média / Camada: edge functions (higiene)
Achados resolvidos: DEP-02, EDG-05
Problema hoje: a função `backup-scheduler` deveria fazer backup e registrar em tabela própria, está publicada e ativa (`origin/contexto:docs/contexto/supabase/edge-functions.md`) e a tabela que ela grava (`backups`) não existe (BD-19) e a credencial não está configurada.
Causa raiz: função criada para um plano que não foi concluído, publicada e nunca retirada (ver DEP-02).
Caminho recomendado: decidir junto da etapa 116, que trata do backup como risco. Leve a decisão ao dono em uma frase ("isto deveria funcionar?"), e registre a resposta em `05-PROGRESSO.md`. Para desativar, use o painel (mantendo o código no repositório); para remover de vez, retire também a entrada de `supabase/config.toml` e a linha correspondente em `supabase/functions/REGISTRY.md`.
Arquivos e objetos a tocar: configuração da função no painel; `supabase/config.toml` e `supabase/functions/REGISTRY.md` se for removida.
Não tocar / armadilhas: confirme que nenhum gatilho do banco a chama (`git show origin/contexto:docs/contexto/supabase/functions.md | grep backup-scheduler`) antes de desativar; nunca desative `csp-report` (recebe relatórios do navegador).
Depende de: 115 · Libera: —
Risco e como reverter: baixo; reverter = reativar.
Precisa de aprovação humana antes do merge: sim (infraestrutura)
Como verificar: a decisão registrada e, conforme ela: ou a função responde 404 (desativada), ou aparece com agendamento em `origin/contexto:docs/contexto/supabase/cron.md`, ou tem chamador no aplicativo. Cole a evidência.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 239 — Decidir o destino de `cleanup-security-logs`
Onda 8 / Severidade Média / Camada: edge functions (higiene)
Achados resolvidos: DEP-02, EDG-05
Problema hoje: a função `cleanup-security-logs` deveria apagar registros de segurança antigos, está publicada e ativa (`origin/contexto:docs/contexto/supabase/edge-functions.md`) e não tem agendamento e a retenção prometida nos documentos de operação não acontece (EDG-05).
Causa raiz: função criada para um plano que não foi concluído, publicada e nunca retirada (ver DEP-02).
Caminho recomendado: se o dono quiser a retenção, agende (etapa 200); se não, remova e corrija os documentos. Leve a decisão ao dono em uma frase ("isto deveria funcionar?"), e registre a resposta em `05-PROGRESSO.md`. Para desativar, use o painel (mantendo o código no repositório); para remover de vez, retire também a entrada de `supabase/config.toml` e a linha correspondente em `supabase/functions/REGISTRY.md`.
Arquivos e objetos a tocar: configuração da função no painel; `supabase/config.toml` e `supabase/functions/REGISTRY.md` se for removida.
Não tocar / armadilhas: confirme que nenhum gatilho do banco a chama (`git show origin/contexto:docs/contexto/supabase/functions.md | grep cleanup-security-logs`) antes de desativar; nunca desative `csp-report` (recebe relatórios do navegador).
Depende de: 115 · Libera: —
Risco e como reverter: baixo; reverter = reativar.
Precisa de aprovação humana antes do merge: sim (infraestrutura)
Como verificar: a decisão registrada e, conforme ela: ou a função responde 404 (desativada), ou aparece com agendamento em `origin/contexto:docs/contexto/supabase/cron.md`, ou tem chamador no aplicativo. Cole a evidência.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 240 — Decidir o destino de `excel-export`
Onda 8 / Severidade Média / Camada: edge functions (higiene)
Achados resolvidos: DEP-02, EDG-05
Problema hoje: a função `excel-export` deveria gerar planilha de dados no servidor, está publicada e ativa (`origin/contexto:docs/contexto/supabase/edge-functions.md`) e nenhuma tela a chama; a exportação que o sistema usa é feita no navegador (`exceljs` no pacote do site).
Causa raiz: função criada para um plano que não foi concluído, publicada e nunca retirada (ver DEP-02).
Caminho recomendado: provavelmente remover — confirme que nenhuma automação externa a usa. Leve a decisão ao dono em uma frase ("isto deveria funcionar?"), e registre a resposta em `05-PROGRESSO.md`. Para desativar, use o painel (mantendo o código no repositório); para remover de vez, retire também a entrada de `supabase/config.toml` e a linha correspondente em `supabase/functions/REGISTRY.md`.
Arquivos e objetos a tocar: configuração da função no painel; `supabase/config.toml` e `supabase/functions/REGISTRY.md` se for removida.
Não tocar / armadilhas: confirme que nenhum gatilho do banco a chama (`git show origin/contexto:docs/contexto/supabase/functions.md | grep excel-export`) antes de desativar; nunca desative `csp-report` (recebe relatórios do navegador).
Depende de: 115 · Libera: —
Risco e como reverter: baixo; reverter = reativar.
Precisa de aprovação humana antes do merge: sim (infraestrutura)
Como verificar: a decisão registrada e, conforme ela: ou a função responde 404 (desativada), ou aparece com agendamento em `origin/contexto:docs/contexto/supabase/cron.md`, ou tem chamador no aplicativo. Cole a evidência.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 241 — Decidir o destino de `image-optimizer`
Onda 8 / Severidade Média / Camada: edge functions (higiene)
Achados resolvidos: DEP-02, EDG-05
Problema hoje: a função `image-optimizer` deveria otimizar imagem no servidor, está publicada e ativa (`origin/contexto:docs/contexto/supabase/edge-functions.md`) e nenhuma tela a chama; a compressão que falta está no cliente (etapa 183).
Causa raiz: função criada para um plano que não foi concluído, publicada e nunca retirada (ver DEP-02).
Caminho recomendado: remover ou usar na etapa 183 — decida junto, para não ter duas soluções. Leve a decisão ao dono em uma frase ("isto deveria funcionar?"), e registre a resposta em `05-PROGRESSO.md`. Para desativar, use o painel (mantendo o código no repositório); para remover de vez, retire também a entrada de `supabase/config.toml` e a linha correspondente em `supabase/functions/REGISTRY.md`.
Arquivos e objetos a tocar: configuração da função no painel; `supabase/config.toml` e `supabase/functions/REGISTRY.md` se for removida.
Não tocar / armadilhas: confirme que nenhum gatilho do banco a chama (`git show origin/contexto:docs/contexto/supabase/functions.md | grep image-optimizer`) antes de desativar; nunca desative `csp-report` (recebe relatórios do navegador).
Depende de: 115 · Libera: —
Risco e como reverter: baixo; reverter = reativar.
Precisa de aprovação humana antes do merge: sim (infraestrutura)
Como verificar: a decisão registrada e, conforme ela: ou a função responde 404 (desativada), ou aparece com agendamento em `origin/contexto:docs/contexto/supabase/cron.md`, ou tem chamador no aplicativo. Cole a evidência.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 242 — Decidir o destino de `metrics-collector`
Onda 8 / Severidade Média / Camada: edge functions (higiene)
Achados resolvidos: DEP-02, EDG-05
Problema hoje: a função `metrics-collector` deveria coletar métricas do sistema para `system_metrics`, está publicada e ativa (`origin/contexto:docs/contexto/supabase/edge-functions.md`) e sem agendamento (EDG-05) e com cálculo de início de dia em fuso errado (EDG-12).
Causa raiz: função criada para um plano que não foi concluído, publicada e nunca retirada (ver DEP-02).
Caminho recomendado: agendar (etapa 203) ou remover. Leve a decisão ao dono em uma frase ("isto deveria funcionar?"), e registre a resposta em `05-PROGRESSO.md`. Para desativar, use o painel (mantendo o código no repositório); para remover de vez, retire também a entrada de `supabase/config.toml` e a linha correspondente em `supabase/functions/REGISTRY.md`.
Arquivos e objetos a tocar: configuração da função no painel; `supabase/config.toml` e `supabase/functions/REGISTRY.md` se for removida.
Não tocar / armadilhas: confirme que nenhum gatilho do banco a chama (`git show origin/contexto:docs/contexto/supabase/functions.md | grep metrics-collector`) antes de desativar; nunca desative `csp-report` (recebe relatórios do navegador).
Depende de: 115 · Libera: —
Risco e como reverter: baixo; reverter = reativar.
Precisa de aprovação humana antes do merge: sim (infraestrutura)
Como verificar: a decisão registrada e, conforme ela: ou a função responde 404 (desativada), ou aparece com agendamento em `origin/contexto:docs/contexto/supabase/cron.md`, ou tem chamador no aplicativo. Cole a evidência.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 243 — Decidir o destino de `security-alert`
Onda 8 / Severidade Média / Camada: edge functions (higiene)
Achados resolvidos: DEP-02, EDG-05
Problema hoje: a função `security-alert` deveria enviar alerta de evento de segurança, está publicada e ativa (`origin/contexto:docs/contexto/supabase/edge-functions.md`) e nenhuma tela a chama e nenhum gatilho a dispara; é a função que escreve no formato correto de `security_events` (serve de referência para a etapa 131).
Causa raiz: função criada para um plano que não foi concluído, publicada e nunca retirada (ver DEP-02).
Caminho recomendado: decidir se o alerta de segurança deve existir: se sim, ligue ao gatilho de evento crítico; se não, mantenha como referência e desative. Leve a decisão ao dono em uma frase ("isto deveria funcionar?"), e registre a resposta em `05-PROGRESSO.md`. Para desativar, use o painel (mantendo o código no repositório); para remover de vez, retire também a entrada de `supabase/config.toml` e a linha correspondente em `supabase/functions/REGISTRY.md`.
Arquivos e objetos a tocar: configuração da função no painel; `supabase/config.toml` e `supabase/functions/REGISTRY.md` se for removida.
Não tocar / armadilhas: confirme que nenhum gatilho do banco a chama (`git show origin/contexto:docs/contexto/supabase/functions.md | grep security-alert`) antes de desativar; nunca desative `csp-report` (recebe relatórios do navegador).
Depende de: 115 · Libera: —
Risco e como reverter: baixo; reverter = reativar.
Precisa de aprovação humana antes do merge: sim (infraestrutura)
Como verificar: a decisão registrada e, conforme ela: ou a função responde 404 (desativada), ou aparece com agendamento em `origin/contexto:docs/contexto/supabase/cron.md`, ou tem chamador no aplicativo. Cole a evidência.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 244 — Decidir o destino de `send-email-report`
Onda 8 / Severidade Média / Camada: edge functions (higiene)
Achados resolvidos: DEP-02, EDG-05
Problema hoje: a função `send-email-report` deveria enviar relatório por e-mail, está publicada e ativa (`origin/contexto:docs/contexto/supabase/edge-functions.md`) e nenhuma tela a chama, não tem agendamento, calcula sobre conjunto truncado (EDG-11) e registra envio de forma não idempotente (EDG-13).
Causa raiz: função criada para um plano que não foi concluído, publicada e nunca retirada (ver DEP-02).
Caminho recomendado: as etapas 134 e 136 a corrigem; aqui decida se ela deve rodar por agendamento ou por botão na tela. Leve a decisão ao dono em uma frase ("isto deveria funcionar?"), e registre a resposta em `05-PROGRESSO.md`. Para desativar, use o painel (mantendo o código no repositório); para remover de vez, retire também a entrada de `supabase/config.toml` e a linha correspondente em `supabase/functions/REGISTRY.md`.
Arquivos e objetos a tocar: configuração da função no painel; `supabase/config.toml` e `supabase/functions/REGISTRY.md` se for removida.
Não tocar / armadilhas: confirme que nenhum gatilho do banco a chama (`git show origin/contexto:docs/contexto/supabase/functions.md | grep send-email-report`) antes de desativar; nunca desative `csp-report` (recebe relatórios do navegador).
Depende de: 115 · Libera: —
Risco e como reverter: baixo; reverter = reativar.
Precisa de aprovação humana antes do merge: sim (infraestrutura)
Como verificar: a decisão registrada e, conforme ela: ou a função responde 404 (desativada), ou aparece com agendamento em `origin/contexto:docs/contexto/supabase/cron.md`, ou tem chamador no aplicativo. Cole a evidência.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 245 — Decidir o destino de `validate-login-ip`
Onda 8 / Severidade Média / Camada: edge functions (higiene)
Achados resolvidos: DEP-02, EDG-05
Problema hoje: a função `validate-login-ip` deveria validar o endereço de origem no login, está publicada e ativa (`origin/contexto:docs/contexto/supabase/edge-functions.md`) e nenhuma tela a chama; a validação que existe hoje roda no cliente (AUT-08) e é burlável.
Causa raiz: função criada para um plano que não foi concluído, publicada e nunca retirada (ver DEP-02).
Caminho recomendado: deve ser absorvida pela etapa 231 (validação no servidor) ou removida. Leve a decisão ao dono em uma frase ("isto deveria funcionar?"), e registre a resposta em `05-PROGRESSO.md`. Para desativar, use o painel (mantendo o código no repositório); para remover de vez, retire também a entrada de `supabase/config.toml` e a linha correspondente em `supabase/functions/REGISTRY.md`.
Arquivos e objetos a tocar: configuração da função no painel; `supabase/config.toml` e `supabase/functions/REGISTRY.md` se for removida.
Não tocar / armadilhas: confirme que nenhum gatilho do banco a chama (`git show origin/contexto:docs/contexto/supabase/functions.md | grep validate-login-ip`) antes de desativar; nunca desative `csp-report` (recebe relatórios do navegador).
Depende de: 115 · Libera: —
Risco e como reverter: baixo; reverter = reativar.
Precisa de aprovação humana antes do merge: sim (infraestrutura)
Como verificar: a decisão registrada e, conforme ela: ou a função responde 404 (desativada), ou aparece com agendamento em `origin/contexto:docs/contexto/supabase/cron.md`, ou tem chamador no aplicativo. Cole a evidência.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 246 — Decidir o destino de `health-monitor`
Onda 8 / Severidade Média / Camada: edge functions (higiene)
Achados resolvidos: DEP-02, EDG-05
Problema hoje: a função `health-monitor` deveria vigiar a saúde das funções de servidor, está publicada e ativa (`origin/contexto:docs/contexto/supabase/edge-functions.md`) e é chamada por agendamento, mas grava em colunas inexistentes (EDG-08), então a vigilância não registra nada.
Causa raiz: função criada para um plano que não foi concluído, publicada e nunca retirada (ver DEP-02).
Caminho recomendado: corrigida na etapa 131; aqui apenas confirme que o registro passou a acontecer e mantenha. Leve a decisão ao dono em uma frase ("isto deveria funcionar?"), e registre a resposta em `05-PROGRESSO.md`. Para desativar, use o painel (mantendo o código no repositório); para remover de vez, retire também a entrada de `supabase/config.toml` e a linha correspondente em `supabase/functions/REGISTRY.md`.
Arquivos e objetos a tocar: configuração da função no painel; `supabase/config.toml` e `supabase/functions/REGISTRY.md` se for removida.
Não tocar / armadilhas: confirme que nenhum gatilho do banco a chama (`git show origin/contexto:docs/contexto/supabase/functions.md | grep health-monitor`) antes de desativar; nunca desative `csp-report` (recebe relatórios do navegador).
Depende de: 115 · Libera: —
Risco e como reverter: baixo; reverter = reativar.
Precisa de aprovação humana antes do merge: sim (infraestrutura)
Como verificar: a decisão registrada e, conforme ela: ou a função responde 404 (desativada), ou aparece com agendamento em `origin/contexto:docs/contexto/supabase/cron.md`, ou tem chamador no aplicativo. Cole a evidência.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 247 — Decidir o destino de `cron-cleanup`
Onda 8 / Severidade Média / Camada: edge functions (higiene)
Achados resolvidos: DEP-02, EDG-05
Problema hoje: a função `cron-cleanup` deveria limpar histórico de execuções de rotina, está publicada e ativa (`origin/contexto:docs/contexto/supabase/edge-functions.md`) e é chamada por agendamento (`purge-old-logs-daily` chama a função de banco; a função de servidor em si não tem chamador registrado).
Causa raiz: função criada para um plano que não foi concluído, publicada e nunca retirada (ver DEP-02).
Caminho recomendado: confirme quem realmente executa a limpeza (função de banco ou de servidor) e remova a que sobra. Leve a decisão ao dono em uma frase ("isto deveria funcionar?"), e registre a resposta em `05-PROGRESSO.md`. Para desativar, use o painel (mantendo o código no repositório); para remover de vez, retire também a entrada de `supabase/config.toml` e a linha correspondente em `supabase/functions/REGISTRY.md`.
Arquivos e objetos a tocar: configuração da função no painel; `supabase/config.toml` e `supabase/functions/REGISTRY.md` se for removida.
Não tocar / armadilhas: confirme que nenhum gatilho do banco a chama (`git show origin/contexto:docs/contexto/supabase/functions.md | grep cron-cleanup`) antes de desativar; nunca desative `csp-report` (recebe relatórios do navegador).
Depende de: 115 · Libera: —
Risco e como reverter: baixo; reverter = reativar.
Precisa de aprovação humana antes do merge: sim (infraestrutura)
Como verificar: a decisão registrada e, conforme ela: ou a função responde 404 (desativada), ou aparece com agendamento em `origin/contexto:docs/contexto/supabase/cron.md`, ou tem chamador no aplicativo. Cole a evidência.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

---

## Onda 8 (continuação) — documentação que afirma o que não acontece

### Etapa 248 — Corrigir os dossiês F-004, F-005 e F-006, que dizem resolvido o que não está
Onda 8 / Severidade Média / Camada: documentação de pendências
Achados resolvidos: AUT-08
Problema hoje: `docs/pendencias/F-004-bloqueio-de-ip-in-cuo.md`, `F-005-allowlist-de-ip-in-cua.md` e `F-006-geo-blocking-sem-enforcement.md` trazem `status: resolvida`, mas a aplicação dessas três proteções continua **somente no cliente** (`src/features/auth/components/AuthProvider.tsx:355` decide antes de chamar o serviço de autenticação, e qualquer chamada direta ao endereço de autenticação passa por fora) — ver AUT-08.
Causa raiz: o dossiê registrou a entrega da interface e do registro, não a aplicação no servidor.
Caminho recomendado: atualize os três dossiês para `status: parcial`, descrevendo exatamente o que foi entregue (tela, registro, consulta) e o que falta (decisão no servidor), e aponte para a etapa 231. Não mude o código nesta etapa.
Arquivos e objetos a tocar: os documentos citados.
Não tocar / armadilhas: não apague o histórico do dossiê — acrescente a correção datada; documentação não substitui a correção — a etapa correspondente continua valendo.
Depende de: — · Libera: —
Risco e como reverter: nenhum (documentação).
Precisa de aprovação humana antes do merge: não
Como verificar: leia o documento alterado como se fosse o dono: a situação real precisa estar na primeira tela, sem jargão. Cole o trecho novo em `05-PROGRESSO.md`.
Impacto no negócio: o dono decide com base nesses dossiês; dizer 'resolvido' sobre uma proteção burlável é o pior defeito possível de documentação.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 249 — Corrigir o dossiê F-009, cuja resolução depende de uma PR que não pode ser aplicada
Onda 8 / Severidade Média / Camada: documentação de pendências
Achados resolvidos: BD-01
Problema hoje: `docs/pendencias/F-009-useautobufferpromotion-promove-todas-as-t-cnicas.md` traz `status: resolvida` e, no corpo, admite que a promoção em produção segue bloqueada pelos gatilhos de auditoria (erro 42703) e que a correção está na PR #244, aberta.
Causa raiz: o dossiê considera resolvida a parte de código e deixa a parte de produção numa observação.
Caminho recomendado: mude o status para `parcial` e torne a dependência explícita no topo: depende da PR #244 **e** do destravamento do deploy (DEP-01, etapas 001-003). Aponte para as etapas 004 e 002.
Arquivos e objetos a tocar: os documentos citados.
Não tocar / armadilhas: não altere o código nem a PR #244; documentação não substitui a correção — a etapa correspondente continua valendo.
Depende de: — · Libera: —
Risco e como reverter: nenhum (documentação).
Precisa de aprovação humana antes do merge: não
Como verificar: leia o documento alterado como se fosse o dono: a situação real precisa estar na primeira tela, sem jargão. Cole o trecho novo em `05-PROGRESSO.md`.
Impacto no negócio: a promoção automática de fila é fluxo central: o dono precisa saber que está parada.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 250 — Alinhar os documentos de operação às rotinas que existem de verdade
Onda 8 / Severidade Média / Camada: documentação de operação
Achados resolvidos: EDG-05
Problema hoje: `docs/operacoes/RETENCAO-DE-LOGS.md:30-35` e `docs/operacoes/LGPD.md:14` descrevem rotinas de retenção e limpeza que **não têm agendamento** no banco (`origin/contexto:docs/contexto/supabase/cron.md` lista sete rotinas, e nenhuma é a de limpeza de registros de segurança).
Causa raiz: documentos escritos a partir do plano, não do estado.
Caminho recomendado: para cada rotina descrita, marque no documento se ela está ativa (com o nome do agendamento) ou pendente (com a etapa deste plano que a ativa: 200 a 204). Enquanto a rotina não existir, o documento não pode afirmar retenção.
Arquivos e objetos a tocar: os documentos citados.
Não tocar / armadilhas: não apague as seções — marque o estado; documentação não substitui a correção — a etapa correspondente continua valendo.
Depende de: — · Libera: —
Risco e como reverter: nenhum (documentação).
Precisa de aprovação humana antes do merge: não
Como verificar: leia o documento alterado como se fosse o dono: a situação real precisa estar na primeira tela, sem jargão. Cole o trecho novo em `05-PROGRESSO.md`.
Impacto no negócio: retenção de dado é compromisso legal; documento que afirma o que não acontece cria exposição desnecessária.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 251 — Registrar no RUNBOOK a proteção de dados que existe de fato
Onda 8 / Severidade Média / Camada: documentação de operação
Achados resolvidos: BD-03
Problema hoje: `docs/operacoes/RUNBOOK.md` descreve procedimentos de restauração, enquanto o projeto está com recuperação a um ponto no tempo **desligada** (`origin/contexto:docs/contexto/supabase/project-config.md`: `pitr_enabled: false`) e a rotina de backup própria não funciona (BD-19).
Causa raiz: o documento foi escrito supondo as proteções ligadas.
Caminho recomendado: escreva no topo do documento, em duas linhas, qual é a proteção real hoje (backup diário do plano, sem ponto no tempo) e o que se perde num incidente (até 24 horas). Atualize quando a etapa 026 for concluída.
Arquivos e objetos a tocar: os documentos citados.
Não tocar / armadilhas: não prometa prazo de restauração sem o teste da etapa 026; documentação não substitui a correção — a etapa correspondente continua valendo.
Depende de: — · Libera: —
Risco e como reverter: nenhum (documentação).
Precisa de aprovação humana antes do merge: não
Como verificar: leia o documento alterado como se fosse o dono: a situação real precisa estar na primeira tela, sem jargão. Cole o trecho novo em `05-PROGRESSO.md`.
Impacto no negócio: o dono acredita ter uma rede de segurança que não tem; essa frase é a diferença entre decidir com informação e descobrir no pior momento.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

---

## Verificações finais e travas de regressão

### Etapa 252 — Travar com teste a correção dos gatilhos de auditoria de OS
Onda 8 / Severidade Alta / Camada: testes (banco)
Achados resolvidos: BD-01
Problema hoje: a correção dos gatilhos (etapa 004) não tem nenhum teste: se outra migration redefinir a função com o nome de coluna errado, o fluxo central volta a quebrar sem ninguém notar até o operador reclamar.
Causa raiz: o repositório não tem teste de comportamento de gatilho; a verificação de RLS que existe (`scripts/rls-regression.mjs`) só cobre policy.
Caminho recomendado: escreva uma verificação no mesmo estilo de `scripts/rls-regression.mjs` (script que faz requisição real com credencial de teste) que mude o status de uma OS de teste e exija sucesso, e inclua-a no trabalho `RLS Regression` do CI, que já roda contra o banco real com conta dedicada. Se preferir não escrever em produção, crie a OS de teste, mude o status e apague em seguida, dentro do próprio script.
Arquivos e objetos a tocar: conforme o caminho acima (verificações registram em `docs/qa/05-PROGRESSO.md`; etapas de CI tocam `.github/workflows/`; etapas de teste criam arquivo de teste).
Não tocar / armadilhas: não use a conta de um operador real; a conta de teste já existe nos segredos do CI.
Depende de: ver o campo "Achados resolvidos" e as etapas citadas no caminho · Libera: —
Risco e como reverter: baixo para teste e documentação; para CI, reverter = voltar o workflow.
Precisa de aprovação humana antes do merge: não
Como verificar: o resultado da verificação registrado em `05-PROGRESSO.md`, passo por passo, com horário e evidência (saída de comando, consulta ou captura de tela). "Deveria funcionar" não conclui esta etapa.
Impacto no negócio: é o fluxo que para a fábrica; merece a única verificação automática que o projeto tem contra o banco real.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 253 — Travar com teste a regra que impede excluir OS com produção
Onda 8 / Severidade Alta / Camada: testes (banco)
Achados resolvidos: RN-04
Problema hoje: as etapas 036 e 040 bloqueiam a exclusão de OS com peças produzidas, e nada impede que uma mudança futura remova o gatilho ou o caminho de serviço.
Causa raiz: idem 252: falta cobertura de comportamento no banco.
Caminho recomendado: acrescente à mesma verificação do CI um caso que tente apagar uma OS de teste **com** produção registrada e exija a recusa — e um caso que apague uma OS em fila, exigindo sucesso.
Arquivos e objetos a tocar: conforme o caminho acima (verificações registram em `docs/qa/05-PROGRESSO.md`; etapas de CI tocam `.github/workflows/`; etapas de teste criam arquivo de teste).
Não tocar / armadilhas: limpe os dados de teste no fim do script.
Depende de: ver o campo "Achados resolvidos" e as etapas citadas no caminho · Libera: —
Risco e como reverter: baixo para teste e documentação; para CI, reverter = voltar o workflow.
Precisa de aprovação humana antes do merge: não
Como verificar: o resultado da verificação registrado em `05-PROGRESSO.md`, passo por passo, com horário e evidência (saída de comando, consulta ou captura de tela). "Deveria funcionar" não conclui esta etapa.
Impacto no negócio: exclusão indevida é perda de dado irreversível: é o tipo de regra que precisa de alarme automático.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 254 — Travar com teste a lista de tabelas do túnel de banco
Onda 8 / Severidade Alta / Camada: testes (servidor)
Achados resolvidos: SEG-04
Problema hoje: a etapa 056 remove `user_roles`, `audit_log` e `security_events` da lista permitida do túnel; a etapa 209 já liga o teste ao código real — falta o caso que defende essa lista.
Causa raiz: o teste mais longo do repositório testava uma cópia da lógica (TST-02).
Caminho recomendado: no teste do túnel, acrescente um caso que **reprova** se qualquer uma das três tabelas voltar à lista, e outro que reprova se a escrita for liberada a papel diferente de administrador.
Arquivos e objetos a tocar: conforme o caminho acima (verificações registram em `docs/qa/05-PROGRESSO.md`; etapas de CI tocam `.github/workflows/`; etapas de teste criam arquivo de teste).
Não tocar / armadilhas: faça depois de 209, senão o teste novo também não roda.
Depende de: ver o campo "Achados resolvidos" e as etapas citadas no caminho · Libera: —
Risco e como reverter: baixo para teste e documentação; para CI, reverter = voltar o workflow.
Precisa de aprovação humana antes do merge: não
Como verificar: o resultado da verificação registrado em `05-PROGRESSO.md`, passo por passo, com horário e evidência (saída de comando, consulta ou captura de tela). "Deveria funcionar" não conclui esta etapa.
Impacto no negócio: foi o caminho de escalada de privilégio mais direto que esta auditoria encontrou; sem teste, volta na próxima alteração.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 255 — Verificar, em produção, o fluxo de acesso depois da onda de segurança
Onda 2 / Severidade Alta / Camada: verificação ponta a ponta
Achados resolvidos: AUT-01, AUT-02, AUT-08
Problema hoje: as etapas 005 a 010, 231 e 235 mudam endereço do sistema, envio de e-mail, cadastro e bloqueio de login — cada uma com sua verificação, mas nenhuma verifica o **fluxo inteiro** do ponto de vista de quem usa.
Causa raiz: correções pontuais podem passar individualmente e ainda assim deixar o caminho do usuário quebrado.
Caminho recomendado: execute, com uma conta de teste e o dono acompanhando: (1) pedir recuperação de senha pela tela; (2) receber o e-mail; (3) abrir o link e definir nova senha; (4) entrar com a nova senha; (5) errar a senha cinco vezes e confirmar o bloqueio; (6) esperar o prazo e entrar de novo. Registre cada passo com o horário.
Arquivos e objetos a tocar: conforme o caminho acima (verificações registram em `docs/qa/05-PROGRESSO.md`; etapas de CI tocam `.github/workflows/`; etapas de teste criam arquivo de teste).
Não tocar / armadilhas: não teste com a conta do dono; não use e-mail real de cliente.
Depende de: ver o campo "Achados resolvidos" e as etapas citadas no caminho · Libera: —
Risco e como reverter: baixo para teste e documentação; para CI, reverter = voltar o workflow.
Precisa de aprovação humana antes do merge: não
Como verificar: o resultado da verificação registrado em `05-PROGRESSO.md`, passo por passo, com horário e evidência (saída de comando, consulta ou captura de tela). "Deveria funcionar" não conclui esta etapa.
Impacto no negócio: é o fluxo que, quebrado, deixa um operador fora do sistema no meio do turno — e hoje está quebrado em quatro pontos ao mesmo tempo.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 256 — Verificar, em produção, o ciclo completo de uma ordem de serviço
Onda 2 / Severidade Crítica / Camada: verificação ponta a ponta
Achados resolvidos: BD-01, RN-01, RN-07, EST-01
Problema hoje: as etapas 004, 041, 048 e 051 destravam e consolidam o ciclo da OS; é preciso provar que o caminho inteiro funciona antes de dizer ao dono que o sistema voltou.
Causa raiz: o ciclo passa por gatilho de banco, promoção automática, criação de tarefa de embalagem e atualização em tempo real — quatro mecanismos que esta auditoria encontrou quebrados em pontos diferentes.
Caminho recomendado: com o dono acompanhando, crie uma OS de teste e percorra: agendar → iniciar → pausar → retomar → concluir → conferir a tarefa de embalagem criada → conferir a promoção da fila → conferir o histórico de status. Em outra janela aberta no Kanban, confirme que as mudanças aparecem **sem recarregar**. Registre cada passo e apague a OS de teste no fim (ela não terá produção registrada, então a regra da etapa 036 permite).
Arquivos e objetos a tocar: conforme o caminho acima (verificações registram em `docs/qa/05-PROGRESSO.md`; etapas de CI tocam `.github/workflows/`; etapas de teste criam arquivo de teste).
Não tocar / armadilhas: faça depois do deploy confirmado (etapa 003); se qualquer passo falhar, pare e registre — não tente corrigir no meio da verificação.
Depende de: ver o campo "Achados resolvidos" e as etapas citadas no caminho · Libera: —
Risco e como reverter: baixo para teste e documentação; para CI, reverter = voltar o workflow.
Precisa de aprovação humana antes do merge: não
Como verificar: o resultado da verificação registrado em `05-PROGRESSO.md`, passo por passo, com horário e evidência (saída de comando, consulta ou captura de tela). "Deveria funcionar" não conclui esta etapa.
Impacto no negócio: é o fluxo que o negócio vende: receber pedido, produzir, embalar, expedir. Hoje ele para no primeiro passo.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 257 — Verificar, em produção, que os painéis param de mostrar número inventado
Onda 4 / Severidade Alta / Camada: verificação ponta a ponta
Achados resolvidos: UI-09 a UI-18
Problema hoje: as etapas 066 a 076 removem ou ligam à fonte real dez painéis com dado fabricado; sem uma passada final, é fácil restar um.
Causa raiz: os dados fabricados estavam espalhados por dez telas, cada uma com correção própria.
Caminho recomendado: abra as dez telas tratadas (segurança, quiosque, gêmeo digital, inteligência de negócio, qualidade de código, telemetria, produtividade, simulação, custos, indicadores) e confirme, uma por uma: todo número exibido ou vem do banco, ou está marcado como exemplo, ou aparece como 'sem dado'. Registre a lista com o veredito de cada tela.
Arquivos e objetos a tocar: conforme o caminho acima (verificações registram em `docs/qa/05-PROGRESSO.md`; etapas de CI tocam `.github/workflows/`; etapas de teste criam arquivo de teste).
Não tocar / armadilhas: não aceite 'parece certo': compare pelo menos um número de cada tela com uma consulta ao banco.
Depende de: ver o campo "Achados resolvidos" e as etapas citadas no caminho · Libera: —
Risco e como reverter: baixo para teste e documentação; para CI, reverter = voltar o workflow.
Precisa de aprovação humana antes do merge: não
Como verificar: o resultado da verificação registrado em `05-PROGRESSO.md`, passo por passo, com horário e evidência (saída de comando, consulta ou captura de tela). "Deveria funcionar" não conclui esta etapa.
Impacto no negócio: é o que devolve a confiança do dono nos painéis: hoje ele não sabe quais números são reais.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 258 — Avisar quando o deploy falhar
Onda 8 / Severidade Alta / Camada: CI/observabilidade
Achados resolvidos: DEP-01
Problema hoje: os quatro deploys que falharam entre 15:44 e 19:36 de 2026-11-22 não geraram nenhum aviso: a falha só foi descoberta nesta auditoria, lendo o histórico de execuções.
Causa raiz: o workflow reporta no próprio painel do repositório, e ninguém olha o painel.
Caminho recomendado: acrescente ao `deploy.yml` um passo final condicionado a falha que envie aviso pelo canal que o dono usa (o projeto tem `VITE_ALERT_WEBHOOK_URL` previsto no `.env.example` e funções de e-mail; escolha com o dono). O aviso deve dizer **o que** ficou sem aplicar — migration, função de servidor, ou ambos.
Arquivos e objetos a tocar: conforme o caminho acima (verificações registram em `docs/qa/05-PROGRESSO.md`; etapas de CI tocam `.github/workflows/`; etapas de teste criam arquivo de teste).
Não tocar / armadilhas: não envie aviso em cada execução, só em falha; não coloque segredo no corpo do aviso.
Depende de: ver o campo "Achados resolvidos" e as etapas citadas no caminho · Libera: —
Risco e como reverter: baixo para teste e documentação; para CI, reverter = voltar o workflow.
Precisa de aprovação humana antes do merge: sim (CI/workflows)
Como verificar: o resultado da verificação registrado em `05-PROGRESSO.md`, passo por passo, com horário e evidência (saída de comando, consulta ou captura de tela). "Deveria funcionar" não conclui esta etapa.
Impacto no negócio: sem isso, o sistema pode ficar semanas com o código novo no repositório e o comportamento antigo em produção, como aconteceu.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

---

## Onda 5 (continuação) — estado de erro, uma tela por PR

> Desdobramento das etapas 078 e 079 em etapas atômicas: uma tela por PR, cada uma verificável sozinha. Todas resolvem o mesmo achado (UI-19) e seguem o mesmo caminho; o que muda é a tela e o que o usuário conclui quando ela fica em branco.

### Etapa 259 — Estado de erro em o quadro de produção
Onda 5 / Severidade Alta / Camada: front
Achados resolvidos: UI-19
Problema hoje: `src/pages/KanbanBoard.tsx` não lê o estado de erro das consultas que faz (varredura de `grep -L "isError" src/pages/*.tsx` e leitura dos hooks consumidos; os hooks **expõem** o erro — por exemplo `src/features/jobs/hooks/useSchedulingData.ts:295` — e nenhum consumidor o usa). Uma falha de leitura deixa a tela em branco, igual a "não há dado": o operador conclui que não há OS para produzir e para a máquina.
Causa raiz: estado de erro não representado na interface (ver UI-19).
Caminho recomendado: leia o estado de erro do(s) hook(s) que a tela consome e renderize um bloco de erro com ação de tentar novamente, usando `src/components/ui/empty-state.tsx` no formato de `src/pages/OperatorView.tsx:169-170`. Mantenha o estado vazio existente: vazio e erro são estados diferentes e **ambos** precisam existir. Se a tela consome vários hooks, mostre um único bloco (não um por consulta). Não altere layout nem cálculo.
Arquivos e objetos a tocar: `src/pages/KanbanBoard.tsx`.
Não tocar / armadilhas: não troque o estado vazio legítimo pelo de erro; não acrescente nova consulta; se houver tratamento global (etapa 077), o bloco da tela é complemento, não substituto.
Depende de: 077 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: bloqueie a requisição desta tela no navegador (ou desligue a rede) e confirme o bloco de erro com ação de recarregar; com dados vazios, confirme o estado vazio; com dados, a tela normal. Cole os três resultados.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 260 — Estado de erro em a fila de pendentes
Onda 5 / Severidade Alta / Camada: front
Achados resolvidos: UI-19
Problema hoje: `src/pages/PendingQueue.tsx` não lê o estado de erro das consultas que faz (varredura de `grep -L "isError" src/pages/*.tsx` e leitura dos hooks consumidos; os hooks **expõem** o erro — por exemplo `src/features/jobs/hooks/useSchedulingData.ts:295` — e nenhum consumidor o usa). Uma falha de leitura deixa a tela em branco, igual a "não há dado": o coordenador acha que não há nada para agendar.
Causa raiz: estado de erro não representado na interface (ver UI-19).
Caminho recomendado: leia o estado de erro do(s) hook(s) que a tela consome e renderize um bloco de erro com ação de tentar novamente, usando `src/components/ui/empty-state.tsx` no formato de `src/pages/OperatorView.tsx:169-170`. Mantenha o estado vazio existente: vazio e erro são estados diferentes e **ambos** precisam existir. Se a tela consome vários hooks, mostre um único bloco (não um por consulta). Não altere layout nem cálculo.
Arquivos e objetos a tocar: `src/pages/PendingQueue.tsx`.
Não tocar / armadilhas: não troque o estado vazio legítimo pelo de erro; não acrescente nova consulta; se houver tratamento global (etapa 077), o bloco da tela é complemento, não substituto.
Depende de: 077 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: bloqueie a requisição desta tela no navegador (ou desligue a rede) e confirme o bloco de erro com ação de recarregar; com dados vazios, confirme o estado vazio; com dados, a tela normal. Cole os três resultados.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 261 — Estado de erro em a tela do operador
Onda 5 / Severidade Alta / Camada: front
Achados resolvidos: UI-19
Problema hoje: `src/pages/OperatorView.tsx` não lê o estado de erro das consultas que faz (varredura de `grep -L "isError" src/pages/*.tsx` e leitura dos hooks consumidos; os hooks **expõem** o erro — por exemplo `src/features/jobs/hooks/useSchedulingData.ts:295` — e nenhum consumidor o usa). Uma falha de leitura deixa a tela em branco, igual a "não há dado": o operador não vê o trabalho dele e procura o coordenador.
Causa raiz: estado de erro não representado na interface (ver UI-19).
Caminho recomendado: leia o estado de erro do(s) hook(s) que a tela consome e renderize um bloco de erro com ação de tentar novamente, usando `src/components/ui/empty-state.tsx` no formato de `src/pages/OperatorView.tsx:169-170`. Mantenha o estado vazio existente: vazio e erro são estados diferentes e **ambos** precisam existir. Se a tela consome vários hooks, mostre um único bloco (não um por consulta). Não altere layout nem cálculo.
Arquivos e objetos a tocar: `src/pages/OperatorView.tsx`.
Não tocar / armadilhas: não troque o estado vazio legítimo pelo de erro; não acrescente nova consulta; se houver tratamento global (etapa 077), o bloco da tela é complemento, não substituto.
Depende de: 077 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: bloqueie a requisição desta tela no navegador (ou desligue a rede) e confirme o bloco de erro com ação de recarregar; com dados vazios, confirme o estado vazio; com dados, a tela normal. Cole os três resultados.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 262 — Estado de erro em o calendário diário
Onda 5 / Severidade Alta / Camada: front
Achados resolvidos: UI-19
Problema hoje: `src/pages/DailyCalendar.tsx` não lê o estado de erro das consultas que faz (varredura de `grep -L "isError" src/pages/*.tsx` e leitura dos hooks consumidos; os hooks **expõem** o erro — por exemplo `src/features/jobs/hooks/useSchedulingData.ts:295` — e nenhum consumidor o usa). Uma falha de leitura deixa a tela em branco, igual a "não há dado": o dia aparece vazio e a programação é refeita à mão.
Causa raiz: estado de erro não representado na interface (ver UI-19).
Caminho recomendado: leia o estado de erro do(s) hook(s) que a tela consome e renderize um bloco de erro com ação de tentar novamente, usando `src/components/ui/empty-state.tsx` no formato de `src/pages/OperatorView.tsx:169-170`. Mantenha o estado vazio existente: vazio e erro são estados diferentes e **ambos** precisam existir. Se a tela consome vários hooks, mostre um único bloco (não um por consulta). Não altere layout nem cálculo.
Arquivos e objetos a tocar: `src/pages/DailyCalendar.tsx`.
Não tocar / armadilhas: não troque o estado vazio legítimo pelo de erro; não acrescente nova consulta; se houver tratamento global (etapa 077), o bloco da tela é complemento, não substituto.
Depende de: 077 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: bloqueie a requisição desta tela no navegador (ou desligue a rede) e confirme o bloco de erro com ação de recarregar; com dados vazios, confirme o estado vazio; com dados, a tela normal. Cole os três resultados.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 263 — Estado de erro em o calendário semanal
Onda 5 / Severidade Alta / Camada: front
Achados resolvidos: UI-19
Problema hoje: `src/pages/WeeklyCalendar.tsx` não lê o estado de erro das consultas que faz (varredura de `grep -L "isError" src/pages/*.tsx` e leitura dos hooks consumidos; os hooks **expõem** o erro — por exemplo `src/features/jobs/hooks/useSchedulingData.ts:295` — e nenhum consumidor o usa). Uma falha de leitura deixa a tela em branco, igual a "não há dado": a semana aparece vazia e o planejamento é refeito.
Causa raiz: estado de erro não representado na interface (ver UI-19).
Caminho recomendado: leia o estado de erro do(s) hook(s) que a tela consome e renderize um bloco de erro com ação de tentar novamente, usando `src/components/ui/empty-state.tsx` no formato de `src/pages/OperatorView.tsx:169-170`. Mantenha o estado vazio existente: vazio e erro são estados diferentes e **ambos** precisam existir. Se a tela consome vários hooks, mostre um único bloco (não um por consulta). Não altere layout nem cálculo.
Arquivos e objetos a tocar: `src/pages/WeeklyCalendar.tsx`.
Não tocar / armadilhas: não troque o estado vazio legítimo pelo de erro; não acrescente nova consulta; se houver tratamento global (etapa 077), o bloco da tela é complemento, não substituto.
Depende de: 077 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: bloqueie a requisição desta tela no navegador (ou desligue a rede) e confirme o bloco de erro com ação de recarregar; com dados vazios, confirme o estado vazio; com dados, a tela normal. Cole os três resultados.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 264 — Estado de erro em o calendário mensal
Onda 5 / Severidade Alta / Camada: front
Achados resolvidos: UI-19
Problema hoje: `src/pages/MonthlyCalendar.tsx` não lê o estado de erro das consultas que faz (varredura de `grep -L "isError" src/pages/*.tsx` e leitura dos hooks consumidos; os hooks **expõem** o erro — por exemplo `src/features/jobs/hooks/useSchedulingData.ts:295` — e nenhum consumidor o usa). Uma falha de leitura deixa a tela em branco, igual a "não há dado": o mês aparece vazio nas reuniões de planejamento.
Causa raiz: estado de erro não representado na interface (ver UI-19).
Caminho recomendado: leia o estado de erro do(s) hook(s) que a tela consome e renderize um bloco de erro com ação de tentar novamente, usando `src/components/ui/empty-state.tsx` no formato de `src/pages/OperatorView.tsx:169-170`. Mantenha o estado vazio existente: vazio e erro são estados diferentes e **ambos** precisam existir. Se a tela consome vários hooks, mostre um único bloco (não um por consulta). Não altere layout nem cálculo.
Arquivos e objetos a tocar: `src/pages/MonthlyCalendar.tsx`.
Não tocar / armadilhas: não troque o estado vazio legítimo pelo de erro; não acrescente nova consulta; se houver tratamento global (etapa 077), o bloco da tela é complemento, não substituto.
Depende de: 077 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: bloqueie a requisição desta tela no navegador (ou desligue a rede) e confirme o bloco de erro com ação de recarregar; com dados vazios, confirme o estado vazio; com dados, a tela normal. Cole os três resultados.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 265 — Estado de erro em o painel de alertas
Onda 5 / Severidade Alta / Camada: front
Achados resolvidos: UI-19
Problema hoje: `src/pages/AlertsDashboard.tsx` não lê o estado de erro das consultas que faz (varredura de `grep -L "isError" src/pages/*.tsx` e leitura dos hooks consumidos; os hooks **expõem** o erro — por exemplo `src/features/jobs/hooks/useSchedulingData.ts:295` — e nenhum consumidor o usa). Uma falha de leitura deixa a tela em branco, igual a "não há dado": nenhum alerta aparece e a equipe conclui que está tudo bem.
Causa raiz: estado de erro não representado na interface (ver UI-19).
Caminho recomendado: leia o estado de erro do(s) hook(s) que a tela consome e renderize um bloco de erro com ação de tentar novamente, usando `src/components/ui/empty-state.tsx` no formato de `src/pages/OperatorView.tsx:169-170`. Mantenha o estado vazio existente: vazio e erro são estados diferentes e **ambos** precisam existir. Se a tela consome vários hooks, mostre um único bloco (não um por consulta). Não altere layout nem cálculo.
Arquivos e objetos a tocar: `src/pages/AlertsDashboard.tsx`.
Não tocar / armadilhas: não troque o estado vazio legítimo pelo de erro; não acrescente nova consulta; se houver tratamento global (etapa 077), o bloco da tela é complemento, não substituto.
Depende de: 077 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: bloqueie a requisição desta tela no navegador (ou desligue a rede) e confirme o bloco de erro com ação de recarregar; com dados vazios, confirme o estado vazio; com dados, a tela normal. Cole os três resultados.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 266 — Estado de erro em o painel de indicadores
Onda 5 / Severidade Alta / Camada: front
Achados resolvidos: UI-19
Problema hoje: `src/pages/KPIDashboard.tsx` não lê o estado de erro das consultas que faz (varredura de `grep -L "isError" src/pages/*.tsx` e leitura dos hooks consumidos; os hooks **expõem** o erro — por exemplo `src/features/jobs/hooks/useSchedulingData.ts:295` — e nenhum consumidor o usa). Uma falha de leitura deixa a tela em branco, igual a "não há dado": os indicadores somem e a reunião decide sem número.
Causa raiz: estado de erro não representado na interface (ver UI-19).
Caminho recomendado: leia o estado de erro do(s) hook(s) que a tela consome e renderize um bloco de erro com ação de tentar novamente, usando `src/components/ui/empty-state.tsx` no formato de `src/pages/OperatorView.tsx:169-170`. Mantenha o estado vazio existente: vazio e erro são estados diferentes e **ambos** precisam existir. Se a tela consome vários hooks, mostre um único bloco (não um por consulta). Não altere layout nem cálculo.
Arquivos e objetos a tocar: `src/pages/KPIDashboard.tsx`.
Não tocar / armadilhas: não troque o estado vazio legítimo pelo de erro; não acrescente nova consulta; se houver tratamento global (etapa 077), o bloco da tela é complemento, não substituto.
Depende de: 077 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: bloqueie a requisição desta tela no navegador (ou desligue a rede) e confirme o bloco de erro com ação de recarregar; com dados vazios, confirme o estado vazio; com dados, a tela normal. Cole os três resultados.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 267 — Estado de erro em o painel de eficiência de máquina
Onda 5 / Severidade Alta / Camada: front
Achados resolvidos: UI-19
Problema hoje: `src/pages/OEEDashboard.tsx` não lê o estado de erro das consultas que faz (varredura de `grep -L "isError" src/pages/*.tsx` e leitura dos hooks consumidos; os hooks **expõem** o erro — por exemplo `src/features/jobs/hooks/useSchedulingData.ts:295` — e nenhum consumidor o usa). Uma falha de leitura deixa a tela em branco, igual a "não há dado": a eficiência aparece vazia e parece queda de produção.
Causa raiz: estado de erro não representado na interface (ver UI-19).
Caminho recomendado: leia o estado de erro do(s) hook(s) que a tela consome e renderize um bloco de erro com ação de tentar novamente, usando `src/components/ui/empty-state.tsx` no formato de `src/pages/OperatorView.tsx:169-170`. Mantenha o estado vazio existente: vazio e erro são estados diferentes e **ambos** precisam existir. Se a tela consome vários hooks, mostre um único bloco (não um por consulta). Não altere layout nem cálculo.
Arquivos e objetos a tocar: `src/pages/OEEDashboard.tsx`.
Não tocar / armadilhas: não troque o estado vazio legítimo pelo de erro; não acrescente nova consulta; se houver tratamento global (etapa 077), o bloco da tela é complemento, não substituto.
Depende de: 077 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: bloqueie a requisição desta tela no navegador (ou desligue a rede) e confirme o bloco de erro com ação de recarregar; com dados vazios, confirme o estado vazio; com dados, a tela normal. Cole os três resultados.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 268 — Estado de erro em o painel executivo
Onda 5 / Severidade Alta / Camada: front
Achados resolvidos: UI-19
Problema hoje: `src/pages/ExecutiveDashboard.tsx` não lê o estado de erro das consultas que faz (varredura de `grep -L "isError" src/pages/*.tsx` e leitura dos hooks consumidos; os hooks **expõem** o erro — por exemplo `src/features/jobs/hooks/useSchedulingData.ts:295` — e nenhum consumidor o usa). Uma falha de leitura deixa a tela em branco, igual a "não há dado": a diretoria vê tela vazia e interpreta como mês sem produção.
Causa raiz: estado de erro não representado na interface (ver UI-19).
Caminho recomendado: leia o estado de erro do(s) hook(s) que a tela consome e renderize um bloco de erro com ação de tentar novamente, usando `src/components/ui/empty-state.tsx` no formato de `src/pages/OperatorView.tsx:169-170`. Mantenha o estado vazio existente: vazio e erro são estados diferentes e **ambos** precisam existir. Se a tela consome vários hooks, mostre um único bloco (não um por consulta). Não altere layout nem cálculo.
Arquivos e objetos a tocar: `src/pages/ExecutiveDashboard.tsx`.
Não tocar / armadilhas: não troque o estado vazio legítimo pelo de erro; não acrescente nova consulta; se houver tratamento global (etapa 077), o bloco da tela é complemento, não substituto.
Depende de: 077 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: bloqueie a requisição desta tela no navegador (ou desligue a rede) e confirme o bloco de erro com ação de recarregar; com dados vazios, confirme o estado vazio; com dados, a tela normal. Cole os três resultados.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 269 — Estado de erro em a comparação de máquinas
Onda 5 / Severidade Alta / Camada: front
Achados resolvidos: UI-19
Problema hoje: `src/pages/MachineComparisonPage.tsx` não lê o estado de erro das consultas que faz (varredura de `grep -L "isError" src/pages/*.tsx` e leitura dos hooks consumidos; os hooks **expõem** o erro — por exemplo `src/features/jobs/hooks/useSchedulingData.ts:295` — e nenhum consumidor o usa). Uma falha de leitura deixa a tela em branco, igual a "não há dado": a comparação não carrega e a decisão de compra fica sem base.
Causa raiz: estado de erro não representado na interface (ver UI-19).
Caminho recomendado: leia o estado de erro do(s) hook(s) que a tela consome e renderize um bloco de erro com ação de tentar novamente, usando `src/components/ui/empty-state.tsx` no formato de `src/pages/OperatorView.tsx:169-170`. Mantenha o estado vazio existente: vazio e erro são estados diferentes e **ambos** precisam existir. Se a tela consome vários hooks, mostre um único bloco (não um por consulta). Não altere layout nem cálculo.
Arquivos e objetos a tocar: `src/pages/MachineComparisonPage.tsx`.
Não tocar / armadilhas: não troque o estado vazio legítimo pelo de erro; não acrescente nova consulta; se houver tratamento global (etapa 077), o bloco da tela é complemento, não substituto.
Depende de: 077 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: bloqueie a requisição desta tela no navegador (ou desligue a rede) e confirme o bloco de erro com ação de recarregar; com dados vazios, confirme o estado vazio; com dados, a tela normal. Cole os três resultados.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 270 — Estado de erro em o histórico do operador
Onda 5 / Severidade Alta / Camada: front
Achados resolvidos: UI-19
Problema hoje: `src/pages/OperatorHistoryPage.tsx` não lê o estado de erro das consultas que faz (varredura de `grep -L "isError" src/pages/*.tsx` e leitura dos hooks consumidos; os hooks **expõem** o erro — por exemplo `src/features/jobs/hooks/useSchedulingData.ts:295` — e nenhum consumidor o usa). Uma falha de leitura deixa a tela em branco, igual a "não há dado": o histórico some numa conversa de desempenho.
Causa raiz: estado de erro não representado na interface (ver UI-19).
Caminho recomendado: leia o estado de erro do(s) hook(s) que a tela consome e renderize um bloco de erro com ação de tentar novamente, usando `src/components/ui/empty-state.tsx` no formato de `src/pages/OperatorView.tsx:169-170`. Mantenha o estado vazio existente: vazio e erro são estados diferentes e **ambos** precisam existir. Se a tela consome vários hooks, mostre um único bloco (não um por consulta). Não altere layout nem cálculo.
Arquivos e objetos a tocar: `src/pages/OperatorHistoryPage.tsx`.
Não tocar / armadilhas: não troque o estado vazio legítimo pelo de erro; não acrescente nova consulta; se houver tratamento global (etapa 077), o bloco da tela é complemento, não substituto.
Depende de: 077 · Libera: —
Risco e como reverter: baixo.
Precisa de aprovação humana antes do merge: não
Como verificar: bloqueie a requisição desta tela no navegador (ou desligue a rede) e confirme o bloco de erro com ação de recarregar; com dados vazios, confirme o estado vazio; com dados, a tela normal. Cole os três resultados.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

---

## Desdobramentos finais — etapas atômicas das correções compostas

### Etapa 271 — Dar estado vazio às três listas do módulo de inteligência de negócio
Onda 7 / Severidade Baixa / Camada: front
Achados resolvidos: UI-23
Problema hoje: `src/features/analytics/components/bi/BINormalView.tsx:344`, `BIComparisonView.tsx:136` e `src/features/analytics/components/bi/executive/KPIMachinesTab.tsx:85` renderizam apenas o cabeçalho da tabela quando não há dado.
Causa raiz: ver UI-23 em `docs/qa/03-ACHADOS.md`.
Caminho recomendado: use `src/components/ui/empty-state.tsx` no formato de `src/pages/OperatorView.tsx:169-170`, com texto específico do que falta ('nenhuma OS no período selecionado').
Arquivos e objetos a tocar: os citados acima.
Não tocar / armadilhas: não confunda com o estado de erro (etapas 259-270). Não aproveite a PR para outra correção.
Depende de: as etapas citadas no caminho · Libera: —
Risco e como reverter: baixo, salvo indicação acima. Reverter = desfazer a mudança listada.
Precisa de aprovação humana antes do merge: não
Como verificar: exercite o comportamento alterado e registre a evidência em `05-PROGRESSO.md` (saída de comando, consulta, requisição ou captura de tela). Compare com o estado anterior.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 272 — Dar estado vazio às três listas restantes (energia e indicadores)
Onda 7 / Severidade Baixa / Camada: front
Achados resolvidos: UI-23
Problema hoje: `src/pages/EnergyDashboard.tsx:148-170` e as duas listas restantes do módulo de indicadores renderizam só o cabeçalho sem dado.
Causa raiz: ver UI-23 em `docs/qa/03-ACHADOS.md`.
Caminho recomendado: mesmo caminho da etapa 271; para a lista de leituras de energia, o texto deve dizer 'nenhuma leitura registrada neste período'.
Arquivos e objetos a tocar: os citados acima.
Não tocar / armadilhas: idem 271. Não aproveite a PR para outra correção.
Depende de: as etapas citadas no caminho · Libera: —
Risco e como reverter: baixo, salvo indicação acima. Reverter = desfazer a mudança listada.
Precisa de aprovação humana antes do merge: não
Como verificar: exercite o comportamento alterado e registre a evidência em `05-PROGRESSO.md` (saída de comando, consulta, requisição ou captura de tela). Compare com o estado anterior.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 273 — Corrigir o botão dentro de link no componente de item de menu
Onda 7 / Severidade Baixa / Camada: front (acessibilidade)
Achados resolvidos: UI-24
Problema hoje: `src/components/layout/sidebar/NavButton.tsx:39-41` envolve `<Button>` dentro de `<Link>` sem `asChild`, gerando HTML inválido (`<a><button>`) em **todos** os itens do menu lateral, com rótulo anunciado duas vezes por leitor de tela.
Causa raiz: ver UI-24 em `docs/qa/03-ACHADOS.md`.
Caminho recomendado: troque por `<Button asChild><Link …>…</Link></Button>` e mantenha um único `aria-label` (o do link). Este arquivo é o único componente de item de menu: corrigir aqui arruma a navegação inteira.
Arquivos e objetos a tocar: os citados acima.
Não tocar / armadilhas: `asChild` repassa as propriedades ao filho — compare a aparência do menu antes e depois. Não aproveite a PR para outra correção.
Depende de: as etapas citadas no caminho · Libera: —
Risco e como reverter: baixo, salvo indicação acima. Reverter = desfazer a mudança listada.
Precisa de aprovação humana antes do merge: não
Como verificar: exercite o comportamento alterado e registre a evidência em `05-PROGRESSO.md` (saída de comando, consulta, requisição ou captura de tela). Compare com o estado anterior.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 274 — Corrigir os quatro pontos restantes de botão dentro de link
Onda 7 / Severidade Baixa / Camada: front (acessibilidade)
Achados resolvidos: UI-24
Problema hoje: `src/components/layout/MainLayout.tsx:174-176` e `:202-204`, `src/components/layout/AppSidebar.tsx:198-211`, `src/components/dashboard/QuickActions.tsx:24-25` repetem o mesmo padrão inválido.
Causa raiz: ver UI-24 em `docs/qa/03-ACHADOS.md`.
Caminho recomendado: mesma correção da etapa 273, aplicada aos quatro locais. `QuickActions` está na lista de componentes órfãos (CI-05): confirme na etapa 217 se ele fica ou sai antes de corrigir.
Arquivos e objetos a tocar: os citados acima.
Não tocar / armadilhas: não mexa em `NavButton` aqui (é a etapa 273). Não aproveite a PR para outra correção.
Depende de: as etapas citadas no caminho · Libera: —
Risco e como reverter: baixo, salvo indicação acima. Reverter = desfazer a mudança listada.
Precisa de aprovação humana antes do merge: não
Como verificar: exercite o comportamento alterado e registre a evidência em `05-PROGRESSO.md` (saída de comando, consulta, requisição ou captura de tela). Compare com o estado anterior.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 275 — Agregar no banco os números do coletor de métricas
Onda 3 / Severidade Média / Camada: edge function
Achados resolvidos: EDG-11
Problema hoje: `supabase/functions/metrics-collector/index.ts:32-34` busca as OS sem limite e soma em memória, com o mesmo defeito de EDG-11: o limite de 1000 linhas do projeto corta a resposta e as métricas gravadas em `system_metrics` ficam calculadas sobre uma fatia.
Causa raiz: ver EDG-11 em `docs/qa/03-ACHADOS.md`.
Caminho recomendado: reaproveite a função de agregação criada na etapa 134 (mesmo período, mesmos filtros) em vez de escrever outra; se os recortes forem diferentes, acrescente parâmetros à mesma função.
Arquivos e objetos a tocar: os citados acima.
Não tocar / armadilhas: não aumente o limite do projeto; faça depois da etapa 134. Não aproveite a PR para outra correção.
Depende de: as etapas citadas no caminho · Libera: —
Risco e como reverter: baixo, salvo indicação acima. Reverter = desfazer a mudança listada.
Precisa de aprovação humana antes do merge: não
Como verificar: exercite o comportamento alterado e registre a evidência em `05-PROGRESSO.md` (saída de comando, consulta, requisição ou captura de tela). Compare com o estado anterior.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 276 — Agregar no banco os números da exportação em planilha
Onda 3 / Severidade Média / Camada: edge function
Achados resolvidos: EDG-11
Problema hoje: `supabase/functions/excel-export/index.ts` busca as OS sem limite e monta a planilha em memória — mesma classe de defeito de EDG-11, com o agravante de a planilha ser levada para fora do sistema como se fosse completa.
Causa raiz: ver EDG-11 em `docs/qa/03-ACHADOS.md`.
Caminho recomendado: idem 275: use a função de agregação da etapa 134 para os totais e pagine explicitamente a lista detalhada (com `range` em laço), registrando no arquivo quantas linhas foram incluídas.
Arquivos e objetos a tocar: os citados acima.
Não tocar / armadilhas: a função está na lista de órfãs (etapa 240): se for removida, esta etapa não se aplica — confirme antes. Não aproveite a PR para outra correção.
Depende de: as etapas citadas no caminho · Libera: —
Risco e como reverter: baixo, salvo indicação acima. Reverter = desfazer a mudança listada.
Precisa de aprovação humana antes do merge: não
Como verificar: exercite o comportamento alterado e registre a evidência em `05-PROGRESSO.md` (saída de comando, consulta, requisição ou captura de tela). Compare com o estado anterior.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 277 — Corrigir o cálculo de início de dia no coletor de métricas
Onda 3 / Severidade Média / Camada: edge function
Achados resolvidos: EDG-12
Problema hoje: `supabase/functions/metrics-collector/index.ts` usa `setHours(0,0,0,0)` num ambiente que roda em UTC, então o 'dia' das métricas começa três horas antes do dia em Brasília e mistura produção de dois dias.
Causa raiz: ver EDG-12 em `docs/qa/03-ACHADOS.md`.
Caminho recomendado: derive os limites do dia no fuso de São Paulo e converta para UTC na consulta — é o mesmo tratamento que o aplicativo já adotou em `src/lib/dateUtils.ts` (`formatDateOnly`/`parseDateOnly`) e que `daily-maintenance-summary` recebeu no commit `ca42441b`.
Arquivos e objetos a tocar: os citados acima.
Não tocar / armadilhas: não mude o fuso do ambiente da função; não altere datas já gravadas. Não aproveite a PR para outra correção.
Depende de: as etapas citadas no caminho · Libera: —
Risco e como reverter: baixo, salvo indicação acima. Reverter = desfazer a mudança listada.
Precisa de aprovação humana antes do merge: não
Como verificar: exercite o comportamento alterado e registre a evidência em `05-PROGRESSO.md` (saída de comando, consulta, requisição ou captura de tela). Compare com o estado anterior.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 278 — Aplicar o prazo por exceção na tela do operador de embalagem
Onda 3 / Severidade Alta / Camada: front (regra)
Achados resolvidos: FUN-02
Problema hoje: o componente que o operador usa para ver o prazo da tarefa de embalagem calcula com a configuração global, ignorando as exceções cadastradas por cliente e técnica (`resolveEffectiveSlaSettings` não é chamada por ninguém).
Causa raiz: ver FUN-02 em `docs/qa/03-ACHADOS.md`.
Caminho recomendado: carregue `usePackagingSlaOverrides()` junto de `usePackagingSettings()` **neste componente primeiro** (é o que o operador vê) e passe o resultado de `resolveEffectiveSlaSettings({ technique_id, client }, …)` ao cálculo.
Arquivos e objetos a tocar: os citados acima.
Não tocar / armadilhas: não mude a configuração global; a exceção apenas sobrepõe. Não aproveite a PR para outra correção.
Depende de: as etapas citadas no caminho · Libera: —
Risco e como reverter: baixo, salvo indicação acima. Reverter = desfazer a mudança listada.
Precisa de aprovação humana antes do merge: não
Como verificar: exercite o comportamento alterado e registre a evidência em `05-PROGRESSO.md` (saída de comando, consulta, requisição ou captura de tela). Compare com o estado anterior.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 279 — Aplicar o prazo por exceção nos painéis de embalagem
Onda 3 / Severidade Média / Camada: front (regra)
Achados resolvidos: FUN-02
Problema hoje: os painéis e listas de embalagem (os demais pontos que chamam `computeSla`) também ignoram as exceções, então o painel do coordenador mostra prazo diferente do que o operador vê depois da etapa 278.
Causa raiz: ver FUN-02 em `docs/qa/03-ACHADOS.md`.
Caminho recomendado: aplique o mesmo tratamento da etapa 278 nos pontos restantes (liste com `grep -rn "computeSla" src/`), para que todas as telas mostrem o mesmo prazo.
Arquivos e objetos a tocar: os citados acima.
Não tocar / armadilhas: faça depois de 278 e compare as duas telas no fim. Não aproveite a PR para outra correção.
Depende de: as etapas citadas no caminho · Libera: —
Risco e como reverter: baixo, salvo indicação acima. Reverter = desfazer a mudança listada.
Precisa de aprovação humana antes do merge: não
Como verificar: exercite o comportamento alterado e registre a evidência em `05-PROGRESSO.md` (saída de comando, consulta, requisição ou captura de tela). Compare com o estado anterior.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 280 — Permitir criar item de estoque
Onda 4 / Severidade Alta / Camada: front (fluxo incompleto)
Achados resolvidos: FUN-04
Problema hoje: `src/pages/InventoryPage.tsx:129-130` traz o comentário 'Botão Novo Item removido: não havia ação/modal de criação implementado' e `src/features/inventory/hooks/useInventory.ts:56` só lê.
Causa raiz: ver FUN-04 em `docs/qa/03-ACHADOS.md`.
Caminho recomendado: implemente apenas a **criação** nesta etapa: formulário com validação (padrão de `src/features/packaging/types/packaging.schema.ts` + componente correspondente) e mutação com invalidação da lista. Deixe editar e desativar para a etapa 281.
Arquivos e objetos a tocar: os citados acima.
Não tocar / armadilhas: o saldo vem das movimentações e é mantido por gatilho — o formulário não grava saldo. Não aproveite a PR para outra correção.
Depende de: as etapas citadas no caminho · Libera: —
Risco e como reverter: baixo, salvo indicação acima. Reverter = desfazer a mudança listada.
Precisa de aprovação humana antes do merge: não
Como verificar: exercite o comportamento alterado e registre a evidência em `05-PROGRESSO.md` (saída de comando, consulta, requisição ou captura de tela). Compare com o estado anterior.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 281 — Permitir editar e desativar item de estoque
Onda 4 / Severidade Alta / Camada: front (fluxo incompleto)
Achados resolvidos: FUN-04
Problema hoje: depois da etapa 280 o catálogo permite criar, mas não corrigir nem retirar item de circulação — um erro de cadastro fica para sempre.
Causa raiz: ver FUN-04 em `docs/qa/03-ACHADOS.md`.
Caminho recomendado: acrescente edição e desativação reaproveitando o formulário da etapa 280 em modo de edição; prefira desativar a excluir, porque há movimentações ligadas ao item.
Arquivos e objetos a tocar: os citados acima.
Não tocar / armadilhas: confirme com o dono se 'excluir' deve existir; exclusão com movimentação ligada é perda de histórico. Não aproveite a PR para outra correção.
Depende de: as etapas citadas no caminho · Libera: —
Risco e como reverter: baixo, salvo indicação acima. Reverter = desfazer a mudança listada.
Precisa de aprovação humana antes do merge: não
Como verificar: exercite o comportamento alterado e registre a evidência em `05-PROGRESSO.md` (saída de comando, consulta, requisição ou captura de tela). Compare com o estado anterior.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 282 — Permitir editar um agendamento de manutenção
Onda 4 / Severidade Alta / Camada: front (fluxo incompleto)
Achados resolvidos: FUN-06
Problema hoje: `src/features/maintenance/hooks/useTPMLifecycleMutations.ts:270-274` expõe apenas criar, iniciar e concluir — não há como corrigir a data ou a periodicidade de um agendamento.
Causa raiz: ver FUN-06 em `docs/qa/03-ACHADOS.md`.
Caminho recomendado: acrescente a mutação de atualização e ligue a ação na linha da lista (`src/features/maintenance/components/TPMScheduleList.tsx:89-96`), reaproveitando o modal de criação em modo de edição.
Arquivos e objetos a tocar: os citados acima.
Não tocar / armadilhas: alterar a data afeta alertas já gerados — confira com o dono se os alertas pendentes do agendamento devem ser encerrados no mesmo passo (o sistema já faz isso em outra situação). Não aproveite a PR para outra correção.
Depende de: as etapas citadas no caminho · Libera: —
Risco e como reverter: baixo, salvo indicação acima. Reverter = desfazer a mudança listada.
Precisa de aprovação humana antes do merge: não
Como verificar: exercite o comportamento alterado e registre a evidência em `05-PROGRESSO.md` (saída de comando, consulta, requisição ou captura de tela). Compare com o estado anterior.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 283 — Permitir desativar um agendamento de manutenção
Onda 4 / Severidade Média / Camada: front (fluxo incompleto)
Achados resolvidos: FUN-06
Problema hoje: sem desativação, um agendamento criado por engano segue gerando alerta de manutenção vencida para sempre.
Causa raiz: ver FUN-06 em `docs/qa/03-ACHADOS.md`.
Caminho recomendado: acrescente a mutação que altera o campo de ativo e a ação na lista; não apague o registro (as execuções apontam para ele).
Arquivos e objetos a tocar: os citados acima.
Não tocar / armadilhas: faça depois de 282, reaproveitando o mesmo hook. Não aproveite a PR para outra correção.
Depende de: as etapas citadas no caminho · Libera: —
Risco e como reverter: baixo, salvo indicação acima. Reverter = desfazer a mudança listada.
Precisa de aprovação humana antes do merge: não
Como verificar: exercite o comportamento alterado e registre a evidência em `05-PROGRESSO.md` (saída de comando, consulta, requisição ou captura de tela). Compare com o estado anterior.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 284 — Ligar a preferência de avisos visuais
Onda 4 / Severidade Média / Camada: front
Achados resolvidos: UI-22
Problema hoje: `src/components/settings/SettingsNotificationsTab.tsx:53` grava a preferência 'Notificações Visuais' e **nenhum** ponto do sistema a lê (`src/pages/SettingsPage.tsx:67-70` só guarda e avisa 'Configuração salva automaticamente').
Causa raiz: ver UI-22 em `docs/qa/03-ACHADOS.md`.
Caminho recomendado: leia a preferência no invólucro de avisos do aplicativo, no mesmo padrão de desligamento que `src/lib/soundFeedback.ts:58-63` já usa para o som (mesma chave por usuário).
Arquivos e objetos a tocar: os citados acima.
Não tocar / armadilhas: a chave é por usuário (`app-settings-<uid>`): não leia sem o identificador. Não aproveite a PR para outra correção.
Depende de: as etapas citadas no caminho · Libera: —
Risco e como reverter: baixo, salvo indicação acima. Reverter = desfazer a mudança listada.
Precisa de aprovação humana antes do merge: não
Como verificar: exercite o comportamento alterado e registre a evidência em `05-PROGRESSO.md` (saída de comando, consulta, requisição ou captura de tela). Compare com o estado anterior.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 285 — Ligar a preferência de atualização automática
Onda 4 / Severidade Média / Camada: front
Achados resolvidos: UI-22
Problema hoje: a preferência 'Atualização Automática' (`src/components/settings/SettingsGeneralTab.tsx:53`) é gravada e nunca lida.
Causa raiz: ver UI-22 em `docs/qa/03-ACHADOS.md`.
Caminho recomendado: aplique em `createQueryClient()` (`src/lib/queryConfig.ts`), controlando a recarga ao voltar o foco e o intervalo de atualização; respeite o valor por usuário.
Arquivos e objetos a tocar: os citados acima.
Não tocar / armadilhas: não desligue a atualização das telas de operação sem avisar o dono — combine o que a preferência cobre. Não aproveite a PR para outra correção.
Depende de: as etapas citadas no caminho · Libera: —
Risco e como reverter: baixo, salvo indicação acima. Reverter = desfazer a mudança listada.
Precisa de aprovação humana antes do merge: não
Como verificar: exercite o comportamento alterado e registre a evidência em `05-PROGRESSO.md` (saída de comando, consulta, requisição ou captura de tela). Compare com o estado anterior.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 286 — Mostrar as notificações reais na contagem e no 'marcar todas como lidas'
Onda 4 / Severidade Alta / Camada: front
Achados resolvidos: FUN-01
Problema hoje: depois da etapa 191 a lista passa a incluir as notificações reais, mas a contagem por aba e a ação de marcar todas como lidas continuam tratando só os prefixos das três fontes antigas (`src/pages/NotificationsPage.tsx:82-103`).
Causa raiz: ver FUN-01 em `docs/qa/03-ACHADOS.md`.
Caminho recomendado: inclua a fonte nova nas contagens e na ação de marcar como lidas, conferindo que o número do menu lateral (`src/components/layout/AppSidebar.tsx:49`) passa a bater com a lista.
Arquivos e objetos a tocar: os citados acima.
Não tocar / armadilhas: o resumo diário tem regra de leitura própria (ver `PENDENCIAS.md`) — não mude o comportamento dele aqui. Não aproveite a PR para outra correção.
Depende de: as etapas citadas no caminho · Libera: —
Risco e como reverter: baixo, salvo indicação acima. Reverter = desfazer a mudança listada.
Precisa de aprovação humana antes do merge: não
Como verificar: exercite o comportamento alterado e registre a evidência em `05-PROGRESSO.md` (saída de comando, consulta, requisição ou captura de tela). Compare com o estado anterior.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 287 — Revogar a execução anônima das funções de rotina e verificação
Onda 1 / Severidade Baixa / Camada: banco (permissões)
Achados resolvidos: BD-11
Problema hoje: além das funções de papel (etapa 236), o catálogo lista como executáveis por visitante anônimo `public.snapshot_cron_health()`, `public.rollup_cron_p95_daily(_days integer)`, `public.verify_audit_chain()` e `public.verify_audit_chain(_limit integer)` (`origin/contexto:docs/contexto/supabase/lints.md`) — a primeira é a consulta mais caras do banco (BD-15), então um visitante pode encarecer o banco sozinho.
Causa raiz: ver BD-11 em `docs/qa/03-ACHADOS.md`.
Caminho recomendado: `REVOKE EXECUTE … FROM anon` nessas quatro, por migration. Nenhuma é chamada pelo aplicativo antes do login — confirme com `grep -rn "rpc('snapshot_cron_health'\|rpc('verify_audit_chain'" src/`.
Arquivos e objetos a tocar: os citados acima.
Não tocar / armadilhas: revogue só de `anon`; `authenticated` e a chave de serviço continuam precisando. Não aproveite a PR para outra correção.
Depende de: as etapas citadas no caminho · Libera: —
Risco e como reverter: baixo, salvo indicação acima. Reverter = desfazer a mudança listada.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: exercite o comportamento alterado e registre a evidência em `05-PROGRESSO.md` (saída de comando, consulta, requisição ou captura de tela). Compare com o estado anterior.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 288 — Revogar a execução anônima das funções de escrita de embalagem e alerta
Onda 1 / Severidade Baixa / Camada: banco (permissões)
Achados resolvidos: BD-11
Problema hoje: o catálogo também lista `public.assign_packaging_task(p_task_id uuid)`, `public.record_packaging_defect(...)`, `public.check_and_notify_kpi_alert(...)` e `public.increment_sheet_view_count(sheet_id uuid)` como executáveis por anônimo. Auditadas nesta sessão, as duas primeiras **se protegem** internamente (recusam `auth.uid()` nulo e exigem papel ativo) — ainda assim, o privilégio não deveria estar concedido.
Causa raiz: ver BD-11 em `docs/qa/03-ACHADOS.md`.
Caminho recomendado: `REVOKE EXECUTE … FROM anon` nas quatro, por migration, mantendo as verificações internas (defesa em profundidade).
Arquivos e objetos a tocar: os citados acima.
Não tocar / armadilhas: `increment_sheet_view_count` pode ser usada por alguma tela pública — confirme antes com `grep -rn "increment_sheet_view_count" src/`. Não aproveite a PR para outra correção.
Depende de: as etapas citadas no caminho · Libera: —
Risco e como reverter: baixo, salvo indicação acima. Reverter = desfazer a mudança listada.
Precisa de aprovação humana antes do merge: sim (DDL em produção)
Como verificar: exercite o comportamento alterado e registre a evidência em `05-PROGRESSO.md` (saída de comando, consulta, requisição ou captura de tela). Compare com o estado anterior.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 289 — Alinhar o arquivo de tipos às nove tabelas com divergência
Onda 8 / Severidade Baixa / Camada: front (tipos gerados)
Achados resolvidos: CI-04
Problema hoje: além das oito tabelas inexistentes, `origin/contexto:docs/contexto/codigo/baseline.json` → `tabelas_com_drift_migration_vs_types` lista nove com divergência entre o que a migration criou e o que o arquivo de tipos declara: `business_config`, `jobs`, `operator_rankings`, `operator_skills`, `operator_status_audit`, `packaging_tasks`, `pre_production_checklists`, `technical_sheets`, `tpm_execution_supplies`.
Causa raiz: ver CI-04 em `docs/qa/03-ACHADOS.md`.
Caminho recomendado: a regeneração da etapa 046/117 resolve as nove de uma vez; esta etapa é a **conferência**: compare o diff tabela por tabela com `origin/contexto:docs/contexto/supabase/tables/public/<tabela>.md` e registre em `05-PROGRESSO.md` qualquer coluna que o aplicativo use e que não exista no banco (é defeito latente, como foi o caso de `cancel_reason` em FUN/RN-05).
Arquivos e objetos a tocar: os citados acima.
Não tocar / armadilhas: não edite o arquivo gerado à mão. Não aproveite a PR para outra correção.
Depende de: as etapas citadas no caminho · Libera: —
Risco e como reverter: baixo, salvo indicação acima. Reverter = desfazer a mudança listada.
Precisa de aprovação humana antes do merge: não
Como verificar: exercite o comportamento alterado e registre a evidência em `05-PROGRESSO.md` (saída de comando, consulta, requisição ou captura de tela). Compare com o estado anterior.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

---

## Desdobramentos finais (continuação)

### Etapa 290 — Decidir o destino dos hooks órfãos do módulo de administração
Onda 8 / Severidade Média / Camada: front
Achados resolvidos: FUN-09
Problema hoje: `src/features/admin/hooks/useDataImport.ts:43,106`, `useSavedFilters.ts:20` e `useDashboardSettings.ts:4` estão exportados e **sem nenhum consumidor** (varredura cruzada de exportações e usos, ignorando barris e testes).
Causa raiz: ver FUN-09 em `docs/qa/03-ACHADOS.md`.
Caminho recomendado: `useDataImport` merece integração: a tela de auditoria (`src/pages/AuditTrailPage.tsx`) já tem exportação e é o lugar natural de uma aba de importação — leve ao dono. Os outros dois, remova, anotando no progresso o que faziam.
Arquivos e objetos a tocar: os citados acima.
Não tocar / armadilhas: importação de dados escreve em produção: se for integrada, exige confirmação explícita na tela e registro na trilha de auditoria. Uma etapa, uma PR.
Depende de: as etapas citadas no caminho · Libera: —
Risco e como reverter: baixo. Reverter = desfazer a mudança listada.
Precisa de aprovação humana antes do merge: não
Como verificar: exercite o resultado e registre a evidência em `05-PROGRESSO.md`; para etapas de verificação automática, mostre o script falhando no cenário defeituoso e passando no corrigido.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 291 — Decidir o destino dos hooks órfãos de rastreabilidade e análise
Onda 8 / Severidade Média / Camada: front
Achados resolvidos: FUN-09
Problema hoje: `useProductionLot` e `useSearchLots` (`src/features/.../useTraceability.ts`) e os hooks de análise sem consumidor, entre eles a gravação em `spc_capability_history` (hoje a tabela só é lida).
Causa raiz: ver FUN-09 em `docs/qa/03-ACHADOS.md`.
Caminho recomendado: a gravação de capacidade do processo (`spc_capability_history`) merece integração — é o que faz a tela de controle estatístico ter histórico; os hooks de lote provavelmente foram substituídos pela tela atual de rastreabilidade: confirme e remova.
Arquivos e objetos a tocar: os citados acima.
Não tocar / armadilhas: não remova `useProductionLot` antes de conferir a etapa 216 (`CreateLotModal`): os dois podem ser as duas metades do mesmo fluxo perdido. Uma etapa, uma PR.
Depende de: as etapas citadas no caminho · Libera: —
Risco e como reverter: baixo. Reverter = desfazer a mudança listada.
Precisa de aprovação humana antes do merge: não
Como verificar: exercite o resultado e registre a evidência em `05-PROGRESSO.md`; para etapas de verificação automática, mostre o script falhando no cenário defeituoso e passando no corrigido.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 292 — Decidir o destino dos hooks órfãos de notificação
Onda 8 / Severidade Média / Camada: front
Achados resolvidos: FUN-08, FUN-09
Problema hoje: além dos dois mecanismos de preferência (FUN-08), há hooks de notificação exportados e sem consumidor no módulo.
Causa raiz: ver FUN-08, FUN-09 em `docs/qa/03-ACHADOS.md`.
Caminho recomendado: resolva junto da etapa 198 (que escolhe um mecanismo): o que sobrar sem uso depois dela, remova na mesma PR.
Arquivos e objetos a tocar: os citados acima.
Não tocar / armadilhas: não deixe dois mecanismos gravando na mesma chave de armazenamento — é o defeito que a etapa 198 corrige. Uma etapa, uma PR.
Depende de: as etapas citadas no caminho · Libera: —
Risco e como reverter: baixo. Reverter = desfazer a mudança listada.
Precisa de aprovação humana antes do merge: não
Como verificar: exercite o resultado e registre a evidência em `05-PROGRESSO.md`; para etapas de verificação automática, mostre o script falhando no cenário defeituoso e passando no corrigido.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 293 — Decidir o destino dos componentes de feature órfãos
Onda 8 / Severidade Média / Camada: front
Achados resolvidos: FUN-09
Problema hoje: quatro componentes de módulo estão exportados e nunca montados, entre eles `src/features/admin/components/audit/AuditTrailDrawer.tsx`, `src/features/analytics/components/bi/AIInsights.tsx` e `src/features/analytics/components/bi/delays/DelaysAnalysis.tsx`.
Causa raiz: ver FUN-09 em `docs/qa/03-ACHADOS.md`.
Caminho recomendado: `AIInsights` provavelmente é a versão anterior do cartão de insights que a etapa 070 corrige — nesse caso remova para não restar dois; `DelaysAnalysis` parece análise de atrasos pronta e desligada: leve ao dono. `AuditTrailDrawer` pode ser o detalhe que falta na trilha de auditoria.
Arquivos e objetos a tocar: os citados acima.
Não tocar / armadilhas: confirme com duas buscas (nome do componente e caminho do arquivo) antes de remover. Uma etapa, uma PR.
Depende de: as etapas citadas no caminho · Libera: —
Risco e como reverter: baixo. Reverter = desfazer a mudança listada.
Precisa de aprovação humana antes do merge: não
Como verificar: exercite o resultado e registre a evidência em `05-PROGRESSO.md`; para etapas de verificação automática, mostre o script falhando no cenário defeituoso e passando no corrigido.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 294 — Estado de erro nas telas de embalagem e logística
Onda 5 / Severidade Baixa / Camada: front
Achados resolvidos: UI-19
Problema hoje: `src/pages/PackagingDashboard.tsx`, `src/pages/PackagingKioskPage.tsx` e `src/pages/LogisticsPage.tsx` não representam o estado de erro das consultas.
Causa raiz: ver UI-19 em `docs/qa/03-ACHADOS.md`.
Caminho recomendado: mesmo caminho das etapas 259-270. O quiosque de embalagem é prioritário: ele roda sem ninguém olhando, e tela vazia ali significa fila parada.
Arquivos e objetos a tocar: os citados acima.
Não tocar / armadilhas: no quiosque, o bloco de erro precisa ser legível de longe (é tela de parede). Uma etapa, uma PR.
Depende de: as etapas citadas no caminho · Libera: —
Risco e como reverter: baixo. Reverter = desfazer a mudança listada.
Precisa de aprovação humana antes do merge: não
Como verificar: exercite o resultado e registre a evidência em `05-PROGRESSO.md`; para etapas de verificação automática, mostre o script falhando no cenário defeituoso e passando no corrigido.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 295 — Estado de erro nas telas de manutenção e qualidade
Onda 5 / Severidade Baixa / Camada: front
Achados resolvidos: UI-19
Problema hoje: `src/pages/TPMDashboard.tsx`, `src/pages/SPCDashboard.tsx` e `src/pages/TechnicalKnowledgeBase.tsx` não representam o estado de erro.
Causa raiz: ver UI-19 em `docs/qa/03-ACHADOS.md`.
Caminho recomendado: mesmo caminho das etapas 259-270.
Arquivos e objetos a tocar: os citados acima.
Não tocar / armadilhas: não confunda com estado vazio: base de conhecimento vazia é legítima. Uma etapa, uma PR.
Depende de: as etapas citadas no caminho · Libera: —
Risco e como reverter: baixo. Reverter = desfazer a mudança listada.
Precisa de aprovação humana antes do merge: não
Como verificar: exercite o resultado e registre a evidência em `05-PROGRESSO.md`; para etapas de verificação automática, mostre o script falhando no cenário defeituoso e passando no corrigido.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 296 — Fechar a decisão sobre a API do ERP com o dono
Onda 2 / Severidade Alta / Camada: integração
Achados resolvidos: EDG-04
Problema hoje: a função `erp-api` está publicada, documentada em `docs/operacoes/openapi-edge-functions.yaml:33` e com autenticação por chave apontando para uma tabela que **não existe** (`erp_api_keys`) — ou seja, há uma API anunciada que recusa toda chamada.
Causa raiz: ver EDG-04 em `docs/qa/03-ACHADOS.md`.
Caminho recomendado: esta etapa é só a decisão, registrada por escrito: existe (ou vai existir) um ERP consumindo esta API? Pergunte ao dono, registre a resposta em `05-PROGRESSO.md` e marque a etapa 062 como 'criar a tabela' ou 'remover o caminho de chave'. Separar a decisão da execução evita que o executor crie tabela por conta própria.
Arquivos e objetos a tocar: os citados acima.
Não tocar / armadilhas: não crie a tabela antes da resposta; não anuncie a API em nenhum lugar novo enquanto isso. Uma etapa, uma PR.
Depende de: as etapas citadas no caminho · Libera: —
Risco e como reverter: baixo. Reverter = desfazer a mudança listada.
Precisa de aprovação humana antes do merge: não
Como verificar: exercite o resultado e registre a evidência em `05-PROGRESSO.md`; para etapas de verificação automática, mostre o script falhando no cenário defeituoso e passando no corrigido.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 297 — Travar com teste o fluxo de recuperação de senha
Onda 8 / Severidade Alta / Camada: testes
Achados resolvidos: AUT-01
Problema hoje: as etapas 005 a 009 corrigem quatro defeitos somados no fluxo de recuperação de senha, e nada impede que uma mudança de configuração (endereço, allowlist, remetente) quebre tudo de novo sem aviso.
Causa raiz: ver AUT-01 em `docs/qa/03-ACHADOS.md`.
Caminho recomendado: acrescente à suíte de ponta a ponta um caso que peça recuperação de senha e verifique que o link recebido aponta para o endereço oficial do sistema (a verificação do e-mail em si pode usar a caixa de teste do provedor). Se isso não for viável na suíte, escreva uma verificação de configuração: um script de CI que leia a configuração do projeto e falhe se `site_url` não estiver na lista de endereços permitidos.
Arquivos e objetos a tocar: os citados acima.
Não tocar / armadilhas: não deixe o teste dependente de uma caixa de e-mail pessoal. Uma etapa, uma PR.
Depende de: as etapas citadas no caminho · Libera: —
Risco e como reverter: baixo. Reverter = desfazer a mudança listada.
Precisa de aprovação humana antes do merge: sim (CI/workflows)
Como verificar: exercite o resultado e registre a evidência em `05-PROGRESSO.md`; para etapas de verificação automática, mostre o script falhando no cenário defeituoso e passando no corrigido.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 298 — Travar com verificação automática a publicação das tabelas em tempo real
Onda 8 / Severidade Alta / Camada: testes/CI
Achados resolvidos: EST-01
Problema hoje: a etapa 041 republica as tabelas que o aplicativo assina; nada impede que uma recriação da publicação zere tudo de novo — foi exatamente o que aconteceu (26 de 27 assinaturas mortas).
Causa raiz: ver EST-01 em `docs/qa/03-ACHADOS.md`.
Caminho recomendado: escreva um script de verificação que compare a lista de tabelas assinadas no código (`grep -rhoE "table: '[a-z_]+'" src`) com a publicação real (consulta a `pg_publication_tables`) e falhe quando houver assinatura sem publicação; rode-o no trabalho `RLS Regression`, que já tem acesso ao banco.
Arquivos e objetos a tocar: os citados acima.
Não tocar / armadilhas: a comparação precisa ignorar as tabelas que a etapa 042 decidir não republicar — mantenha essa lista de exceções no próprio script, com comentário. Uma etapa, uma PR.
Depende de: as etapas citadas no caminho · Libera: —
Risco e como reverter: baixo. Reverter = desfazer a mudança listada.
Precisa de aprovação humana antes do merge: sim (CI/workflows)
Como verificar: exercite o resultado e registre a evidência em `05-PROGRESSO.md`; para etapas de verificação automática, mostre o script falhando no cenário defeituoso e passando no corrigido.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 299 — Travar com verificação automática a correspondência entre rotas e menu
Onda 8 / Severidade Média / Camada: CI
Achados resolvidos: NAV-03, NAV-01
Problema hoje: quatro rotas existiam sem nenhuma entrada na interface e dois links apontavam para rotas inexistentes — defeitos que um comparador simples detecta.
Causa raiz: ver NAV-03, NAV-01 em `docs/qa/03-ACHADOS.md`.
Caminho recomendado: escreva um script que extraia os caminhos de `src/routes/AppRoutes.tsx` e os destinos de navegação do código, e falhe quando houver rota sem entrada ou destino sem rota; rode no trabalho `lint`. O repositório já gera esse tipo de inventário (`scripts/inventario/gerar-rotas.mjs`) — reaproveite a extração em vez de escrever outra.
Arquivos e objetos a tocar: os citados acima.
Não tocar / armadilhas: rotas públicas e de erro (`/*`, `/auth`, `/track`, `/install`, `/reset-password`) precisam de exceção explícita. Uma etapa, uma PR.
Depende de: as etapas citadas no caminho · Libera: —
Risco e como reverter: baixo. Reverter = desfazer a mudança listada.
Precisa de aprovação humana antes do merge: sim (CI/workflows)
Como verificar: exercite o resultado e registre a evidência em `05-PROGRESSO.md`; para etapas de verificação automática, mostre o script falhando no cenário defeituoso e passando no corrigido.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso

### Etapa 300 — Regerar o contexto e conferir que os alertas refletem as correções
Onda 8 / Severidade Média / Camada: ferramentas de apoio
Achados resolvidos: CI-03, CI-04, CI-05, CI-06
Problema hoje: o contexto que os agentes leem (`origin/contexto:docs/contexto/`) é gerado automaticamente e, no commit auditado, acusava 14 funções de servidor órfãs, 30 componentes órfãos, 9 ciclos de importação, 8 tabelas inexistentes no arquivo de tipos e métricas de dívida medidas fora do escopo (CI-03).
Causa raiz: ver CI-03, CI-04, CI-05, CI-06 em `docs/qa/03-ACHADOS.md`.
Caminho recomendado: ao fim da execução deste plano, rode `node scripts/ai-context/gerar.mjs` (e aguarde a coleta do banco pelo workflow `contexto`) e compare, item por item, os alertas de `baseline.json` com o estado esperado depois das etapas 115, 117, 119-120, 215-217, 238-247 e 289. Registre em `05-PROGRESSO.md` a tabela 'antes / depois / pendente' — é esse registro que diz ao dono o que sobrou.
Arquivos e objetos a tocar: os citados acima.
Não tocar / armadilhas: não ajuste o gerador para esconder alerta que ainda é verdadeiro; a correção da métrica é a etapa 121, e ela é diferente de maquiar o número. Uma etapa, uma PR.
Depende de: as etapas citadas no caminho · Libera: —
Risco e como reverter: baixo. Reverter = desfazer a mudança listada.
Precisa de aprovação humana antes do merge: não
Como verificar: exercite o resultado e registre a evidência em `05-PROGRESSO.md`; para etapas de verificação automática, mostre o script falhando no cenário defeituoso e passando no corrigido.
Checklist de conclusão:
[ ] mudança aplicada só nos arquivos listados
[ ] typecheck, lint e testes dos arquivos tocados passam
[ ] verificação acima executada, com a evidência registrada
[ ] deploy confirmado, quando se aplica
[ ] etapa marcada no arquivo de progresso
