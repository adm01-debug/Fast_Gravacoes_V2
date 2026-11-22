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
- Autorizacao espelha exatamente a policy RLS "Authorized defect management": so o dono da tarefa (assigned_to) ou coordenador; tarefa nao atribuida tambem e negada.
- Frontend `packagingService.recordDefect` chama `supabase.rpc(...)` com `p_loss_reason` (trigger R5.3 exige loss_reason > 5% rejeicao).
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
- RPC criada em prod; `increment_packaging_rejected` nao existia.
- Operador dono: rejected_quantity incrementado, loss_reason salvo, defect inserido com reported_by = operador.
- Operador nao-dono: "Sem autorizacao para registrar defeito nesta tarefa".
- Tarefa nao atribuida: negada (mesmo criterio da policy).
- Sonda `_f010_test_probe` dropada; nenhum dado de teste sobrou.

## Ordem
10 de 16 por impacto x custo.