---
tipo: pendencia
id: F-005
titulo: Allowlist de IP inócua
prioridade: P1
status: aberta
fonte: BALANCO-DOCS-2026-10-28.md (secao C)
---

# F-005 - Allowlist de IP inócua

## Impacto no negocio
Lista branca não protege nada

## Causa raiz
ip_allowlist só lida pela function órfã validate-login-ip

## Onde
A confirmar na execucao (repo/banco/edge).

## Criterio de aceite
Comportamento verificado em producao, sem regressao.

## Ordem
5 de 16 por impacto x custo.
