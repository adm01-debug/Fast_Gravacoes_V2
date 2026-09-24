# Inventário de policies RLS efetivamente permissivas

**Data da consulta:** 2026-09-24 · **Banco:** `uoujzvpecohinketylud` (produção canônica) · **Fonte:** `pg_policies`
(não `grep` em `supabase/migrations/` — ver nota metodológica em `docs/plano-50-etapas-consolidacao.md` §0.3.1).

## Contagem efetiva

`SELECT count(*) FROM pg_policies WHERE qual = 'true' OR with_check = 'true'` → **4**, de um total de **326**
policies ativas em **137** tabelas. Muito abaixo das 170 ocorrências históricas medidas por `grep` em
`supabase/migrations/` — a maioria já foi substituída por migrations corretivas (confirma a suspeita
metodológica registrada em 13/09: `grep` mede histórico, não estado implantado).

## As 4 policies

| Tabela | Policy | Comando | Roles | Classificação | Ação |
|---|---|---|---|---|---|
| `packaging_equipment` | "All authenticated users can see equipment" | SELECT | `authenticated` | **P2** — catálogo de equipamento, leitura sem PII/financeiro | Aceito, sem ação. Qualquer usuário autenticado pode legitimamente consultar quais equipamentos existem. |
| `packaging_defects` | "Anyone can see defects" | SELECT | `authenticated` | **P2** (redundante, não crítico) | Aceito sem correção nesta etapa. A tabela também tem uma policy SELECT mais restrita ("Operators view defects of accessible tasks"), mas como policies SELECT são combinadas por `OR`, a policy `true` já garante leitura ampla — a mais restrita fica sem efeito prático. Não expõe PII/financeiro (defeitos de embalagem são dado operacional). Fica registrado como dívida técnica: a policy restrita é código morto enquanto a `true` existir; não removida agora para não reduzir escopo desta correção pontual. |
| `packaging_waste` | "Users can read waste records" | SELECT | `authenticated` | **P2** — dado operacional (refugo), sem PII | Aceito, sem ação. |
| `packaging_waste` | "Users can insert waste records" | INSERT | `authenticated` | **P1** — única das 4 que é escrita, não leitura. `with_check = true` deixava qualquer autenticado inserir registro de refugo em nome de qualquer `operator_id`, sem checagem de papel. | **Corrigida** nesta sessão — ver `supabase/migrations/20260924174928_fix_packaging_waste_insert_check.sql`. Novo `with_check`: `has_any_active_role() AND (operator_id IS NULL OR operator_id = auth.uid())`, no mesmo padrão já usado em `packaging_defects`. |

## Nenhuma das 4 é P0

Nenhuma expõe dado a `anon` (todas exigem `authenticated`); nenhuma toca `user_roles`, PII pessoal, dado
financeiro ou trilha de auditoria. O trabalho pesado de correção que os planos anteriores orçavam em 12-24h
(Etapas 19-20 de `docs/plano-50-etapas-consolidacao.md`) já estava, na prática, feito no banco canônico antes
desta sessão começar.

## Nota de completude — `packaging_defects` tem 5 policies no total, não 2

A tabela acima lista só a policy `qual=true` ("Anyone can see defects") e a "Operators view defects of
accessible tasks" (mencionada na coluna Ação). Reauditoria adversarial em 24/09 (mesmo dia, sessão de
validação) confirmou que `packaging_defects` tem **5 policies** ao todo — as 3 que faltavam não são P2/P0,
têm condição real (papel/atribuição de tarefa), então não mudam a classificação acima, mas ficam registradas
aqui para não dar a impressão de que a tabela só tem policies de SELECT:

| Policy | Comando | Condição |
|---|---|---|
| `Authorized defect management` | ALL (INSERT/UPDATE/DELETE/SELECT) | operador dono da task OU coordinator |
| `Staff manage all defects` | ALL | role coordinator/manager/admin |
| `Operators insert defects on their tasks` | INSERT | role operator + `reported_by = auth.uid()` + task acessível |

## Risco residual real (não é mais "policy aberta")

1. **Sem suíte de teste de regressão** (Etapa 15 de `docs/plano-50-etapas-260924.md`) — já existe a função
   `test_rls_policies(table, user_id, role)` e a tabela `rls_test_results` no banco (migrations de maio/2026),
   mas nada em CI a invoca. Uma policy corrigida hoje pode regredir no próximo `ALTER` sem ninguém notar.
2. **Policy morta em `packaging_defects`** — "Operators view defects of accessible tasks" nunca tem efeito
   enquanto "Anyone can see defects" existir. Não é risco de segurança (a `true` já é o comportamento
   efetivo, aceito como P2), mas é confusão de manutenção: um futuro dev pode achar que a restrição existe.
3. **Modelo de autorização (`has_role`/`is_staff`/`has_any_active_role`/`get_user_role`) não está documentado**
   como padrão canônico em `docs/ARCHITECTURE.md` — é o padrão de fato (usado em praticamente todas as 326
   policies), só falta escrever isso.
