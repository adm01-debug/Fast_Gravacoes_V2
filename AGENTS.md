# AGENTS.md

Regras do dono para qualquer agente de IA; se `docs/` contradisser, este arquivo vence (relatórios, auditorias, handoffs, planos = histórico). Sempre em PT-BR.

<!-- 1–6 = texto-mestre adm01-debug 2026-11-02: mudou aqui, mude em todos os repos. -->

## 1. Contexto

Sistema ~80% pronto, em manutenção. O dono não é dev: decide negócio, o agente executa engenharia. Princípio: qualidade + velocidade — máximo de tarefas com êxito total pelo caminho mais rápido e barato em tokens; isso decide ferramenta, leitura, diff e resposta.

## 2. Como trabalhar

1. End-to-end via MCP (GitHub, Supabase, Vercel, infra). Nunca "copie e cole"/"roda aí"/"você faz X e eu faço Y".
2. Decida como dev sênior; pergunte só com custo, mudança de arquitetura, dado destrutivo em produção, trade-off real de negócio ou item 6.8. Para ler/inspecionar, nunca peça permissão.
3. Verdade acima de validação: não sabe/falhou → diga; nunca afirme ter testado o que não rodou. Afirmação sobre código cita evidência (arquivo:linha, diff, saída) ou vira "NÃO VERIFICADO" + motivo. Branch/commit/PR não provam nada — leia o código.
4. Diff mínimo, zero churn: causa raiz, não reescrita. Não refatore, renomeie, "melhore" ou comente o que não foi pedido; não reescreva arquivo inteiro por 3 linhas. Dependência nova ou bump major só se indispensável — e avise na PR.
5. `APROVADO` = execute o plano exatamente como descrito, sem reconfirmar.
6. Uma tarefa por vez; vários itens = em sequência, cada um com branch/PR. Outro bug? Não conserte — anote em "Próximos passos". Travou (acesso, MCP, dependência) → erro exato e pare; não pivote nem contorne regra. Antes de concluir, releia o pedido.
7. Tokens: só o trecho necessário (range, grep); grafo (§9) antes de busca por texto; exploração ampla → subagente. Sem tool "por garantia", código não aplicado ou replanejar a cada turno.
8. Segredos nunca em código, commit ou resposta — só em env/secret do serviço.

## 3. Bugs e features

- Diagnóstico antes de patch: logs e estado real (banco, container, worker, request), ponto exato (arquivo:linha) e causa; várias causas → liste todas, corrija a pedida.
- Antes da PR: typecheck/lint/testes dos arquivos tocados; só erro seu conta; herdado do `main` → "Próximos passos".
- Bug "pronto" = PR mergeada + deploy confirmado + comportamento verificado (log, query ou request real); faltou um → diga onde parou.
- Feature "pronta" = integrada de ponta a ponta (componente usado, rota registrada, entrada na UI, serviço/hook chamado, edge function invocada e registrada, tabela/coluna com RLS, estados erro/loading/vazio, handler e submit), sem mock, hardcode ou TODO/WIP; fluxo incompleto (cria sem editar/excluir, lê sem salvar) = pela metade.
- Não cabe na sessão → entregue o funcional e integrado e liste o que falta, em ordem, com arquivos; nunca deixe código morto ou feature "quase" sem dizer.

## 4. Comunicação

- Resultado primeiro; só o que muda decisão do dono. Sem introdução, recapitulação, resumo, "vou fazer X", meta-comentário, hedging, disclaimers, desculpas, lição de moral, cortesia. O que mudou e o efeito no negócio; técnica só se perguntarem.
- Proporcional: fix de 3 linhas = 5 linhas; não despeje log/arquivo — cite a linha que importa; caminhos, comandos e links completos. Destrutivo de verdade: uma linha ("isso apaga X, sem volta — confirma?").
- Fecho único e obrigatório após execução (fix, deploy, migração, auditoria, PR): `Próximos passos` com 3 itens `N. [título] — [por quê] · [repo/arquivo/camada]`, por impacto, do que viu nesta sessão (nada genérico: "testes/docs/segurança"), executáveis por você via MCP, para não-dev. É menu: `1`, `1 e 3`, `APROVADO 2`, "todos" ou o bloco colado = executar na ordem, sem reconfirmar. Consulta, 3 rejeitados ou nada pendente → `Próximos passos: nada pendente neste escopo.`

## 5. Nunca

Reaproveitar branch · commitar em `main` ou em branch que não criou nesta sessão · mergear item 6.8 · passo manual do dono quando há MCP (revisar diff, rodar comando, testar local) · narrar o que faz · "quer que eu faça?" depois de pedido · plano de 12 fases para fix de 20 linhas · ler repo inteiro para 1 função · expandir escopo ou consertar o que não pediram · "testado/validado" sem evidência · imprimir ou commitar `.git-credentials`, `.env.local`, tokens, chaves de API, service_role.

## 6. Fluxo Git

Escrita em repos `adm01-debug`: MCP `GITHUB - MCP - FOREVER` (o padrão dá 403; `git push`/`gh` só com repo autorizado).

1. Nunca em `main`; toda mudança em branch própria.
2. Só escreva em branch que você criou nesta sessão; branch alheia é somente leitura, sempre.
3. Antes de começar, liste PRs abertas (e arquivos) via `github_graphql` (não `github_list_pull_requests`: estoura o contexto). PR aberta nos mesmos arquivos → pare e avise.
4. Branch de `main` atualizado: `claude/<fix|feat|chore|infra>-<slug>-<AAMMDD-HHMM>` (sem carimbo, não aceito); uma tarefa = uma branch = uma PR. Antes do push, o último commit deve ser seu; senão pare e avise.
5. Commits curtos em PT-BR com tipo do commitlint (`fix`, `feat`, `chore`, `ci`, `docs`, `refactor`, `test`…; `infra:` é rejeitado — branch `infra` commita como `chore:`/`ci:`); de preferência 1 commit atômico (`github_push_files` faz `files`+`delete` juntos).
6. PR sempre: título = o que muda; corpo = causa + o que foi verificado, com evidência.
7. Mergeie sem aprovação PRs suas prontas (CI verde, sem conflito, escopo comum: front, edge function, workflow, config): squash e apague a branch. Exceção: 8.
8. Deixe aberta e chame o dono: DDL/migration em produção; CI/workflows, segredos, Dockerfile, stack/Swarm, Traefik; deleção de dado, arquitetura ou custo; conflito com PR alheia.
9. Conflito: rebase em `main`; `--force-with-lease` só na sua branch; nunca force-push em `main` nem mexa em branch alheia.
10. Merge = produção (Vercel; `deploy.yml` aplica migrations e Edge Functions). Confira o deploy e reporte. CI vermelha → leia o resumo antes de patch; se foi seu merge, branch `fix:` nova na mesma sessão.
11. Reporte: link da PR + estado (mergeada / aguardando o dono / CI vermelha e por quê).

## 7. Stack e IDs

- Repo `adm01-debug/Fast_Gravacoes_V2` · deploy Vercel · Supabase `uoujzvpecohinketylud`.
- Vite, React 18, TS, Tailwind/shadcn, TanStack Query, Zod/RHF, i18next (PT-BR); Supabase: Postgres + RLS + Edge Functions Deno. Alias `@/` → `src/`. `src/integrations/supabase/client.ts` e `types.ts` são gerados — não editar.
- Env (`.env.example`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`; `VITE_*` é público — chaves de API só em secrets de Edge Function.
- `ANALISE_TECNICA_SISTEMA.md`: problemas conhecidos — leia antes de assumir que o atual é intencional.
- Ler: `docs/agentes/arquitetura.md`, `docs/operacoes/RUNBOOK.md`, `docs/adr/`.
- **Antes de qualquer tarefa ou planejamento**: `git fetch origin contexto && git show origin/contexto:docs/contexto/00-INDEX.md`
  — estado real de código, banco de produção e regras de negócio, regerado a cada 10 min pelo `contexto.yml`
  (branch `contexto`, gerada: nunca edite nem abra PR dela). Como usar: `docs/agentes/contexto.md`.
  Migration no repo é histórico, não estado: o que existe no banco está em `docs/contexto/supabase/`.
  Regra que só o negócio sabe → `docs/contexto/regras/manual/*.md` na `main`.

## 8. Comandos e CI

- `npm run dev` · `npm run build` · `npm run lint` · `npx tsc --noEmit -p tsconfig.app.json && npx tsc --noEmit -p tsconfig.node.json` · `npm run test` (Vitest) · `npm run test:e2e` (Playwright).
- Pacotes: npm (`npm ci --legacy-peer-deps`, como o CI), não bun.
- Husky: `pre-commit` = lint-staged + `scripts/check-any-baseline.mjs`; `commit-msg` = commitlint.
- CI (`ci.yml`): lint+tsc, `any`, audit, TruffleHog, unit+coverage (limiares só sobem), Deno, fuzz, build+bundle, e2e, RLS; check obrigatório na `main`: `Quality Gate ✅`. `db-admin.yml`/`migration-repair.yml` só `workflow_dispatch` (6.8).

## 9. Graphify

`npm run graph:doctor|build|check`. Antes de mudança cross-file: `npm run graph:query -- "símbolo módulo" --budget 1500` e confira as linhas citadas; `graph:affected|path|explain`; `--profile security|frontend|backend`. Mudou código → `graph:build`. Artefatos e venv locais/ignorados; sem hooks nativos sobre o Husky. Interpretar: `docs/agentes/graphify.md`.
