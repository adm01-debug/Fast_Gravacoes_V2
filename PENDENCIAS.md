# PENDENCIAS — itens que dependem de ação manual do Joaquim

## 1. Secrets E2E (GitHub Actions)

A suíte E2E autenticada não roda sem estes secrets no repositório
(Settings → Secrets and variables → Actions):

| Secret | Para que serve |
|---|---|
| `FAST_GRAVACOES_VITE_SUPABASE_PUBLISHABLE_KEY` | chave publishable do Supabase |
| `FAST_GRAVACOES_E2E_EMAIL` | e-mail do usuário de teste |
| `FAST_GRAVACOES_E2E_PASSWORD` | senha do usuário de teste |
| `_2FA_FAST_GRAVACOES_2FA_SEED` | seed TOTP do 2FA do usuário de teste |

Sem eles, fluxos autenticados (wizard etapa 2, dirty-guard com data, scroll
restaurado, deep-link pós-login, `?focus=`, opt-out de som) ficam sem cobertura.

## 2. Bitrix OAuth callback vs. gateway JWT

`supabase/config.toml` tem `verify_jwt = true` para `bitrix24-sync`. O
redirect do OAuth (`action=oauth-callback`) chega do navegador do Bitrix sem
Bearer JWT → o gateway responde 401 antes do handler. Para o fluxo OAuth
funcionar de ponta a ponta é preciso `verify_jwt = false` nessa function — mas
o config.toml exige validação contra o projeto canônico antes de mudar gateway.
O handler já se protege (cada action exige a própria credencial), então a
mudança é segura; falta a validação formal no projeto canônico.

## 3. Reexecução dos workflows pós-merge

Após o merge do PR, os workflows de push da main (CI + Deploy) precisam
rodar verdes — monitorar na página de Actions. O Deploy aplicará a migration
`20261019140000_validation_hardening.sql` (corrigida neste PR).
