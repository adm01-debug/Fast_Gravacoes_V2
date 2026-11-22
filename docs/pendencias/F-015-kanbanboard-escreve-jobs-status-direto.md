---
tipo: pendencia
id: F-015
titulo: KanbanBoard escreve jobs.status direto
prioridade: P2
status: resolvida
fonte: BALANCO-DOCS-2026-10-28.md (secao C)
resolucao: auditoria 2026-11-22 — KanbanBoard usa jobsService (PR #248, merge a17c419b)
---

# F-015 - KanbanBoard escreve jobs.status direto

## Impacto no negocio
Bypass do jobsService — side effects/triggers não disparados

## Causa raiz
escrita direta no client em vez de serviço

## Onde
src/pages/KanbanBoard.tsx

## Criterio de aceite
Comportamento verificado em producao, sem regressao.

## Estado atual (2026-11-22)
RESOLVIDA (PR #248, merge a17c419b). Evidência:
- `src/pages/KanbanBoard.tsx` não faz mais `.from('jobs').update(...)`; todas as mutações passam por `jobsService.update(...)`: transições individuais (`jobsService.update(jobId, updateData)`), transição em lote e `jobsService.delete` para remoção.
- Nenhuma ocorrência de escrita direta em `jobs` no arquivo (grep negativo no diff da PR #248).
- CI 100% verde no merge; tests `src/features/jobs/services/jobsService.test.ts` cobrem o serviço.

## Ordem
15 de 16 por impacto x custo.
