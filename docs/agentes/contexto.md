# Contexto para agentes de IA — três fontes de verdade, uma branch

Ler antes de qualquer tarefa ou planejamento. O repositório mantém **sozinho** um retrato do estado real
(código, banco de produção e regras de negócio) na branch gerada **`contexto`**. Nada disso é escrito à mão.

## Como ler (sem trocar de branch)

```bash
git fetch origin contexto
git show origin/contexto:docs/contexto/00-INDEX.md
```

Ou sem clone: `https://raw.githubusercontent.com/adm01-debug/Fast_Gravacoes_V2/contexto/docs/contexto/00-INDEX.md`
(ou MCP `github_get_content` com `ref=contexto`).

O `00-INDEX.md` diz **quem é dono de cada fato** e o frescor de cada fonte. Se duas fontes discordarem,
vale o dono.

| Preciso de… | Fonte | Arquivo |
|---|---|---|
| Tabelas, colunas, RLS/policies, funções, triggers, cron, storage, lints — **como está em produção agora** | banco real | `docs/contexto/supabase/README.md` |
| Rotas, telas, módulos, hooks, edge functions, grafo de dependências, testes, scripts, convenções | código | `docs/contexto/codigo/INDEX.md` |
| O que pode/não pode: RLS por operação, estados e transições, validações, fórmulas, prazos, erros de negócio, lacunas | regras de negócio | `docs/contexto/regras/07-REGRAS-DE-NEGOCIO.md` |

Regra prática: **migration no repo é histórico, não estado.** Existe de verdade? → `supabase/`.
Onde fica e quem chama? → `codigo/`. Pode fazer isso? → `regras/`.

## Quem produz cada pasta

| Pasta | Produtor | Fonte de dados |
|---|---|---|
| `codigo/` | `scripts/ai-context/gerar.mjs` (Node, zero deps) | arquivos do repo + `git log` + grafo graphify |
| `supabase/` | `scripts/supabase_snapshot/snapshot.py` (psycopg) | banco oficial `uoujzvpecohinketylud`, sessão **read-only** + Management API |
| `regras/` | `scripts/regras_negocio/generate.py` (stdlib) | código, migrations/`types.ts` e `docs/contexto/regras/manual/` |
| `00-INDEX.md` | `scripts/regras_negocio/indice.py` | o `manifest.json` de cada pasta |

Orquestração: `.github/workflows/contexto.yml` — um job por produtor, a cada push em `main` que toque
código/banco/scripts e a cada 10 min (minuto 3). Só comita quando algo mudou; métricas voláteis do banco
no máximo 1×/h. O push usa `GITHUB_TOKEN`, que não dispara outros workflows (anti-loop), e a branch tem
`vercel.json` com `ignoreCommand` para a Vercel não fazer preview deploy dela.

## O que você deve fazer

- **Nunca** edite a branch `contexto` nem abra PR dela: é gerada e sobrescrita.
- Regra que só o negócio sabe (prazo, limite, quem pode o quê) → escreva em
  `docs/contexto/regras/manual/*.md` **na `main`** (copie o `TEMPLATE-regras-de-negocio.md`). Esse texto
  entra na seção A do `07` com prioridade máxima e nunca é sobrescrito.
- Item marcado **NÃO VERIFICADO** ou como inconsistência: confirme na fonte dona antes de assumir.
- Fonte com estado `parcial`/`desatualizado` no índice: leia `errors.md` da fonte antes de concluir algo.

## Rodar local

```bash
node scripts/ai-context/gerar.mjs --out docs/contexto/codigo
python3 scripts/regras_negocio/generate.py --repo . --out docs/contexto/regras \
  --profile regras --schema-snapshot docs/contexto/supabase --index-path docs/contexto/00-INDEX.md --no-pointer
python3 scripts/regras_negocio/indice.py --repo . --out docs/contexto/00-INDEX.md \
  --fonte "banco real=docs/contexto/supabase" --fonte "código=docs/contexto/codigo" --fonte "regras de negócio=docs/contexto/regras"
```

`docs/contexto/` (exceto `regras/manual/`) é ignorado pelo git: a saída local é descartável.
O snapshot do banco exige credencial e roda no CI; detalhes em `scripts/supabase_snapshot/README.md`.

Testes dos produtores (sem banco, sem rede):

```bash
node --test scripts/ai-context/gerar.unit.mjs
python3 scripts/regras_negocio/test_generate.py -v
python3 scripts/supabase_snapshot/test_snapshot.py -v
```
