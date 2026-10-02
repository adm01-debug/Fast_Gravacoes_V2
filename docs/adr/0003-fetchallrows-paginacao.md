# ADR 0003 — `fetchAllRows` como padrão para selects ilimitados

- **Status:** aceito — 2026-10-01 (helper implementado no PR #83, incluindo variante keyset `fetchAllRowsByCursor` para tabelas com INSERTs concorrentes)
- **Contexto:** o PostgREST aplica `max-rows` (~1000) **silenciosamente**:
  `.select()` sem `.range()`/`.limit()` devolve 1000 linhas e o resto some
  sem erro. KPIs, rankings, export/backup e listas de estoque ficavam
  errados sem nenhum sintoma. `.limit(N)` com N > 1000 é igualmente inútil —
  o cap do servidor corta antes.
- **Decisão:** `src/lib/fetchAllRows.ts` pagina qualquer query via
  `.range(offset, offset+limit-1)` até esgotar (ou `maxRows`). Regra:
  toda query em tabela que cresce sem teto (`jobs`, `maintenance_records`,
  `audit_log`, `inventory_items`, `profiles` em export) usa `fetchAllRows`;
  tabela pequena e estável (`machines`, `techniques`) pode continuar direta.
- **Consequências:** custo = 1 request a cada 1000 linhas — idêntico ao
  anterior abaixo do cap. Erros passam a propagar (`throw`) em vez de virar
  `data: null` ignorado — o que antes truncava em silêncio agora falha alto.
