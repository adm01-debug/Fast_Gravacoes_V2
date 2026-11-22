---
tipo: pendencia
id: F-010
titulo: Corrida em rejected_quantity
prioridade: P1
status: resolvida
fonte: BALANCO-DOCS-2026-10-28.md (secao C)
---

# F-010 - Corrida em rejected_quantity

## Impacto no negocio
Dois operadores simultâneos perdem defeito (lost update)

## Causa raiz
packagingService.recordDefect read-modify-write no cliente

## Solucao (PR #249)
RPC transacional e autorizada `record_packaging_defect` (security definer) substitui o read-modify-write:
- UPDATE atomico de `packaging_tasks.rejected_quantity` + INSERT de `packaging_defects` em uma unica transacao.
- Autorizacao atual (prod): staff (coordinator/manager/admin) para qualquer tarefa; operador para tarefa propria ou nao atribuida. (Criterio inicial "so dono/coordenador, nega nao atribuida" foi corrigido para este, espelhando a uniao das policies.)
- `p_request_id` torna a operacao idempotente por envio (evita duplicar defect no retry do React Query).
- Frontend `packagingService.recordDefect` chama `supabase.rpc(...)` com `p_loss_reason` (trigger R5.3 exige loss_reason > 5% rejeicao).
- Defeito `critical` (<=5%): RPC coloca a tarefa em `on_hold`, inclusive quando ja estava em `ready_to_ship` (manifesto de carga deixa de listar).
- Botao "Assumir tarefa" agora usa a RPC `assign_packaging_task`: atribuicao atomica que preserva `on_hold` (nao "reseta" a tarefa em espera para `in_triage`) e valida papel ativo + autorizacao (staff sempre; operador so se nao atribuida ou se ja e dele).
- Drop da RPC insegura `increment_packaging_rejected` da PR #246 (fechada, trabalho absorvido).

## V3 (threads 12 e 14 do Devin Review na PR #249)
- **Thread 12 (bloqueio de despacho):** nova RPC `update_shipment_status` (security definer). Qualquer caminho de UI — modal de edição de envio e menu rápido — converte a mudança de status em `supabase.rpc('update_shipment_status', ...)`. A RPC impede `in_transit` quando o job do shipment tem `packaging_task` em `on_hold` (defeito crítico/cancelamento), retornando `'blocked'` **sem alterar nada** (envios já despachados não retroagem). Autorização: staff (coordinator/manager/admin); operador bloqueado. O hook `useLogistics.updateShipment` propaga o `'blocked'` e o modal mostra toast de aviso em vez de sucesso; campos não-status continuam indo direto na tabela.
- **Thread 14 (defeito crítico após liberação):** antes, `approved_quantity` ocupava todo o `received` (default do form) e a constraint `packaging_tasks_qty_sum` tornava a rejeição impossível; a RPC agora subtrai o excedente de `approved_quantity` para manter `approved + rejected <= received` na mesma transação, com erro claro "Rejeição excede a quantidade recebida (restante: N)" antes de registrar (evita `request_id` queimado e erro de constraint obscuro).
- `PackagingTaskDetail`: em tarefa `on_hold` não atribuída, staff (coordinator/manager/admin) vê o botão "Assumir tarefa" (RPC preserva `on_hold`); operador vê o aviso "aguardando coordenador".

## Onde
- `supabase/migrations/20261122120000_f010_rpc_record_defect_atomic.sql` (v1/v2)
- `supabase/migrations/20261122150000_f010_v3_shipment_hold_e_qtde.sql` (v3 — `update_shipment_status` + ajuste de approved_quantity na RPC de defeito)
- `src/features/packaging/services/packagingService.ts`
- `src/features/packaging/components/DefectTriageForm.tsx`
- `src/features/inventory/hooks/useLogistics.ts` + `useLogistics.test.ts`
- `src/features/packaging/components/PackagingTaskDetail.tsx`
- `src/features/packaging/types/packaging.schema.ts`
- `src/integrations/supabase/types.ts`

## Criterio de aceite
Comportamento verificado em producao, sem regressao.

## Evidencia (validacao em producao - Management API, sonda ROLLBACK)
- RPC criada em prod; `increment_packaging_rejected` nao existia; existe apenas a assinatura 9-arg de `record_packaging_defect` (com `p_request_id`), sem overload stale.
- Operador dono: rejected_quantity incrementado, loss_reason salvo, defect inserido com reported_by = operador.
- Operador nao-dono: "Sem autorizacao para registrar defeito nesta tarefa".
- Tarefa nao atribuida: autorizada para operador (policy "Operators update their own packaging tasks" = unassigned ou assigned_to = uid).
- Rejeicao > 5% sem `p_loss_reason`: negada pelo trigger (`loss_reason e obrigatorio`).
- Defeito critical <= 5%: status da tarefa vira `on_hold`.
- Sondas `_f010_probe*` dropadas; nenhum dado de teste sobrou.
- Camada frontend atualizada em `packagingService.assignToMe` (RPC) e `types.ts` (`request_id` + `assign_packaging_task`); validacao local tsc/eslint pendente de conferencia.
- Nota de deploy: a migration e idempotente e sera aplicada automaticamente por `deploy.yml` no merge para main (inclui `assign_packaging_task` e `ready_to_ship` no CASE critical, nao presentes na aplicacao manual anterior).

## Evidencia v3 (validacao local - Postgres 16, schema real, sonda ROLLBACK)
Suite `tsuite.sql` executada em banco temporario `fg_f010_test1` com RLS ativa + policies reais de prod:
- T1: update para `in_transit` com packaging_task `on_hold` -> RPC retorna `blocked`, status permanece `pending` (nenhum dado alterado).
- T2: sem `on_hold` -> `ok`, status -> `in_transit`.
- T3: operador (sem papel staff) -> `Sem permissão para alterar envio`.
- T4: sessão anônima -> `Não autenticado`.
- T5: defeito critical pós-liberação (received 100, approved 100) -> approved 70, rejected 30, status `on_hold` (subtração do excedente na mesma transação).
- T6: `request_id` repetido -> 1 defect registrado, saldos inalterados (idempotência).
- T7: rejeição > recebido -> `Rejeição excede a quantidade recebida (restante: 100)`.
- tsc --noEmit limpo; eslint nos arquivos tocados limpo; vitest `useLogistics.test.ts` 11/11.
- Banco de teste dropado; nenhum dado persistido.

## Ordem
10 de 16 por impacto x custo.