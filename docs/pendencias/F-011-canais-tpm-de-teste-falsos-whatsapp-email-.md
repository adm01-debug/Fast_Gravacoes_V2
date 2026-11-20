---
tipo: pendencia
id: F-011
titulo: Canais TPM de teste falsos (WhatsApp/Email)
prioridade: P1
status: aberta
fonte: BALANCO-DOCS-2026-10-28.md (secao C)
---

# F-011 - Canais TPM de teste falsos (WhatsApp/Email)

## Impacto no negocio
Fluxo visível que finge funcionar, apenas log success

## Causa raiz
useTPMNotifications.ts só envia real para push; demais canais fake

## Onde
A confirmar na execucao (repo/banco/edge).

## Criterio de aceite
Comportamento verificado em producao, sem regressao.

## Ordem
11 de 16 por impacto x custo.
