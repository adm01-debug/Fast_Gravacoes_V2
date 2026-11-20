---
tipo: pendencia
id: F-003
titulo: inventory_movements sem escrita
prioridade: P1
status: resolvida
fonte: BALANCO-DOCS-2026-10-28.md (secao C)
---

# F-003 - inventory_movements sem escrita

## Impacto no negocio
Movimentacao de estoque nao gravava no banco (INSERT/DELETE negados por RLS)

## Causa raiz
RLS so tinha SELECT; INSERT/DELETE do browser negados

## Onde
- supabase/migrations/20261120160000_fix_inventory_movements_write_policies.sql (nova)
- src/features/inventory/hooks/useInventory.ts (ja fazia INSERT/DELETE direto)

## Resolucao (2026-11-20)
Criadas 2 policies em producao (aplicadas via Management API):
- INSERT 'Active roles can insert inventory movements' (authenticated, WITH CHECK has_any_active_role() AND user_id = auth.uid())
- DELETE 'Active roles can delete own inventory movements' (authenticated, USING has_any_active_role() AND user_id = auth.uid())

Evidencia real (producao):
- INSERT OUT 1 com claims {sub,role} de user com role ativa: retornou id cd30eaba-195a-4566-9087-41ac46a48292; trigger update_inventory_stock ajustou estoque.
- DELETE do mesmo registro: deletado; trigger rollback_inventory_stock restaurou estoque (2900.0 antes e depois).
- INSERT com user sem role ativa: bloqueado com 'new row violates row-level security policy'.

Front (useInventory.ts) ja seta user_id = auth.uid() em recordMovement e transferItems - sem mudanca de codigo necessaria.

## Criterio de aceite
Comportamento verificado em producao, sem regressao. [OK]

## Ordem
3 de 16 por impacto x custo.