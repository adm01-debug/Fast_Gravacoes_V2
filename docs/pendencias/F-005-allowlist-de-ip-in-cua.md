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
evidencia: "Deploy Vercel success; gate check-login-lockout validado em producao: com entrada global ativa, chamada sem o IP na lista retornou blocked_by_ip:true e, apos adicionar o IP real a lista, passou (locked:false); sem entradas, fail-open. Tabela ip_allowlist limpa apos validacao."
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
As chamadas ao gate usam o IP real do cliente (o runtime do Supabase descarta X-Forwarded-For forjado), entao os 3 cenarios abaixo exercitam o enforcement com o mesmo IP de saida (186.207.138.55):

1. Inserida entrada global ativa `10.99.99.99` -> chamada com IP real 186.207.138.55 retornou `{"blocked_by_ip":true,"block_reason":"IP não está na lista de IPs permitidos"}` (IP fora da lista bloqueado).
2. Adicionada entrada global ativa com o IP real 186.207.138.55 -> a mesma chamada retornou `{"locked":false}` (IP na lista passa).
3. Removidas as entradas de teste (tabela com 0 linhas) -> qualquer chamada retorna `{"locked":false}` (fail-open default, lista desligada).

## Ordem
5 de 16 por impacto x custo.