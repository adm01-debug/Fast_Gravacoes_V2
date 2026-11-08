# ADR 0005 — Supabase Cloud `uoujzvpecohinketylud` é o backend oficial

- **Status:** aceito — 2026-11-08 (decisão do dono, sessão de replicação do
  padrão de instruções para agentes). Supersede a
  [ADR 0001](0001-supabase-self-hosted-unico.md).
- **Contexto:** a ADR 0001 (aceita 2026-10-01) declarou
  `https://supabase.atomicabr.com.br` como único backend válido. Na prática,
  todo o código em vigor nunca seguiu essa decisão: `supabase/config.toml:1`
  tem `project_id = "uoujzvpecohinketylud"`; `.github/workflows/deploy.yml`
  aplica migrations e Edge Functions nesse projeto; `.github/workflows/contexto.yml`
  faz o snapshot read-only dele; `docs/operacoes/RUNBOOK.md:10-11` e
  `supabase/ENVIRONMENTS.md:6` (confirmação do dono, 11/09/2026) também
  apontam para ele. As duas fontes nunca podiam estar certas ao mesmo tempo.
- **Decisão:** **Supabase Cloud `uoujzvpecohinketylud`** ("Fast Gravações -
  V2") é o backend oficial de produção. É o que o código, o CI/CD e o dono já
  usam — esta ADR só torna a decisão explícita e remove a contradição com a
  ADR 0001, que passa a ser histórico.
- **Consequências:**
  - `AGENTS.md` e `docs/agentes/banco.md` citam `uoujzvpecohinketylud` como
    oficial sem ressalva.
  - **Pendência não resolvida por esta ADR:** `vercel.json` ainda declara
    `report-uri https://supabase.atomicabr.com.br/functions/v1/csp-report`
    e `connect-src` libera esse host — resíduo da decisão anterior. Trocar o
    endpoint de CSP é mudança de config de produção (infra/segurança, cai no
    item 8 do Fluxo Git em `AGENTS.md`) e não foi feita aqui; ver
    "Próximos passos" da sessão que criou esta ADR.
  - Os refs que não são deste projeto continuam proibidos como alvo de
    deploy, listados em `supabase/ENVIRONMENTS.md`.
