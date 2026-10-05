# Validação da integração Graphify

Data: 05/10/2026. Execução local sobre `main`, HEAD `2d424182` (pós-merge dos
PRs #78–#87 do pacote de auditoria), worktree limpo (`manifest.dirty=false`).
Validação anterior: 11/09/2026 sobre `chore/plano-10-10-bloco-a` `866d24a0`.
Desde então o workflow `graphify.yml` (job "Architecture graph") executou e
passou remotamente no GitHub sobre commits deste pacote — a certificação CI
remota pendente na revisão anterior agora existe.

## Entrega implementada

- Graphify 0.9.48 com parser SQL, ambiente Python 3.12 isolado e lock com hashes.
- Quinze comandos `graph:*` para instalação, geração, consulta, visualização, auditoria, benchmark, diff, ratchet e testes.
- Perfis `all`, `security`, `frontend` e `backend`, com saídas independentes.
- Extração local, cache AST, assinatura de conteúdo e reconstrução após exclusões.
- Lock entre builds, validação de artefatos e detecção de mudanças durante extração.
- Evidência bruta preservada por relação, mapas estáticos de arquitetura/segurança/SQL/testes, relatório de comunidades e diagnóstico de referências incompletas.
- Workflow dedicado rodando no CI remoto (job `graph` verde nos PRs do pacote).
- Plano com **50 etapas, 250 atividades e 50 checkpoints**. Após esta execução:
  **26 I**, **19 P**, **5 F**; I significa base local implementada, não aceite final.

## Resultados executados

| Verificação | Resultado |
|---|---|
| Instalação com `--require-hashes` | Passou no ambiente isolado. |
| `graph:doctor` | Python 3.12.13, Graphify 0.9.48, parser SQL presente, 4 perfis. |
| `graph:test` | **15/15 passaram**, em repositórios temporários. |
| `graph:build` completo (perfil all) | **1.277 fontes**, **5.499 nós**, **18.737 relações** (~39 s, cache frio parcial). |
| Representação de fontes | **0 fontes elegíveis sem nó de origem**, incluindo as 232 migrations SQL. |
| `graph:check` | Snapshot atual e consistente; 0 nós não verificados, 0 arquivos não representados. |
| `graph:audit` | **8/8** controles locais aprovados. |
| `graph:benchmark` | **20/20** perguntas estruturais com termos esperados presentes. |
| `graph:ratchet -- --mode report` | Baseline revisada 05/10/2026 (ver `graphify-baseline.json`). |
| Workflow remoto `graphify.yml` | **Verde no GitHub** — runs 37356507967 a 37360559734 sobre o HEAD do PR #85. |

Os 15 testes cobrem: exclusões/symlinks; extração real e direção; SQL sem banco;
isolamento de perfis; no-op; edição/exclusão/configuração; extração vazia com
preservação; concorrência; corrupção; endpoint ausente; ID duplicado; alteração
durante a extração; mapas JSX/Edge/SQL/simulação; relações paralelas; e diff/ratchet.
Eles não substituem os testes do aplicativo.

## Limitações medidas

Na extração atual do perfil `all` (HEAD `2d424182`):

- **22.674 relações brutas**;
- **3.415 relações com endpoints não resolvidos** pelo extrator;
- **490 relações paralelas potencialmente colapsadas** na projeção DiGraph;
- grafo exportado: **18.737 relações**;
- zero endpoint ausente no JSON final, porque o check verifica a projeção exportada,
  não porque todas as referências brutas tenham sido resolvidas.

Essas contagens mudam quando o código muda — a baseline em
`graphify-baseline.json` foi revisada nesta data para refletir o código novo do
pacote de auditoria (crescimento legítimo, não regressão de parser). Consulte
`manifest.json`, `health.json` e `relation-catalog.json` para o estado
atualizado. As 19.259 relações válidas são preservadas no catálogo mesmo quando a
projeção DiGraph combina endpoints; 3.415 relações permanecem explicitamente
inconclusivas. Ter um nó por fonte não comprova cobertura de todos os seus
símbolos ou relações.

Mapas estáticos atuais: 58 rotas, 4 providers, 34 handlers Edge, 20 consumidores
literais, 649 candidatos de acesso a dados, 788 de notificação, 86 de simulação;
232 migrations com 950 objetos, 1.137 policies e 27 agendamentos no histórico
SQL; 93 arquivos de teste no mapa de contratos; 147 menções a service_role.

O visualizador nativo depende de `vis-network@9.1.6` no CDN unpkg, protegido por SRI.
Extração e consulta funcionam sem LLM, mas o primeiro carregamento do HTML não é
totalmente offline. Isso está documentado no guia.

O benchmark nativo foi executado e reportou corpus ingênuo vs. trechos
recuperados: a razão **não é medição de economia real, qualidade de resposta ou
custo total**. O benchmark controlado de 20 perguntas está versionado; ele apenas
comprova presença de termos no snapshot. Ainda faltam revisão independente,
respostas citadas e comparação humana com/sem grafo para medir utilidade real.

## Ainda não certificado

- Exigência do job `graph` nas proteções de branch (ele roda e passa, mas não bloqueia merge por si só).
- Revisão independente do dataset de perguntas e homologação por outro desenvolvedor (etapas 26, 45, 48).
- Extração semântica de documentação e rastreamento completo dos requisitos do plano mestre.
- Resolução completa de aliases/calls dinâmicas, contratos UI/API/DB e estado final de RLS.
- Hooks automáticos, watcher, MCP e visualizações de jornada com navegação revisada.
- Suporte verificado fora de Linux (esta validação é Linux/Python 3.12; a anterior era Python 3.11).
- Ensaio de upgrade/rollback da versão Graphify com dataset de referência.

Nenhuma alteração no banco, deployment, permissões de produção ou bundle React
foi necessária para esta integração. O Graphify fornece evidência para continuar
a auditoria; não certifica a meta 10/10 do sistema.
