# RELATORIO_CI — Inventário e correção dos workflows (2026-10-28)

## 1. Inventário (última execução na main)

| Workflow | Último run na main | Status | Causa provável |
|---|---|---|---|
| CI | [40488087960](https://github.com/adm01-debug/Fast_Gravacoes_V2/actions/runs/40488087960) | failure | Job **Security Scan** (`scripts/audit-gate.mjs`): npm audit acusou `dompurify` (critical), `undici`, `vite` e `zod` (high) — advisories publicados depois de 11/out |
| Deploy | [40488087953](https://github.com/adm01-debug/Fast_Gravacoes_V2/actions/runs/40488087953) | failure | Mesma causa: o Security Scan é gate do deploy |
| E2E (job do CI) | — | advisory | Suíte em quarentena declarada no Quality Gate — não bloqueia merge |
| graphify.yml | — | verde (só roda em PR) | — |
| visual-baselines.yml | — | verde | — |
| migration-repair.yml | — | dispatch-only | — |
| db-admin.yml | — | dispatch-only | — |

## 2. Baseline local (antes de alterar)

| Etapa | Resultado |
|---|---|
| `npm install` | ok |
| `npm run lint` | 0 erros, 21 warnings |
| `npx tsc --noEmit` | exit 0 |
| `npm run build` | ok (~2min) |
| `npm run test` (vitest) | **919/919 passando** |
| `node scripts/audit-gate.mjs` | falhava com 4 pacotes high/critical |

## 3. Diagnóstico por causa raiz

**Raiz única — advisories npm novos (post-11/out)** quebrando o audit gate:
- `dompurify` (critical) e `undici` (high): corrigidos por `npm audit fix` (patch).
- `vite` (high): corrigido subindo devDep para `^7.3.7` e o override do vitest para `8.1.6`.
- `zod` (high, GHSA-mrhx-c7xc-m3w5): sem backport na linha 3.x — fix só existe na v4 (major breaking). Exceção documentada no `ALLOWED_PACKAGES` do gate com justificativa + plano de remoção.

**Bug encontrado durante a correção (deploy-blocking):**
- Migration `20261019140000_validation_hardening.sql` (ainda não aplicada — o Deploy pulou):
  1. O loop `has_role` usava `replace()` encadeado que corrompia `app_private.has_role(` → `app_private.app_private.has_role(`, revertendo a migration inteira. Corrigido com `regexp_replace` único e borda de identificador.
  2. O índice único `geo_blocking_settings_singleton` falharia se a tabela tivesse duplicatas. Adicionado dedupe antes do índice.
- `isSoundEnabled()` (PR #104): opt-out global `user-preferences` era ignorado com sessão ativa — regressão revertida (global vale logado também).

## 4. Correções (um commit por causa raiz, branch fix/ci-workflows)

1. `fix(ci)`: bumps de patch (dompurify/undici/vite 7.3.7 + override 8.1.6) — dompurify/undici/vite
2. `fix(ci)`: exceção documentada do zod no audit-gate (sem fix na 3.x; remoção = zod v4)
3. `fix(db)`: migration hardening — regexp_replace no loop has_role + dedupe geo_blocking
4. `fix(ux)`: opt-out de som global vale com sessão ativa

## 5. Resultado final

| Etapa | Baseline | Final |
|---|---|---|
| lint | 0 erros | 0 erros |
| typecheck | exit 0 | exit 0 |
| build | ok | ok |
| testes | 919/919 | 919/919 |
| audit gate | falha (4 pkgs) | ✔ passou (1 exceção doc + 7 informativos) |

## 6. Gaps / melhorias futuras (baixo risco não implementado aqui)

- Migração zod v4 (remove a exceção; breaking — precisa revisão de `zod-validation-error`).
- Migração tailwindcss v4 (remove a cadeia de exceções braces/postcss).
- `bitrix24-sync` `action=oauth-callback` exige `verify_jwt=false` no gateway — ver PENDENCIAS.md.

## 7. Fechamento — prova final na main (2026-10-28)

Cadeia de correções mergeada (PRs #105–#110): advisories npm + exceção
documentada do zod (#105), dollar-quoting aninhado no db push (#106),
retry anti rate-limit do ghcr no deploy (#107), DB Admin com
diagnóstico RLS + reprovisionamento de papéis (#108) e fator TOTP da
conta E2E (#109), baseline do snapshot + auth dual-header de cron +
gaps de UX (#110).

| Workflow | Último run na main | Conclusão |
|---|---|---|
| CI — Quality Gates | [40669038502](https://github.com/adm01-debug/Fast_Gravacoes_V2/actions/runs/40669038502) | ✅ success — 8/8 jobs incl. **E2E verde** |
| Deploy | [40669038548](https://github.com/adm01-debug/Fast_Gravacoes_V2/actions/runs/40669038548) | ✅ success |
| Migration repair | [40672488196](https://github.com/adm01-debug/Fast_Gravacoes_V2/actions/runs/40672488196) | ✅ success (re-run; falha anterior era rate-limit ghcr transitório) |
| DB Admin | [40596235633](https://github.com/adm01-debug/Fast_Gravacoes_V2/actions/runs/40596235633) | ✅ success |
| Visual Baselines Generator | [35506297337](https://github.com/adm01-debug/Fast_Gravacoes_V2/actions/runs/35506297337) | ✅ success |
| Architecture graph | só roda em PR/dispatch | ✅ success no último PR |

Obs.: o job E2E segue **advisory** no Quality Gate por design — falhas
futuras não bloqueiam merge, então o verde acima é evidência do estado
atual, não enforcement. Tirar a suíte da quarentena fica como decisão do
Joaquim quando ela se provar estável.

Baseline × final mantido sem regressão (lint 0, tsc ok, build ok,
919/919 vitest, 8/8 deno). Nenhum workflow que estava verde quebrou.
