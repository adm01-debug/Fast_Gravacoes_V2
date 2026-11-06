# Decisões e Vereditos — Fast_Gravacoes_V2

**Data:** 2026-10-31  
**SHA main inicial:** ebe3a6b2a6655e0f0d5e44bac4a2fb1766fddcbb  
**SHA main final:** 8664d9381882b53d99b6cfa29caa1f17c5350e60

---

## PR #119 — fix: corrigir política RLS password_reset_requests para anon

**Veredito: MERGEADA** ✅

- CI: success (Vercel deployed)
- Continha DROP POLICY IF EXISTS nas 3 variantes históricas antes do CREATE
- Aprovação humana concedida (regra 8 CLAUDE.md satisfeita) — merge squash
- Merge SHA: `918828fd481d848bf4d084f8745a036581011b1c`
- Resultado: restaura acesso anon ao INSERT em password_reset_requests; reset de senha desbloqueado

---

## devin/1793268046-divida-estrutural-2 — Dívida estrutural TS

**Veredito: RESGATADO PARCIAL E MERGEADO via PR #120** ✅

- 4 commits, 35 arquivos TypeScript + AGENTS.md
- PR #120 criada a partir da branch; CI verde; merge squash
- Merge SHA: `8120bef7f2c475e341441e9d085927ffbec57a95`
- Fixes válidos: logger.ts (import dinâmico quebra ciclo), useDailyDragDrop.ts (alias DbJob→Job), SPCDashboard.tsx (remove Math.random mock, usa Cp/Cpk reais)

---

## devin/1790870081-audit-csp — CSP Reporting

**Veredito: MERGEADO via PR #121** ✅

- 10 commits, 14 arquivos (5 migrations novas, edge function, vercel.json)
- Conflitos resolvidos na criação da PR #121:
  - `rateLimit.test.ts`: mantida versão main
  - `csp-report/index.ts`: usada versão devin (security hardening)
- Migrations aditivas; merge squash
- Merge SHA: `8664d9381882b53d99b6cfa29caa1f17c5350e60`

---

## devin/1791372473-migration-repair — Migration repair workflow

**Veredito: BLOQUEADO / FECHAR SUGERIDO** (inalterado)

- 1 arquivo: .github/workflows/migration-repair.yml
- Regra proíbe alterar .github/workflows — fora de escopo
- **Decisão:** FICA NO BACKLOG; Joaquim decide manualmente

---

## devin/1791466219-db-admin-alter-role — DB admin alter role workflow

**Veredito: BLOQUEADO / FECHAR SUGERIDO** (inalterado)

- 1 arquivo: .github/workflows/db-admin.yml
- Regra proíbe alterar .github/workflows — fora de escopo
- **Decisão:** FICA NO BACKLOG; Joaquim decide manualmente

---

## fix/pr116-revisao — Worktree auxiliar

**Veredito: SUPERADO** — conteúdo consolidado via PR #120

- SHA: 0b4c7e24 (worktree local em _worktrees/Fast_Gravacoes_V2-pr116)
- Conteúdo resgatado na PR #120; worktree pode ser removido
- PENDENCIAS.md (bitrix24 verify_jwt, PITR/SLOs) permanece como backlog
