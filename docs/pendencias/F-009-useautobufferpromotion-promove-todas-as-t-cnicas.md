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

## Resolucao do filtro (2026-11-21, PR #243) — código na main
`auto-promote-jobs` honra `techniqueId` opcional no body:
- Chamada por-técnica só toca aquela técnica (filtro `requestedTechniqueId ? t.id === requestedTechniqueId : true`).
- Body ausente/vazio = rebalanceamento global (cron / botão global).
- Contrato de erro: techniqueId vazio ou de tipo incorreto -> 400; techniqueId sem técnica correspondente -> 404; nenhum dos dois inicia promoção global.

## Situacao em PRODUCAO (separada do filtro)
A promoção em produção segue bloqueada por DDL pendente: os triggers de auditoria de jobs (que escrevem em `old_values`/`new_values` e leem `NEW.code`, inexistentes) fazem qualquer UPDATE de status de job falhar com ERRO 42703 — reproduzido ao vivo via Management API. A migração `20261121110000_fix_audit_triggers_old_values.sql` está na PR #244 (regra 8: aguarda aprovação do dono e aplicação em produção). Enquanto não for aplicada, não há evidência de aceite em produção para a promoção.

## Criterio de aceite
Filtro por techniqueId: código na main #243 com CI verde. Aceite em produção: pendente da PR #244 (DDL de audit triggers).