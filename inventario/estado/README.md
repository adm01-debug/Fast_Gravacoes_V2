# Estado real do projeto — inventário gerado

Pasta de **dados gerados por script**, não de relatórios escritos à mão. É a fonte de consulta dos
agentes para "o que existe hoje" no banco e no código. Se um número aqui divergir do que você mediu,
regere o arquivo (comandos abaixo) em vez de corrigir à mão.

Complementa a branch `contexto` (gerada a cada 10 min pelo `contexto.yml`), que é mais detalhada e
mais fresca. Este inventário existe para o que a `contexto` não dá: **tabela × uso no código**,
**rota × papéis × tabelas/edges alcançadas** e **edge function × quem a chama**, num JSON pequeno,
versionado na `main` e com histórico de PR semanal.

| Arquivo | Como gerar | O que tem |
|---|---|---|
| `banco.json` | `SUPABASE_ACCESS_TOKEN=... node scripts/inventario/gerar-banco.mjs` (Management API: `/database/query/read-only` + `/functions`, só leitura) **ou**, sem token, rodar `scripts/inventario/banco.sql` no MCP do projeto `uoujzvpecohinketylud`, salvar a resposta e `node scripts/inventario/gerar-banco.mjs --entrada <arquivo>` | banco oficial, só leitura: cada tabela (RLS, policies, triggers, linhas, tamanho, se é citada em função/view e quantos `.from()` e `/rest/v1/<tabela>` tem em `src/` e `supabase/functions/`), tabelas órfãs, cada cron job (agenda, funções chamadas, falhas e taxa em 24 h/7 d, duração máxima), horas em que o cron ficou parado, tamanho do histórico do cron, saúde gravada pelo `snapshot_cron_health`, saúde das edges pelo `health-monitor`, pulso da produção (`public.jobs`), edge functions publicadas × pastas do repo (só com token; sem token fica `publicadas: null`), e a lista `alertas` |
| `rotas.json` | `node scripts/inventario/gerar-rotas.mjs` (`--check` só confere se está em dia) | as URLs de `src/routes/AppRoutes.tsx` (página, arquivo, pública/protegida, `allowedRoles`, redirect) e, por rota, os hooks, tabelas, RPCs, buckets e edge functions alcançados pelos imports da página (`functions.invoke` e `fetch` em `/functions/v1/<edge>`), mais a lista `problemas` (URL sem arquivo, rota sem página, import quebrado) |
| `edges.json` | `node scripts/inventario/gerar-repo.mjs` | as edge functions: linhas, segredos lidos (`Deno.env.get`) e quem invoca cada uma (src, migrations, outras edges, e2e, CI) |
| `tabelas-uso.json` (não versionado) | `node scripts/inventario/gerar-repo.mjs < lista-de-tabelas.txt` | quantos `.from('tabela')` cada tabela tem — hoje também sai em `banco.json` → `tabelas[].uso_no_codigo` |

Testes: `node --test 'scripts/inventario/*.unit.mjs'` (também rodam no início do workflow semanal).

## Como ler `banco.json`

- **`alertas`** é o que um agente precisa saber antes de mexer:
  - `tabela_sem_rls` e `rls_sem_policy` (RLS ligado sem nenhuma policy nega tudo para
    `authenticated`/`anon`; pode ser de propósito, mas não fica invisível);
  - `cron_falhando` (taxa ≥ 5 % em 7 dias), `cron_parado` (hora com mais da metade das execuções
    falhando), `cron_sem_execucao` (job ativo que roda todo dia sem nenhuma execução em 24 h — o cron
    100 % parado não grava falha, então só aparece aqui), `cron_marcado_parado_no_banco`
    (`cron_health_history.is_stale`), `historico_cron_sem_limpeza` (> 50 mil linhas com mais de 7 dias);
  - `health_check_falhando` / `health_check_degradado` (última leitura de `edge_health_history`
    com status `fail` / `warn`);
  - `sem_producao_7d` (nenhuma linha nova em `public.jobs` na semana);
  - `edge_sem_deploy` e `edge_publicada_sem_codigo`.
  Os limiares estão em `LIMIARES` no script.
- **`tabelas_orfas`**: 0 linhas + não citada em função/view do banco + nenhum `.from()` nem
  `/rest/v1/` no código (`.from(variavel)` não é resolvido). Candidata a limpeza, **não** prova de
  que pode apagar (pode ser usada por RPC com outro nome ou por sistema externo).
- **`linhas`** é `count(*)` exato quando a tabela tem menos de 200 mil linhas (`linhas_exatas: true`);
  acima disso, a estimativa do planner. Não confie em `pg_stat_user_tables.n_live_tup`: zera quando o
  banco reinicia.
- Contagens rodam com o papel da conexão. Pelo endpoint read-only da Management API o papel tem
  `rolbypassrls`, então o RLS não filtra; com outro papel, tabelas com RLS e `cron.job` podem vir
  incompletas.
- A resposta só é gravada se **as tabelas baterem** (≥ 90 %, nos dois sentidos) com o bloco `Tables`
  de `src/integrations/supabase/types.ts` (arquivo gerado do banco oficial, versionado) **e** o
  **ledger bater** com `supabase/migrations/`: maior versão aplicada entre as 20 migrations mais
  recentes do repo (ou à frente) e quantidade de registros a até 10 % da de arquivos. Isso barra
  resposta colada de outro banco.
- O PR semanal (`inventario-estado-semanal.yml`) só abre quando algo **estrutural** mudou: tabela
  nova/apagada, alerta novo, RLS/policy, contagem real de linhas de tabela, rota, edge etc.
  `medido_em`/`gerado_em` sozinhos não abrem PR, e a telemetria viva também não (`execucoes_24h`,
  `taxa_falha_7d_pct`, `horas_paradas_7d`, `cron.historico.linhas/bytes`, `jobs_7d`,
  `jobs_por_status`, `latencia_ms`, `leituras_7d`): esses números rolam toda semana só pela janela
  de 24 h/7 dias, sem mudança real, e abrir PR por isso é ruído. Consequência: o valor commitado
  desses campos pode ficar atrasado por tempo indefinido — confie neles só depois de regenerar.
- **Nada de segredo sai do banco**: de `cron.job` sai só o nome das funções chamadas (nunca o
  `command`, que neste projeto tem URL e cabeçalho `x-cron-secret`); de `cron_health_history` não sai
  `last_error` (pode ecoar a URL chamada com o cabeçalho); de `edge_health_history` não sai o jsonb
  `checks`. O script se recusa a gravar saída com cara de credencial (`Bearer`, JWT, `sb_secret_`) —
  ver `PARECE_CREDENCIAL` em `scripts/inventario/gerar-banco.mjs`.
