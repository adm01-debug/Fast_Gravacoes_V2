---
tipo: pendencia
id: F-004
titulo: Bloqueio de IP inócuo
prioridade: P1
status: aberta
fonte: BALANCO-DOCS-2026-10-28.md (secao C)
---

# F-004 - Bloqueio de IP inócuo

## Impacto no negocio
Controle de segurança falso — IPs bloqueados continuam acessando

## Causa raiz
blocked_ips só lido pela function órfã rate-limit-check; login usa check-login-lockout

## Onde
A confirmar na execucao (repo/banco/edge).

## Criterio de aceite
Comportamento verificado em producao, sem regressao.

## Ordem
4 de 16 por impacto x custo.
