# Regras de Negócio — Fast_Gravacoes_V2

**Fonte:** CLAUDE.md / AGENTS.md, AppRoutes.tsx, migrations, PRs e auditorias históricas  
**Data:** 2026-10-31  
**SHA main inicial:** ebe3a6b2 (registro histórico)  
**SHA main final:** 8664d938 (pós-consolidação)

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
- Reset de senha: fluxo via `password_reset_requests` — INSERT permitido para `anon` e `authenticated` com `status = 'pending'` (**CORRIGIDO** — PR #119, DROP + CREATE das políticas)  
- Redirect pós-login: `/` (Index/Dashboard)

---

## RLS — Regras Vigentes (estado atual main 8664d938)

| Tabela | Situação |
|---|---|
| `password_reset_requests` | **CORRIGIDO** — anon/authenticated INSERT com WITH CHECK status='pending' (PR #119 `918828fd`) |
| Demais tabelas | USANDO true em várias (audit histórica: permissivo, risco documentado em ANALISE_TECNICA_SISTEMA.md) |
| `csp_violation_reports` | Em main (migrations CSP aditivas da branch audit-csp) |

---

## Chaves e Segredos

- Chave ERP: armazenada como `key_hash` (SHA-256) em `erp_api_keys`, NÃO plaintext
- Chave display MasterAPI: `VITE_MASTER_API_DISPLAY_KEY` (env var) — chave hardcoded removida na PR #118
- Supabase URL/anon key: variáveis de ambiente Vite (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
- Segredos nunca commitados em código
- **BACKLOG (segurança):** `docs/estado/_lote-07-admin-integracoes.md`, `docs/estado/_meta-02-refutacao-verdes.md` e `docs/estado/_meta-00-consolidado.md` ainda contêm a chave `sk_live_fast_***` real em main — remover/redigir via PR

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
  - Regra documentada em AGENTS.md (PR #120, `8120bef7`)
- `logger.ts`: import dinâmico de `supabase` para evitar ciclo `client→logger→client`
  - **CORRIGIDO** — PR #120 (`8120bef7`)

---

## Qualidade de Código

- TypeScript estrito: tsc --noEmit = PASS em 8664d938
- ESLint: 22 warnings (nenhum error)
- Coverage mínima (ratchet em vitest.config.ts): lines 34%, statements 32%, functions 27%, branches 26%
- Husky pre-commit: falha no WSL sem nvm (usar --no-verify)

---

## Monitoramento de Segurança (CSP)

- Edge function `csp-report` rejeita `*.vercel.app` e `localhost` por padrão quando `CSP_REPORT_ALLOWED_HOSTS` vazio (**CORRIGIDO** — PR #121, `8664d938`)

---

## Pendências Documentadas (PENDENCIAS.md)

1. Revisão de política RLS — **endereçado** por PR #119 (reset senha)
2. Bitrix24 verify_jwt — **PENDENTE**
3. ghcr.io rate-limit — **PENDENTE**
4. Segredo em `docs/estado/` — **PENDENTE** (remover/redigir)
5. (outros itens conforme PENDENCIAS.md em main)
