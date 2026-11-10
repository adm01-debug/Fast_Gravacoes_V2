# regras_negocio — regras de negócio para agentes de IA

Produtor da fonte **regras de negócio** do contexto para agentes. Lê código, o snapshot do banco real
(`--schema-snapshot`; sem ele cai para migrations/`types.ts`, com aviso no documento) e
`docs/contexto/regras/manual/` (texto humano) e publica, na branch derivada `contexto`:

| Arquivo | Conteúdo |
|---|---|
| `docs/contexto/regras/07-REGRAS-DE-NEGOCIO.md` | regras manuais · RLS por operação · constraints/CHECK/FK/colunas calculadas · triggers + `RAISE EXCEPTION` · máquinas de estado (colunas de status, mapas de transição, valores usados no código) · validações (Zod + refine, react-hook-form, inputs) · fórmulas · parâmetros e prazos · mensagens de erro · testes como especificação · eventos de webhook · efeitos colaterais |
| `docs/contexto/regras/10-ACESSO-E-SEGURANCA.md` | perfis, matriz tabela × operação → quem pode, onde o RLS é ignorado (service_role, SECURITY DEFINER), edge functions públicas, rotas protegidas, multi-tenancy, soft delete, PII, colunas de dinheiro |
| `docs/contexto/regras/11-GLOSSARIO-E-LACUNAS.md` | glossário, seed, inconsistências código × schema (NÃO VERIFICADO) e lacunas que só o dono do negócio responde |
| `docs/contexto/regras/manifest.json` | `gerado_em`, `commit`, `entrada`, `arquivos`, `fonte_schema` (`snapshot`/`migrations`), `snapshot_gerado_em`, `erros` (saída degradada — o índice mostra `parcial`) e `avisos` — lido pelo `indice.py` |
| `docs/contexto/00-INDEX.md` | índice único das três fontes (banco real, código, regras), gerado por `indice.py` |

O que **não** é daqui (cada fato tem um dono): schema real → snapshot do banco (`docs/contexto/supabase/`,
`scripts/supabase_snapshot/`); rotas/módulos/hooks/edges/grafo → `docs/contexto/codigo/` (`scripts/ai-context/gerar.mjs`). Tudo na branch `contexto`, job a job em `.github/workflows/contexto.yml`.

## Arquivos

- `generate.py` — gerador (stdlib, ~8 s neste repo). `--profile regras` escreve só 07/10/11. `--repo` inexistente sai com código 2 sem escrever nada.
- `indice.py` — monta `00-INDEX.md` lendo o `manifest.json` de cada fonte (`--fonte "NOME=CAMINHO[@BRANCH]"`); fonte que vive em outra branch entra como "como ler" (git show / raw), sem inventar conteúdo.
- `publish.sh` — publicação genérica (push / PR / branch derivada) para uso standalone em outros repos; **neste repo não é usado**: o job `publicar` do `contexto.yml` monta a branch `contexto` e o índice. No modo `branch` monta tudo num worktree temporário (não mexe no checkout, no índice nem na identidade git de quem chama), aborta se não conseguir ler a branch derivada no remoto e publica com `--force-with-lease`.
- Workflow: job `regras` (+ `publicar`, que monta o índice) em `.github/workflows/contexto.yml`.

O índice distingue `ok`, `parcial` (erro no manifest, falha de coleta ou reaproveitamento), `não verificável` (manifest ausente/ilegível, data
de geração ilegível, sem timezone ou no futuro), `desatualizado` e fonte ausente. `avisos` do manifest aparecem sem rebaixar o estado.
Código/regras com commit igual ao HEAD continuam atuais apesar da idade da coleta; banco real e fontes sem commit confirmado seguem o limite de idade configurado.

## De onde vêm as regras de banco

Seções B (RLS), C (restrições), D (triggers/`RAISE`) e E.1 (colunas de status) do 07, a matriz do 10 e a auditoria do 11:

- **Com `--schema-snapshot <pasta>` contendo `snapshot.json`** (saída de `scripts/supabase_snapshot/`): vêm do banco real e os
  títulos dizem `banco real, snapshot de <data>`. A pasta do snapshot não é varrida como código-fonte.
- **Sem snapshot utilizável** (pasta ausente, `snapshot.json` ilegível ou sem as seções): vêm das migrations, os títulos dizem
  `derivado de migrations — pode divergir do banco` e o motivo vai para `erros` do manifest (se o snapshot foi pedido) ou `avisos`.

No 07/10 nenhuma tabela de política é truncada; política `RESTRICTIVE` é marcada como "E obrigatório" e o INSERT mostra o `WITH CHECK`.

## Fontes SQL

Arquivos `.sql` em diretórios chamados exatamente `_foreign` ou `_superseded` são históricos:
continuam no inventário de arquivos, mas não entram na reconstrução do schema nem na extração
de regras do código. Outras pastas de migrations e fontes SQL, Prisma e tipos gerados mantêm
a seleção existente. A reconstrução é estática; só o snapshot descreve o banco em produção.

Regras da reconstrução por migrations (fallback):

- Havendo `supabase/migrations/`, só ela reconstrói o schema: `supabase/*.sql` solto (ex.: `fix_*.sql`) é ignorado e listado em
  `avisos`; `supabase/seed.sql` continua valendo só como dado de referência.
- Migration com "seed" no nome é migration: o DDL dela vale (os `INSERT` também entram como dado de referência).
- `DO $$ … $$`: o DDL estático de dentro é aplicado (inclusive em `EXECUTE 'literal'`); `EXECUTE format(...)` é dinâmico, não dá
  para reconstruir e o arquivo é listado em `avisos`.
- `DROP TABLE a, b` remove as tabelas com suas policies, triggers, índices e RLS, e `types.ts` não as traz de volta;
  `CREATE TABLE IF NOT EXISTS` não sobrescreve tabela existente; `ALTER TABLE` com várias ações, `ALTER POLICY` e
  `ALTER FUNCTION … SET search_path` são aplicados.

## Regras humanas

`docs/contexto/regras/manual/*.md` (exceto README e TEMPLATE) entram na seção A do 07 com prioridade
máxima e nunca são sobrescritos. Comece copiando `TEMPLATE-regras-de-negocio.md` (criado na 1ª execução)
para `regras.md`. Editar `manual/` em main dispara o workflow.

## Rodar local

```bash
python3 scripts/regras_negocio/generate.py --repo . --out docs/contexto/regras --profile regras --schema-snapshot docs/contexto/supabase --no-pointer
python3 scripts/regras_negocio/indice.py --repo . --out docs/contexto/00-INDEX.md \
  --fonte "banco real=docs/contexto/supabase" --fonte "código=docs/contexto/codigo" --fonte "regras de negócio=docs/contexto/regras"
```

Ler o resultado: `git fetch origin contexto && git show origin/contexto:docs/contexto/00-INDEX.md`.

## Testes de regressão

```bash
python3 -m unittest discover -s scripts/regras_negocio -p 'test_*.py'
```

- `test_generate.py` — fixtures locais: SQL ativo versus histórico, replay de migrations, snapshot como fonte, conteúdo
  do 07/10/11 e do manifest, Zod/transições, redação de segredo.
- `test_indice.py` — datas (formatos dos três produtores), manifest ausente/ilegível, erros e avisos do produtor.
- `test_publish.py` — `publish.sh` contra um remoto bare local em tempdir (1ª publicação, sem mudança = sem commit, pastas de
  outros produtores, remoto ilegível = aborta, corrida com lease). Precisa de `bash` e `git`.

Nenhum teste acessa banco, API de LLM ou remoto real.

Origem e testes (430 cenários sintéticos + simulação git de 3 produtores na mesma branch): pacote
`ai-context-sync` no Project "SCRIPTS | AUTÔNOMOS | REPOSITÓRIO".
