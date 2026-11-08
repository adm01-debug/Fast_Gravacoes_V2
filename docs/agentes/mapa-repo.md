# Mapa do repositório — referência para agentes

Ler quando precisar saber **onde fica algo** antes de buscar por texto. Arquitetura e convenções de
código em profundidade: `docs/agentes/arquitetura.md`. Regras operacionais: `AGENTS.md`.

## Onde olhar primeiro

1. **Estado real** (código, banco, regras de negócio) — branch gerada `contexto`:
   `git fetch origin contexto && git show origin/contexto:docs/contexto/00-INDEX.md`.
   Como usar: `docs/agentes/contexto.md`.
2. **Grafo de código** antes de grep: `npm run graph:query -- "símbolo módulo" --budget 1500`
   (limites: `docs/agentes/graphify.md`).
3. **Problemas conhecidos** antes de assumir que o comportamento atual é intencional:
   `ANALISE_TECNICA_SISTEMA.md`.
4. **Operação** (deploy, rollback, backup, incidentes): `docs/operacoes/RUNBOOK.md`.

## Mapa rápido

| Preciso de… | Caminho |
|---|---|
| Rotas (arquivo único, tudo lazy) | `src/routes/AppRoutes.tsx` |
| Árvore de providers (ordem importa) | `src/providers/AppProviders.tsx` + `ProviderComposer.tsx` |
| Páginas | `src/pages/` (58 `.tsx`) |
| Domínios verticais | `src/features/` — `admin`, `analytics`, `auth`, `inventory`, `jobs`, `maintenance`, `notifications`, `packaging`, `production` |
| UI por área + primitivos shadcn | `src/components/<área>/`, `src/components/ui/` |
| Contexts globais | `src/contexts/` (14) |
| Utilitários e resiliência (retry, circuit breaker, rate limit, offline, export, logger) | `src/lib/` |
| Paginação obrigatória do PostgREST | `src/lib/fetchAllRows.ts` (ADR 0003) |
| Schemas Zod | `src/schemas/`, `src/lib/schemas/`, `src/features/<dom>/types/*.schema.ts` |
| Cliente e tipos Supabase (**gerados, não editar**) | `src/integrations/supabase/client.ts`, `types.ts` |
| Guard de env no boot | `src/lib/envGuard.ts` |
| i18n | `src/i18n/index.ts`, `src/i18n/locales/` (ADR 0004) |
| Edge Functions (Deno) | `supabase/functions/<nome>/`, helpers em `_shared/`; inventário em `README.md` e gatilhos em `REGISTRY.md` da mesma pasta |
| Migrations (histórico, não estado) | `supabase/migrations/` (243 `.sql`) |
| Matriz de ambientes / refs proibidos | `supabase/ENVIRONMENTS.md` |
| Testes unitários | ao lado do código + `src/test/` (65 arquivos `*.test.ts*`); config em `vitest.config.ts` |
| Testes E2E | `tests/e2e/*.spec.ts` (18) + `helpers/`; config em `playwright.config.ts` (porta 8090, `npm run preview`) |
| Budgets de bundle | `bundle-budget.json` |
| Baseline de `any` | `.any-baseline.json` (hoje 0) |

Escala atual: 977 arquivos em `src/`, 35 pastas em `supabase/functions/` (34 functions + `_shared`).

Dois esquemas de organização convivem — `src/features/<domínio>/` (barrel `index.ts`, importar de fora
por `@/features/<dom>`; de dentro, caminho profundo, senão cria ciclo) e `src/components/<área>/`.
Respeite o esquema do módulo que você está tocando.

## Automações (`scripts/`)

| Item | O que faz |
|---|---|
| `audit-gate.mjs` | `npm audit` com allowlist por advisory; roda no CI e no deploy |
| `check-any-baseline.mjs` | Ratchet de `any` (`npm run quality:any`, hook `pre-commit`) |
| `bundle-report.mjs` · `bundle-diff.mjs` · `bundle.test.mjs` | Relatório/diff de bundle e budgets (o `.test.mjs` não roda em CI) |
| `rls-regression.mjs` | Teste negativo de RLS contra produção (job do CI) |
| `graphify.mjs` + `graphify/` | Todos os `npm run graph:*` (frontend Node + pipeline Python) |
| `ci/check-claude-md-integrity.mjs` | Garante que `AGENTS.md` + `docs/agentes/` não foram apagados ou esvaziados |
| `ai-context/` | Produtor da fonte "código" do contexto (`gerar.mjs`, zero deps) |
| `supabase_snapshot/` | Produtor da fonte "banco" (snapshot read-only do projeto oficial) |
| `regras_negocio/` | Produtor da fonte "regras de negócio" + índice + `publish.sh` |

Automação nova vai em `scripts/<nome>/` com README — nunca dentro de `supabase/` nem de `src/`.

## Comandos

```bash
npm run dev            # Vite em http://localhost:8090
npm run build          # build de produção
npm run preview        # serve o build (porta 8090; usado pelo e2e)
npm run lint
npx tsc --noEmit -p tsconfig.app.json && npx tsc --noEmit -p tsconfig.node.json
npm run test                      # Vitest; um arquivo: npx vitest run <caminho>
npm run test:coverage             # limiares em vitest.config.ts (só sobem)
npm run test:e2e                  # Playwright; --project=chromium|mobile-chrome
npm run quality:any               # ratchet de any
npm run quality:gate              # lint + any + test
npm run bundle:report             # precisa de dist/ (rode build antes)
```

Pacotes: **npm**, `npm ci --legacy-peer-deps` — é o que todos os workflows rodam. `bun.lock` e
`bun.lockb` estão commitados e `bun install` funciona, mas nenhum workflow usa: não misture.
Não existe script `typecheck`; o `tsconfig.json` raiz é solution file com `files: []`, então
`npx tsc --noEmit` sem `-p` não verifica nada.

## Documentos: vigente × histórico

**Vigente:** `AGENTS.md` (regras; `CLAUDE.md` é só `@AGENTS.md`), `docs/agentes/*`, `README.md`,
`docs/ARCHITECTURE.md`, `docs/operacoes/` (RUNBOOK, LGPD, retenção, OpenAPI das edges), `docs/adr/`,
`docs/graphify/`, `supabase/ENVIRONMENTS.md`, `supabase/functions/README.md` e `REGISTRY.md`,
`tests/e2e/README.md`, `docs/contexto/regras/manual/`, `.hermes.md`.
Referência datada mas útil: `ANALISE_TECNICA_SISTEMA.md`, `docs/estado/rls-inventario.md`,
`docs/estado/exec-sql-acl.md`, `docs/post-mortems/`.
**Histórico (não é estado):** `ESTADO_ATUAL.md`, `CODE_REVIEW_FINDINGS.md`, `RELATORIO_CI.md`,
`AUDITORIA_*.md`, `docs/QA_*`, `docs/plano-*`, o resto de `docs/estado/`, `analise-prs/`,
`.lovable/plan.md`.
