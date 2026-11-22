---
tipo: pendencia
id: F-012
titulo: Assinatura eletrônica falsa
prioridade: P1
status: resolvida
fonte: BALANCO-DOCS-2026-10-28.md (secao C)
resolvida_em: 2026-11-22
pr: adm01-debug/Fast_Gravacoes_V2#247
merge_commit: 42f66bec
---

# F-012 - Assinatura eletrônica falsa

## Impacto no negocio
Gate de segurança de status em TraceabilityPage é bypassável

## Causa raiz
ElectronicSignatureDialog aceita senha qualquer sem validar contra Supabase Auth

## Onde
- src/components/traceability/ElectronicSignatureDialog.tsx (PR #247, merge 42f66bec)

## Resolucao (2026-11-22, PR #247)
O dialog valida a senha REAL do usuário antes de assinar:
- Chamada a `POST /auth/v1/token?grant_type=password` com `{ email: user.email, password }` — senha incorreta retorna erro e bloqueia a operação.
- A senha é validada uma única vez, antes de chamar `onConfirm` com o motivo; `onConfirm` revalida os lotes (não a senha). Assinatura inválida nunca aplica a operação.
- Sem senha: toast de erro "Senha de assinatura é obrigatória".

Antes disso, o dialog aceitava qualquer texto digitado como senha válida (assinatura fake, sem validade legal).

## Criterio de aceite
Senha conferida contra o Supabase Auth (token grant real) antes de qualquer operação. [OK - código na main]