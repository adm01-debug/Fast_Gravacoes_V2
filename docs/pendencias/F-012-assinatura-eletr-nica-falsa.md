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
O dialog agora valida a senha REAL do usuário antes de assinar:
- Chamada a `POST /auth/v1/token?grant_type=password` com `{ email: user.email, password }` — senha incorreta retorna erro e bloqueia a operação.
- `onConfirm` revalida contra o Supabase Auth no momento da operação (não confia só no estado do form).
- Sem senha: toast de erro "Senha de assinatura é obrigatória" — assinatura inválida nunca aplica a operação.

Antes disso, `ElectronicSignatureDialog` aceitava qualquer texto digitado como senha válida (assinatura fake, sem validade legal).

## Criterio de aceite
Senha conferida contra o Supabase Auth (token grant real); assinatura inválida não aplica a operação. [OK - código na main]