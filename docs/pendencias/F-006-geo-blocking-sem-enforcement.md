---
tipo: pendencia
id: F-006
titulo: Geo-blocking sem enforcement
prioridade: P1
status: aberta
fonte: BALANCO-DOCS-2026-10-28.md (secao C)
---

# F-006 - Geo-blocking sem enforcement

## Impacto no negocio
Restrição geográfica não aplicada no login

## Causa raiz
geo_blocking_* só lida/escrita no painel admin

## Onde
A confirmar na execucao (repo/banco/edge).

## Criterio de aceite
Comportamento verificado em producao, sem regressao.

## Ordem
6 de 16 por impacto x custo.
