---
tipo: pendencia
id: F-016
titulo: Troca de papel quebrada
prioridade: P2
status: resolvida
fonte: BALANCO-DOCS-2026-10-28.md (secao C)
resolucao: auditoria 2026-11-22 — troca de papel reescrita com delete+insert em user_roles (PR #245, merge 885b37cf)
---

# F-016 - Troca de papel quebrada

## Impacto no negocio
Upsert de troca de papel retorna 42P10 depois do profile salvo

## Causa raiz
onConflict user_id vs UNIQUE(user_id, role)

## Onde
src/components/settings/UserManagement.tsx

## Criterio de aceite
Comportamento verificado em producao, sem regressao.

## Estado atual (2026-11-22)
RESOLVIDA (PR #245, merge 885b37cf). Evidência:
- `src/components/settings/UserManagement.tsx` reescrito (164 linhas alteradas) para trocar papel com `delete` + `insert` em `user_roles` em vez de upsert com `onConflict: user_id`, eliminando o 42P10 causado pela UNIQUE(user_id, role).
- Tabela `user_roles` em produção: 20 registros verdes (verificado via Management API).
- CI 100% verde no merge.

## Ordem
16 de 16 por impacto x custo.
