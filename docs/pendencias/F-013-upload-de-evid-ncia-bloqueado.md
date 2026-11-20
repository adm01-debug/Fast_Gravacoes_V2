---
tipo: pendencia
id: F-013
titulo: Upload de evidência bloqueado
prioridade: P1
status: aberta
fonte: BALANCO-DOCS-2026-10-28.md (secao C)
---

# F-013 - Upload de evidência bloqueado

## Impacto no negocio
Evidência de manutenção/alertas não sobe para o bucket

## Causa raiz
policy exige primeiro segmento = auth.uid(); código envia path errado

## Onde
A confirmar na execucao (repo/banco/edge).

## Criterio de aceite
Comportamento verificado em producao, sem regressao.

## Ordem
13 de 16 por impacto x custo.
