---
tipo: pendencia
id: F-005
titulo: Allowlist de IP inócua
prioridade: P1
status: resolvida
fonte: BALANCO-DOCS-2026-10-28.md (secao C)
resolvida_em: 2026-11-21
pr: "https://github.com/adm01-debug/Fast_Gravacoes_V2/pull/238"
merge_commit: ecaa43916cad5775f06bc8d209f49a1aaf639dbe
evidencia: "Deploy Vercel success; gate check-login-lockout validado em producao: com entrada global 10.99.99.99 ativa, IP fora da lista retornou blocked_by_ip:true e IP na lista passou; sem entradas, fail-open (locked:false). Tabela ip_allowlist limpa apos validacao."
---

# F-005 - Allowlist de IP inócua

## Impacto no negocio
Lista branca não protege nada

## Causa raiz
ip_allowlist só lida pela function órfã validate-login-ip

## Resolucao
Enforcement no gate real `check-login-lockout` (PR #238, merge ecaa4391):
- Ordem: hard block `blocked_ips` -> rate limit (30/min) -> allowlist -> validacao de email.
- Entrada global (`is_global=true`) restringe todos; entrada com `user_id` restringe so o usuario do e-mail.
- IP fora da lista -> `blocked_by_ip:true` com motivo. 429 do rate limit tratado como bloqueio no AuthProvider (fail-closed).
- Sem entradas aplicaveis -> fail-open (lista desligada), consistente com o design documentado.

## Validacao em producao (2026-11-21)
1. Inserido `10.99.99.99` (is_global) -> chamada com IP real 186.207.138.55 retornou `blocked_by_ip:true`; IP 10.99.99.99 (na lista) idem (so ele estava na lista).
2. Adicionado 186.207.138.55 -> ambos retornaram `{locked:false}`.
3. Removidas entradas de teste (tabela com 0 linhas) -> qualquer IP retorna `{locked:false}` (fail-open default).

## Ordem
5 de 16 por impacto x custo.