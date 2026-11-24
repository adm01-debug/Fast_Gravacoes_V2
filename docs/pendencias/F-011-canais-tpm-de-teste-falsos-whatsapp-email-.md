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
Fluxo visível que finge funcionar, apenas log success — corrigido no front e nas edge functions (secao "Resolvido"); resta ativar os provedores.

## Causa raiz
useTPMNotifications.ts só envia real para push; demais canais fake

## Resolvido (2026-11-24, PR #278)
- Os canais `email` e `whatsapp` não registram mais `success` sem envio: gravam `failure` com `error_message` e o motivo (`provider_not_configured`) em `payload`, mostram erro ao operador e retornam `success: false` para a UI.
- `send-tpm-email` e `send-loss-risk-alert` deixaram de responder `{ success: true, notified: N }` sem `RESEND_API_KEY`: agora devolvem `{ success: false, notified: 0, reason: 'email_provider_not_configured' }`.
- O canal `push` passou a registrar `success`/`failure` conforme a entrega real de `sendNotification` (que devolve `null` sem permissão ou suporte), e o aviso de sucesso deixou de sugerir envio aos destinatários cadastrados — o teste exibe uma notificação local no navegador atual.
- `TPMNotificationSettings` fecha o diálogo de validação também em falha, para o operador não repetir a confirmação e gerar apenas mais um log de erro.
- Cobertura: `src/features/notifications/hooks/useTPMNotifications.test.ts` (5 casos: email, whatsapp, push entregue, push não entregue, validação sem envio).

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
- **Email real**: a edge function de email exige `RESEND_API_KEY` (conta Resend), que não existe — bloqueado por credencial externa. O falso sucesso foi removido (PR #278); resta prover a credencial.
- **WhatsApp**: canal não existe (sem integração/credencial de provedor de WhatsApp Business API) — tratar como requisito novo, fora do escopo de "teste falso". Hoje o teste falha explícito em vez de fingir envio.

## Criterio de aceite
Push: notificacao entregue de ponta a ponta no navegador com inscricao real (pendente de usuário real se inscrever). Email/WhatsApp: decisao de negocio sobre prover credenciais.

## Ordem
11 de 16 por impacto x custo.