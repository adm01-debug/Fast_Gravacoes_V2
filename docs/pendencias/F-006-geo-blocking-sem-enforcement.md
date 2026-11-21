---
tipo: pendencia
id: F-006
titulo: Geo-blocking sem enforcement
prioridade: P1
status: resolvida
fonte: BALANCO-DOCS-2026-10-28.md (secao C)
resolvida_em: 2026-11-21
pr: adm01-debug/Fast_Gravacoes_V2#240
---

# F-006 - Geo-blocking sem enforcement

## Impacto no negocio
Restrição geográfica não aplicada no login — agora aplicada.

## Causa raiz
`geo_blocking_*` só lida/escrita no painel admin; o gate `check-login-lockout` não avaliava as regras em runtime.

## Correção (PR #240, mergeada 2026-11-21, squash `3c05e4ee`)
- `supabase/functions/check-login-lockout/index.ts` — bloco F-006 (~linhas 245-310, só `action=check`): lê `geo_blocking_settings` (is_enabled, mode blocklist|allowlist, block_unknown_countries, log_blocked_attempts), resolve país via ipwho.is (fallback ipapi.co, teto 8s/5s por provider), avalia regra em `geo_blocking_rules` (sem regra = bloqueado; is_blocked=true = bloqueado), grava `geo_blocking_logs` quando log_blocked_attempts, retorna `geo_blocked:true`.
- UI admin `GeoBlockingSettings.tsx` — usa mode blocklist/allowlist (o CHECK constraint não aceita `whitelist`).

## Validação em produção (2026-11-21 16:26 UTC, edge v114)
1. `blocked_ips` com IPv4 real de saída (`186.207.138.55`) → `{"blocked_by_ip":true,"block_reason":"..."}` — F-004 confirmado.
2. Regra BR `is_blocked:true` + settings allowlist → `{"geo_blocked":true,"country_code":"BR","block_reason":"Acesso bloqueado para BR"}` — F-006 confirmado.
3. `geo_blocking_logs` registrou `{ip_address:"186.207.138.55", country_code:"BR", action:"blocked"}`.
4. Observação: o gateway Supabase ignora/sobrescreve `x-forwarded-for` do cliente (anti-spoofing); testes com IP spoofado via header são inválidos — o gate lê o IP real do caller. IPs de teste spoofados (`5.45.207.55`, IPv6 real) retornaram `locked:false` por essa razão, não por bug.

## Criterio de aceite
Comportamento verificado em produção, sem regressão. CI 100% verde (22 checks), deploy Vercel READY (`fast-gravacoes-v2.vercel.app` HTTP 200).

## Ordem
6 de 16 por impacto x custo.

