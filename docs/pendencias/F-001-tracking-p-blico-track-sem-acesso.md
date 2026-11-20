---
tipo: pendencia
id: F-001
titulo: Tracking público /track sem acesso
prioridade: P1
status: resolvida
fonte: BALANCO-DOCS-2026-10-28.md (secao C)
---

# F-001 - Tracking público /track sem acesso

## Impacto no negocio
Links públicos de rastreio retornam "não encontrado"

## Causa raiz
Policy `Authenticated users can view jobs` (migration 20251214203346) quebrou o
SELECT anon que o tracking usava. REST restringe SELECT a authenticated.

## Correção aplicada
- RPC `get_public_tracking(uuid, text)` SECURITY DEFINER criada em
  supabase/migrations/20261120173500_public_tracking_rpc.sql, expondo apenas
  campos de tracking (sem reabrir SELECT anon em jobs).
- Migration aplicada em produção (supabase db push --remote --yes).
- src/pages/PublicTrackingPage.tsx passou a chamar a RPC (3 passos: j param -> uuid -> order_number).

## Evidência real (2026-11-20, produção)
RPC chamada com chave publishable (anon) retornou o job 64a0c94d-4c5f-47ed-ab94-79de61371593:
- via p_job_id: uuid -> {id, client, status, product, order_number, shipment:null}
- via p_order_number "ORD-1795195827942" -> mesmo job
Build de produção OK, eslint OK, 123 testes de snapshot PASS.

## Hardening R3.3 (2026-11-20, producao)
Review de seguranca (Devin) apontou que o payload da RPC expunha client (nome
do cliente) para chamada anonima, violando a regra R3.3 (anon nunca ve nome do
cliente). Correcao aplicada:
- Migration 20261120203000_public_tracking_remove_client.sql: CREATE OR REPLACE
  da RPC removendo client do JSON (mantem apenas campos de rastreio).
- Aplicada em producao via Management API e validada com chave publishable (anon):
  payload retornado nao contem mais a chave client.
- src/integrations/supabase/types.ts: Returns alinhado ao formato gerado (Json).
- src/pages/PublicTrackingPage.tsx: interface TrackingJob sem client.