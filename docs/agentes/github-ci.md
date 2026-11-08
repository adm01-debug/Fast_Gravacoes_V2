# GitHub, CI e workflows — referência para agentes

Ler quando mexer em `.github/workflows/`, settings do repo ou branch protection, e quando um merge ou um
workflow falhar de forma estranha. Resumo das regras está em `AGENTS.md` (Fluxo Git); aqui está o detalhe.

## Escrita no GitHub

Repo `adm01-debug/Fast_Gravacoes_V2`, **público**, default branch `main`. Escrita (commit, PR, merge,
settings) pelo MCP **`GITHUB - MCP - FOREVER`** — o MCP padrão do GitHub devolve 403 em write;
`git push`/`gh` só funcionam se o repo estiver autorizado na sessão.

- `github_push_files` manda `files` + `delete` num único commit — use para o commit atômico.
- Liste PRs abertas com `github_graphql` (`pullRequests(states:OPEN)` + `files`); `github_list_pull_requests`
  estoura o contexto.

## Perímetro — estado canônico (confirmado por MCP)

Branch protection de `main` (`github_get_branch_protection`):

| Item | Valor |
|---|---|
| Check obrigatório | **`Quality Gate ✅`** — um só |
| `strict` (PR atualizada com `main`) | **`true`** → PR `BEHIND` não mergeia; atualize a branch |
| Reviews exigidas | **nenhuma** (chave ausente) |
| `required_conversation_resolution` | **`true`** → comentário não resolvido bloqueia o merge, mesmo com CI verde |
| `enforce_admins` | `false` |
| Force push / deleção de `main` | bloqueados |
| Histórico linear, assinatura | não exigidos |

Settings do repo (`github_get_repo`): `squash`, `merge commit` e `rebase` estão **os três habilitados** —
o repo não força squash; a regra de squash é de processo (`AGENTS.md`), não do GitHub.
`delete_branch_on_merge: true` (a branch é apagada no merge), `allow_auto_merge: true`,
`allow_update_branch: true`. Secret scanning e push protection ativos; Dependabot security updates
desativado. `homepage: https://fast-gravacoes-v2.vercel.app`.

Mudou o perímetro (checks obrigatórios, `strict`, permissões de merge)? É item "chame o dono" —
PR aberta, sem merge.

## `ci.yml` — `CI — Quality Gates`

Gatilho: `push` só em `main`, `pull_request` com base `main`, `workflow_dispatch`. `push` em outras
branches foi removido de propósito (duas runs por commit com grafos diferentes de jobs davam dois
resultados para o mesmo SHA — comentário no topo do arquivo). `concurrency: ci-<ref>` com
`cancel-in-progress: true`; `permissions: contents: read` (só `bundle-diff` amplia, para comentar na PR).
Node 24 + `npm ci --legacy-peer-deps --no-fund` em todos os jobs.

| Job | Nome | O que roda |
|---|---|---|
| `lint` | Lint & Type Check | guard de artefato de tooling sob `supabase/functions/`; `npm run lint -- --max-warnings 9999`; `npx tsc --noEmit -p tsconfig.app.json` e `-p tsconfig.node.json`; `npm run quality:any` |
| `security` | Security Scan | `node scripts/audit-gate.mjs`; TruffleHog (`fetch-depth: 0`, sem `--only-verified`); guard de CORS wildcard em `supabase/functions/` e `src/` |
| `unit-tests` | Unit & Integration Tests | `npm run test:coverage`; limiares reais em `vitest.config.ts` (lines 34, statements 32, functions 27, branches 26 — **só subir**) |
| `deno-tests` | Edge Functions (Deno) | `deno check --frozen` em `_shared/auth.ts` + cada `functions/*/index.ts`; `deno test --frozen` nos `_shared/*.test.ts` |
| `simulation-tests` | Simulation & Fuzz Tests | 4 suítes: `webhookSimulation`, `webhookFuzz`, `erpApiContracts`, `loadStress` |
| `build` | Production Build | `npm run build` (com `VITE_E2E_TEST_HOOKS=true`) + `npm run bundle:report` (budgets de `bundle-budget.json`); o `dist/` é CI-only, consumido pelo E2E, **nunca deployado** |
| `bundle-diff` | Bundle Diff vs main | só em PR; compara com o report da `main` e comenta na PR; **não** entra no gate |
| `e2e` | E2E Tests (Playwright) | `--project=chromium --workers=1` (MFA real + rate limit do GoTrue); falha fechado se faltar secret |
| `rls-regression` | RLS Regression | `node scripts/rls-regression.mjs` contra produção (INSERT negado); falha fechado sem secret |
| `quality-gate` | **Quality Gate ✅** | agrega os 8 jobs; é o único check obrigatório |

Duas armadilhas de leitura do gate:

1. **`e2e` é advisory**: falha dele imprime `⚠️` e **não** reprova o `Quality Gate ✅` (suíte em
   quarentena, nunca ficou verde de forma estável). Verde no gate não significa E2E verde.
2. `skipped`, `cancelled` e `abandoned` contam como OK ("superseded by newer push") — run cancelada por
   concorrência não reprova.

## Demais workflows

| Workflow | Gatilho | O que faz |
|---|---|---|
| `deploy.yml` | `push` em `main` + dispatch | Aplica migrations (`supabase db push --yes`) e depois `supabase functions deploy`. **Não deploya o front.** Detalhe em `docs/agentes/banco.md` e `vercel-deploy.md` |
| `contexto.yml` | `push` em `main` (paths) + cron `3-59/10` + dispatch | Regenera a branch `contexto` (código, banco, regras). Único workflow com `contents: write` (job `publicar`) |
| `graphify.yml` | `pull_request` (paths) + dispatch | Constrói o grafo, diffa contra a base, `graph:check`/`audit`/`benchmark`/`ratchet` |
| `visual-baselines.yml` | **dispatch only** | Gera os snapshots de regressão visual no ambiente do CI; o artifact é commitado à mão. Sem `concurrency` |
| `db-admin.yml` | **dispatch only** (`mode: inspect\|apply`) | GUCs `app.settings.*` e secrets de Edge Function; `apply` só na `main` |
| `migration-repair.yml` | **dispatch only** (`inspect_only`) | Reconcilia o histórico de migrations para desbloquear `db push` |

Secrets usados (só nomes): `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_ID`, `SUPABASE_DB_PASSWORD`,
`SUPABASE_DB_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`,
`VITE_ALERT_WEBHOOK_URL`, `E2E_EMAIL`, `E2E_PASSWORD`, `E2E_TOTP_SECRET`, `E2E_OPERATOR_EMAIL`,
`E2E_OPERATOR_PASSWORD`. Valor de secret nunca entra em log — mascare antes de usar.

## Commit e hooks

`.husky/pre-commit`: `npx lint-staged` + `node scripts/check-any-baseline.mjs`.
`.husky/commit-msg`: `npx --no -- commitlint --edit ${1}`.
`commitlint.config.js` só faz `extends: ['@commitlint/config-conventional']` — não há `type-enum`
próprio, então vale o do preset: `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`,
`revert`, `style`, `test`. **`infra` não existe** no enum: branch `infra` commita como `chore:` ou `ci:`.
`lint-staged` roda `eslint --fix --max-warnings 9999` em `*.{ts,tsx}`.

## Guards que você pode rodar antes da PR

```bash
npm run lint -- --max-warnings 9999
npx tsc --noEmit -p tsconfig.app.json && npx tsc --noEmit -p tsconfig.node.json
npm run quality:any                      # = node scripts/check-any-baseline.mjs (baseline 0)
node scripts/audit-gate.mjs              # npm audit com allowlist por advisory
npm run test:coverage                    # limiares do vitest.config.ts
npm run build && npm run bundle:report   # budgets de bundle-budget.json
node scripts/ci/check-claude-md-integrity.mjs   # instruções para agentes não encolheram
node scripts/bundle.test.mjs             # testes dos scripts de bundle (não roda em CI)
```

Edge Functions: `deno check --frozen supabase/functions/_shared/auth.ts supabase/functions/*/index.ts` e
`deno test --frozen --allow-env --allow-read=supabase/functions/_shared supabase/functions/_shared/*.test.ts`.

`npm run quality:gate` encadeia lint + `any` + test. **Não existe** script `typecheck` — o CI chama `npx
tsc` direto, por projeto, porque o `tsconfig.json` raiz é solution file com `files: []`.

## CI vermelha

Leia o resumo da falha antes de qualquer patch (`github_get_run_failure_summary`). Falha que veio do seu
merge se corrige em branch `fix:` nova na mesma sessão — nunca com commit direto em `main`, nunca
desabilitando ou quarentenando teste para ficar verde.
