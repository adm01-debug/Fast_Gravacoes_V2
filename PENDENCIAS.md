# PENDENCIAS — itens que dependem de ação manual do Joaquim

## 0. Merge do PR #105 (correção dos workflows) — decisão do Joaquim

O PR https://github.com/adm01-debug/Fast_Gravacoes_V2/pull/105 corrige a causa
raiz das falhas de CI/Deploy e está com todos os checks obrigatórios verdes.
Ele NÃO foi mergeado porque a regra do projeto proíbe merge automático quando
o PR altera código da aplicação (não só CI/config) e o merge dispara deploy de
produção — este PR toca `src/lib/soundFeedback.ts` e uma migration SQL, e o
merge no main dispara o workflow Deploy, que aplicará
`20261019140000_validation_hardening.sql` em produção.

**O que fazer:** revisar e mergear o PR #105. Sem o merge, CI e Deploy na main
seguem falhando (audit gate) e a migration com o bug `has_role` continua armada
para quebrar o próximo deploy.

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
