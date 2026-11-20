---
tipo: pendencia
id: F-008
titulo: Web Push sem criptografia
prioridade: P1
status: aberta
fonte: BALANCO-DOCS-2026-10-28.md (secao C)
---

# F-008 - Web Push sem criptografia

## Impacto no negocio
Notificações push provavelmente nunca funcionaram

## Causa raiz
send-push-notification declara aes128gcm mas envia payload sem criptografia RFC 8291/8188

## Onde
A confirmar na execucao (repo/banco/edge).

## Criterio de aceite
Comportamento verificado em producao, sem regressao.

## Ordem
8 de 16 por impacto x custo.
