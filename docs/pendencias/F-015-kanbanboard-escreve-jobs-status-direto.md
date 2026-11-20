---
tipo: pendencia
id: F-015
titulo: KanbanBoard escreve jobs.status direto
prioridade: P2
status: aberta
fonte: BALANCO-DOCS-2026-10-28.md (secao C)
---

# F-015 - KanbanBoard escreve jobs.status direto

## Impacto no negocio
Bypass do jobsService — side effects/triggers não disparados

## Causa raiz
escrita direta no client em vez de serviço

## Onde
A confirmar na execucao (repo/banco/edge).

## Criterio de aceite
Comportamento verificado em producao, sem regressao.

## Ordem
15 de 16 por impacto x custo.
