# Plano de correções e melhorias em 50 etapas — FAST GRAVAÇÕES ES v2

> **Data:** 2026-09-24 · **Baseline:** `main` @ commit mais recente na data acima.
> **Origem:** auditoria de 6 frentes paralelas rodada nesta data, validando `docs/plano-50-etapas-consolidacao.md`
> (2026-09-13) e `docs/plano-mestre-10-10.md` contra o estado **real** — banco Supabase vivo (`pg_policies`,
> `pg_proc`, `pg_indexes`), GitHub Actions/Environments/Secrets, e leitura direta do código — em vez do texto
> desses documentos, que se mostrou desatualizado em pontos concretos (ver seção 0.2).
> **Relação com os planos anteriores:** este documento **não os substitui**; ele fecha o que a auditoria de
> 2026-09-24 mostrou que continua parcial ou não iniciado, com números medidos agora, e corrige 3 alegações
> daqueles planos que não resistiram à verificação direta.

---

## 0. Situação medida (baseline factual, 2026-09-24)

### 0.1 Resultado da auditoria — 50 etapas anteriores

| Veredito | Qtde | Etapas |
|---|---|---|
| ✅ Concluída | 17 | 1,2,3,4,11,12,13,14,19,20,22,25,28,31,40,43,47 |
| 🟨 Parcial | 18 | 5,6,9,10,16,17,18,23,26,27,29,34,36,38,39,41,42,44 |
| ❌ Não iniciada | 13 | 7,8,21,24,30,32,33,35,37,45,46,49,50 |
| ⚠️ Não verificável neste ambiente | 2 | 15,48 |

**Conclusão:** o trabalho de segurança de dados (RLS) avançou muito mais do que o texto registrava — o
trabalho de sustentação (runbooks, governança, cobertura de teste das regras de negócio, observabilidade)
não avançou quase nada.

### 0.2 Três alegações dos planos anteriores que não resistiram à verificação direta

| Alegação no plano anterior | Verificação em 2026-09-24 | Consequência |
|---|---|---|
| "exec_sql revogado" (Bloco A, Etapa 3) | A função **ainda existe** no banco canônico (`pg_proc`), `SECURITY DEFINER = true`. Não foi possível confirmar os `GRANT`s efetivos nesta sessão (somente leitura). | Vira a **Etapa 1** deste plano — maior severidade possível, trata-se primeiro. |
| "170 policies `USING(true)` a corrigir" (herdado do plano de 13/09) | Contagem real via `pg_policies`: **4** policies efetivamente permissivas, nenhuma P0, nenhuma exposta a `anon`. | As Etapas 19-20 do plano anterior já estão, na prática, resolvidas. O esforço real deste bloco está em documentar e travar, não em corrigir 170 coisas. |
| "bitrix24-sync com HMAC padronizado, `timingSafeEqual`" (Bloco 3, Etapa 29) | O código usa `provided !== BITRIX24_WEBHOOK_SECRET` — comparação de string simples, não timing-safe, não é HMAC do payload. Quem faz HMAC real é uma function diferente (`webhook-handler`). | Vira a **Etapa 10** deste plano. |

A lição repete a do plano de 13/09: **o texto de um plano de segurança não é evidência — só o estado vivo é.**
Toda etapa abaixo tem checkpoint verificável por comando ou consulta ao banco/CI, não por releitura de documento.

### 0.3 Ordenação por risco

```
P0 Segurança crítica viva     → etapas 1–5    (vulnerabilidade real aberta agora)
P0 Certificar hardening       → etapas 6–11   (declarado mas não fechado)
P1 RLS: medir → travar        → etapas 12–18  (risco residual é regressão, não policy aberta)
P1 Reprodutibilidade do banco → etapas 19–21  (pré-requisito para testar RLS de verdade)
P1 Edge Functions residual    → etapas 22–23
P2 Consertar a régua de teste → etapas 24–26  (medir certo antes de perseguir número)
P1 Cobrir regras de negócio   → etapas 27–31  (estoque e agendamento têm cobertura ZERO)
P2 Certificar qualidade E2E   → etapas 32–35
P2 Performance: ligar o que já existe → etapas 36–40
P2 Reduzir ambiguidade estrutural → etapas 41–43
P2 Observabilidade e continuidade → etapas 44–48
P0 Certificação final          → etapas 49–50
```

---

# BLOCO 0 — Segurança crítica viva (etapas 1–5)

> **Objetivo:** fechar vulnerabilidades que estão abertas **agora**, em produção, hoje. Nenhuma outra etapa
> deste plano tem prioridade sobre este bloco.

### Etapa 1 — ✅ RECLASSIFICADA (2026-09-24, mesma sessão) — `exec_sql` não tem grant público

> **Correção de achado, feita antes de qualquer ação destrutiva.** A consulta inicial via `pg_proc` só
> confirmava que a função existe — não checava o ACL. `SELECT proacl FROM pg_proc WHERE proname='exec_sql'`
> retorna `{postgres=X/postgres,service_role=X/postgres}`: **nenhum grant a `anon` nem `authenticated`**.
> `has_function_privilege('anon'|'authenticated', 'public.exec_sql(text)', 'EXECUTE')` = `false` para os dois.
> **Não é alcançável via PostgREST/RPC.** Não é a vulnerabilidade crítica ativa que a primeira leitura sugeria.
> Evidência completa em `docs/estado/exec-sql-acl.md`. Se eu tivesse seguido a Ação 3 original (`DROP FUNCTION`
> caso "não fosse mais necessária") sem essa checagem, teria quebrado o gateway MCP do Supabase usado nesta
> organização, que depende de `exec_sql` via `service_role` para executar SQL arbitrário — infraestrutura em
> uso, não resíduo do incidente.

**Por quê (revisado):** a função é infraestrutura intencional, restrita a `postgres`/`service_role` por
desenho do Supabase. O risco real não é exposição pública hoje — é regressão futura (um `GRANT` por engano,
ou vazamento da `service_role key`, que é exatamente o cenário da Etapa 2).

**Ações (revisadas):**
1. ~~Revogar grants de `anon`/`authenticated`~~ — nada a revogar, nunca tiveram acesso.
2. ~~Avaliar `DROP FUNCTION`~~ — **não dropar**: é dependência do gateway MCP em uso ativo.
3. Repetir a checagem em staging (pendente — ref de staging precisa ser confirmado em `supabase/ENVIRONMENTS.md`).
4. Adicionar teste de regressão que falha se `anon`/`authenticated` ganharem `EXECUTE` no futuro — **bloqueado**: exige credencial de conexão direta ao Postgres em CI, que não existe hoje (depende da Etapa 6 — GitHub Environments — como pré-requisito não mapeado no desenho original desta etapa).

**Checkpoint:** ✅ evidência publicada em `docs/estado/exec-sql-acl.md`. Regressão automatizada em CI fica
como item aberto, dependente da Etapa 6.
**Risco:** 🟢 baixo (era 🔴 na primeira leitura, corrigido após verificação). **Esforço real:** 1 h (a checagem), não 2 h.

---

### Etapa 2 — Rotacionar `SERVICE_ROLE_KEY` e senha do banco (incidente migrate-helper)

**Por quê:** `docs/post-mortems/2026-09-10-migrate-helper.md` lista rotação de `SERVICE_ROLE_KEY` e senha do banco
como pendência manual, nenhuma marcada como feita. Enquanto isso não roda, **o incidente segue tecnicamente aberto**
independentemente do código já removido.

**Ações:**
1. Gerar nova `service_role key` no painel Supabase; nova senha do banco.
2. Atualizar todos os consumidores: secrets do GitHub (Actions), variáveis da Vercel, secrets das Edge Functions.
3. Revogar as credenciais antigas.
4. Auditar logs do painel Supabase no intervalo entre a introdução e a remoção do `migrate-helper`, procurando uso não reconhecido da chave antiga.
5. Atualizar o post-mortem com seção "Rotação concluída em \<data\>" e "Auditoria de logs: \<resultado\>".

**Checkpoint:** post-mortem atualizado; chave/senha antigas comprovadamente inválidas (uma chamada de teste com a antiga deve falhar).
**Risco:** 🔴 credencial possivelmente exposta segue válida até esta etapa fechar. **Esforço:** 2–3 h.

---

### Etapa 3 — Rotacionar tokens de integração que passaram pelo `migrate-helper`

**Por quê:** o post-mortem também cita Bitrix24/Resend/Twilio como possivelmente expostos pelo mesmo incidente — não só as chaves Supabase.

**Ações:**
1. Listar todos os tokens de integração ativos no período do incidente.
2. Rotacionar cada um na respectiva plataforma.
3. Atualizar os consumidores (secrets de Edge Function).
4. Registrar no mesmo post-mortem.

**Checkpoint:** post-mortem lista cada credencial rotacionada com data.
**Depende de:** 2. **Esforço:** 2 h.

---

### Etapa 4 — Confirmar admin com MFA inscrito + runbook de recuperação AAL2

**Por quê:** as 3 policies `RESTRICTIVE` de AAL2 em `user_roles` **já estão ao vivo em produção** (confirmado via
`pg_policies`) — é um breaking change já aplicado sem a rede de segurança que o próprio plano anterior exigia
antes de aplicar. `docs/runbooks/` não existe. Risco real: um admin perde acesso ao MFA (celular perdido, app
desinstalado) e ninguém consegue promover um novo admin porque a própria escrita em `user_roles` exige AAL2.

**Ações:**
1. Confirmar que ao menos 1 conta admin tem TOTP verificado (`auth.mfa_factors` com `status='verified'`).
2. Se nenhuma tiver, inscrever uma agora, antes de qualquer outra etapa deste bloco.
3. Escrever `docs/runbooks/recuperacao-admin-mfa.md`: procedimento via service-role (bypassa RLS) para promover um admin de emergência ou resetar um fator MFA travado.
4. Ensaiar o runbook uma vez em staging.

**Checkpoint:** query confirma ≥1 admin com MFA verificado; runbook escrito e ensaiado com resultado registrado.
**Risco:** 🔴 ALTO — sem isso, um lockout de MFA pode travar toda a administração do sistema. **Esforço:** 3 h.

---

### Etapa 5 — Teste negativo/positivo de AAL2 em nível de policy + ensaio de rollback

**Por quê:** o guard `requireAal2` está testado em nível de Edge Function (Deno), mas ninguém testou a **policy do
banco** diretamente — é ela que decide se a escrita em `user_roles` é aceita, não o código da function.

**Ações:**
1. Escrever teste SQL: sessão AAL1 tentando `INSERT`/`UPDATE`/`DELETE` em `user_roles` → deve falhar.
2. Escrever teste SQL: sessão AAL2 → deve suceder.
3. Documentar e ensaiar o rollback (`DROP POLICY` de volta ao estado anterior) em staging.

**Checkpoint:** os dois testes rodam e passam; rollback ensaiado com resultado registrado.
**Depende de:** 4. **Risco:** 🔴 breaking change sem teste formal. **Esforço:** 3 h.

> **✅ Portão do Bloco 0:** as 3 vulnerabilidades reais abertas (Etapas 1, 2/3, 4/5) fechadas. Só então seguir.

---

# BLOCO 1 — Certificar hardening declarado mas não fechado (etapas 6–11)

### Etapa 6 — Migrar secrets do CI/Deploy para GitHub Environments com required reviewers

**Por quê:** `production` existe como Environment mas com `protection_rules = []` e **0 secrets próprios** — todo
CI/Deploy continua usando secrets de repositório, acessíveis por qualquer workflow do repo, sem gate de aprovação.

**Ações:**
1. Mover `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_ID`, `SUPABASE_DB_PASSWORD` e demais secrets sensíveis de repository-level para o Environment `production`.
2. Configurar *required reviewers* no Environment `production`.
3. Fazer os jobs de `deploy.yml` referenciarem `environment: production`.
4. Confirmar que PRs de fork não recebem esses secrets.

**Checkpoint:** `gh api repos/:owner/:repo/environments/production` mostra reviewers configurados; job de deploy só roda após aprovação.
**Esforço:** 2–3 h.

---

### Etapa 7 — Promover CSP para bloquear `unsafe-eval`

**Por quê:** `vercel.json` já tem `Content-Security-Policy` **enforcing** (progresso real sobre o plano de 13/09),
mas ainda com `script-src 'self' 'unsafe-eval'`. A versão sem `unsafe-eval` só existe em paralelo como
`Content-Security-Policy-Report-Only` — ou seja, a política que de fato bloqueia não tem a força esperada.

**Ações:**
1. Coletar violações do CSP restrito (Report-Only) por ≥48 h de tráfego real.
2. Identificar o que hoje depende de `eval`/`Function()` (bibliotecas como alguns parsers de Excel/PDF costumam precisar) e resolver com `nonce`/versão sem eval, ou isolar em Web Worker com CSP separada.
3. Promover a política restrita para o header enforcing.
4. Monitorar 48 h com rollback pronto.

**Checkpoint:** header `Content-Security-Policy` (não Report-Only) em produção, sem `unsafe-eval`; 0 violação legítima em 48 h.
**Esforço:** 4 h + 48 h de observação (calendário).

---

### Etapa 8 — Resolver as 2 vulnerabilidades moderate remanescentes (react-router)

**Por quê:** `npm audit` mostra 2 moderate (CVE-2025-68470 — open redirect / bypass + injeção via `deserializeErrors`) em `react-router`/`react-router-dom`, reduzido de 5 mas não zerado. O fix exige `--force` (major breaking).

**Ações:**
1. Avaliar o upgrade major de `react-router-dom` para `7.18.4` em branch isolada.
2. Rodar a suíte E2E completa contra o upgrade.
3. Se breaking demais para agora, registrar aceite formal com data de revisão em `docs/estado/supply-chain.md` (arquivo ainda não existe).

**Checkpoint:** `npm audit` sem moderate não-aceita, ou aceite formal datado.
**Esforço:** 4–6 h (mais se o upgrade quebrar rotas).

---

### Etapa 9 — Redisparar 3x o mesmo commit e confirmar determinismo do CI

**Por quê:** o plano anterior exigia esse ensaio empírico para a Etapa 4 (não-determinismo do CI) e ele nunca foi
executado — só a configuração (`concurrency`, gatilho único) foi conferida como presente.

**Ações:**
1. Escolher um commit estável em `main`.
2. Redisparar o workflow `ci.yml` 3 vezes via `workflow_dispatch` ou re-run.
3. Comparar os 3 resultados.

**Checkpoint:** 3 execuções consecutivas do mesmo SHA com conclusão idêntica.
**Esforço:** 1 h + tempo de fila do CI.

---

### Etapa 10 — Trocar `bitrix24-sync` de comparação de string para HMAC timing-safe real

**Por quê:** o código atual (`verifyBitrixWebhookSecret()`) compara `provided !== BITRIX24_WEBHOOK_SECRET` — um
`!==` de string, vulnerável a timing attack, e não é uma assinatura HMAC do payload (é um token estático). O
`_shared/auth.ts` já tem `verifyWebhook`/`timingSafeEqual` prontos e testados — só não são usados aqui.

**Ações:**
1. Confirmar com o time Bitrix24 se o webhook deles suporta assinatura HMAC do payload (nem todo provedor suporta — se não suportar, no mínimo trocar `!==` por `timingSafeEqual` do secret).
2. Implementar usando `_shared/auth.ts` (`verifyWebhook` se HMAC de payload for viável, ou o comparador timing-safe como mínimo).
3. Testar com payload real do Bitrix24.
4. Confirmar idempotência de reentrega (webhooks repetem).

**Checkpoint:** comparação de secret é timing-safe (no mínimo); teste com payload real passa; reentrega duplicada não duplica efeito.
**Risco:** 🟠 timing attack teórico sobre um secret de webhook. **Esforço:** 4 h.

---

### Etapa 11 — Nomear corretamente as exceções no README de Edge Functions

**Por quê:** `supabase/functions/README.md` classifica `bitrix24-sync` como categoria "hmac" — o que a Etapa 10 vai corrigir no código, mas o README também precisa refletir a realidade, incluindo `webhook-handler` que hoje faz HMAC real e não está nomeado nas exceções do plano anterior.

**Ações:** atualizar a tabela de classificação das 33 (ou N atual) funções após a Etapa 10 fechar.

**Checkpoint:** README bate exatamente com o mecanismo de auth implementado em cada function.
**Depende de:** 10. **Esforço:** 1 h.

> **✅ Portão do Bloco 1:** hardening declarado nos planos anteriores agora com evidência real, não só texto.

---

# BLOCO 2 — RLS: fechar o ciclo medir → corrigir → travar (etapas 12–18)

> **Contexto:** a auditoria de 24/09 mediu **4 policies efetivamente permissivas** no banco vivo (não 170) —
> nenhuma P0, nenhuma exposta a `anon`. O trabalho de correção pesada do plano anterior já está feito na prática;
> o que falta é reduzido e específico.

### Etapa 12 — Publicar `docs/estado/rls-inventario.md`

**Ações:** documentar as 4 policies efetivas (`packaging_equipment.SELECT`, `packaging_defects.SELECT`,
`packaging_waste.SELECT`, `packaging_waste.INSERT`), com tabela → policy → comando → papel-alvo → sensibilidade,
data da consulta e ref do banco.

**Checkpoint:** documento publicado, versionado no repo.
**Esforço:** 2 h.

---

### Etapa 13 — Corrigir (ou aceitar formalmente) as 4 policies de `packaging`

**Por quê:** `packaging_waste.INSERT` permite qualquer usuário autenticado inserir registro de refugo sem checagem de papel/dono — é a única das 4 com risco de escrita, não só leitura.

**Ações:**
1. Para `packaging_equipment`/`packaging_defects`/`packaging_waste` (SELECT): decidir se leitura por qualquer autenticado é aceitável (catálogo/operacional sem PII) — se sim, documentar por quê e não mexer.
2. Para `packaging_waste` (INSERT): trocar `true` por `has_role(auth.uid(), 'operator') OR has_role(auth.uid(), 'coordinator')` (ou o papel correto do domínio).
3. Testar que a aplicação continua funcionando.

**Checkpoint:** `packaging_waste.INSERT` sem `with_check=true`; as 3 de SELECT documentadas como aceitas ou corrigidas.
**Depende de:** 12. **Esforço:** 2 h.

---

### Etapa 14 — Documentar o modelo de autorização canônico

**Por quê:** o padrão de fato já existe e é usado em quase todas as 326 policies (`has_role()`, `is_staff()`,
`has_any_active_role()`, `get_user_role()`) — só não está documentado como decisão arquitetural.

**Ações:** escrever em `docs/ARCHITECTURE.md` os helpers como padrão aprovado, com exemplos; registrar que 85
das 326 policies ainda usam `cmd=ALL` em vez de separar SELECT/INSERT/UPDATE/DELETE, e decidir se vale o
retrabalho de separar (nem sempre é necessário).

**Checkpoint:** seção no `docs/ARCHITECTURE.md` aprovada.
**Depende de:** 12. **Esforço:** 3 h.

---

### Etapa 15 — Suíte de teste de regressão de RLS no CI

**Por quê:** já existe infraestrutura pronta e não usada — função `test_rls_policies(table, user_id, role)` e
tabela `rls_test_results` no banco (migrations de maio/2026) — mas nada em `src/`/`tests/`/`ci.yml` a invoca.

**Ações:**
1. Escrever a suíte usando `test_rls_policies()` já existente.
2. Cobrir pelo menos as tabelas P0 (`user_roles`, `profiles`, auditorias) e as 4 de `packaging`.
3. Integrar como job no `ci.yml`, bloqueante.

**Checkpoint:** suíte roda a cada PR; falha bloqueia merge se uma policy regredir.
**Depende de:** 13. **Esforço:** 6 h (infra já existe — é só conectar).

---

### Etapa 16 — Decidir o destino dos ~95 índices nunca usados

**Por quê:** de 200 índices no banco, 95 (não-PK) têm `scans=0` desde o último reset de estatísticas — incluindo
índices em tabelas centrais (`idx_jobs_operator_id`, `idx_jobs_status_machine`, `idx_production_lots_job_id`,
vários de `user_roles`). Índice parado custa espaço e escrita, sem ganho de leitura.

**Ações:**
1. Confirmar que as estatísticas (`pg_stat_user_indexes`) refletem um período representativo de uso (não logo após um reset).
2. Para cada índice ocioso: `DROP` se claramente supérfluo, ou justificar por escrito se protege um caso raro mas crítico (ex.: relatório mensal).
3. Documentar a decisão.

**Checkpoint:** cada um dos 95 índices tem decisão registrada (dropado ou justificado).
**Esforço:** 4 h.

---

### Etapa 17 — Medir p95 das 10 queries mais frequentes antes/depois

**Ações:** usar `pg_stat_statements`; medir antes da Etapa 16, depois de aplicá-la; publicar em `docs/estado/`.

**Checkpoint:** número comparável publicado, com ganho (ou neutralidade) registrado.
**Depende de:** 16. **Esforço:** 2 h.

---

### Etapa 18 — Governança de migrations

**Ações:** lint SQL básico (ex.: `squawk` ou equivalente) sobre migrations novas; template com seção de rollback
obrigatória; check de CI que detecta timestamp duplicado e refs de projeto hardcoded.

**Checkpoint:** toda migration nova passa por lint no CI; template documentado.
**Esforço:** 5 h.

> **✅ Portão do Bloco 2:** risco de RLS documentado, travado por teste, sem policy de escrita aberta.

---

# BLOCO 3 — Reprodutibilidade e drift do banco (etapas 19–21)

### Etapa 19 — `supabase db reset` reprodutível

**Por quê:** pré-requisito para testar RLS/migrations de verdade em CI — hoje não há garantia de que as ~219
migrations acumuladas aplicam em sequência do zero. A auditoria de 24/09 não conseguiu verificar isso por falta
de Supabase CLI no ambiente da sessão.

**Ações:** em ambiente com Docker + Supabase CLI, iniciar Supabase local limpo; `supabase db reset`; corrigir a
**primeira** falha encontrada (dependência temporal, referência a objeto inexistente); repetir até passar 2x
consecutivas com schema idêntico.

**Checkpoint:** `supabase db reset` passa 2x consecutivas sem intervenção manual, schema idêntico nas duas.
**Esforço:** 8–16 h (maior variância do plano — depende de quantas migrations acumularam problema).

---

### Etapa 20 — Drift report formal (schema local vs. banco vivo)

**Ações:** exportar DDL de staging e produção; comparar contra o schema que as migrations produzem localmente
(pós Etapa 19); gerar migrations corretivas para qualquer diferença; validar que nenhuma causa perda de dados.

**Checkpoint:** *drift report* vazio ou só com diferenças com aceite escrito.
**Depende de:** 19. **Esforço:** 6 h (a amostra da auditoria de 24/09 não achou drift em 5 tabelas centrais — não deveria ser o pior caso do plano de 13/09).

---

### Etapa 21 — Automatizar e integrar o `db reset` validado ao CI

**Ações:** rodar o `db reset` (Etapa 19) como job de CI a cada PR que toque `supabase/migrations/`.

**Checkpoint:** job ativo, falha bloqueia merge se uma migration nova quebrar o reset.
**Depende de:** 19. **Esforço:** 3 h.

---

# BLOCO 4 — Edge Functions residual (etapas 22–23)

### Etapa 22 — Inventariar credenciais de integração e política de rotação

**Ações:** listar todas as credenciais (Bitrix24 OAuth, Resend, Twilio, Google) com onde vivem hoje; definir
cadência de rotação; registrar data da próxima rotação de cada uma.

**Checkpoint:** `docs/estado/credenciais-integracao.md` com inventário e datas.
**Depende de:** 3. **Esforço:** 3 h.

---

### Etapa 23 — Mover credenciais de integração para secrets de Edge Function dedicados

**Ações:** confirmar que nenhuma credencial de integração está em variável de ambiente compartilhada com outras
funções sem necessidade; migrar para o escopo mínimo necessário.

**Checkpoint:** nenhuma credencial de integração acessível por function que não a usa.
**Depende de:** 22. **Esforço:** 2 h.

---

# BLOCO 5 — Consertar a régua de teste antes de perseguir número (etapas 24–26)

### Etapa 24 — Corrigir o denominador da cobertura

**Por quê:** cobertura reportada (23,33%) ainda é medida sem `all: true`/`include` — v8 só instrumenta o que
algum teste importa; a métrica recompensa não testar.

**Ações:**
1. Adicionar `all: true` e `include: ['src/**/*.{ts,tsx}']` em `vitest.config.ts`.
2. Definir `exclude` explícito e justificado (tipos gerados, barrels, `main.tsx`, mocks).
3. Remedir e registrar o número real como novo baseline em `docs/estado/`.

**Checkpoint:** denominador coerente com o tamanho real de `src/`; baseline publicado.
**Esforço:** 3 h.

---

### Etapa 25 — Recalibrar thresholds para o número real

**Ações:** ajustar `vitest.config.ts` para thresholds logo abaixo do número medido na Etapa 24 (impede
regressão, não trava CI à toa).

**Checkpoint:** CI passa no baseline atual, falha se cobertura cair.
**Depende de:** 24. **Esforço:** 1 h.

---

### Etapa 26 — Escrever a estratégia de testes por camada

**Ações:** documentar o que é unit/integração/e2e neste projeto; metas por camada; ordem de ataque por risco
(estoque e agendamento primeiro — ver Bloco 6).

**Checkpoint:** `docs/estrategia-testes.md` escrito e aprovado.
**Depende de:** 24. **Esforço:** 3 h.

> **✅ Portão do Bloco 5:** a régua mede o universo certo antes de investir nas etapas abaixo.

---

# BLOCO 6 — Cobrir as regras de negócio críticas sem rede (etapas 27–31)

> **Achado da auditoria de 24/09:** **controle de estoque e agendamento de máquina têm cobertura de teste ZERO**
> — as duas áreas que o próprio plano anterior citava como prioridade máxima.

### Etapa 27 — Testes de `scheduling.ts`/`useSchedulingConflicts`/`useSchedulingData`

**Por quê:** é o "agendamento de máquina" citado como prioridade P0 do plano anterior — hoje sem nenhum teste.

**Ações:** cobrir a lógica de conflito de agendamento, casos de borda (sobreposição, troca de turno, cancelamento).

**Checkpoint:** ≥80% de branch coverage nesses 3 arquivos.
**Depende de:** 26. **Esforço:** 8 h.

---

### Etapa 28 — Testes de `useInventory`/`useLogistics`/`useTraceability`

**Por quê:** controle de estoque, hoje 0% de cobertura.

**Ações:** cobrir movimentação de estoque, rastreabilidade, casos de borda (estoque negativo, item duplicado).

**Checkpoint:** ≥80% de branch coverage nesses arquivos.
**Depende de:** 26. **Esforço:** 10 h.

---

### Etapa 29 — Testes de `offlineStorage.ts`

**Por quê:** app se declara offline-first; hoje 0% (o plano anterior citava 11,18% como "o mais baixo de lib/" — a auditoria de 24/09 não achou nenhum arquivo de teste, então o número real hoje é 0%, pode ter regredido).

**Ações:** cobrir fila de sincronização, resolução de conflito, persistência local.

**Checkpoint:** ≥70% statements.
**Depende de:** 26. **Esforço:** 6 h.

---

### Etapa 30 — Testes dos módulos de exportação

**Por quê:** `pdfExport`, `excelExport`, `spcExport`, `calendarExports`, `oeeExport` — os 5 sem nenhum teste.
Exportação quebrada costuma ser descoberta pelo cliente.

**Ações:** testar geração com dados representativos, estrutura da saída, caminho de erro, dataset grande.

**Checkpoint:** os 5 módulos ≥70%.
**Depende de:** 26. **Esforço:** 10 h.

---

### Etapa 31 — Testes de integração de hooks React Query contra Supabase local

**Ações:** validar cache, invalidação, retry e caminho offline dos hooks de dados críticos (jobs, inventory, production).

**Checkpoint:** fluxos de dados principais com teste de integração passando.
**Depende de:** 19 (banco reproduzível), 26. **Esforço:** 12 h.

---

# BLOCO 7 — Certificar qualidade E2E/A11y/Visual (etapas 32–35)

### Etapa 32 — Ampliar o sweep de axe-core

**Por quê:** hoje cobre só 4 rotas (`/`, `/operator`, `/kpi`, `/oee`) de ~55 páginas.

**Ações:** adicionar jobs, inventory, maintenance, admin ao sweep de `tests/e2e/accessibility.spec.ts`.

**Checkpoint:** rotas principais dos módulos de negócio cobertas; 0 violações críticas.
**Esforço:** 6 h.

---

### Etapa 33 — Certificar 0 flaky em 5 execuções + reativar `mobile-chrome` no gate

**Por quê:** a suíte E2E avançou muito nesta sessão (MFA real, ~17 specs reforçados), mas nunca foi formalmente
certificada como estável, e o gate obrigatório só roda `--project=chromium` (não `mobile-chrome`, que o
checkpoint original da Etapa 3 do plano de 13/09 exigia).

**Ações:** rodar a suíte completa 5 vezes consecutivas; triar qualquer flake real; decidir se `mobile-chrome`
volta ao gate obrigatório ou fica só em runs agendados (custo de tempo de CI vs. cobertura).

**Checkpoint:** 5 execuções consecutivas sem falha não-determinística; decisão sobre `mobile-chrome` documentada.
**Esforço:** 4 h + tempo de CI.

---

### Etapa 34 — Fixar fontes e desativar animações na regressão visual

**Por quê:** só o mascaramento de valores dinâmicos existe hoje; sem `animations: 'disabled'` nem fixação de
fontes, os 4 snapshots (`dashboard-desktop`, `dashboard-mobile`, `sidebar-collapsed`, `sidebar-expanded`) têm
risco de falso-positivo.

**Ações:** adicionar `animations: 'disabled'` nas opções de screenshot; garantir fonte carregada antes do
snapshot; documentar em `tests/e2e/README.md` como atualizar baseline conscientemente.

**Checkpoint:** 10 execuções consecutivas sem falso-positivo.
**Esforço:** 3 h.

---

### Etapa 35 — Registrar formalmente "0 violações críticas" pós-ampliação

**Ações:** rodar a suíte de a11y ampliada (Etapa 32) no CI real e publicar o resultado.

**Checkpoint:** run de CI linkado com 0 violações críticas nas rotas ampliadas.
**Depende de:** 32. **Esforço:** 1 h.

---

# BLOCO 8 — Performance: ligar o que já está escrito (etapas 36–40)

> **Achado da auditoria:** o bundle não diminuiu (ainda 12 MB) — o que melhorou foi a estratégia de
> carregamento (Mermaid/Charts/Excel viraram lazy, boot caiu para ~2,1 MB). O próximo ganho real não é remover
> mais peso — é **ligar a paginação que já foi escrita e nunca foi conectada**.

### Etapa 36 — Ligar `usePaginatedJobs` na página real de Jobs

**Por quê:** o hook existe, correto, com `.range()`+`count:'exact'` — mas nada o consome. A listagem real usa
`jobsService.getAll()` sem paginação, carregando a tabela inteira.

**Ações:** trocar o consumo da página de Jobs para `usePaginatedJobs`; preservar filtros/ordenação existentes.

**Checkpoint:** página de Jobs não carrega mais a tabela inteira; tempo de resposta estável com 10× o volume atual.
**Esforço:** 4 h.

---

### Etapa 37 — Paginar `useInventory`

**Por quê:** mesmo padrão — `.select('*').order('name')` sem `.range()`/`.limit()`.

**Ações:** aplicar paginação por cursor, mesmo padrão de `usePaginatedJobs`.

**Checkpoint:** listagem de inventário não carrega tabela inteira.
**Esforço:** 4 h.

---

### Etapa 38 — Remover a dependência órfã `vite-plugin-pwa`

**Por quê:** está em `package.json` sem uso — `vite.config.ts` não a referencia; só `public/sw.js` manual está
ativo. É uma armadilha para quem ler o `CLAUDE.md` achando que o plugin está em uso.

**Ações:** confirmar de vez que o SW manual é a escolha definitiva; remover a dependência não usada; se decidir
migrar para o plugin em vez disso, fazer isso aqui em vez de manter os dois.

**Checkpoint:** `package.json` sem dependência órfã; decisão documentada.
**Esforço:** 1 h.

---

### Etapa 39 — Documentar e testar o caminho de upgrade de Service Worker

**Ações:** confirmar que `self.skipWaiting()`/`self.clients.claim()` migram usuários com SW antigo sem limpeza
manual; testar esse caminho manualmente; documentar.

**Checkpoint:** teste de upgrade documentado com resultado.
**Depende de:** 38. **Esforço:** 3 h.

---

### Etapa 40 — Lighthouse CI com budgets de LCP/TTI

**Por quê:** já existe budget de tamanho de bundle bloqueante no CI (`bundle-budget.json` + `bundle:report`) —
falta conectar com performance de execução real.

**Ações:** integrar Lighthouse CI; definir budgets de LCP/TTI; conectar com os Web Vitals já enviados ao Sentry.

**Checkpoint:** PR que regride LCP/TTI é bloqueado.
**Esforço:** 6 h.

> **✅ Portão do Bloco 8:** ganho de performance real medido, não só potencial.

---

# BLOCO 9 — Reduzir ambiguidade estrutural (etapas 41–43)

### Etapa 41 — Migrar imports profundos em `features/` para barrels + lint de fronteira

**Por quê:** 154 imports profundos (`@/features/X/components/...` em vez de `@/features/X`) contra 354 corretos
via barrel; nenhuma regra de lint impede isso hoje.

**Ações:** migrar os 154 incrementalmente; adicionar `no-restricted-imports` (ou `eslint-plugin-boundaries`) em
`eslint.config.js` proibindo import profundo em `src/features/*`.

**Checkpoint:** 0 imports profundos; lint de fronteira ativo e falha se um novo aparecer.
**Esforço:** 10 h (incremental, não big-bang).

---

### Etapa 42 — Documentar a ordem/dependência de cada provider

**Ações:** em `src/providers/AppProviders.tsx`, comentar por que cada provider está naquela posição (ex.: por
que `AuthProvider` antes de `PermissionsProvider`); confirmar que nenhum provider global serve só uma rota.

**Checkpoint:** ordem documentada com justificativa por provider.
**Esforço:** 4 h.

---

### Etapa 43 — Resolver o único TODO restante

**Ações:** `src/test/exportSimulation.test.ts` — resolver ou vincular a uma issue.

**Checkpoint:** 0 TODO sem issue vinculada.
**Esforço:** 30 min.

---

# BLOCO 10 — Observabilidade e continuidade operacional (etapas 44–48)

### Etapa 44 — Definir SLIs e configurar alertas no Sentry

**Ações:** taxa de erro, latência de operações críticas, falha de sync offline como SLIs; configurar alertas
com destinatário e limiar no painel Sentry (fora do repo — documentar a configuração feita).

**Checkpoint:** alertas configurados e **testados end-to-end** (disparar um de propósito e confirmar recebimento).
**Esforço:** 6 h.

---

### Etapa 45 — Dashboard operacional

**Ações:** criar dashboard com os SLIs da Etapa 44; definir severidades e quem responde a cada uma.

**Checkpoint:** dashboard acessível; escalonamento documentado.
**Depende de:** 44. **Esforço:** 4 h.

---

### Etapa 46 — Escrever os 6 runbooks operacionais

**Por quê:** `docs/runbooks/` nunca existiu no histórico do repo.

**Ações:** escrever runbooks para: rotação de credenciais (usar a Etapa 22 como insumo), rollback de deploy,
rollback de migration, recuperação de admin travado por MFA (já escrito na Etapa 4 — só mover/consolidar aqui),
incidente de dados, falha de integração Bitrix24.

**Checkpoint:** 6 runbooks em `docs/runbooks/`.
**Depende de:** 4, 22. **Esforço:** 8 h.

---

### Etapa 47 — Ensaiar ao menos 2 runbooks

**Ações:** escolher os 2 de maior risco (recuperação MFA e rollback de migration); ensaiar; registrar resultado.

**Checkpoint:** 2 runbooks com resultado de ensaio registrado.
**Depende de:** 46. **Esforço:** 4 h.

---

### Etapa 48 — Calendário de manutenção

**Ações:** documentar cadência: revisão de dependências (semanal), auditoria de RLS (trimestral), revisão de
acessos (trimestral), ensaio de runbook (semestral) — com responsáveis nomeados.

**Checkpoint:** calendário publicado com responsáveis.
**Depende de:** 47. **Esforço:** 2 h.

---

# BLOCO 11 — Certificação final (etapas 49–50)

### Etapa 49 — Reexecutar a matriz completa de gates e comparar contra este baseline

**Ações:** rodar todos os gates de CI; comparar dimensão por dimensão contra a seção 0 deste documento.

**Checkpoint:** comparação publicada; cada dimensão com número antes/depois.
**Depende de:** todas. **Esforço:** 4 h.

---

### Etapa 50 — Atualizar os documentos-mestre com o scorecard final

**Ações:** atualizar `docs/plano-mestre-10-10.md` (scorecard), `ESTADO_ATUAL.md` e `ANALISE_TECNICA_SISTEMA.md`
— os três descrevem um sistema anterior a este plano. Registrar pendências remanescentes com responsável e
prazo — sem `🟨` órfão.

**Checkpoint:** os 3 documentos batem com o estado real medido na Etapa 49; 0 achado crítico aberto sem dono.
**Depende de:** 49. **Esforço:** 4 h.

---

## Resumo executivo

| Bloco | Etapas | Esforço | Risco | Portão |
|---|---|---|---|---|
| 0 — Segurança crítica viva | 1–5 | ~12 h + 48h obs. | 🔴 | 3 vulnerabilidades reais fechadas |
| 1 — Certificar hardening | 6–11 | ~17 h + 48h obs. | 🟠 | Hardening com evidência, não só texto |
| 2 — RLS: medir→travar | 12–18 | ~24 h | 🟡 | RLS documentado e travado por teste |
| 3 — Reprodutibilidade do banco | 19–21 | ~17–25 h | 🟡 | `db reset` confiável no CI |
| 4 — Edge Functions residual | 22–23 | ~5 h | 🟢 | Credenciais de integração geridas |
| 5 — Régua de teste | 24–26 | ~7 h | 🟢 | Cobertura mede o universo certo |
| 6 — Regras de negócio críticas | 27–31 | ~46 h | 🔴 | Estoque e agendamento com rede de teste |
| 7 — Qualidade E2E/A11y/Visual | 32–35 | ~14 h | 🟡 | Suíte certificada, não só existente |
| 8 — Performance: ligar o escrito | 36–40 | ~18 h | 🟡 | Paginação de verdade em produção |
| 9 — Ambiguidade estrutural | 41–43 | ~14 h | 🟢 | Fronteira de `features/` travada |
| 10 — Observabilidade/continuidade | 44–48 | ~24 h | 🟡 | Alertas testados, runbooks ensaiados |
| 11 — Certificação final | 49–50 | ~8 h | 🟢 | Scorecard atualizado, 0 pendência órfã |
| **Total** | **50** | **~206 h + 96h obs.** | | |

### Regras de execução (mantidas do plano anterior — continuam valendo)

1. **Portões são obrigatórios.** Nenhuma etapa de um bloco começa antes do portão do bloco anterior fechar.
2. **Checkpoint não demonstrável = etapa não concluída.** Foi exatamente a falta disso que produziu as 3
   alegações da seção 0.2 que não resistiram à verificação.
3. **Etapas 🔴 exigem ensaio de rollback antes de qualquer aplicação em produção.** Sem exceção para as etapas 1, 2, 4, 5.
4. **Toda correção de segurança nasce com teste de regressão.** Correção sem teste regride no próximo `ALTER`.
5. **Medir antes e depois.** As etapas de performance e índices (16, 17, 36, 37, 40) só fecham com número comparável.

### Duas decisões que travam o resto

1. **`exec_sql` tem grant público hoje?** (Etapa 1) — se sim, é o item de maior urgência deste documento inteiro, à frente de qualquer outra prioridade.
2. **A rotação de credenciais do incidente `migrate-helper` já foi feita em algum momento não documentado?** (Etapa 2) — se sim, esta etapa vira só "atualizar o post-mortem"; se não, é rotação real, urgente.
