# Linha de base ??? Fast_Gravacoes_V2

> Fotografia do sistema em `d7111c97` (main), 2026-11-20 ~14:30 UTC.
> Evid??ncias reais; nada aqui ?? suposi????o.

## 1. Estado do c??digo (main)

| Verifica????o | Resultado | Evid??ncia |
| --- | --- | --- |
| Git HEAD | `d7111c97` | `git rev-parse` |
| Worktree | limpo (sem arquivos modificados) | `git status --porcelain` vazio |
| Lint | PASS | `npx eslint .` exit 0 |
| Testes de scripts/snapshot | 123 pass / 0 fail | `node --test scripts/*.test.mjs scripts/ci/*.test.mjs` |
| Deploy Vercel | success | run 44782200564 |
| Automa????o local | success | run 44782200882 |
| CodeQL | success | run 44782199667 |
| CI Quality Gates (`d7111c97`) | **success** (8/8 jobs, incl. E2E) | run 44782200214 |

Baseline local reproduzida; CI verde na main ?? o crit??rio anti-regress??o.

## 2. Banco de dados (projeto `uoujzvpecohinketylud`, regi??o ca-central-1, ACTIVE_HEALTHY)

- **131 tabelas** no schema `public`.
- **RLS habilitado em 100%** das tabelas `public` (0 tabelas sem `rowsecurity`).
- **86 triggers** n??o-internos (l??gica de neg??cio real no banco):
  - `jobs`: auditoria (3x), valida????es de cancelamento/rework/overlap, `on_job_finished_promote`, cria????o de packaging task ao finalizar, `trg_job_cancelled_hold_packaging`.
  - `inventory_movements`: rollback/valida????o/atualiza????o de stock (3 triggers).
  - `packaging_tasks`: checklist obrigat??rio, notifica????o, cria????o de shipment (`trg_packaging_ready_create_shipment`), auditoria.
  - `packaging_defects`: auditoria, notifica????o cr??tica, cria????o de rework (`trg_packaging_defect_create_rework`).
  - `maintenance_records`: notifica????o de corre????o, auditoria TPM, snapshot de checklist.
  - `technical_sheets`: versionamento (`tr_increment_tech_sheet_version`), auditoria, log.
  - `audit_log`: append-only (no delete/no update) + hash.
  - `jobs.status` escrito direto pelo KanbanBoard (bypass registrado no backlog F-015).
- **Diverg??ncia vs dossi??**: `archived_jobs` **EXISTE** no banco (cron-cleanup arquiva para tabela existente ??? dossi?? D desatualizado). `shifts`, `suppliers` **N??O existem** (confirmado).

## 3. Migrations e edge functions

- **246 migrations** em `supabase/migrations/`.
- **37 edge functions** em `supabase/functions/` ??? inclui `bitrix24-sync`, `auto-promote-jobs`, `pdf-generator`, `image-optimizer` (stubs conhecidos no backlog), `webhook-handler` (gen??rico, `logged_only`).

## 4. Fontes de pend??ncias cruzadas

- `PENDENCIAS.md` ??? item 2 (Bitrix `verify_jwt`) e item 4 (bugs do pr??ximo sprint).
- `docs/estado/BALANCO-DOCS-2026-10-28.md` ??? 547 itens; se????es C (bugs reais) e D (d??vida estrutural).
- `analise-prs/funcionalidades.csv` ??? 56 rotas ativas.
- `analise-prs/dossies/` ??? PR-119/120/121 (gaps flutter/estado, CSP).

## 5. Backlog

Cada item desta pasta (`docs/pendencias/F-*.md`) nasce desta fotografia. Ordem de execu????o segue o crit??rio de impacto ?? custo anotado em cada arquivo.
