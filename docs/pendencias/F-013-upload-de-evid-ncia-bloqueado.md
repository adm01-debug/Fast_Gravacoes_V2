---
tipo: pendencia
id: F-013
titulo: Upload de evidência bloqueado
prioridade: P1
status: resolvida
fonte: BALANCO-DOCS-2026-10-28.md (secao C)
resolucao: auditoria 2026-11-22 — uploadOwnedFile prefixa uid/ em todos os buckets + policies INSERT/UPDATE/SELECT verificadas em produção
---

# F-013 - Upload de evidência bloqueado

## Impacto no negocio
Evidência de manutenção/alertas não sobe para o bucket

## Causa raiz
policy exige primeiro segmento = auth.uid(); código envia path errado

## Onde
src/lib/storage.ts (uploadOwnedFile) + buckets storage

## Criterio de aceite
Comportamento verificado em producao, sem regressao.

## Estado atual (2026-11-22)
RESOLVIDA. Evidência:
- `src/lib/storage.ts` `uploadOwnedFile()` monta `ownedPath = ${user.id}/${path}` antes de `upload` e retorna signed URL — primeiro segmento sempre auth.uid(), como as policies exigem.
- Chamadas reais: `MaintenanceExecutionModal` (buckets `tpm-evidences` e `execution-evidence`), `ProductionRegistrationModal`/`LotInspectionsTab` (bucket `production-photos`), `useDocuments` (bucket `technical-documents`).
- Policies em produção (verificadas via pg_policies no storage.objects): INSERT "Active roles can upload own (execution evidence | production photos | technical documents | tpm evidences | tpm signatures)" para {authenticated}; SELECT/UPDATE/DELETE para owner/staff correspondentes.

## Ordem
13 de 16 por impacto x custo.
