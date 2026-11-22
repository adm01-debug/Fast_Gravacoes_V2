---
tipo: pendencia
id: F-002
titulo: Reset de senha inacessível
prioridade: P1
status: resolvida
fonte: BALANCO-DOCS-2026-10-28.md (secao C)
resolucao: auditoria 2026-11-22 — RLS INSERT libera anon + ResetPasswordPage usa updateUser real
---

# F-002 - Reset de senha inacessível

## Impacto no negocio
Recuperação de senha falha para todos

## Causa raiz
AuthPage insert anon em password_reset_requests, policy exige auth

## Onde
supabase (policy) + src/pages/ResetPasswordPage.tsx

## Criterio de aceite
Comportamento verificado em producao, sem regressao.

## Estado atual (2026-11-22)
RESOLVIDA. Evidência:
- Policy `Anyone can request password reset` em password_reset_requests roles {anon,authenticated} (INSERT) — verificada em produção via pg_policies.
- `src/pages/ResetPasswordPage.tsx` executa `supabase.auth.updateUser` para redefinir a senha (fluxo padrão Supabase Auth), não escrita direta na tabela.
- Fluxo de solicitação em `src/pages/AuthPage.tsx` (diálogo "Reset de senha" → solicitação para aprovação do gestor).

## Ordem
2 de 16 por impacto x custo.
