# ai-context — contexto de código para agentes de IA

**O que faz:** `gerar.mjs` lê o repositório (zero dependências, Node ≥ 18) e escreve JSONs + `INDEX.md`
com rotas, menu, módulos, componentes, hooks, edge functions, banco (migrations/types), testes, CI, scripts,
convenções e baseline. Genérico: React/Next/Vue/Svelte/Nuxt/Remix/Astro, Express/Hono/Fastify/Nest,
FastAPI/Flask/Django, Supabase/Prisma/Drizzle/TypeORM/SQL. Saída determinística: só `manifest.json` tem
data/hora, e as janelas de git (7/30/90 dias) contam a partir da data do commit HEAD, não do relógio — o
mesmo commit gera os mesmos bytes, então o contexto só é recommitado quando o conteúdo muda.

**Como rodar:** `node scripts/ai-context/gerar.mjs [--root <dir>] [--out <dir>] [--quiet] [--help]`
(padrão de saída `inventario/ia`, ou `ai-context.config.json → out`, ou env `AI_CONTEXT_DIR`).
`--out` relativo é resolvido a partir de `--root`. `--root` inexistente sai com 1; flag desconhecida ou sem
valor sai com 2; `--help` imprime o uso e não grava nada.
Testes: `node --test scripts/ai-context/gerar.unit.mjs`. Cenários: `cenarios.mjs`.
Neste repo a suíte roda no job `codigo` de `.github/workflows/contexto.yml`, antes de gerar.

**Config opcional** (`ai-context.config.json` na raiz): `out`, `skipDirs`, `srcDirs`, `menuFiles`,
`routeFiles`, `aliases`, `typesFile`, `maxFileMB`, `publicacao` (texto do rodapé do `INDEX.md` dizendo
onde o contexto é publicado neste repo; env `AI_CONTEXT_PUBLICACAO` tem precedência). Config ou JSON que não
parseia (tsconfig aceita comentário e vírgula sobrando) e arquivo acima de `maxFileMB` não derrubam a
geração, mas ficam registrados em `manifest.json → avisos` e `baseline.json → avisos_do_gerador`.

**Neste repo:** o workflow `.github/workflows/contexto.yml` roda o gerador a cada push em `main` e a cada
10 min e publica em `docs/contexto/codigo/` na branch `contexto` (índice único em `docs/contexto/00-INDEX.md`).

**Secrets:** nenhum (lê só arquivos do repo e `git log`).

## Alcance dos alertas

- O schema reconstruído ignora os diretórios `_foreign/` e `_superseded/`: são histórico, não migrations
  vigentes. Os demais SQLs e diretórios de migrations continuam sendo considerados.
- Tudo que descreve a aplicação — alertas de tabela/RPC/edge inexistente, mapa de chamadores, hooks, rotas
  HTTP de backend, lazy, tabelas de ORM, flags, papéis, hosts, buckets, canais e possíveis segredos —
  exclui testes, stories e raízes de ferramentas/documentação (`scripts/`, `bin/`, `tools/`, `.github/`,
  `docs/`, `inventario/`, `analise/`, `examples/`, `samples/`, inclusive sob pacotes de monorepo): as
  fixtures dos testes do próprio gerador não viram "rota" nem "tabela". Esses arquivos continuam nos
  inventários próprios (scripts, testes, grafo). Uma raiz desse tipo que contenha aplicação pode ser
  declarada em `srcDirs`.
- Rota `protegida` = há um guard entre os wrappers do `element` ou num layout pai (inclusive rota-layout sem
  `path`). O nome da página (`AuthPage`, `AdminDocs`) e JSX passado em props (`fallback`, `errorElement`)
  não protegem. `<Route>`/objeto de rota com `path` não literal ou tag que não fecha não some: entra em
  `alertas.rotas_nao_interpretadas` (quantas, de quantas, em qual arquivo).
- `tabelas`/`edges`/`rpcs` de rota e módulo são o fecho por import **estático** (`import()` não é seguido; o
  lazy da própria rota é a entrada). `diretos` traz só a tela e seus imports de 1º nível.
- Edge chamada = `invoke('x')`, URL `/functions/v1/x`, `invoke(CONSTANTE)` com a constante no mesmo
  arquivo, ou wrapper (`edgeFunctionFetch('x')`: função exportada por um arquivo que monta
  `/functions/v1/${…}`, chamada por quem o importa). Literal solto igual ao nome da pasta não conta.
- `banco.json → tabelas` segue os `DROP TABLE` (inclusive lista `a, b`); tabela que só o `types.ts` conhece
  vai para `tabelas_so_no_types`: a dropada sai da lista, a sem `CREATE TABLE` fica só com `colunas_types`.
- `testes.json → total` conta arquivos de teste (nome de teste ou com casos); setup, mocks e helpers em
  pasta de teste são `suporte: true` e ficam fora do total e da cobertura.
- As relações são extraídas estaticamente: referência encontrada não prova execução; ausência de
  chamador no mapa não prova que uma edge não tenha consumidor externo. Marcadores `TODO` também são
  candidatos para revisão — texto em português sem pontuação pode ser ambíguo.
