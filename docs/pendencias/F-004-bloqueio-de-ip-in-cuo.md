---
tipo: pendencia
id: F-004
titulo: Bloqueio de IP inócuo
prioridade: P1
status: resolvida
fonte: BALANCO-DOCS-2026-10-28.md (secao C)
---

# F-004 - Bloqueio de IP inócuo

## Impacto no negocio
Controle de segurança falso — IPs bloqueados continuavam acessando

## Causa raiz
blocked_ips só lido pela function órfã rate-limit-check; login usa check-login-lockout

## Onde
supabase/functions/check-login-lockout/index.ts (gate pre-login, action check)

## Resolucao (PR #236 - merged 46e22198)
- check-login-lockout agora consulta blocked_ips no topo do serve, ANTES do
  checkRateLimit (ip permanente ou expires_at futuro -> { blocked_by_ip: true }).
- AuthProvider.abort signIn com LockoutError quando blocked_by_ip.
- AuthPage mostra toast dedicado "Acesso Bloqueado / rede/IP bloqueada" para IP
  bloqueado (diferente do lockout por tentativas).

## Verificacao (producao, pos-deploy)
- IP real de saida inserido como bloqueio permanente em blocked_ips:
  POST /functions/v1/check-login-lockout -> {"blocked_by_ip":true,"block_reason":"teste F-004 validacao"}
- Apos remover o IP de teste: {"locked":false} (fluxo normal preservado).
- CI verde no SHA 7873f2f5 (Quality Gate + Lint + E2E + Edge Deno); deploy.yml success.

## Criterio de aceite
Comportamento verificado em producao, sem regressao.

## Ordem
4 de 16 por impacto x custo.
