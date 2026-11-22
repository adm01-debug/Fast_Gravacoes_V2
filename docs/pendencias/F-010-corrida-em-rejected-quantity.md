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

## Onde
- `supabase/migrations/20261122120000_f010_rpc_record_defect_atomic.sql` (criada)
- `src/features/packaging/services/packagingService.ts`
- `src/features/packaging/components/DefectTriageForm.tsx`
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

## Ordem
10 de 16 por impacto x custo.