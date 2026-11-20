---
tipo: pendencia
id: F-012
titulo: Assinatura eletrônica falsa
prioridade: P1
status: aberta
fonte: BALANCO-DOCS-2026-10-28.md (secao C)
---

# F-012 - Assinatura eletrônica falsa

## Impacto no negocio
Gate de segurança de status em TraceabilityPage é bypassável

## Causa raiz
ElectronicSignatureDialog aceita senha qualquer sem validar contra Supabase Auth

## Onde
A confirmar na execucao (repo/banco/edge).

## Criterio de aceite
Comportamento verificado em producao, sem regressao.

## Ordem
12 de 16 por impacto x custo.
