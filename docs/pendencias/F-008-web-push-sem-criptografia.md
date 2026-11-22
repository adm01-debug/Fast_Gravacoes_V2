---
tipo: pendencia
id: F-008
titulo: Web Push sem criptografia
prioridade: P1
status: resolvida
fonte: BALANCO-DOCS-2026-10-28.md (secao C)
resolucao: auditoria 2026-11-22 — send-push-notification usa encryptPushPayload (RFC 8291/8188) + teste unitário
---

# F-008 - Web Push sem criptografia

## Impacto no negocio
Notificações push provavelmente nunca funcionaram

## Causa raiz
send-push-notification declara aes128gcm mas envia payload sem criptografia RFC 8291/8188

## Onde
supabase/functions/send-push-notification/index.ts + _shared/webpushEncrypt.ts

## Criterio de aceite
Comportamento verificado em producao, sem regressao.

## Estado atual (2026-11-22)
RESOLVIDA (código). Evidência:
- `send-push-notification/index.ts` envia header `Content-Encoding: aes128gcm` e usa `encryptPushPayload(subscription, payload)` (import de `_shared/webpushEncrypt.ts`).
- `webpushEncrypt.ts` implementa a criptografia RFC 8291 (aes128gcm) com HKDF e derivada de chave do VAPID.
- Teste unitário `webpushEncrypt.test.ts` cobre o fluxo de criptografia; job Edge Functions (Deno) roda na CI.

Ressalva de produção: 0 registros em `push_subscriptions` (verificado via Management API) — não há push em produção hoje porque nenhum navegador registrou assinatura; o código de envio criptografado está pronto para quando houver subscription.

## Ordem
8 de 16 por impacto x custo.
