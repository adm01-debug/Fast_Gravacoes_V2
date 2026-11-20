---
tipo: pendencia
id: F-002
titulo: Reset de senha inacessível
prioridade: P1
status: aberta
fonte: BALANCO-DOCS-2026-10-28.md (secao C)
---

# F-002 - Reset de senha inacessível

## Impacto no negocio
Recuperação de senha falha para todos

## Causa raiz
AuthPage insert anon em password_reset_requests, policy exige auth

## Onde
A confirmar na execucao (repo/banco/edge).

## Criterio de aceite
Comportamento verificado em producao, sem regressao.

## Ordem
2 de 16 por impacto x custo.
