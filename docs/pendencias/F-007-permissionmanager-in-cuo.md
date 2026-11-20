---
tipo: pendencia
id: F-007
titulo: PermissionManager inócuo
prioridade: P1
status: aberta
fonte: BALANCO-DOCS-2026-10-28.md (secao C)
---

# F-007 - PermissionManager inócuo

## Impacto no negocio
Tela de permissões não muda autorização real

## Causa raiz
autorização usa mapa hard-coded ROLE_PERMISSIONS; role_permissions não é lido

## Onde
A confirmar na execucao (repo/banco/edge).

## Criterio de aceite
Comportamento verificado em producao, sem regressao.

## Ordem
7 de 16 por impacto x custo.
