# Plano de consolidação em 50 etapas — FAST GRAVAÇÕES ES v2

> **Data:** 2026-09-13 · **Baseline:** `04febbfa` (branch `chore/plano-10-10-bloco-a`, PR #43 aberto)
> **Relação com o plano mestre:** este documento **não substitui** `docs/plano-mestre-10-10.md` (100 etapas, Blocos A–J).
> Ele é o **plano de execução consolidado** que (a) fecha as pendências reais do Bloco A — 9 das 10 etapas estão
> `🟨 Parcial` —, (b) desbloqueia o PR #43 e o pipeline de Deploy, e (c) prioriza por risco medido o que sobrou dos
> Blocos B–J. Cada etapa tem **checkpoint verificável**: se o checkpoint não puder ser demonstrado por comando ou
> artefato, a etapa **não** está concluída.

---

## 0. Situação medida (baseline factual, 2026-09-13)

Todos os números abaixo foram **medidos** neste commit, não herdados de documentos anteriores.

### 0.1 Sincronização Git — ✅ CONFORME

| Verificação | Resultado |
|---|---|
| SHA local vs `git ls-remote` | `04febbfa` = `04febbfa` |
| **Tree SHA** via API GitHub | `d6192151…` = `d6192151…` (prova criptográfica de conteúdo) |
| Ahead / behind vs `origin` | `0 / 0` |
| Working tree após `update-index --really-refresh` (1.329 arquivos) | 0 divergências |
| `git fsck --connectivity-only` | 0 objetos corrompidos (apenas *dangling* de rebase) |
| Branches locais sem upstream (`fix/audit-pr32-findings`, `pr32-branch`) | 0 commits órfãos |
| Stashes / `assume-unchanged` / submódulos / LFS | nenhum |

**Conclusão:** não há risco de perda de trabalho local. O risco está no **fluxo**, não no conteúdo.

### 0.2 Bloqueios ativos — ❌ NÃO CONFORME

| Bloqueio | Evidência |
|---|---|
| `main` não contém o Bloco A | branch 16 commits à frente; `merge-base` = `a82e4fed` |
| PR #43 com 2/25 checks falhando | E2E aborta: `Configure VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, E2E_EMAIL e E2E_PASSWORD` |
| Quality Gate falha em cascata | `["e2e"]="failure"` → `❌ DEPLOY BLOCKED` |
| Workflow **Deploy** falhando | `O token não possui acesso ao projeto canônico configurado` (runs 34606923720, 34607302501) |
| CI não determinístico | mesmo commit `04febbfa` produziu run `…923499` **success** e run `…929018` **failure** |

### 0.3 Dívida técnica quantificada

| Dimensão | Medição | Fonte |
|---|---|---|
| Adoção do middleware `_shared/auth.ts` | **1 de 33** Edge Functions (`create-operator`) | `grep -rl _shared/auth` |
| `verify_jwt` declarado em `config.toml` | **0** ocorrências (33 funções no default implícito) | `supabase/config.toml` |
| RLS permissivo `USING (true)` | **170 ocorrências** em **50** migrations — ⚠️ contagem **histórica**, não efetiva (592 `CREATE POLICY` vs 397 `DROP POLICY` no histórico). O número real só sai de `pg_policies` no banco vivo — ver Etapa 17 | `grep` + contagem de DDL |
| CORS em produção | ✅ **fonte única** `_shared/cors.ts` com `pickAllowedOrigin(req)`; **0** wildcards em código de produção | `grep -rn Allow-Origin` |
| Funções fora do helper de CORS | **2** (`backup-scheduler`, `metrics-collector`) — cron-only com `requireCronSecret`, **correto por design** | inspeção |
| Migrations | **218** — reprodutibilidade de `db reset` não verificada | `ls supabase/migrations` |
| Cobertura declarada | 23,31% stmts / 19,82% funcs / 19,85% branches | `vitest --coverage` |
| **Denominador da cobertura** | **7.305 stmts** medidos vs **141.724 linhas** em `src/` | métrica inflada — ver Etapa 32 |
| Arquivos de teste | 50 unit (para 906 fontes) + 17 e2e | `find` |
| Bundle | **12 MB** em `dist/assets`; `lib-mermaid` **2,9 MB**, `lib-charts` 1,1 MB, `lib-excel` 1.012 KB | `du -sh` |
| Service Worker | `public/sw.js` manual **+** `vite-plugin-pwa` (conflito) | `ls public/sw.js` |
| Schema | `start_time` / `end_time` como **TEXT** | migration `20251212212803` |
| Supply chain | **5 vulnerabilidades moderate**; **88 pacotes** desatualizados | `npm audit` / `npm outdated` |
| Dívida de tipos | 18 usos de `any`; 5 TODO/FIXME | `grep` |

**Ponto positivo a preservar:** `.env.production` e `.env.staging` versionados contêm **apenas placeholders** — sem vazamento de segredo. `any` e TODO em níveis baixos para 141k linhas.

### 0.3.1 Nota metodológica — dois achados corrigidos nesta análise

Duas medições iniciais por `grep` não sobreviveram à verificação linha a linha. Ficam registradas porque a
correção muda o trabalho a fazer:

| Achado inicial | Verificação | Consequência |
|---|---|---|
| "9 arquivos com CORS permissivo" | Eram `.select('*')` do PostgREST; os 3 `Allow-Origin: *` reais estão em **arquivos de teste**. Produção usa fonte única `_shared/cors.ts` com `pickAllowedOrigin(req)` | **Etapa 11 deixa de ser correção e vira certificação** (4 h → 3 h) |
| "170 policies `USING (true)` a corrigir" | Contagem **histórica**; o histórico tem 592 `CREATE POLICY` vs 397 `DROP POLICY`, logo muitas já foram substituídas | **Etapa 17 passa a inventariar via `pg_policies`**; Etapas 19–20 a reestimar |

A lição vale para a execução inteira: **`grep` em `supabase/migrations/` mede história, não estado.**
Toda afirmação sobre RLS, schema ou policies efetivas neste plano deve ser confirmada contra o banco vivo
antes de gerar trabalho.

### 0.4 Ordenação por risco

```
P0 Desbloqueio      → etapas 1–6    (sem isto nada chega a produção)
P0 Fechar Bloco A   → etapas 7–14   (contenção declarada mas não certificada)
P1 Banco e RLS      → etapas 15–24  (maior superfície de exposição de dados)
P1 Edge Functions   → etapas 25–31  (32 funções fora do middleware)
P2 Medição e testes → etapas 32–39  (a métrica atual mente)
P2 Performance/PWA  → etapas 40–44  (2,9 MB de mermaid no bundle)
P3 Supply chain/Ops → etapas 45–50  (sustentação)
```

---

# BLOCO 0 — Desbloqueio imediato (etapas 1–6)

> **Objetivo do bloco:** transformar o PR #43 em mergeável e o Deploy em executável. Nenhuma outra etapa deve
> começar antes deste bloco fechar — trabalhar sobre um pipeline quebrado produz dívida que ninguém consegue validar.

### Etapa 1 — Decidir e registrar o projeto Supabase canônico

**Por quê:** a Etapa 5 do Bloco A ficou `🟨 Parcial` explicitamente por "decisão do ref canônico **pendente** (owner)". Isso é a causa-raiz de dois bloqueios (Deploy e E2E) e de não conseguir validar as Etapas 3 e 7.

**Ações:**
1. Listar todos os project refs em uso: `supabase/config.toml` (`uoujzvpecohinketylud`), `supabase/ENVIRONMENTS.md`, secrets do GitHub, variáveis da Vercel, MCP local.
2. Identificar qual ref tem os **dados de produção reais** (contagem de linhas em tabelas de negócio, não em `auth.users`).
3. Decidir, com o *owner* do negócio, a matriz definitiva: `prod` / `staging` / `preview` / `local`.
4. Registrar a decisão em `supabase/ENVIRONMENTS.md` com ref, finalidade, quem tem acesso e política de dados.
5. Marcar explicitamente os refs **órfãos** a serem arquivados.

**Checkpoint:** `supabase/ENVIRONMENTS.md` lista cada ref com finalidade única e sem ambiguidade; nenhum ref aparece em dois papéis.
**Bloqueia:** 2, 3, 5, 9, 10, 15, 16.
**Responsável:** owner + tech lead. **Esforço:** 2–4 h (majoritariamente decisão, não código).

---

### Etapa 2 — Corrigir o `SUPABASE_ACCESS_TOKEN` do workflow Deploy

**Por quê:** `Validate Supabase Target (dry-run)` falha com `O token não possui acesso ao projeto canônico configurado`. O guard-rail criado no commit `04febbfa` está **correto** — ele está fazendo exatamente o que deveria: recusando deploy contra o projeto errado. O defeito está na credencial, não no guard.

**Ações:**
1. Gerar novo *access token* na conta Supabase com acesso ao ref definido na Etapa 1.
2. Atualizar os secrets `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_ID` e `SUPABASE_DB_PASSWORD` no GitHub (escopo: environment, não repository — ver Etapa 6).
3. Revogar o token antigo.
4. Re-executar o workflow Deploy em modo dry-run.
5. Confirmar que o step de validação **passa** e que o step de migrations continua gated por *environment approval*.

**Checkpoint:** `Validate Supabase Target (dry-run)` verde; `gh run view --log` mostra o ref canônico validado; token antigo revogado.
**Depende de:** 1. **Esforço:** 1 h.

---

### Etapa 3 — Provisionar os secrets de E2E e desbloquear o Quality Gate

**Por quê:** E2E aborta antes de rodar qualquer teste — os 17 specs **nunca executaram** neste PR. O Quality Gate falha em cascata (`["e2e"]="failure"` → `DEPLOY BLOCKED`). Hoje não existe evidência empírica de que a aplicação funciona.

**Ações:**
1. Criar um **usuário de teste dedicado** no projeto de staging (nunca em produção), com papel mínimo e dados sintéticos.
2. Configurar `E2E_EMAIL`, `E2E_PASSWORD`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` como secrets.
3. Garantir que os secrets estejam disponíveis para PRs **do próprio repositório** (forks devem continuar sem acesso — ver Etapa 6).
4. Rodar a suíte e triar cada falha: falha real de produto vs. fragilidade de teste.
5. Documentar em `tests/e2e/README.md` como rodar localmente.

**Checkpoint:** `E2E Tests (Playwright)` verde nos projetos `chromium` **e** `mobile-chrome`; Quality Gate verde; nenhum teste em `.skip` sem justificativa escrita.
**Depende de:** 1. **Esforço:** 4–6 h (a triagem das primeiras falhas é o custo real).

---

### Etapa 4 — Eliminar o não-determinismo do CI

**Por quê:** o commit `04febbfa` produziu **success** no run `34606923499` e **failure** no run `34606929018`. Um pipeline que responde duas coisas diferentes para a mesma entrada não é um gate — é ruído, e treina o time a ignorar vermelho.

**Ações:**
1. Diferenciar os dois runs (`gh run view --log`) e identificar por que um pulou E2E (`skipping`) e o outro executou.
2. Mapear os gatilhos de workflow (`on:`) — provável duplicação `push` + `pull_request` na mesma branch.
3. Consolidar em um gatilho único por contexto e adicionar `concurrency: { group, cancel-in-progress: true }`.
4. Tornar determinística a condição de skip do E2E: ou roda, ou falha — nunca "pula silenciosamente e o gate passa".
5. Re-disparar 3 vezes o mesmo commit e exigir resultado idêntico.

**Checkpoint:** 3 execuções consecutivas do mesmo SHA com conclusão idêntica; nenhum job duplicado na aba Checks.
**Esforço:** 3–4 h.

---

### Etapa 5 — Aplicar e validar a migration de MFA AAL2 no banco canônico

**Por quê:** a Etapa 7 do Bloco A entregou policies `RESTRICTIVE` combinando AAL2 com limites de papel, mas o registro diz: "a migration ainda não foi aplicada/validada no banco canônico". Há um **BREAKING planejado** — AAL1 deixa de escrever em `user_roles`. Aplicar isso sem ensaio é risco de travar administradores fora do próprio sistema.

**Ações:**
1. Aplicar em **staging** primeiro, com `supabase db reset` a partir do zero.
2. Escrever teste negativo: sessão AAL1 tentando `INSERT`/`UPDATE`/`DELETE` em `user_roles` → deve falhar.
3. Escrever teste positivo: sessão AAL2 → deve suceder.
4. **Ensaiar o caminho de recuperação:** garantir que existe ao menos um administrador com MFA já inscrito *antes* de aplicar, e um procedimento documentado de emergência via service-role.
5. Validar o fluxo de UI `/mfa-enrollment` para papel elevado sem fator.
6. Documentar o rollback (`DROP POLICY`) e ensaiá-lo.
7. Só então aplicar em produção, em janela combinada.

**Checkpoint:** testes negativo e positivo passam em staging; rollback ensaiado; procedimento de emergência escrito em `docs/runbooks/`; comunicado aos usuários de papel elevado enviado **antes** da aplicação.
**Depende de:** 1, 2. **Risco:** 🔴 ALTO — breaking change de acesso. **Esforço:** 6–8 h.

---

### Etapa 6 — Endurecer a superfície de secrets do CI

**Por quê:** a Etapa 3 introduz credenciais reais no CI. Fazer isso sem segmentação transforma uma correção em uma nova exposição: qualquer workflow, em qualquer PR, passa a poder ler o token.

**Ações:**
1. Migrar secrets de *repository* para **GitHub Environments** (`staging`, `production`) com *required reviewers* em production.
2. Garantir que workflows disparados por `pull_request` de fork **não** recebam secrets.
3. Declarar `permissions:` mínimo em todos os workflows (`contents: read` por padrão; elevar só onde necessário).
4. Auditar uso de `pull_request_target` — se existir, revisar linha a linha (é o vetor clássico de exfiltração).
5. Confirmar que o TruffleHog com histórico completo (já ativo pela Etapa 9 do Bloco A) cobre os novos secrets.

**Checkpoint:** `gh api repos/:owner/:repo/environments` mostra `production` com reviewers; nenhum workflow com `permissions: write-all`; scan de secrets verde.
**Depende de:** 2, 3. **Esforço:** 3 h.

> **✅ Portão do Bloco 0:** PR #43 com 25/25 checks verdes e mergeável. **Não avançar sem isto.**

---

# BLOCO 1 — Fechamento real do Bloco A (etapas 7–14)

> **Objetivo:** converter os nove `🟨 Parcial` em `✅ Executada` com evidência. Contenção declarada e não certificada é pior que contenção ausente — cria falsa confiança.

### Etapa 7 — Concluir a rotação de segredos do incidente migrate-helper

**Por quê:** a Etapa 2 do Bloco A removeu o diretório e limpou o `index.html`, mas registra pendências manuais: "rotação service-role/DB password + auditoria de logs no painel". **Enquanto a chave não rodar, o incidente continua aberto** — remover o código não invalida a credencial que vazou.

**Ações:**
1. Rotacionar a `service_role key` no painel Supabase.
2. Rotacionar a senha do banco.
3. Rotacionar qualquer token Bitrix24/Resend/Twilio que possa ter transitado pelo helper.
4. Atualizar todos os consumidores (GitHub secrets, Vercel, Edge Function secrets).
5. Auditar logs do painel no intervalo entre a introdução e a remoção do helper, procurando uso não reconhecido.
6. Atualizar `docs/post-mortems/2026-09-10-migrate-helper.md` com data da rotação e resultado da auditoria.

**Checkpoint:** post-mortem com seção "Rotação concluída em <data>" e "Auditoria de logs: <resultado>"; chaves antigas comprovadamente inválidas.
**Risco:** 🔴 credencial possivelmente exposta segue válida. **Esforço:** 3–4 h.

---

### Etapa 8 — Verificar a revogação de `exec_sql` no banco real

**Por quê:** a Etapa 3 corrigiu a migration para ser condicional, mas "verificação no banco real **pendente**". Uma função `exec_sql` exposta é execução arbitrária de SQL — é o achado de maior severidade possível.

**Ações:**
1. No banco canônico, consultar `pg_proc` por funções que executem SQL dinâmico.
2. Verificar `GRANT`s efetivos sobre cada uma (`has_function_privilege` para `anon` e `authenticated`).
3. Confirmar que nenhuma é acessível via PostgREST (checar exposição do schema).
4. Repetir para staging.
5. Adicionar um **teste de regressão** no CI que falha se a função reaparecer com grant público.

**Checkpoint:** query de evidência salva em `docs/estado/` mostrando 0 funções de SQL dinâmico com grant a `anon`/`authenticated`, em prod e staging; teste de regressão ativo.
**Depende de:** 1, 2. **Risco:** 🔴 CRÍTICO. **Esforço:** 3 h.

---

### Etapa 9 — Promover a CSP de Report-Only para enforcement

**Por quê:** a Etapa 8 do Bloco A entregou CSP `Report-Only` sem `unsafe-eval`/`unsafe-inline` e relatórios ao Sentry. Report-Only **não bloqueia nada** — é instrumentação. O valor de segurança só existe no enforcement.

**Ações:**
1. Coletar ao menos 7 dias de eventos `securitypolicyviolation` no Sentry, com tráfego real.
2. Classificar cada violação: legítima (precisa de allow) vs. ruído de extensão de navegador vs. ataque.
3. Ajustar a política para cobrir as legítimas — preferir `nonce`/`hash` a afrouxar a diretiva.
4. Trocar `Content-Security-Policy-Report-Only` por `Content-Security-Policy`, mantendo `report-uri` ativo.
5. Publicar primeiro em preview, depois staging, depois produção.
6. Monitorar 48 h com rollback pronto.

**Checkpoint:** header `Content-Security-Policy` (enforcing) em produção, sem `unsafe-eval` nem `unsafe-inline`; taxa de violação legítima ≈ 0 por 48 h.
**Esforço:** 4 h + 7 dias de observação (calendário, não trabalho).

---

### Etapa 10 — Fechar as 5 vulnerabilidades moderate e definir política de supply chain

**Por quê:** a Etapa 9 do Bloco A deixou explícito: "falta pin por SHA e tratamento das vulnerabilidades moderadas". 5 moderate + 88 pacotes desatualizados.

**Ações:**
1. `npm audit --json` → triar as 5: exploráveis em runtime vs. apenas em build/dev.
2. Corrigir por upgrade onde não houver breaking; documentar as que exigem major.
3. Para as não corrigíveis agora, registrar aceite formal com data de revisão em `docs/estado/supply-chain.md`.
4. **Pin por SHA** de todas as GitHub Actions de terceiros (`uses: org/action@<sha>`).
5. Configurar Dependabot/Renovate com agrupamento e janela semanal.
6. Ativar `npm ci --ignore-scripts` onde viável.

**Checkpoint:** `npm audit` sem moderate não-aceita; 100% das actions de terceiros pinadas por SHA; arquivo de aceites com datas de revisão.
**Esforço:** 5–6 h.

---

### Etapa 11 — Certificar a política de CORS (revisão de achado)

> **⚠️ Correção de achado.** Uma primeira medição por `grep '*'` sugeriu 9 arquivos com CORS permissivo.
> A verificação linha a linha mostrou que aquilo eram `.select('*')` do PostgREST — **sem relação com CORS** —
> e que as 3 ocorrências de `Access-Control-Allow-Origin: *` estão em **arquivos de teste**
> (`_shared/rateLimit.test.ts`, `_shared/cronAuth.test.ts`), onde são legítimas.
> **O código de produção está correto:** fonte única em `_shared/cors.ts` usando `pickAllowedOrigin(req)`.
> As 2 funções que não importam o helper (`backup-scheduler`, `metrics-collector`) são **cron-only**
> guardadas por `requireCronSecret` — não expõem superfície de navegador, logo não precisam de CORS.
> A afirmação da Etapa 8 do Bloco A ("CORS compartilhado não usa wildcard") **se confirma**.
> Esta etapa deixa de ser correção e passa a ser **certificação + trava de regressão**.

**Por quê:** o estado está correto hoje, mas nada impede que a próxima função nasça com wildcard. O que falta é a trava, não o conserto.

**Ações:**
1. Revisar a allowlist de `pickAllowedOrigin` por ambiente: produção, previews da Vercel (domínio dinâmico), localhost em dev.
2. Confirmar que a allowlist de preview não é ampla a ponto de aceitar qualquer subdomínio de terceiros.
3. Verificar que `Access-Control-Allow-Credentials: true` nunca coexiste com origem `*` (inclusive no caminho de fallback).
4. Adicionar **teste de regressão** que falha o CI se `Access-Control-Allow-Origin: *` aparecer fora de `*.test.ts`.
5. Adicionar check que exige de toda função nova: ou importa `_shared/cors.ts`, ou declara-se cron-only com `requireCronSecret`.
6. Testar preflight de origem não-listada → deve ser recusado.

**Checkpoint:** allowlist revisada e documentada por ambiente; preflight de origem estranha recusado em staging; os dois checks de CI ativos e comprovadamente falhando ao introduzir um wildcard de teste.
**Esforço:** 3 h (reduzido — não há correção a fazer).

---

### Etapa 12 — Declarar `verify_jwt` explicitamente para as 33 funções

**Por quê:** `supabase/config.toml` tem **0** ocorrências de `verify_jwt`. Toda função depende do default implícito da plataforma. Segurança por omissão é frágil: uma mudança de default do fornecedor altera a postura de 33 funções sem nenhum commit.

**Ações:**
1. Classificar cada uma das 33 funções: exige JWT / é webhook público com HMAC / é cron interno.
2. Declarar `[functions.<nome>] verify_jwt = true|false` para **todas** — nenhuma no implícito.
3. Para as `false`, exigir autenticação alternativa explícita (HMAC já existente em `_shared/auth.ts`, ou secret de cron).
4. Documentar a matriz em `supabase/functions/README.md`.
5. Adicionar check de CI que falha se uma função nova não estiver declarada.

**Checkpoint:** 33 declarações em `config.toml`; nenhuma função com `verify_jwt=false` sem autenticação alternativa documentada; check de CI ativo.
**Esforço:** 4 h.

---

### Etapa 13 — Limpar `graphify-out/` de dentro de `supabase/functions/_shared/`

**Por quê:** existe `supabase/functions/_shared/graphify-out/` (220 KB, **não rastreado** no git — logo não está no GitHub, e a sincronização segue íntegra). Mas `_shared/` é empacotado no deploy Deno: artefato de análise dentro do diretório de deploy é poluição que mais cedo ou mais tarde vira payload ou quebra de build.

**Ações:**
1. Localizar por que a ferramenta Graphify escreve ali (provável `--root` incorreto) e corrigir a invocação.
2. Remover o diretório localmente.
3. Adicionar `supabase/functions/**/graphify-out/` ao `.gitignore` como defesa em profundidade.
4. Adicionar verificação no CI que falha se artefatos de análise aparecerem sob `supabase/functions/`.
5. Confirmar que `npm run graph:build` passa a escrever apenas em `graphify-out/` na raiz.

**Checkpoint:** `supabase/functions/_shared/graphify-out` não existe; `graph:build` reproduz o grafo sem recriá-lo; check de CI ativo.
**Esforço:** 1–2 h.

---

### Etapa 14 — Certificar a contenção P0 com evidência externa

**Por quê:** a Etapa 10 do Bloco A fechou com "gates locais verdes", mas "secret scan remoto, E2E real e banco canônico continuam pendentes". Gate local é autoavaliação.

**Ações:**
1. Reexecutar a matriz completa de gates **no CI**, não localmente.
2. Anexar ao PR #43 os links de run de cada gate.
3. Rodar um scan de secrets sobre o histórico completo e anexar o resultado.
4. Atualizar a tabela "Registro de execução — Bloco A" de `plano-mestre-10-10.md`: cada `🟨` vira `✅` **com link de evidência** ou permanece `🟨` com pendência nomeada.
5. Merge do PR #43 em `main`.

**Checkpoint:** `main` contém o Bloco A; tabela do plano mestre sem `🟨` sem justificativa; `origin/main` = `origin/chore/plano-10-10-bloco-a`.
**Depende de:** 1–13. **Esforço:** 3 h.

> **✅ Portão do Bloco 1:** Bloco A certificado e mergeado. A partir daqui, trabalhar a partir de `main`.

---

# BLOCO 2 — Banco de dados, schema e RLS (etapas 15–24)

> **Objetivo:** o maior volume de risco residual. Uma policy `USING (true)` é, na prática, uma tabela sem autorização por linha.
> O histórico registra 170 ocorrências, mas a **contagem efetiva sai de `pg_policies`** no banco vivo (Etapa 17) — o plano
> deste bloco deve ser redimensionado assim que esse número existir.

### Etapa 15 — Tornar o banco reconstruível do zero

**Por quê:** 218 migrations sem garantia de que aplicam em sequência. Sem isso, nenhuma das etapas seguintes de RLS pode ser testada — não há onde testar.

**Ações:** iniciar Supabase local limpo; `supabase db reset`; registrar a **primeira** falha; corrigir dependências temporais; corrigir referências a objetos inexistentes; validar seeds; repetir do zero; comparar schema final entre duas execuções; automatizar; integrar ao CI.

**Checkpoint:** `supabase db reset` passa **duas vezes consecutivas** sem intervenção manual, e o schema resultante é idêntico nas duas.
**Depende de:** 1. **Esforço:** 8–16 h (é a etapa de maior variância — 218 migrations acumuladas).

---

### Etapa 16 — Reconciliar schema local com o banco vivo

**Por quê:** o repositório descreve **histórico versionado**, não o schema **implantado** (o próprio `CLAUDE.md` alerta para isso). Mudanças feitas via painel Lovable/Supabase não estão nas migrations.

**Ações:** exportar DDL de staging e de produção; normalizar os dumps; comparar tabelas, colunas, constraints, policies, funções e triggers; gerar migrations corretivas; validar que nenhuma causa perda de dados.

**Checkpoint:** *drift report* vazio ou contendo apenas diferenças com aceite escrito.
**Depende de:** 1, 15. **Esforço:** 8–12 h.

---

### Etapa 17 — Inventariar as policies permissivas **efetivas** (não as históricas)

> **⚠️ Correção metodológica.** As 170 ocorrências de `USING (true)` são uma contagem sobre o **histórico de
> migrations**, não sobre o schema implantado: o histórico tem **592 `CREATE POLICY` contra 397 `DROP POLICY`**,
> ou seja, boa parte dessas policies já foi substituída por versões posteriores. O próprio `CLAUDE.md` alerta:
> *"SQL extraction describes versioned history, not the deployed schema or effective RLS."*
> **Planejar 170 correções a partir do grep produziria trabalho fantasma.** O número que importa vem de
> `pg_policies` no banco canônico.

**Por quê:** antes de corrigir é preciso saber o que cada policy **efetiva** protege. Corrigir na ordem errada derruba a aplicação; corrigir policy já morta desperdiça o time e não move o risco.

**Ações:**
1. Consultar `pg_policies` em **produção** e em **staging** — esta é a fonte da verdade, não `supabase/migrations`.
2. Filtrar as que têm `qual = 'true'` ou `with_check = 'true'` e obter a **contagem real**.
3. Comparar essa contagem com as 170 históricas e registrar a diferença (mede o drift entre repo e banco — insumo direto da Etapa 16).
4. Para cada policy efetiva, registrar: tabela → policy → comando → papel-alvo → sensibilidade do dado.
5. Classificar em **P0** (PII, financeiro, `user_roles`, auditoria), **P1** (dados de negócio), **P2** (catálogos/lookup legitimamente públicos).
6. Para cada P2, registrar por que `true` é aceitável — algumas serão corretas, e marcá-las evita retrabalho.
7. Mapear cada policy ao código que a consome (`npm run graph:query`).
8. Publicar em `docs/estado/rls-inventario.md`, com a data e o ref do banco consultado.

**Checkpoint:** inventário gerado a partir de `pg_policies` (não de grep), com contagem efetiva registrada, 0 policies sem classificação, e cada P2 com justificativa escrita.
**Depende de:** 1, 15, 16. **Esforço:** 8 h.

> **Nota de dimensionamento:** as Etapas 19 e 20 foram estimadas assumindo as 170 históricas. Se o inventário
> efetivo revelar um número substancialmente menor, **reestimar os dois blocos** antes de alocar time — e
> registrar a nova estimativa aqui.

---

### Etapa 18 — Definir o modelo de autorização canônico

**Por quê:** corrigir N policies ad-hoc gera N estilos diferentes. É preciso um padrão único **antes** da primeira correção — caso contrário a Etapa 21 não consegue escrever um teste genérico.

**Ações:** definir funções SQL `SECURITY DEFINER` estáveis (`current_app_role()`, `has_role(...)`, `owns_record(...)`); padronizar nomes de policy; separar `SELECT`/`INSERT`/`UPDATE`/`DELETE`; decidir onde usar `RESTRICTIVE` (o padrão já adotado na Etapa 7 do Bloco A); documentar em `docs/ARCHITECTURE.md`.

**Checkpoint:** documento de padrão aprovado + helpers SQL criados e testados isoladamente.
**Depende de:** 17. **Esforço:** 6 h.

---

### Etapa 19 — Corrigir as policies P0

**Por quê:** `user_roles`, PII e auditoria são onde um `USING (true)` causa dano irreversível.

**Ações:** por tabela P0 — escrever testes negativos **antes** (usuário A não lê dado de B); substituir a policy; rodar os testes; validar que a aplicação continua funcionando; aplicar em staging; observar 24 h.

**Checkpoint:** 0 policies `USING (true)` em tabelas P0; suíte de testes negativos verde; nenhuma regressão funcional em staging.
**Depende de:** 18. **Risco:** 🔴 pode quebrar funcionalidades. **Esforço:** 12–16 h.

---

### Etapa 20 — Corrigir as policies P1

**Ações:** mesmo procedimento da Etapa 19, em lotes por domínio (jobs, inventory, production, maintenance), com deploy incremental.

**Checkpoint:** 0 policies `USING (true)` em P1; testes negativos por domínio; E2E verde após cada lote.
**Depende de:** 19. **Esforço:** 16–24 h.

---

### Etapa 21 — Suíte de testes de RLS no CI

**Por quê:** policy corrigida sem teste regride no próximo `ALTER`.

**Ações:** criar suíte que sobe banco limpo, cria usuários por papel, e para cada tabela sensível executa a matriz leitura/escrita própria × alheia; integrar ao pipeline; exigir teste para toda policy nova.

**Checkpoint:** suíte roda no CI a cada PR; cobre 100% das tabelas P0 e P1; falha bloqueia merge.
**Depende de:** 19, 20. **Esforço:** 10 h.

---

### Etapa 22 — Corrigir `start_time`/`end_time` TEXT → tipo temporal

> ✅ **SUPERADA (2026-09-16)** — verificado no banco canônico (`information_schema`): `jobs.start_time/end_time` = `time without time zone`; `machine_downtime.start_time/end_time` = `timestamptz`. O achado vinha da leitura histórica da migration `20260511192402`; o schema vivo já usa tipos temporais.


**Por quê:** a migration `20260511192402` contém o comentário `-- Assuming start_time and end_time are in 'HH:mm' format (text comparison works)`. Comparação textual de horário funciona **até** aparecer `9:00` em vez de `09:00`, ou cruzar meia-noite. É um bug latente em dado de produção.

**Ações:** auditar os valores reais existentes; identificar os fora do formato; decidir o tipo-alvo (`time`, `timestamptz` ou `interval`); escrever migration com backfill validado; ajustar queries e o front; ensaiar rollback; aplicar em staging antes de produção.

**Checkpoint:** colunas com tipo temporal; 0 linhas perdidas na conversão; comparações de intervalo corretas em teste; rollback ensaiado.
**Risco:** 🟠 migração de dados. **Esforço:** 8 h.

---

### Etapa 23 — Índices em colunas de alta cardinalidade

> ⚠️ **Reavaliada (2026-09-16)** — `pg_indexes` mostra 33 índices nas tabelas-chave (ex.: `idx_jobs_created_at_desc`). Falta conferir contra a lista exata do checkpoint antes de declarar concluída.


**Ações:** coletar queries lentas (`pg_stat_statements`); identificar *seq scans* em tabelas grandes; criar índices `CONCURRENTLY`; medir antes/depois; remover índices não utilizados; documentar.

**Checkpoint:** p95 das 10 queries mais frequentes medido antes e depois, com ganho registrado; nenhum índice não utilizado criado.
**Depende de:** 16. **Esforço:** 6 h.

---

### Etapa 24 — Governança de migrations

**Ações:** proibir SQL ad-hoc via painel; template obrigatório com rollback documentado; detectar timestamps duplicados; bloquear project refs hardcoded; gerar *schema snapshot* a cada migration; revisão obrigatória.

**Checkpoint:** toda migration nova passa por lint, `db reset`, revisão e ensaio de rollback; check de CI ativo.
**Depende de:** 15. **Esforço:** 5 h.

---

# BLOCO 3 — Edge Functions (etapas 25–31)

> **Objetivo:** 32 de 33 funções ainda não usam o middleware comum. O `_shared/auth.ts` existe e tem 40 testes Deno passando — o trabalho é de adoção, não de construção.

### Etapa 25 — Inventariar e classificar as 33 funções

**Ações:** para cada função registrar: autenticação atual, papéis exigidos, dados que toca, se é pública/cron/interna, e se tem teste. Priorizar por sensibilidade.

**Checkpoint:** inventário em `supabase/functions/README.md` com as 33 classificadas.
**Esforço:** 4 h.

---

### Etapa 26 — Migrar as funções P0 para `_shared/auth.ts`

**Ações:** migrar as que tocam papéis, PII ou dinheiro; usar os envelopes de erro `{code,message}` já padronizados (o front já os trata — ver commit `17d13ec1`); escrever teste Deno por função; validar 401/403/200.

**Checkpoint:** funções P0 sobre o middleware; testes Deno verdes; envelopes consistentes.
**Depende de:** 25. **Esforço:** 12 h.

---

### Etapa 27 — Migrar as funções restantes

**Ações:** mesma abordagem, em lotes; remover código de auth duplicado; unificar CORS via helper compartilhado.

**Checkpoint:** **33 de 33** importam `_shared/auth.ts`; 0 implementações locais de verificação de JWT.
**Depende de:** 26. **Esforço:** 16 h.

---

### Etapa 28 — Eliminar a duplicação `erp-api/index.ts` × `erp-api/handler.ts`

> ✅ **SUPERADA (2026-09-16)** — `erp-api/handler.ts` não existe mais no repo (histórico: removido após o PR #17); hoje apenas `index.ts` (316 linhas). Duplicação eliminada.


**Por quê:** achado 3.3 da análise técnica — lógica duplicada entre os dois arquivos, com autenticação insuficiente e código morto.

**Ações:** diferenciar os dois; escolher o autoritativo; extrair a lógica comum; remover o morto; adicionar testes; validar que nenhum consumidor externo quebrou.

**Checkpoint:** uma única implementação; testes cobrindo os caminhos de auth; código morto removido.
**Depende de:** 26. **Esforço:** 6 h.

---

### Etapa 29 — Resolver o TODO do webhook Bitrix24

> ✅ **SUPERADA (2026-09-16)** — zero TODOs em `bitrix24-sync`; verificação HMAC de webhooks padronizada em `_shared/auth.ts` (`verifyWebhook` com `timingSafeEqual`).


**Por quê:** achado 6.1 — webhook com TODO não implementado. Integração que aceita chamada e não processa é pior que integração ausente: falha em silêncio.

**Ações:** especificar o comportamento esperado; implementar com validação HMAC; tratar idempotência (webhooks repetem); registrar falhas em fila de retry; testar com payload real; documentar.

**Checkpoint:** webhook processa payload real; assinatura validada; reentrega duplicada não duplica efeito; falhas observáveis.
**Depende de:** 26. **Esforço:** 8 h.

---

### Etapa 30 — Rotação e escopo das credenciais de integração

**Ações:** inventariar credenciais (Bitrix24 OAuth, Resend, Twilio, Google); definir política de rotação; mover para secrets de Edge Function; documentar o procedimento; agendar a primeira rotação.

**Checkpoint:** nenhuma credencial de integração fora do cofre de secrets; política com data da próxima rotação.
**Depende de:** 7. **Esforço:** 4 h.

---

### Etapa 31 — Lock file verificado para imports Deno

**Por quê:** achado 3.5 — import map sem lock verificado. Um import remoto sem lock permite que o conteúdo mude sob os pés.

**Ações:** gerar `deno.lock`; commitá-lo; rodar CI com `--frozen`; migrar imports `deno.land` diretos para versões pinadas; validar integridade no pipeline.

**Checkpoint:** `deno.lock` commitado; CI com `--frozen` verde; 0 imports sem versão pinada.
**Esforço:** 4 h.

---

# BLOCO 4 — Integridade da medição e testes (etapas 32–39)

> **Objetivo:** hoje a cobertura reportada (23,31%) é medida sobre **7.305 statements** enquanto `src/` tem **141.724 linhas**. A métrica não está errada por pouco — ela mede outro universo. Consertar a régua vem antes de tentar subir o número.

### Etapa 32 — Corrigir o denominador da cobertura

**Por quê:** sem `all: true` e `include`, o v8 só instrumenta arquivos **importados por algum teste**. Arquivos sem teste nenhum não entram no denominador — quanto menos se testa, melhor parece o número. É o pior tipo de métrica: a que recompensa o descuido.

**Ações:**
1. Adicionar `all: true` e `include: ['src/**/*.{ts,tsx}']` à config de cobertura.
2. Definir `exclude` explícito e justificado (tipos gerados, barrels, `main.tsx`, mocks).
3. Re-medir e registrar o número **real** como novo baseline.
4. Recalibrar os thresholds para logo abaixo do real medido (impedir regressão, não travar o CI).
5. Publicar o antes/depois em `docs/estado/`.

**Checkpoint:** denominador coerente com o tamanho de `src/`; baseline real documentado; thresholds recalibrados.
**Esforço:** 3 h.

---

### Etapa 33 — Definir a estratégia de testes por camada

**Ações:** decidir o que é unit, integração e e2e neste projeto; definir metas por camada; priorizar por risco (as áreas P0 das Etapas 17 e 25 primeiro, não por facilidade); documentar em `docs/`.

**Checkpoint:** estratégia escrita e aprovada, com metas por camada e ordem de ataque.
**Depende de:** 32. **Esforço:** 4 h.

---

### Etapa 34 — Cobrir as regras de negócio críticas

**Por quê:** 50 arquivos de teste para 906 fontes. A prioridade não é o número — é que agendamento de máquina, cálculo de produção e controle de estoque não têm rede.

**Ações:** identificar as regras de negócio de maior impacto financeiro/operacional; escrever testes de unidade nelas; incluir casos de borda e erro; medir ganho real de cobertura nessas áreas.

**Checkpoint:** regras críticas com cobertura ≥ 80% de branches; casos de borda documentados.
**Depende de:** 33. **Esforço:** 20–30 h.

---

### Etapa 35 — Testes de integração dos fluxos de dados

**Ações:** testar hooks de React Query contra um Supabase local; validar cache, invalidação, retry e o caminho offline; cobrir `offlineStorage.ts` (hoje em **11,18%** de statements — o mais baixo de `lib/`, num app que se declara offline-first).

**Checkpoint:** fluxos de dados com teste de integração; `offlineStorage` ≥ 70%.
**Depende de:** 15, 33. **Esforço:** 16 h.

---

### Etapa 36 — Ampliar a cobertura E2E dos caminhos de negócio

**Ações:** após desbloquear o E2E (Etapa 3), mapear as jornadas críticas de ponta a ponta; escrever specs para as não cobertas pelos 17 existentes; estabilizar seletores; eliminar esperas por tempo fixo.

**Checkpoint:** jornadas críticas cobertas; 0 testes *flaky* em 5 execuções consecutivas.
**Depende de:** 3. **Esforço:** 16 h.

---

### Etapa 37 — Cobrir os módulos de exportação

**Por quê:** `pdfExport.ts` está em **0%** de cobertura e `lib-pdf` pesa 412 KB no bundle. Exportação quebrada costuma ser descoberta pelo cliente.

**Ações:** testar geração de PDF e Excel com dados representativos; validar estrutura da saída; cobrir o caminho de erro; incluir caso de dataset grande.

**Checkpoint:** `pdfExport` e `excelExport` ≥ 70%; teste de dataset grande passando.
**Depende de:** 32. **Esforço:** 8 h.

---

### Etapa 38 — Acessibilidade como gate

**Ações:** os specs `@axe-core/playwright` já existem — promovê-los de informativo a bloqueante; corrigir as violações encontradas; definir o nível-alvo (WCAG 2.1 AA); cobrir as páginas principais.

**Checkpoint:** 0 violações críticas de axe nas páginas principais; gate bloqueante.
**Depende de:** 3. **Esforço:** 10 h.

---

### Etapa 39 — Regressão visual estável

**Ações:** revisar os snapshots existentes; fixar viewport, fontes e animações; documentar como atualizar baseline conscientemente; integrar ao CI sem falso-positivo.

**Checkpoint:** regressão visual roda no CI com taxa de falso-positivo ≈ 0 em 10 execuções.
**Depende de:** 4. **Esforço:** 6 h.

---

# BLOCO 5 — Performance e PWA (etapas 40–44)

### Etapa 40 — Remover os 2,9 MB de Mermaid do bundle

**Por quê:** `lib-mermaid` é **2,9 MB** — o maior chunk, sozinho maior que o resto somado, num app de gestão de produção. Ou é usado em uma tela específica (e deve ser lazy), ou não é usado (e deve sair).

**Ações:**
1. Rastrear onde Mermaid é importado (`npm run graph:query`).
2. Se usado em uma tela: converter para import dinâmico dentro da rota.
3. Se não usado: remover a dependência.
4. Aplicar o mesmo exame a `lib-charts` (1,1 MB) e `lib-excel` (1.012 KB).
5. Medir o bundle antes/depois (o job `Bundle Diff vs main` já existe e passa).

**Checkpoint:** bundle inicial reduzido em ≥ 50%; Mermaid ausente do carregamento inicial; `Bundle Diff` registra o ganho.
**Esforço:** 6 h. **ROI: o mais alto do plano por hora investida.**

---

### Etapa 41 — Resolver o conflito de Service Worker

**Por quê:** achado 5.3 — `public/sw.js` manual coexistindo com `vite-plugin-pwa`. Dois service workers disputando escopo causam cache obsoleto servido a usuários, o bug mais difícil de diagnosticar remotamente.

**Ações:** determinar qual está efetivamente registrado em produção; escolher um (preferir o plugin); remover o outro; definir estratégia de cache por tipo de recurso; garantir atualização limpa para quem já tem o SW antigo instalado; testar o caminho de upgrade.

**Checkpoint:** um único SW registrado; usuário com SW antigo migra sem limpar cache manualmente; teste de upgrade documentado.
**Risco:** 🟠 usuários podem ficar presos em versão antiga. **Esforço:** 8 h.

---

### Etapa 42 — Paginação server-side nas listagens

**Por quê:** achado 4.1 — listagens sem paginação. Com 52 máquinas e histórico acumulando, o custo cresce linearmente até a página não abrir.

**Ações:** identificar as listagens sem paginação; implementar paginação por cursor no Supabase; ajustar os hooks de React Query; preservar filtros e ordenação; medir com volume realista.

**Checkpoint:** nenhuma listagem carrega tabela inteira; tempo de resposta estável com 10× o volume atual.
**Depende de:** 23. **Esforço:** 12 h.

---

### Etapa 43 — Tirar o logger do hot path

**Por quê:** achado 4.2 — logger síncrono com chamadas Supabase no caminho quente. O `client.ts` instrumenta **toda** chamada PostgREST; se o log é síncrono, cada request paga o custo de outro request.

**Ações:** tornar o envio assíncrono com buffer; agrupar em lote; descartar sob pressão em vez de bloquear; garantir que falha de telemetria nunca quebre a operação; medir o impacto.

**Checkpoint:** latência p95 das chamadas Supabase medida antes/depois com ganho registrado; falha do endpoint de log não afeta a UI.
**Esforço:** 6 h.

---

### Etapa 44 — Orçamento de performance no CI

**Ações:** definir budgets (tamanho de bundle, LCP, TTI); integrar Lighthouse CI; conectar com os Web Vitals já enviados ao Sentry; falhar o PR que estourar o budget.

**Checkpoint:** budgets definidos e aplicados; PR que regride performance é bloqueado.
**Depende de:** 40. **Esforço:** 6 h.

---

# BLOCO 6 — Arquitetura, CI/CD e sustentação (etapas 45–50)

### Etapa 45 — Consolidar `features/` × `components/`

**Por quê:** o `CLAUDE.md` documenta dois esquemas organizacionais paralelos. Ambiguidade estrutural em 906 arquivos multiplica o custo de toda mudança futura.

**Ações:** mapear o que está em cada esquema; definir a regra de decisão; migrar incrementalmente os casos mais ambíguos; proibir import por caminho profundo em features (usar barrels); adicionar lint de fronteira; atualizar o `CLAUDE.md`.

**Checkpoint:** regra escrita; lint de fronteira ativo; 0 imports profundos em `src/features`.
**Esforço:** 12 h (incremental, não big-bang).

---

### Etapa 46 — Revisar a árvore de providers

**Ações:** validar a ordem de dependência real; separar o que precisa ser global do que pode ser local à rota; medir o impacto de re-render; documentar a ordem e o porquê de cada posição.

**Checkpoint:** ordem documentada com justificativa por provider; nenhum provider global que só serve uma rota.
**Esforço:** 8 h.

---

### Etapa 47 — Eliminar a dívida de tipos

**Por quê:** 18 usos de `any` e 5 TODO — números **baixos** para 141k linhas. É barato fechar agora e caro deixar normalizar.

**Ações:** substituir cada `any` por tipo real ou `unknown` com narrowing; resolver ou registrar como issue cada TODO; regenerar os tipos Supabase e eliminar casts que escondem drift; ativar regra de lint contra `any` novo.

**Checkpoint:** 0 `any` sem supressão justificada; 0 TODO sem issue vinculada; lint bloqueia `any` novo.
**Depende de:** 16. **Esforço:** 6 h.

---

### Etapa 48 — Observabilidade e alertas

**Por quê:** achado 5.2 — ausência de monitoramento estruturado. Sentry está inicializado, mas capturar erro não é o mesmo que ser avisado.

**Ações:** definir os SLIs que importam (taxa de erro, latência de operações críticas, falha de sync offline); configurar alertas no Sentry com destinatário e limiar; criar dashboard operacional; definir severidades e quem responde; testar disparando um alerta real.

**Checkpoint:** alertas configurados e **testados end-to-end**; dashboard acessível; escalonamento documentado.
**Esforço:** 8 h.

---

### Etapa 49 — Runbooks operacionais

**Ações:** escrever runbooks para: rotação de credenciais, rollback de deploy, rollback de migration, recuperação de admin travado por MFA (Etapa 5), incidente de dados, falha de integração Bitrix24. Ensaiar ao menos dois.

**Checkpoint:** runbooks em `docs/runbooks/`; 2 ensaiados com resultado registrado.
**Depende de:** 5, 7, 30. **Esforço:** 10 h.

---

### Etapa 50 — Certificação final e ciclo de manutenção

**Ações:**
1. Reexecutar a matriz completa de gates.
2. Atualizar o scorecard do `plano-mestre-10-10.md` com os números **medidos** pós-execução.
3. Comparar contra o baseline da seção 0 deste documento, dimensão por dimensão.
4. Registrar as pendências que sobrarem, com responsável e prazo — sem `🟨` órfão.
5. Estabelecer a cadência de manutenção: revisão de dependências (semanal), auditoria de RLS (trimestral), revisão de acessos (trimestral), ensaio de runbook (semestral).
6. Atualizar `ESTADO_ATUAL.md` e `ANALISE_TECNICA_SISTEMA.md` — ambos descrevem um sistema anterior a este plano.

**Checkpoint:** scorecard atualizado com evidência por linha; 0 achado crítico aberto; calendário de manutenção com responsáveis nomeados.
**Depende de:** todas. **Esforço:** 8 h.

---

## Resumo executivo

| Bloco | Etapas | Esforço | Risco | Portão |
|---|---|---|---|---|
| 0 — Desbloqueio | 1–6 | ~20 h | 🔴 | PR #43 com 25/25 verdes |
| 1 — Fechar Bloco A | 7–14 | ~27 h | 🔴 | Bloco A em `main`, certificado |
| 2 — Banco e RLS | 15–24 | ~90 h † | 🔴 | 0 policies permissivas efetivas em P0/P1 |
| 3 — Edge Functions | 25–31 | ~54 h | 🟠 | 33/33 no middleware |
| 4 — Medição e testes | 32–39 | ~85 h | 🟡 | Cobertura real e regras críticas cobertas |
| 5 — Performance/PWA | 40–44 | ~38 h | 🟡 | Bundle −50%, SW único |
| 6 — Arquitetura/Ops | 45–50 | ~52 h | 🟢 | Scorecard certificado |
| **Total** | **50** | **~366 h** | | |

† Estimativa baseada na contagem **histórica** de policies. Reestimar após a Etapa 17 produzir a contagem efetiva — pode cair substancialmente.

### Regras de execução

1. **Portões são obrigatórios.** Nenhuma etapa de um bloco começa antes do portão do bloco anterior.
2. **Checkpoint não demonstrável = etapa não concluída.** Sem `✅` por autoavaliação — foi essa prática que produziu nove `🟨` no Bloco A.
3. **Etapas 🔴 exigem ensaio de rollback antes da aplicação em produção.** Sem exceção para as etapas 5, 19, 20 e 22.
4. **Toda correção de segurança nasce com teste de regressão.** Correção sem teste regride.
5. **Medir antes e depois.** As etapas de performance (23, 40, 42, 43) só fecham com número comparável.

### Três decisões que travam o resto

Estas dependem de pessoas, não de código, e devem ser tomadas **antes** de a execução começar:

1. **Qual é o projeto Supabase canônico?** (Etapa 1) — trava 7 etapas.
2. **Quando aplicar o breaking change de MFA AAL2?** (Etapa 5) — exige janela e comunicado.
3. **A rotação de segredos do migrate-helper já foi feita?** (Etapa 7) — se não, o incidente segue **aberto**, independentemente do código já removido.
