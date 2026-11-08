# ADR 0005 — Supabase Cloud `uoujzvpecohinketylud` é o backend oficial

- **Status:** aceito — 2026-11-08 (decisão do dono, sessão de replicação do
  padrão de instruções para agentes). Supersede a
  [ADR 0001](0001-supabase-self-hosted-unico.md).
- **Contexto:** a ADR 0001 (aceita 2026-10-01) declarou
  `https://supabase.atomicabr.com.br` como único backend válido. Na prática,
  todo o código em vigor nunca seguiu essa decisão: `supabase/config.toml:1`
  tem `project_id = "uoujzvpecohinketylud"`; `.github/workflows/deploy.yml`
  aplica migrations e Edge Functions nesse projeto; `.github/workflows/contexto.yml`
  faz o snapshot read-only dele; `docs/operacoes/RUNBOOK.md:11-12` e
  `supabase/ENVIRONMENTS.md:6` (confirmação do dono, 11/09/2026) também
  apontam para ele. O valor de `uoujzvpecohinketylud` em `deploy.yml` não é
  um literal no arquivo — vem do secret `SUPABASE_PROJECT_ID`, garantido em
  runtime por um guard (`deploy.yml:128-129`) que falha o job se esse secret
  divergir do `project_id` de `supabase/config.toml`. As duas fontes nunca
  podiam estar certas ao mesmo tempo.
- **Decisão:** **Supabase Cloud `uoujzvpecohinketylud`** ("Fast Gravações -
  V2") é o backend oficial de produção. É o que o código, o CI/CD e o dono já
  usam — esta ADR só torna a decisão explícita e remove a contradição com a
  ADR 0001, que passa a ser histórico.
- **Consequências:**
  - `AGENTS.md` e `docs/agentes/banco.md` citam `uoujzvpecohinketylud` como
    oficial sem ressalva.
  - `vercel.json`, `index.html` (meta CSP + preconnect/dns-prefetch) e
    `docs/operacoes/openapi-edge-functions.yaml` citavam o host self-hosted
    como resíduo da decisão anterior — corrigidos em PR separada (fix de
    config/infra, não de ADR).
  - **Pendência não resolvida por esta ADR:** `.github/workflows/db-admin.yml:371`
    grava `BASE_URL='https://supabase.atomicabr.com.br/functions/v1'` no GUC
    `app.settings.functions_base_url`/`app_private.runtime_config`, lido pelas
    triggers `trigger_send_tpm_email`, `notify_loss_risk` e
    `trigger_auto_promotion` para chamar Edge Functions — não é só o cron de
    fallback `auto-promote-jobs-fallback`, é também o caminho realtime de
    promoção de job. Trocar isso é mudança de workflow + banco de produção
    (item 8 do Fluxo Git em `AGENTS.md`) e não foi feita aqui; ver
    "Próximos passos" da sessão que criou esta ADR.
  - Os refs que não são deste projeto continuam proibidos como alvo de
    deploy, listados em `supabase/ENVIRONMENTS.md`.
