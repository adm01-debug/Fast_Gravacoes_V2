# Graphify — limites e interpretação do grafo

Ler quando for interpretar o grafo de arquitetura (arestas faltando, extração SQL, segurança).
Texto movido do antigo `CLAUDE.md` (sem alteração de conteúdo); os comandos do dia a dia estão na
seção 9 de `AGENTS.md`. Detalhes e plano de rollout: `docs/graphify/README.md` e
`docs/plano-graphify-50-etapas.md`.

## Graphify — architecture evidence

Use `npm run graph:doctor` to validate tooling, `npm run graph:build` to generate
the structural graph, and `npm run graph:check` to check freshness and integrity.
Before cross-file architecture changes, query with `npm run graph:query --
"actualSymbol actualModule" --budget 1500`; verify cited source lines before editing.
Use `graph:affected`, `graph:path` or `graph:explain` for focused investigation.
After source changes run `graph:build` again (cached AST, full reconstruction).
For smaller scopes append `--profile security|frontend|backend` to both build and query.

Read `graphify-out/health.json` and `GRAPH_REPORT.md` before interpreting missing
edges as dead code. The current upstream projection collapses some parallel edges;
`extraction.json` retains raw evidence. SQL extraction describes versioned history,
not the deployed schema or effective RLS. No graph metric certifies runtime security.
Graph artifacts and the Python environment are local/ignored, never Vite assets.
Do not install native hooks over Husky automatically. See `docs/graphify/README.md`
and `docs/plano-graphify-50-etapas.md` for limits and the rollout plan.
