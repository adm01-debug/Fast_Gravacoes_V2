---
tipo: pendencia
id: F-003
titulo: inventory_movements sem escrita
prioridade: P1
status: aberta
fonte: BALANCO-DOCS-2026-10-28.md (secao C)
---

# F-003 - inventory_movements sem escrita

## Impacto no negocio
Movimentação de estoque não grava no banco

## Causa raiz
RLS só tem SELECT; INSERT/DELETE do browser negados

## Onde
A confirmar na execucao (repo/banco/edge).

## Criterio de aceite
Comportamento verificado em producao, sem regressao.

## Ordem
3 de 16 por impacto x custo.
