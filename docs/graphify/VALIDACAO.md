# Validação da integração Graphify

Data: 11/09/2026. Execução local sobre `chore/plano-10-10-bloco-a`,
HEAD de referência `866d24a0`, com worktree sujo. As alterações preexistentes da
auditoria foram preservadas. Este registro não representa publicação ou CI remoto.

## Entrega implementada

- Graphify 0.9.48 com parser SQL, ambiente Python 3.11 isolado e lock com hashes.
- Quinze comandos `graph:*` para instalação, geração, consulta, visualização, auditoria, benchmark, diff, ratchet e testes.
- Perfis `all`, `security`, `frontend` e `backend`, com saídas independentes.
- Extração local, cache AST, assinatura de conteúdo e reconstrução após exclusões.
- Lock entre builds, validação de artefatos e detecção de mudanças durante extração.
- Evidência bruta preservada por relação, mapas estáticos de arquitetura/segurança/SQL/testes, relatório de comunidades e diagnóstico de referências incompletas.
- Workflow dedicado, guia operacional e instruções espelhadas para agentes.
- Plano com **50 etapas, 250 atividades e 50 checkpoints**. Após a execução local:
  **25 I**, **20 P**, **5 F**; I significa base local implementada, não aceite remoto.

## Resultados executados

| Verificação | Resultado |
|---|---|
| Instalação com `--require-hashes` | Passou no ambiente isolado. |
| `graph:doctor` | Python 3.11.16, Graphify 0.9.48, parser SQL presente. |
| `graph:test` | **15/15 passaram**, em repositórios temporários. |
| `graph:build` completo | **1.202 fontes**, **5.222 nós**, **17.522 relações**. |
| Duração do último build completo | **14,30 s** nesta máquina, com cache disponível; não é SLA. |
| Representação de fontes | **0 fontes elegíveis sem nó de origem**, incluindo as migrations SQL. |
| Perfil security | **36 fontes**, **187 nós**, **273 relações**. |
| Perfil frontend | **905 fontes**, **4.083 nós**, **16.248 relações**; check passou. |
| Perfil backend | **269 fontes**, **997 nós**, **1.044 relações**; check passou. |
| Segunda geração sem alteração | No-op; nenhuma extração necessária. |
| `graph:check` | Snapshot atual e consistente, com warnings semânticos expostos. |
| Query de auth | Retornou `authenticate`, `requireRole`, `requireAal2` e localizações. |
| Path de AAL2 | `requireElevatedAal2()` → `requireAal2()`, aresta `calls`. |
| Impacto reverso AAL2 | Retornou guarda elevada, teste auth e `create-operator`. |
| Export HTML | Agregação por comunidades acima de 5.000 nós. |
| Smoke no Chromium headless | Um canvas renderizado; **zero erro JavaScript**. |
| `actionlint` do novo workflow | Passou. |
| `node --check` do launcher | Passou. |
| `git diff --check` | Passou. |
| Corpo de AGENTS × CLAUDE | Conteúdo espelhado idêntico; cabeçalho próprio do AGENTS preservado. |
| Catálogo de relações | **18.012** relações válidas preservadas, **3.289** não resolvidas e **458** grupos paralelos. |
| Mapas estáticos | 58 rotas, 4 providers, 33 handlers Edge, 20 consumidores literais, 218 migrations e 78 arquivos de teste listados. |
| `graph:audit` | **8/8** controles locais aprovados. |
| `graph:benchmark` | **20/20** perguntas estruturais com termos esperados presentes. |
| `graph:ratchet -- --mode enforce` | Baseline local de ambiguidade passou sem exceções. |

Os 15 testes cobrem: exclusões/symlinks; extração real e direção; SQL sem banco;
isolamento de perfis; no-op; edição/exclusão/configuração; extração vazia com
preservação; concorrência; corrupção; endpoint ausente; ID duplicado; alteração
durante a extração; mapas JSX/Edge/SQL/simulação; relações paralelas; e diff/ratchet.
Eles não substituem os testes do aplicativo.

## Limitações medidas

Na extração final do perfil `all`:

- **21.301 relações brutas**;
- **3.289 relações com endpoints não resolvidos** pelo extrator;
- **498 relações paralelas potencialmente colapsadas** na projeção DiGraph;
- grafo exportado: **17.522 relações**;
- zero endpoint ausente no JSON final, porque o check verifica a projeção exportada,
  não porque todas as referências brutas tenham sido resolvidas.

Essas contagens mudam quando o código muda. Consulte `manifest.json`, `health.json`
e `relation-catalog.json` para o estado atualizado. As 18.012 relações válidas são
preservadas no catálogo mesmo quando a projeção DiGraph combina endpoints; 3.289
relações permanecem explicitamente inconclusivas. Ter um nó por fonte não comprova
cobertura de todos os seus símbolos ou relações.

O visualizador nativo depende de `vis-network@9.1.6` no CDN unpkg, protegido por SRI.
Extração e consulta funcionam sem LLM, mas o primeiro carregamento do HTML não é
totalmente offline. Isso está documentado no guia.

O benchmark nativo foi executado e reportou 259.300 palavras (~345.733 tokens) como
corpus ingênuo e ~178 tokens médios de contexto nas quatro perguntas genéricas.
A razão nativa de 1.942,3× compara corpus completo a trechos recuperados: **não é
medição de economia real, qualidade de resposta ou custo total**. O benchmark
controlado de 20 perguntas agora está versionado; ele apenas comprova presença de
termos no snapshot. Ainda faltam revisão independente, respostas citadas e comparação
humana com/sem grafo para medir utilidade real.

## Ainda não certificado

- Execução do workflow no GitHub e exigência dele nas proteções de branch.
- Extração semântica de documentação e rastreamento dos 1.000 requisitos do plano mestre.
- Resolução completa de aliases/calls dinâmicas, contratos UI/API/DB e estado final de RLS.
- Hooks automáticos, watcher, MCP e visualizações de jornada com navegação revisada.
- Homologação por outro desenvolvedor e suporte verificado fora de Linux.
- Upgrade/rollback da versão Graphify com dataset de referência.

Nenhuma alteração no banco, deployment, permissões de produção ou bundle React
foi necessária para esta integração. O Graphify fornece evidência para continuar
a auditoria; não certifica a meta 10/10 do sistema.
