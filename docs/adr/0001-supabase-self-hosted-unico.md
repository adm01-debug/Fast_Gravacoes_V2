# ADR 0001 — Supabase self-hosted `supabase.atomicabr.com.br` é o único backend

- **Status:** aceito — 2026-10-01
- **Contexto:** o histórico do projeto (era Lovable) deixou referências a
  projetos Supabase cloud legados (`xxroejpvloldkmqdydar`, `whnnzdreuwxczxelvqjh`)
  em migrations, seeds e código. Crons versionados chegaram a agendar chamadas
  para hosts que não respondem mais.
- **Decisão:** `https://supabase.atomicabr.com.br` é a ÚNICA URL de backend
  válida. Toda URL `*.supabase.co` de projeto legado é inválida e deve ser
  tratada como bug. Frontend resolve o host via `VITE_SUPABASE_URL`; crons e
  chamadas internas versionadas devem usar a URL self-hosted ou path relativo.
- **Consequências:** migrations novas que referenciam functions devem usar a
  URL canônica; `report-uri` do CSP aponta fixo para ela (ver ADR 0002);
  `supabase link`/deploys usam o ref do self-hosted, nunca um projeto cloud.
