---
tipo: pendencia
id: F-010
titulo: Corrida em rejected_quantity
prioridade: P1
status: aberta
fonte: BALANCO-DOCS-2026-10-28.md (secao C)
---

# F-010 - Corrida em rejected_quantity

## Impacto no negocio
Dois operadores simultâneos perdem defeito (lost update)

## Causa raiz
packagingService.recordDefect read-modify-write no cliente

## Onde
A confirmar na execucao (repo/banco/edge).

## Criterio de aceite
Comportamento verificado em producao, sem regressao.

## Ordem
10 de 16 por impacto x custo.
