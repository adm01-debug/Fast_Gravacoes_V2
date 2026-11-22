---
tipo: pendencia
id: F-011
titulo: Canais TPM de teste falsos (WhatsApp/Email)
prioridade: P1
status: parcial
fonte: BALANCO-DOCS-2026-10-28.md (secao C)
---

# F-011 - Canais TPM de teste falsos (WhatsApp/Email)

## Impacto no negocio
Fluxo visível que finge funcionar, apenas log success

## Causa raiz
useTPMNotifications.ts só envia real para push; demais canais fake

## Onde
- `src/features/notifications/hooks/useTPMNotifications.ts` (front: envia push real; demais canais fake)
- `supabase/functions/send-push-notification/index.ts` (edge function de envio push)
- `src/features/notifications/hooks/usePushSubscription.ts` e `useWebPushNotifications.ts` (chave VAPID pública)

## Resolvido (2026-11-22, PR #252)
- Push real ativado de ponta a ponta: secrets `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` configuradas no Supabase e par VAPID gerado no formato nativo do web-push.
- Correção de bug no formato da chave privada: a edge function importava a chave como PKCS#8 (DER), mas o web-push gera escalar P-256 de 32 bytes. Agora detecta 32 bytes e deriva JWK EC P-256 (x/y/d) para a assinatura ES256, com fallback PKCS#8 preservado.
- Validação em produção: `send-push-notification` responde `vapid_configured: true` e assina o JWT VAPID sem erro (antes falharia silenciosamente com `sent: 0`).
- Limitação conhecida: o teste de front (`usePushNotifications.sendNotification`) exibe notificação só no navegador atual e não aciona a edge function de envio em massa; a entrega remota exige inscrição real no dispositivo (ver critério de aceite).

## Pendente (não é push)
- **Email real**: a edge function de email exige `RESEND_API_KEY` (conta Resend), que não existe — bloqueado por credencial externa, não implementado no repo.
- **WhatsApp**: canal não existe (sem integração/credencial de provedor de WhatsApp Business API) — tratar como requisito novo, fora do escopo de "teste falso".

## Criterio de aceite
Push: notificacao entregue de ponta a ponta no navegador com inscricao real (pendente de usuário real se inscrever). Email/WhatsApp: decisao de negocio sobre prover credenciais.

## Ordem
11 de 16 por impacto x custo.