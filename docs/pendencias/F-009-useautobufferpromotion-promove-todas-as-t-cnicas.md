---
tipo: pendencia
id: F-009
titulo: useAutoBufferPromotion promove todas as técnicas
prioridade: P1
status: aberta
fonte: BALANCO-DOCS-2026-10-28.md (secao C)
---

# F-009 - useAutoBufferPromotion promove todas as técnicas

## Impacto no negocio
Mutação de estado de produção fora do escopo clicado

## Causa raiz
body ignora techniqueId; auto-promote-jobs promove tudo

## Onde
A confirmar na execucao (repo/banco/edge).

## Criterio de aceite
Comportamento verificado em producao, sem regressao.

## Ordem
9 de 16 por impacto x custo.
