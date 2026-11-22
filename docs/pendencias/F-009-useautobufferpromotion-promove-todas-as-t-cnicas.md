---
tipo: pendencia
id: F-009
titulo: useAutoBufferPromotion promove todas as técnicas
prioridade: P1
status: resolvida
fonte: BALANCO-DOCS-2026-10-28.md (secao C)
resolvida_em: 2026-11-21
pr: adm01-debug/Fast_Gravacoes_V2#243
merge_commit: 3fc37b32
---

# F-009 - useAutoBufferPromotion promove todas as técnicas

## Impacto no negocio
Mutação de estado de produção fora do escopo clicado

## Causa raiz
body ignora techniqueId; auto-promote-jobs promove tudo

## Onde
- supabase/functions/auto-promote-jobs/index.ts (PR #243, merge 3fc37b32)
- Front `useAutoBufferPromotion`/BufferStatusWidget (chamada com techniqueId)

## Resolucao (2026-11-21, PR #243)
`auto-promote-jobs` passa a honrar `techniqueId` opcional no body:
- Chamada por-técnica (BufferStatusWidget -> promoteForTechnique) só toca aquela técnica (filtro `requestedTechniqueId ? t.id === requestedTechniqueId : true`).
- Body ausente/vazio = rebalanceamento global (cron / botão global).
- techniqueId presente mas inválido -> 400 (contract violation, nunca reverte a global).

## Nota DDL pendente (PR #244)
A migração `20261121110000_fix_audit_triggers_old_values.sql` (triggers de auditoria de jobs quebrados, ERRO 42703 em produção) está aberta na PR #244 e aguarda aprovação do dono (regra 8). Sem ela, UPDATE de status de job falha em produção. O fix de promoção em si já está na main e não depende dela.

## Criterio de aceite
Comportamento verificado: filtro por techniqueId presente e testado na main (edge function), sem regressão. [OK - código na main]