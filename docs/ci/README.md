# Workflows de CI — o que cada um faz

> **Gerado por `scripts/ci/render-workflow-docs.mjs`.** Não edite à mão: o CI roda
> `--check` e falha se este arquivo divergir do bloco `# docs:` de cada workflow.
> Para mudar o que está aqui, mude o bloco no YAML.

**4 de 10 workflows se descrevem.**

| Workflow | Arquivo | Gatilho | O que prova | Quando falha | Quem é avisado | Custo/sem (min) | Falha (7 d) |
|---|---|---|---|---|---|---|---|
| Branch Hygiene Audit | [`branch-hygiene-audit.yml`](../../.github/workflows/branch-hygiene-audit.yml) | agendado (segunda 07:56 UTC) e dispatch | issue [branch-hygiene] com patch-equivalentes, abandonadas, PRs paradas e comando de poda pronto; issue [kpi-actions] com o consumo de Actions da semana | o job fica vermelho e as issues não são atualizadas | issues [branch-hygiene] e [kpi-actions] (uma de cada, atualizadas no lugar) | — | — |
| Contexto para agentes de IA (10 min) | [`contexto.yml`](../../.github/workflows/contexto.yml) | push em main que toque código, banco, scripts das automações ou docs/contexto/regras/manual/; a cada 10 min (minuto 3); dispatch | branch contexto com docs/contexto/{codigo,supabase,regras}/ regerados das três fontes de verdade (código em main, banco oficial, código+migrations+manual/) e docs/contexto/00-INDEX.md montado a partir dos manifests | falha fatal de produtor reprova o workflow; fontes com artefato publicam e as demais mantêm a última versão; erro de download impede a publicação | ninguém (a branch contexto é a prova; errors.md em supabase/ e erros_do_gerador em codigo/ listam seções com falha) | — | — |
| Inventário do estado real (semanal) | [`inventario-estado-semanal.yml`](../../.github/workflows/inventario-estado-semanal.yml) | agendado (seg 10:23 UTC) e dispatch | inventario/estado (banco, rotas, edges) regerado do banco oficial e do codigo | o job fica vermelho e o inventario nao e atualizado | PR automation/inventario-estado com o inventario novo | — | — |
| Settings Guard | [`settings-guard.yml`](../../.github/workflows/settings-guard.yml) | agendado (diario 07:15 UTC) e dispatch | o perimetro do GitHub (branch protection, merge, actions, environments) contra o baseline versionado | divergencia real deixa o job vermelho e abre/atualiza issue; ponto cego sai verde com aviso | issue [settings-guard] (label settings-guard) | — | — |

## Detalhe

### Branch Hygiene Audit (`branch-hygiene-audit.yml`)

- **Gatilho:** agendado (segunda 07:56 UTC) e dispatch
- **O que prova:** issue [branch-hygiene] com patch-equivalentes, abandonadas, PRs paradas e comando de poda pronto; issue [kpi-actions] com o consumo de Actions da semana
- **Quando falha:** o job fica vermelho e as issues não são atualizadas
- **Quem é avisado:** issues [branch-hygiene] e [kpi-actions] (uma de cada, atualizadas no lugar)

### Contexto para agentes de IA (10 min) (`contexto.yml`)

- **Gatilho:** push em main que toque código, banco, scripts das automações ou docs/contexto/regras/manual/; a cada 10 min (minuto 3); dispatch
- **O que prova:** branch contexto com docs/contexto/{codigo,supabase,regras}/ regerados das três fontes de verdade (código em main, banco oficial, código+migrations+manual/) e docs/contexto/00-INDEX.md montado a partir dos manifests
- **Quando falha:** falha fatal de produtor reprova o workflow; fontes com artefato publicam e as demais mantêm a última versão; erro de download impede a publicação
- **Quem é avisado:** ninguém (a branch contexto é a prova; errors.md em supabase/ e erros_do_gerador em codigo/ listam seções com falha)

### Inventário do estado real (semanal) (`inventario-estado-semanal.yml`)

- **Gatilho:** agendado (seg 10:23 UTC) e dispatch
- **O que prova:** inventario/estado (banco, rotas, edges) regerado do banco oficial e do codigo
- **Quando falha:** o job fica vermelho e o inventario nao e atualizado
- **Quem é avisado:** PR automation/inventario-estado com o inventario novo

### Settings Guard (`settings-guard.yml`)

- **Gatilho:** agendado (diario 07:15 UTC) e dispatch
- **O que prova:** o perimetro do GitHub (branch protection, merge, actions, environments) contra o baseline versionado
- **Quando falha:** divergencia real deixa o job vermelho e abre/atualiza issue; ponto cego sai verde com aviso
- **Quem é avisado:** issue [settings-guard] (label settings-guard)

## Workflows sem bloco `# docs:`

> Estes YAML ainda não dizem o que fazem. Nada aqui está quebrado — eles só não aparecem
> na tabela acima. Para incluir um, acrescente o bloco `# docs:` (gatilho, prova, falha,
> avisa) no topo do arquivo e rode o gerador de novo.

- [`ci.yml`](../../.github/workflows/ci.yml)
- [`db-admin.yml`](../../.github/workflows/db-admin.yml)
- [`deploy.yml`](../../.github/workflows/deploy.yml)
- [`graphify.yml`](../../.github/workflows/graphify.yml)
- [`migration-repair.yml`](../../.github/workflows/migration-repair.yml)
- [`visual-baselines.yml`](../../.github/workflows/visual-baselines.yml)

## O que NÃO é bug

> Comportamentos que parecem erros mas são design intencional.
> Cada item vem do bloco `# nao-e-bug:` do YAML do workflow.

| Workflow | Situação | Por quê não é bug |
|---|---|---|
| [`branch-hygiene-audit.yml`](../../.github/workflows/branch-hygiene-audit.yml) | **nada-apagado** | o relatório só MOSTRA o comando de poda; apagar branch é decisão do dono |
| [`branch-hygiene-audit.yml`](../../.github/workflows/branch-hygiene-audit.yml) | **poda-vazia** | sem a lista de PRs abertas ou de protegidas o script recusa gerar comando — na dúvida a branch fica |
| [`contexto.yml`](../../.github/workflows/contexto.yml) | **sem-commit** | "nada mudou" no publicar significa que nenhuma das três fontes mudou desde a última publicação |
| [`contexto.yml`](../../.github/workflows/contexto.yml) | **metricas** | métricas/manifests do banco aguardam 60 min desde a coleta publicada; commits de código não reiniciam o prazo; data ausente/inválida/futura e mudanças de saúde/estado do índice publicam sem espera |
| [`contexto.yml`](../../.github/workflows/contexto.yml) | **banco-pulado** | sem credencial de banco utilizável o job do banco sai verde com aviso e a pasta supabase/ fica como estava |
| [`inventario-estado-semanal.yml`](../../.github/workflows/inventario-estado-semanal.yml) | **sem-pr** | "sem mudanca de conteudo" = nada estrutural mudou; carimbo de data e telemetria viva (24 h/7 d) de proposito nao abrem PR (ver inventario/estado/README.md) |
| [`settings-guard.yml`](../../.github/workflows/settings-guard.yml) | **ponto-cego** | sem o secret SETTINGS_GUARD_TOKEN o GITHUB_TOKEN nao le branch protection (403) nem os campos de merge; sai como NAO VERIFICAVEL, job verde com ::warning:: |
