---
tipo: pendencia
id: F-016
titulo: Troca de papel quebrada
prioridade: P2
status: aberta
fonte: BALANCO-DOCS-2026-10-28.md (secao C)
---

# F-016 - Troca de papel quebrada

## Impacto no negocio
Upsert de troca de papel retorna 42P10 depois do profile salvo

## Causa raiz
onConflict user_id vs UNIQUE(user_id, role)

## Onde
A confirmar na execucao (repo/banco/edge).

## Criterio de aceite
Comportamento verificado em producao, sem regressao.

## Ordem
16 de 16 por impacto x custo.
