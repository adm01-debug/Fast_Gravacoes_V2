# Regras de Negócio — Fast_Gravacoes_V2

**Fonte:** CLAUDE.md / AGENTS.md, AppRoutes.tsx, migrations, PRs e auditorias históricas  
**Data:** 2026-10-31  
**SHA main:** ebe3a6b2

---

## Negócio

- SPA de gestão de produção para empresa de gravação/personalização industrial
- 52 máquinas, 16 técnicas de gravação
- UI em Português Brasileiro
- Deploy: Vercel (merge em main = produção automática)
- Banco: Supabase (PostgreSQL + RLS + Deno Edge Functions)

---

## Papéis (AppRole)

| Role | Acesso |
|---|---|
| `operator` | kanban, packaging, operator view, kiosk, gamification |
| `coordinator` | tudo de operator + criação de jobs, calendários, relatórios, integrações, admin |
| `manager` | tudo de coordinator + dashboards executivos, BI, configurações |
| público (anon) | /auth, /reset-password, /track, /install |

---

## Autenticação

- Supabase Auth (JWT)
- MFA disponível (/mfa-enrollment)
- Reset de senha: fluxo via `password_reset_requests` — INSERT deve ser permitido para `anon` (PR #119 corrige bloqueio)
- Redirect pós-login: `/` (Index/Dashboard)

---

## RLS — Regras Vigentes (estado atual main ebe3a6b2)

| Tabela | Situação |
|---|---|
| `password_reset_requests` | RLS bloqueando anon INSERT — **BUG ATIVO** (PR #119 pendente) |
| Demais tabelas | USANDO true em várias (audit histórica: permissivo, risco documentado em ANALISE_TECNICA_SISTEMA.md) |
| `csp_violation_reports` | Tabela não existe em main ainda (branch devin/audit-csp pendente) |

---

## Chaves e Segredos

- Chave ERP: armazenada como `key_hash` (SHA-256) em `erp_api_keys`, NÃO plaintext
- Chave display MasterAPI: `VITE_MASTER_API_DISPLAY_KEY` (env var) — chave hardcoded removida na PR #118
- Supabase URL/anon key: variáveis de ambiente Vite (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
- Segredos nunca commitados em código

---

## Integrações

- **Bitrix24:** integração em `/integrations/bitrix24` — `verify_jwt` pendente (PENDENCIAS.md item 2)
- **ERP API:** via edge function, chave hasheada
- **Push notifications:** edge function dedicada
- **ML predictions:** edge function dedicada
- **PDF/Excel export:** edge functions

---

## Offline / PWA

- App é PWA (vite-plugin-pwa)
- `OfflineProvider` + `OfflineSyncContext` para sync offline-first
- `offlineStorage.ts` na lib compartilhada

---

## Arquitetura de Módulos

- Features auto-contidas: `src/features/<domain>/` com barrel `index.ts`
- Importação dentro de feature: usar deep path (não barrel — evita ciclo)
  - Regra documentada em AGENTS.md (adicionada por devin/1793268046-divida-estrutural-2)
- `logger.ts`: import dinâmico de `supabase` para evitar ciclo `client→logger→client`
  - Fix em devin/1793268046-divida-estrutural-2, pendente de PR

---

## Qualidade de Código

- TypeScript estrito: tsc --noEmit = PASS em ebe3a6b2
- ESLint: 22 warnings (nenhum error) em ebe3a6b2
- Coverage mínima (ratchet em vitest.config.ts): lines 34%, statements 32%, functions 27%, branches 26%
- Husky pre-commit: falha no WSL sem nvm (usar --no-verify)

---

## Pendências Documentadas (PENDENCIAS.md)

1. Revisão de política RLS — **parcialmente endereçado** por PR #119 (reset senha)
2. Bitrix24 verify_jwt — **PENDENTE**
3. ghcr.io rate-limit — **PENDENTE**
4. (outros itens conforme PENDENCIAS.md em main)
