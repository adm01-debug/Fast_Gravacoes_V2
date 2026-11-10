# Automação local — Fast_Gravacoes_V2

O dispatcher `scripts/automation.mjs` liga as suites, o motor de manutenção e o adaptador de grafo. O perfil versionado `scripts/automation.config.json` é a fonte dos aliases e do registro exato de scripts. Apenas ferramentas determinísticas locais: não há chamadas de IA nem cobrança de API de IA. O CI usa minutos do GitHub Actions sujeitos ao plano da conta; execução local usa os recursos da máquina.

## Comandos

| Alias                        | Comando executado                                       | Efeito                                                                                |
| ---------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `automation:doctor`          | `node scripts/automation.mjs doctor`                    | Verifica arquivos, aliases, registros e instalação local de hooks.                    |
| `automation:test`            | `node scripts/automation.mjs test`                      | Roda exclusivamente as suites registradas abaixo.                                     |
| `automation:check`           | `node scripts/automation.mjs check --ref HEAD`          | Inspeciona a referência HEAD em worktree isolada.                                     |
| `automation:heal`            | `node scripts/automation.mjs heal --ref origin/main`    | Propõe e valida correções limitadas a partir de origin/main; não faz push.            |
| `automation:nightly`         | `node scripts/automation.mjs nightly --ref origin/main` | Atualiza o grafo e tenta manutenção isolada; relata as duas falhas independentemente. |
| `automation:graph`           | `node scripts/automation.mjs graph`                     | Encaminha subcomandos do grafo; acrescente status, query, path ou explain.            |
| `automation:status`          | `node scripts/automation.mjs graph status`              | Mostra a situação local do grafo.                                                     |
| `automation:install-hooks`   | `node scripts/automation.mjs install-hooks`             | Instala pontes locais reversíveis, encadeando hooks originais.                        |
| `automation:uninstall-hooks` | `node scripts/automation.mjs uninstall-hooks`           | Restaura o hooksPath anterior, recusando sobrescrever alteração de terceiros.         |

O comando estático para CI é `node scripts/automation.mjs doctor --static`. Ele verifica contratos; não comprova merge, execução remota, timer ou ponte instalada. `doctor` sem `--static` também exige a instalação local. Ausência de dependência é erro explícito; o dispatcher não instala pacotes automaticamente.

## Gatilhos e ativação

| Gatilho                                                  | Cadeia real de execução                                                                                                                                                          | Ativação                                                                                                                                                                                                              |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PR para main / push em main / dispatch                   | `.github/workflows/automation-local.yml` → `doctor --static` → `test` → suites exatas do perfil                                                                                  | Workflow versionado; atividade remota depende de publicação/merge e run observado.                                                                                                                                    |
| pre-commit com tooling staged                            | Ponte privada → hook original → `automation.mjs hook pre-commit` → suites registradas                                                                                            | `automation:install-hooks` instala por clone; não é instalado pelo prepare.                                                                                                                                           |
| pre-push                                                 | Ponte privada → hook original → doctor local → suites registradas                                                                                                                | A mesma instalação local; erro bloqueia a operação.                                                                                                                                                                   |
| Fontes staged / post-commit / post-merge / post-checkout | Ponte privada → hook original → adaptador de grafo marca estado sujo                                                                                                             | Não reconstrói grafo durante commit nem altera staging.                                                                                                                                                               |
| Noturno local, previsto 04:30                            | `repo-maintenance.service` → `repo-automation-nightly` → `repo-automation nightly` → `central.mjs` → suites do snapshot → nightly do snapshot → graph ensure + motor bridge heal | Configuração do timer fica fora do repositório, sob responsabilidade do runtime local. A cadeia instalada usa o snapshot aprovado antes do merge; presença dos arquivos versionados não comprova serviço/timer ativo. |

A ponte privada fica em `.tools/repo-automation/`; não substitui os arquivos Husky. Preserva erros, argumentos e stdin dos hooks originais, incluindo commit-msg. `prepare`, hooks e guards existentes foram preservados. Para reverter, use `automation:uninstall-hooks`. `nightly.command` declara o comando real do core. O timer instalado usa o snapshot aprovado por projeto antes do merge; o alias `automation:nightly` chama o core versionado manualmente após integração. Não há callback shell redundante no repositório nem `nightly.file` fictício. A existência do perfil não comprova agendamento ativo. O runtime deve conferir `systemctl --user status` e a cadeia do callback instalado antes de declarar o timer ativo.

## Suites efetivamente executadas

- `scripts/automation.unit.mjs`
- `scripts/maintenance/maintenance.unit.mjs`
- `scripts/graphify-local.unit.mjs`
- `scripts/autofix.test.mjs`

Estado local informado pelo coordenador: o sincronizador histórico possui timer externo horário ativo. A rotina antiga foi desativada e substituída pelo fleet; não é reativada por este kit para evitar duplicidade com o fleet. Essa rotina cria apenas branch local, sem publicar. Os respectivos instaladores e operações permanecem manuais no dispatcher novo; o timer de sync existente continua independente.

Fixtures dos corretores anteriores exigem dependências reais. Este workflow instala o lockfile com `npm ci --ignore-scripts` e `--legacy-peer-deps` conforme a política existente; não executa lifecycle nem instala dependências novas.

As suites usam fixtures descartáveis e não executam os scripts operacionais do inventário. O motor mantém isolamento de rede, validações obrigatórias, escopo e quotas; um gate herdado vermelho bloqueia o patch. Nenhuma referência, tipo gerado, configuração de produção ou regra de negócio é alterada para forçar verde. O grafo usa o perfil específico `graphify.local.json`; seu estado local fica em `.tools/graphify/local-state/`.

## Registro exato dos demais scripts

Os registros `legacy` abaixo preservam ferramentas anteriores e seus chamadores; não são incluídos automaticamente no novo pipeline. Para arquivos TypeScript de apoio sem runner comprovado, o comando listado só valida o inventário; os chamadores originais continuam sendo a referência de execução. Referência literal indica onde o arquivo é citado, sem garantir que esse caminho rode nem autorização para executar operações contra serviços. Sem referência, o arquivo é mantido manual porque função, parâmetros e ambiente precisam de revisão antes de ativar qualquer gatilho. Scripts novos não cobertos por registro fazem `doctor --static` falhar; não existe registro genérico `scripts/**` para ocultá-los.

| Arquivo exato                                   | Invocação manual de inventário                              | Chamadores literais / justificativa                                                                          |
| ----------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `scripts/ai-context/cenarios.mjs`               | `node scripts/ai-context/cenarios.mjs`                      | .github/workflows/contexto.yml                                                                               |
| `scripts/ai-context/gerar.mjs`                  | `node scripts/ai-context/gerar.mjs`                         | .github/workflows/contexto.yml                                                                               |
| `scripts/ai-context/gerar.unit.mjs`             | `node --test scripts/ai-context/gerar.unit.mjs`             | .github/workflows/contexto.yml                                                                               |
| `scripts/audit-gate.mjs`                        | `node scripts/audit-gate.mjs`                               | package.json:scripts, .github/workflows/ci.yml, .github/workflows/deploy.yml, .github/workflows/graphify.yml |
| `scripts/audit-gate.test.mjs`                   | `node --test scripts/audit-gate.test.mjs`                   | package.json:scripts, .github/workflows/graphify.yml                                                         |
| `scripts/audit/run.mjs`                         | `node scripts/audit/run.mjs`                                | package.json:scripts                                                                                         |
| `scripts/bundle-diff.mjs`                       | `node scripts/bundle-diff.mjs`                              | package.json:scripts, .github/workflows/ci.yml, .github/workflows/graphify.yml                               |
| `scripts/bundle-report.mjs`                     | `node scripts/bundle-report.mjs`                            | package.json:scripts, .github/workflows/graphify.yml                                                         |
| `scripts/bundle.test.mjs`                       | `node --test scripts/bundle.test.mjs`                       | package.json:scripts, .github/workflows/graphify.yml                                                         |
| `scripts/check-any-baseline.mjs`                | `node scripts/check-any-baseline.mjs`                       | package.json:scripts, .github/workflows/graphify.yml, .husky/pre-commit                                      |
| `scripts/check-any-baseline.test.mjs`           | `node --test scripts/check-any-baseline.test.mjs`           | package.json:scripts, .github/workflows/graphify.yml                                                         |
| `scripts/ci/check-claude-md-integrity.mjs`      | `node scripts/ci/check-claude-md-integrity.mjs`             | package.json:scripts, .github/workflows/ci.yml                                                               |
| `scripts/ci/check-claude-md-integrity.test.mjs` | `node --test scripts/ci/check-claude-md-integrity.test.mjs` | package.json:scripts                                                                                         |
| `scripts/ci/session-start.test.mjs`             | `node --test scripts/ci/session-start.test.mjs`             | package.json:scripts                                                                                         |
| `scripts/graphify.mjs`                          | `node scripts/graphify.mjs`                                 | package.json:scripts, .github/workflows/graphify.yml                                                         |
| `scripts/graphify.test.mjs`                     | `node --test scripts/graphify.test.mjs`                     | package.json:scripts, .github/workflows/graphify.yml                                                         |
| `scripts/graphify/corpus.py`                    | `python3 scripts/graphify/corpus.py`                        | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar.                         |
| `scripts/graphify/enrich.py`                    | `python3 scripts/graphify/enrich.py`                        | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar.                         |
| `scripts/graphify/pipeline.py`                  | `python3 scripts/graphify/pipeline.py`                      | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar.                         |
| `scripts/graphify/quality.py`                   | `python3 scripts/graphify/quality.py`                       | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar.                         |
| `scripts/graphify/run.py`                       | `python3 scripts/graphify/run.py`                           | .github/workflows/graphify.yml                                                                               |
| `scripts/graphify/tests/test_integration.py`    | `python3 scripts/graphify/tests/test_integration.py`        | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar.                         |
| `scripts/regras_negocio/generate.py`            | `python3 scripts/regras_negocio/generate.py`                | .github/workflows/contexto.yml                                                                               |
| `scripts/regras_negocio/indice.py`              | `python3 scripts/regras_negocio/indice.py`                  | .github/workflows/contexto.yml                                                                               |
| `scripts/regras_negocio/publish.sh`             | `sh scripts/regras_negocio/publish.sh`                      | .github/workflows/contexto.yml                                                                               |
| `scripts/regras_negocio/test_generate.py`       | `python3 scripts/regras_negocio/test_generate.py`           | .github/workflows/contexto.yml                                                                               |
| `scripts/rls-regression.mjs`                    | `node scripts/rls-regression.mjs`                           | package.json:scripts, .github/workflows/ci.yml, .github/workflows/graphify.yml                               |
| `scripts/rotina/instalar.sh`                    | `sh scripts/rotina/instalar.sh`                             | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar.                         |
| `scripts/rotina/rotina.mjs`                     | `node scripts/rotina/rotina.mjs`                            | scripts/autofix.test.mjs, scripts/rotina/instalar.sh                                                         |
| `scripts/seed-users.test.mjs`                   | `node --test scripts/seed-users.test.mjs`                   | package.json:scripts, .github/workflows/graphify.yml                                                         |
| `scripts/supabase_snapshot/snapshot.py`         | `python3 scripts/supabase_snapshot/snapshot.py`             | .github/workflows/contexto.yml                                                                               |
| `scripts/supabase_snapshot/test_snapshot.py`    | `python3 scripts/supabase_snapshot/test_snapshot.py`        | .github/workflows/contexto.yml                                                                               |
| `scripts/sync/instalar.sh`                      | `sh scripts/sync/instalar.sh`                               | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar.                         |
| `scripts/sync/sincronizar.sh`                   | `sh scripts/sync/sincronizar.sh`                            | scripts/autofix.test.mjs, scripts/sync/instalar.sh                                                           |

## Hooks e workflows anteriores

Hooks inventariados: `.husky/_` era o hooksPath observado. A tabela registra os arquivos, sem afirmar bootstrap instalado ou execução efetiva em outro clone. O registro legacy desses hooks limita apenas execução arbitrária pelo dispatcher; o Git e a ponte preservam os gatilhos originais.

| Hook exato          | Gatilho Git original | Referência de inventário                              |
| ------------------- | -------------------- | ----------------------------------------------------- |
| `.husky/commit-msg` | `commit-msg`         | Hook preservado e encadeado antes do novo dispatcher. |
| `.husky/pre-commit` | `pre-commit`         | Hook preservado e encadeado antes do novo dispatcher. |

Workflows anteriores preservados: 7. Os gatilhos e condições de cada arquivo continuam definidos no YAML original; esta listagem não os promove ao novo pipeline e não executa suas operações.

- `.github/workflows/ci.yml`
- `.github/workflows/contexto.yml`
- `.github/workflows/db-admin.yml`
- `.github/workflows/deploy.yml`
- `.github/workflows/graphify.yml`
- `.github/workflows/migration-repair.yml`
- `.github/workflows/visual-baselines.yml`

Os helpers dos corretores anteriores são cobertos por suites de regressão em fixtures; a chamada operacional original continua no respectivo hook/workflow. Os quatro registros principais e helpers ficam explícitos no JSON, sem globs para novos arquivos.
