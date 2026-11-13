# AGENTS.md — Fast Gravações V2

Regras do dono para qualquer agente de IA; vencem `docs/` (relatórios, auditorias, handoffs e planos =
histórico). Detalhe em `docs/agentes/<tema>.md`, citado aqui como "ler quando"; divergiu da realidade →
corrija no mesmo PR do fix. Sempre em PT-BR.

## Postura

Sistema ~80% pronto, em manutenção. O dono não é dev: decide negócio, o agente executa a engenharia
inteira via MCP (GitHub, Supabase, Vercel, infra). Qualidade + velocidade com o mínimo de tokens: isso
decide ferramenta, leitura, diff e resposta.

1. Nunca "copie e cole"/"roda aí"/"você faz X e eu faço Y", nem passo manual do dono (revisar diff,
   rodar comando, testar local). Decida como dev sênior; pergunte só com custo, arquitetura, dado
   destrutivo em produção, trade-off de negócio ou item 8 do Fluxo Git. Para ler, não peça permissão.
2. Verdade acima de validação: não sabe/falhou → diga; nunca "testado" sem ter rodado. Afirmação sobre
   código cita evidência (arquivo:linha, diff, saída) ou vira "NÃO VERIFICADO" + motivo. Branch, commit
   e PR não provam nada — leia o código.
3. Diff mínimo, zero churn: causa raiz, não reescrita; não refatore, renomeie ou comente o que não foi
   pedido; não reescreva arquivo inteiro por 3 linhas. Dependência nova ou bump major só se
   indispensável (avise na PR).
4. `APROVADO` = execute o plano como descrito, sem reconfirmar.
5. Uma tarefa por vez, cada uma com sua branch/PR. Outro bug → "Próximos passos". Travou (acesso, MCP,
   dependência) → erro exato e pare; não contorne regra. Releia o pedido antes de concluir.
6. Tokens: só o trecho necessário (range, grep); grafo antes de busca por texto; exploração ampla →
   subagente; nenhuma tool "por garantia"; não gere código que não será aplicado.
7. Segredos só em env/secret do serviço; nunca imprima nem commite `.git-credentials`, `.env.local`,
   token, chave de API ou service_role.
8. **Antes de qualquer tarefa**: `git fetch origin contexto && git show
   origin/contexto:docs/contexto/00-INDEX.md` — estado real de código, banco e regras, regerado a cada
   10 min; a branch `contexto` é gerada: nunca edite nem abra PR dela (`docs/agentes/contexto.md`).

## Bugs e funcionalidades

- Diagnóstico antes de patch: logs e estado real (banco, request, worker), ponto exato (arquivo:linha) e
  causa; várias causas → liste todas, corrija a pedida.
- Antes da PR: typecheck/lint/testes do que tocou. Só erro seu conta; herdado da `main` → "Próximos
  passos". Nunca desabilite ou quarentene teste para ficar verde.
- "Pronto" = PR mergeada + deploy confirmado + comportamento verificado (log, query ou request real);
  faltou um → diga onde parou.
- Funcionalidade pronta = integrada ponta a ponta (componente usado, rota registrada, entrada na UI,
  serviço/hook chamado, edge function invocada e registrada, tabela/coluna com RLS, estados
  erro/loading/vazio, handler e submit), sem mock, hardcode ou TODO. Fluxo incompleto (cria sem
  editar/excluir, lê sem salvar) = pela metade.
- Não cabe na sessão → entregue o funcional e integrado e liste o que falta, em ordem, com arquivos;
  nunca deixe código morto ou feature "quase" sem dizer.

## Comunicação

- Resultado primeiro, só o que muda decisão do dono. Sem introdução, recapitulação, narração, "vou fazer
  X", hedging, disclaimer, lição de moral, desculpa ou cortesia. O que mudou e o efeito no negócio;
  técnica só se perguntarem. Nunca "quer que eu faça?" depois de pedido, nem plano de 12 fases para fix
  de 20 linhas.
- Proporcional: fix de 3 linhas = 5 linhas; não despeje log/arquivo — cite a linha que importa; caminhos,
  comandos e links completos. Destrutivo de verdade: uma linha ("isso apaga X, sem volta — confirma?").
- Fecho único e obrigatório após execução (fix, deploy, migração, auditoria, PR): `Próximos passos` com 3
  itens `N. [título] — [por quê] · [repo/arquivo/camada]`, por impacto, do que viu nesta sessão (nada
  genérico: testes, documentação, segurança), executáveis por você via MCP, para não-dev. É menu: `1`,
  `1 e 3`, `APROVADO 2`, "todos" ou o bloco colado = executar na ordem, sem reconfirmar. Consulta, 3
  rejeitados ou nada pendente → `Próximos passos: nada pendente neste escopo.`

## Nunca

Reaproveitar branch · commitar em `main` ou em branch que não criou nesta sessão · mergear item 8 do Fluxo Git ·
expandir escopo ou consertar o que não pediram, mesmo quebrado · ler repo inteiro para achar 1 função ·
dizer "testado/validado" sem evidência real.

## Fluxo Git — detalhe em `docs/agentes/github-ci.md`

Escrita em repos `adm01-debug`: MCP **`GITHUB - MCP - FOREVER`** (o padrão dá 403 em write; `git push`/
`gh` só com repo autorizado na sessão); `github_push_files` manda `files` + `delete` num commit.

1. Nunca em `main`; toda mudança em branch própria.
2. Só escreva em branch que **você** criou nesta sessão; branch alheia ou já existente é somente leitura.
3. Antes de começar, liste as PRs abertas e seus arquivos via `github_graphql` (`github_list_pull_requests`
   estoura o contexto). PR aberta nos mesmos arquivos → pare e avise.
4. Branch de `main` atualizado: `claude/<fix|feat|chore|infra>-<slug>-<AAMMDD-HHMM>` (sem carimbo, não
   aceito); uma tarefa = uma branch = uma PR. Antes do push, o último commit deve ser seu.
5. Commit PT-BR, 1 atômico, `<tipo>(<escopo>): <assunto>` com os tipos do commitlint; **não há `infra`**
   — branch `infra` → `chore:`/`ci:`.
6. PR sempre: título = o que muda; corpo = causa + o que foi verificado, com evidência.
7. Mergeie sem aprovação PR sua pronta (CI verde, sem conflito, escopo comum: front, edge function,
   workflow, config): squash e apague a branch. Exceção: 8.
8. **Deixe aberta e chame o dono**: DDL/migration em produção; CI/workflows, segredos, Dockerfile,
   stack/Swarm, Traefik; deleção de dado, arquitetura ou custo; conflito com PR de outro agente.
9. Conflito: rebase em `main`; `--force-with-lease` só na sua branch; nunca force-push em `main` nem mexa
   em branch alheia. PR `BEHIND` → atualize (`strict` ligado na `main`).
10. Merge = produção: confira o deploy e reporte. CI vermelha → leia o resumo da falha antes de patch; do
    seu merge → `fix:` em branch nova.
11. Fim: link da PR + estado (mergeada / aguardando o dono / CI vermelha e por quê).

## Banco — ler `docs/agentes/banco.md` antes de SQL, migration ou deploy

- Oficial: Supabase Cloud **`uoujzvpecohinketylud`**; produção só leitura. Refs proibidos e a
  divergência do ADR 0001: `banco.md`.
- **Migration no repo é histórico, não estado**: o que existe está em `docs/contexto/supabase/` — confira
  lá antes de criar coluna, índice ou policy.
- DDL só pelo fluxo de `banco.md` (arquivo → PR → merge → `deploy.yml` aplica), nunca de branch aberta
  nem do painel; forward-only. DDL em produção cai no item 8 do Fluxo Git.
- Tabela/coluna nova precisa de RLS. `src/integrations/supabase/client.ts` e `types.ts` são gerados.
- Destrutivo, segredo e rotação: só com o dono. Regra que só o negócio sabe →
  `docs/contexto/regras/manual/*.md` na `main`.

## Serviços

- **Vercel** — ler `docs/agentes/vercel-deploy.md` ao confirmar deploy ou mexer em env/domínio/CSP.
  Merge em `main` = deploy de produção; nenhum workflow deploya o front. O código exige
  `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`; `VITE_*` é público no bundle — chave de API só
  em secret de Edge Function.
- **GitHub/CI** — ler `docs/agentes/github-ci.md` ao mexer em workflow, settings ou branch protection, e
  quando merge ou workflow falhar de forma estranha. Único check obrigatório na `main`:
  `Quality Gate ✅` (nele, o job `e2e` é advisory). `db-admin.yml`, `migration-repair.yml` e
  `visual-baselines.yml` são `workflow_dispatch`.
- **Edge Functions** — Deno em `supabase/functions/<nome>/`, helpers em `_shared`, deploy pelo
  `deploy.yml`; segredo por `supabase secrets set`/painel, nunca no código.

## Stack e comandos — detalhe em `docs/agentes/mapa-repo.md`

- Vite, React 18, TS, Tailwind/shadcn, TanStack Query, Zod/RHF, i18next (PT-BR); Supabase Postgres + RLS
  + Edge Functions Deno. Alias `@/` → `src/`. Provider tree, rotas, features e testes:
  `docs/agentes/arquitetura.md`.
- Pacotes: npm (`npm ci --legacy-peer-deps`, como o CI), não bun.
- `npm run dev` · `build` · `lint` · `test` (um arquivo: `npx vitest run <caminho>`) · `test:e2e` ·
  `quality:any` · `quality:gate`; typecheck é
  `npx tsc --noEmit -p tsconfig.app.json && npx tsc --noEmit -p tsconfig.node.json` (sem `-p` não
  verifica nada).
- Husky: `pre-commit` = lint-staged + `scripts/check-any-baseline.mjs`; `commit-msg` = commitlint.
- Ler quando precisar: `docs/operacoes/RUNBOOK.md` (deploy, rollback, restore), `docs/adr/` e
  `ANALISE_TECNICA_SISTEMA.md` (RLS permissiva, CORS wildcard e outras dívidas conhecidas — leia antes de
  assumir que o comportamento atual é intencional).

## Grafo de código (graphify)

`npm run graph:doctor|build|check`. Antes de mudança cross-file:
`npm run graph:query -- "símbolo módulo" --budget 1500` e confira as linhas citadas; `graph:affected`,
`graph:path`, `graph:explain`; `--profile security|frontend|backend` para escopo menor. Mudou código →
`graph:build`. Artefatos e venv locais/ignorados; sem hooks nativos sobre o Husky. O snapshot do
árvore Python (`graph:build`) vive em `graphify-out/`, e o do motor local (`graphify-local.mjs`,
disparado por `automation graph`) em `graphify-local-out/` — são independentes e ambos ignorados.
Limites:
`docs/agentes/graphify.md`.
