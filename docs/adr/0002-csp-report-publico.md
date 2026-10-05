# ADR 0002 — `csp-report` é a única Edge Function sem JWT

- **Status:** aceito — 2026-10-01
- **Contexto:** o CSP queríamos em modo *enforcing* precisava de telemetria
  real. `report-uri`/`report-to` é um POST feito pelo próprio browser, sem
  Authorization — exigir JWT tornaria o endpoint inútil.
- **Decisão:** `supabase/functions/csp-report` roda com `verify_jwt = false`
  (única exceção em `config.toml`). Compensação em camadas:
  schema zod com `.passthrough()` (protocolo varia por browser), teto de
  16 KB de body com leitura streamada, rate limit por IP (120/min, último
  IP do XFF — o anexado pelo ingress), bucket global (600/min) contra
  rotação de IP forjado, e tabela `csp_violation_reports` sem policy de
  INSERT para anon/auth (só o service role da function escreve).
- **Consequências:** relatórios só chegam via header HTTP — `report-uri` em
  meta tag é ignorado pelos browsers, por isso a meta CSP de `index.html`
  não a declara. Em staging, os relatórios continuam indo para a tabela de
  produção (uma só fonte de verdade enquanto não houver projeto de staging).
