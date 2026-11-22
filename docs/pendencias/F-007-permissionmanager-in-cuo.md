---
tipo: pendencia
id: F-007
titulo: PermissionManager inócuo
prioridade: P1
status: resolvida
fonte: BALANCO-DOCS-2026-10-28.md (secao C)
---

# F-007 - PermissionManager inócuo

## Impacto no negocio
Tela de permissões não muda autorização real

## Causa raiz
autorização usa mapa hard-coded ROLE_PERMISSIONS; role_permissions não é lido

## Onde
A confirmar na execucao (repo/banco/edge).

## Estado atual
RESOLVIDA em 2026-11-22 (PR #254, merge 75dc9249): useRBAC agora lê a tabela
`role_permissions` do banco como fonte primária, com fallback para o mapa
estático ROLE_PERMISSIONS em erro de consulta. Regra `resource:all` cobre
permissões com `:` e `.` (inventory:all concede inventory:adjust e
inventory.adjust). Tratamento de role null sob strict TS. Cobertura por testes
unitários (src/features/auth/hooks/useRBAC.test.tsx, 4 casos: banco-primário,
fallback, resource:all, bypass admin) + CI 100% verde (E2E incluído).
Deploy de produção Vercel confirmado em 2026-11-22
(fast-gravacoes-v2-oxvoqxcrl-juca1.vercel.app).

## Criterio de aceite
Comportamento verificado em producao, sem regressao.

## Ordem
7 de 16 por impacto x custo.
