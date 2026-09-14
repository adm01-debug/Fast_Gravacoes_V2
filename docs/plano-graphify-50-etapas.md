# Plano de implementação Graphify — 50 etapas

Data: 11/09/2026. Projeto: FAST GRAVAÇÕES V2. Escopo: inteligência estrutural para
desenvolvimento, auditoria e revisão de mudanças. Graphify não integra o bundle da
SPA nem substitui testes, migrations, RLS, observabilidade ou o plano mestre de 100 etapas.

## Resultado e método

Entregar grafos locais reproduzíveis, consultáveis e rastreáveis; depois ampliar
resolução de dependências, cobertura de contratos e uso assistido no CI. O plano
contém 50 etapas e 250 atividades. Cada etapa explicita dependência, responsabilidade,
critério verificável e evidência de conclusão. Os papéis abaixo são responsabilidades
propostas, não pessoas já designadas nem aprovações obtidas.

Estados: **I** = base implementada localmente; **P** = parcial; **F** = futura.
I não significa commit, CI remoto, publicação ou homologação. Uma etapa só pode
receber aceite final após seu checkpoint; hipóteses precisam permanecer identificadas.
O andamento desta entrega está em `docs/graphify/VALIDACAO.md`.

Sequência: fundação 01–10 → geração 11–20 → consulta e integração 21–30 →
enriquecimento 31–40 → automação e homologação 41–50. Não estimar prazo global sem
medir cada lote e definir responsáveis. Baseline local é entregue antes das extensões.

## A. Fundação e escopo

### Etapa 01 — Fixar o objetivo de engenharia [I]

Responsável: liderança técnica. Dependência: nenhuma.
1. Definir perguntas de arquitetura que o grafo deve ajudar a responder.
2. Escolher uso local por desenvolvedores e agentes como primeiro escopo.
3. Distinguir estrutura estática de comportamento executado e de regra de negócio.
4. Registrar que nenhuma migration ou chamada ao banco faz parte da geração.
5. Vincular a integração ao plano mestre, especialmente etapas 34, 51–60 e 97.

Checkpoint: escopo explícito no guia; nenhum import Graphify em `src`.
Evidência: `docs/graphify/README.md`, revisão do diff e busca em `src`.

### Etapa 02 — Inventariar o estado inicial [I]

Responsável: engenharia. Dependência: 01.
1. Registrar branch, commit e alterações locais preexistentes.
2. Localizar instalação CLI, interpretador e versão efetiva.
3. Localizar o grafo legado em `supabase/functions/_shared/graphify-out`.
4. Medir arquivos por categoria e por diretório antes da filtragem.
5. Registrar limitações do mapa legado e seu escopo reduzido.

Checkpoint: inventário reproduzível e alterações preexistentes preservadas.
Evidência: Git, `graph:doctor`, `graph:detect` e relatório de validação.

### Etapa 03 — Definir limites do corpus [I]

Responsável: engenharia. Dependência: 02.
1. Incluir frontend, Edge Functions, migrations, testes e scripts.
2. Declarar extensões de linguagem permitidas.
3. Excluir tipos gerados que dominariam o mapa sem explicar regras.
4. Separar mídia/documentos da extração estrutural inicial.
5. Tornar a lista elegível inspecionável pelo comando de detecção.

Checkpoint: seleção reproduzida integralmente por configuração versionada.
Evidência: `graphify.config.json` e `npm run graph:detect`.

### Etapa 04 — Definir exclusões e fronteiras locais [I]

Responsável: engenharia de segurança. Dependência: 03.
1. Excluir ambientes, chaves e nomes conhecidos de credenciais.
2. Excluir dependências, resultados de testes e builds.
3. Excluir grafos anteriores e o ambiente Python do próprio corpus.
4. Rejeitar symlinks e arquivos fora da raiz.
5. Documentar que seleção por caminho não substitui secret scan de conteúdo.

Checkpoint: fixtures de segredo, saída gerada e symlink externo não entram no grafo.
Evidência: teste `test_excludes_sensitive_outputs_and_outside_symlinks`.

### Etapa 05 — Fixar ferramenta e dependências [I]

Responsável: plataforma. Dependência: 02.
1. Validar APIs da versão instalada 0.9.48.
2. Fixar `graphifyy[sql]` com versão exata.
3. Gerar lock transitivo com hashes de distribuição.
4. Impedir fallback silencioso para uma versão Graphify diferente.
5. Registrar procedimento de atualização conjunta do lock e da configuração.

Checkpoint: instalação aceita somente distribuições autorizadas pelo lock.
Evidência: `requirements.in`, `requirements.lock` e `graph:install`.

### Etapa 06 — Isolar o ambiente Python [I]

Responsável: plataforma. Dependência: 05.
1. Criar `.venv-graphify` dentro do projeto.
2. Preferir Python 3.11 para padronização local/CI.
3. Suportar instalação com uv e documentar alternativa pip/venv.
4. Permitir interpretador explícito por `GRAPHIFY_PYTHON`.
5. Ignorar ambiente e bytecode no Git.

Checkpoint: instalação local repetível sem modificar Python do sistema.
Evidência: `graph:install`, `graph:doctor` e regras de ignore.

### Etapa 07 — Criar comandos de desenvolvimento [I]

Responsável: engenharia. Dependência: 06.
1. Expor instalação, diagnóstico e detecção por npm.
2. Expor build, check e testes por npm.
3. Expor query, path, explain e affected por npm.
4. Expor geração de HTML local.
5. Repassar argumentos como argv, sem avaliação por shell.

Checkpoint: comandos funcionam a partir do projeto e erros preservam exit code.
Evidência: `package.json`, launcher e exercícios do guia.

### Etapa 08 — Criar perfis de análise [I]

Responsável: arquitetura. Dependência: 03, 07.
1. Definir `all` para relações entre camadas.
2. Definir `security` para auth e administração de operadores.
3. Definir `frontend` para navegação, providers e features.
4. Definir `backend` para Edge e SQL.
5. Isolar as saídas para um perfil não substituir outro.

Checkpoint: seleção e caminho de saída determinados pelo mesmo perfil.
Evidência: configuração, `output_dir` e builds por perfil.

### Etapa 09 — Controlar custo e tamanho [I]

Responsável: plataforma. Dependência: 08.
1. Usar AST local sem cliente LLM no caminho de execução.
2. Limitar extração a quatro workers.
3. Avisar acima de 500 arquivos.
4. Limitar o HTML detalhado a 5.000 nós.
5. Registrar duração e custo de API zero sem alegar economia global de tokens.

Checkpoint: limites e medições aparecem no manifest e no relatório.
Evidência: configuração, manifest e benchmark futuro da etapa 45.

### Etapa 10 — Estabelecer contrato de evidência [I]

Responsável: arquitetura. Dependência: 01–09.
1. Preservar labels de confiança gerados pelo extrator.
2. Manter localização da fonte sempre que fornecida.
3. Distinguir relações originais da projeção navegável.
4. Expor relações não resolvidas e colapsos.
5. Proibir conclusão de segurança ou código morto baseada só em ausência de aresta.

Checkpoint: guia e relatório explicam os limites sem ocultar diagnósticos.
Evidência: `extraction.json`, `health.json` e seção de limites do relatório.

## B. Geração, consistência e recuperação

### Etapa 11 — Gerar grafo estrutural completo [I]

Responsável: engenharia. Dependência: 10.
1. Detectar corpus elegível.
2. Extrair TS/JS/Python/SQL com parsers locais.
3. Usar a raiz comum na resolução de caminhos.
4. Construir grafo direcionado.
5. Rejeitar extração vazia antes de publicar.

Checkpoint: grafo não vazio e fontes representadas no relatório de cobertura.
Evidência: `graph:build`, manifest e teste de extração real.

### Etapa 12 — Preservar relações paralelas originais [I]

Responsável: arquitetura. Dependência: 11.
1. Salvar a extração bruta antes do export.
2. Quantificar pares com relações diferentes.
3. Identificar relações colapsadas pelo DiGraph upstream.
4. Ensaiar projeção MultiDiGraph compatível com consulta e visualização.
5. Migrar somente após teste que preserve direção, contexto e localização.

Checkpoint: zero perda de relações válidas no formato principal ou adaptação documentada e testada.
Evidência: `relation-catalog.json` preserva cada relação válida, endpoints não resolvidos e grupos paralelos; teste de catálogo paralelo. A projeção navegável continua sendo DiGraph por limitação explícita do upstream.

### Etapa 13 — Agrupar comunidades e hubs [I]

Responsável: arquitetura. Dependência: 11.
1. Executar clustering sobre o grafo.
2. Exibir scores numéricos de coesão.
3. Nomear comunidades pela pasta predominante.
4. Produzir hubs e conexões entre comunidades.
5. Registrar que clusters não são comprovação de bounded contexts de negócio.

Checkpoint: relatório navegável com rótulos e métricas rastreáveis.
Evidência: `GRAPH_REPORT.md` e `.graphify_labels.json`.

### Etapa 14 — Rastrear commit e conteúdo [I]

Responsável: engenharia. Dependência: 11.
1. Registrar commit HEAD e estado sujo do worktree.
2. Calcular SHA-256 de cada fonte elegível.
3. Incluir configuração, aliases, lock e scripts na assinatura.
4. Registrar data UTC, versão e perfil.
5. Rejeitar assinatura diferente antes de consultar.

Checkpoint: editar fonte, alias ou política invalida o snapshot.
Evidência: manifest e teste `test_edit_delete_and_config_change_invalidate_snapshot`.

### Etapa 15 — Reutilizar cache com exclusões corretas [I]

Responsável: engenharia. Dependência: 14.
1. Reutilizar cache AST do Graphify.
2. Evitar extração quando assinatura e artefatos estão íntegros.
3. Reconstruir a partir da lista atual após mudança.
4. Remover naturalmente fontes excluídas da nova projeção.
5. Diferenciar reconstrução com cache de limpeza forçada do cache.

Checkpoint: segunda execução intacta é no-op e exclusão não deixa fonte antiga.
Evidência: testes de no-op, edição/exclusão e duas execuções reais.

### Etapa 16 — Publicar snapshot validado [I]

Responsável: plataforma. Dependência: 14–15.
1. Preparar todos os artefatos em diretório temporário.
2. Validar JSON, IDs, direção e endpoints.
3. Calcular hashes de todos os artefatos principais.
4. Publicar manifest por último.
5. Fazer leitores rejeitarem snapshot misto após interrupção.

Checkpoint: corrupção é detectada e extração inválida preserva snapshot anterior.
Evidência: testes de corrupção e extração vazia.

### Etapa 17 — Impedir concorrência de builds [I]

Responsável: plataforma. Dependência: 16.
1. Criar lock exclusivo na raiz de saída.
2. Serializar também builds de perfis diferentes pelo cache compartilhado.
3. Registrar PID para recuperação manual.
4. Liberar lock em sucesso e falha tratada.
5. Comparar corpus antes/depois para detectar edições concorrentes.

Checkpoint: build concorrente e alteração durante extração falham explicitamente.
Evidência: testes de concorrência e mudança durante build.

### Etapa 18 — Criar diagnóstico de qualidade estrutural [I]

Responsável: qualidade. Dependência: 11–17.
1. Medir endpoints ausentes na extração.
2. Medir paralelismo colapsado e duplicação.
3. Listar fontes elegíveis sem representação.
4. Validar endpoints do grafo exportado separadamente.
5. Diferenciar integridade do arquivo de cobertura semântica.

Checkpoint: warnings permanecem visíveis mesmo quando snapshot passa integridade.
Evidência: `health.json`, `graph:check` e diagnósticos do relatório.

### Etapa 19 — Gerar visualização utilizável [I]

Responsável: experiência de desenvolvimento. Dependência: 13, 18.
1. Exportar HTML a partir do snapshot vigente.
2. Exibir labels das comunidades.
3. Agregar automaticamente grafos grandes.
4. Manter HTML fora de `public` e `dist`.
5. Documentar regeneração após atualização do grafo.

Checkpoint: export HTML válido e gerado para o perfil escolhido.
Evidência: `graph:html`; usabilidade completa de navegador será homologada na etapa 48.

### Etapa 20 — Validar recuperação de falhas [I]

Responsável: qualidade. Dependência: 16–19.
1. Simular JSON corrompido.
2. Simular extração sem resultado.
3. Simular arquivo removido.
4. Simular corrida entre edição e extração.
5. Documentar lock abandonado e reexecução segura.

Checkpoint: testes negativos passam e procedimento não requer apagar código fonte.
Evidência: `graph:test` e seção de recuperação do guia.

## C. Consultas e uso diário

### Etapa 21 — Integrar busca com orçamento [I]

Responsável: engenharia. Dependência: 18.
1. Expor query pela interface npm.
2. Aceitar termos do vocabulário real.
3. Aplicar budget entre 100 e 10.000 tokens estimados.
4. Validar frescor antes da consulta.
5. Documentar confirmação dos trechos no arquivo original.

Checkpoint: consulta real retorna símbolos/localizações dentro do escopo informado.
Evidência: consulta de `authenticate requireRole requireAal2`.

### Etapa 22 — Integrar caminhos e explicação [I]

Responsável: engenharia. Dependência: 21.
1. Expor `path` com dois argumentos explícitos.
2. Expor `explain` com um símbolo.
3. Respeitar direção registrada pelo grafo.
4. Tratar falta de caminho como resultado inconclusivo quando cobertura é parcial.
5. Validar exemplos no perfil de segurança.

Checkpoint: caminhos/explicações exercitados e fontes acessíveis.
Evidência: `graph:path`, `graph:explain` e saída de validação.

### Etapa 23 — Integrar análise de impacto [I]

Responsável: arquitetura. Dependência: 22.
1. Expor consulta reversa `affected`.
2. Testar uma guarda compartilhada.
3. Diferenciar impacto potencial de chamada comprovada em runtime.
4. Inspecionar relações brutas quando o resumo perder contexto.
5. Incluir consulta no roteiro de revisão de mudanças entre módulos.

Checkpoint: consumidores potenciais são localizáveis e ressalvas constam no guia.
Evidência: comando `graph:affected` e instruções de agentes.

### Etapa 24 — Integrar Codex, Cline e demais agentes [I]

Responsável: experiência de desenvolvimento. Dependência: 21–23.
1. Adicionar comandos e limites a `CLAUDE.md`.
2. Espelhar o mesmo corpo em `AGENTS.md`.
3. Referenciar o guia para ferramentas que não leem esses arquivos automaticamente.
4. Exigir leitura das fontes antes de mudanças relevantes.
5. Orientar atualização após edição de fontes.

Checkpoint: guia copiável para Cline e instruções espelhadas sem divergência de conteúdo.
Evidência: README, CLAUDE e corpo de AGENTS.

### Etapa 25 — Documentar instalação e operação [I]

Responsável: experiência de desenvolvimento. Dependência: 06–24.
1. Escrever comandos completos a partir de checkout limpo.
2. Documentar perfis, arquivos e exclusões.
3. Documentar falhas e recuperação.
4. Documentar retirada da integração sem mudança de banco.
5. Vincular guia e plano ao README do projeto.

Checkpoint: roteiro local reproduzido; onboarding por outra pessoa ficará na etapa 48.
Evidência: `docs/graphify/README.md`.

### Etapa 26 — Criar conjunto de perguntas de referência [P]

Responsável: arquitetura e QA. Dependência: 21–25.
1. Selecionar 20 perguntas reais de manutenção.
2. Cobrir auth, TPM, jobs, offline, notificações e deploy.
3. Registrar resposta esperada, arquivos e relações obrigatórias.
4. Incluir casos sem resposta ou com ambiguidade conhecida.
5. Versionar revisões quando a arquitetura mudar.

Checkpoint: dataset revisado por um segundo desenvolvedor e sem respostas inferidas sem fonte.
Evidência: `graphify-benchmark.json` com 20 perguntas e `benchmark.json`; falta a revisão independente e a validação de respostas/arestas por pergunta.

### Etapa 27 — Ampliar resolução de aliases e barrels [F]

Responsável: arquitetura frontend. Dependência: 12, 26.
1. Medir acerto atual de `@/` e imports relativos.
2. Testar reexports, aliases de símbolos e barrels por feature.
3. Testar lazy imports de páginas e bibliotecas.
4. Criar fixtures pequenas para cada falha real.
5. Implementar adaptador somente para gaps comprovados do extrator.

Checkpoint: fixtures reproduzem falhas e demonstram a correção sem inventar arestas.
Evidência: testes de resolução e delta do diagnóstico.

### Etapa 28 — Criar visão de rotas e providers [P]

Responsável: arquitetura frontend. Dependência: 27.
1. Extrair paths e componentes de `AppRoutes`.
2. Relacionar rotas a guards, papéis e skeletons com localização de fonte.
3. Mapear ordem dos providers e consumidores reais.
4. Distinguir componente montado de funcionalidade alcançável.
5. Criar consultas de impacto para alteração de rota/provider.

Checkpoint: amostra de rotas e providers coincide com leitura manual e testes.
Evidência: `architecture.json` e fixture JSX. Guards, papéis, skeletons e consumidores ainda exigem resolução AST específica.

### Etapa 29 — Criar visão de funções Edge [P]

Responsável: backend. Dependência: 26–27.
1. Enumerar handlers legítimos.
2. Relacionar imports de auth, CORS, cron, logger e rate limit.
3. Mapear consumidores `functions.invoke` e URLs construídas estaticamente.
4. Marcar chamadas dinâmicas como não resolvidas.
5. Relacionar o registry ao plano mestre de segurança.

Checkpoint: mapa enumera todos os handlers e distingue guarda criada de guarda adotada.
Evidência: `architecture.json`/`security-map.json` enumeram handlers, guards e consumidores literais; URLs e chamadas dinâmicas continuam inconclusivas.

### Etapa 30 — Criar visão de testes e contratos [P]

Responsável: QA. Dependência: 26–29.
1. Relacionar testes a imports reais de produção.
2. Diferenciar testes de handler de testes de cópia de schema.
3. Relacionar contratos Zod compartilhados.
4. Apontar fluxos críticos sem teste relacionado.
5. Evitar converter proximidade no grafo em porcentagem de cobertura.

Checkpoint: cada ligação teste → produção possui import ou chamada verificável.
Evidência: `test-contract-map.json` e fixture de imports/contratos; resolução de import relativo, fluxos críticos e cobertura permanecem pendentes.

## D. Enriquecimento e rastreabilidade do plano mestre

### Etapa 31 — Validar extração SQL histórica [P]

Responsável: backend/DBA. Dependência: 11, 26.
1. Instalar parser SQL e medir representação das 218 migrations atuais.
2. Relacionar tabelas, funções e triggers quando o parser reconhecer a construção.
3. Testar PL/pgSQL, SQL dinâmico e objetos condicionais.
4. Distinguir CREATE, ALTER, DROP e ordem temporal.
5. Proibir inferência de estado final por simples união de declarações.

Checkpoint: casos de evolução temporal e SQL dinâmico têm resultado validado.
Evidência: parser e extração inicial entregues; fixtures avançadas pendentes.

### Etapa 32 — Curar documentação semântica [F]

Responsável: arquitetura. Dependência: 10, 26.
1. Selecionar plano mestre, ADRs e contratos atuais.
2. Excluir relatórios desatualizados ou marcá-los como histórico.
3. Definir schema separado de entidades documentais.
4. Exigir origem, data e confiança de toda relação semântica.
5. Escolher processamento local/host e medir custo antes de automatizar.

Checkpoint: documento obsoleto não é apresentado como comportamento atual.
Evidência: corpus semântico revisado e testes de conflito entre versões.

### Etapa 33 — Rastrear as 100 etapas existentes [P]

Responsável: liderança técnica e QA. Dependência: 30–32.
1. Criar IDs estáveis para 100 etapas e 1.000 subetapas.
2. Relacionar requisitos a artefatos com evidência explícita.
3. Relacionar checkpoints a comandos e resultados datados.
4. Distinguir planejado, implementado local, commitado, CI e runtime.
5. Exigir revisão humana para promover status de conclusão.

Checkpoint: consulta identifica lacunas sem promover requisito apenas porque um arquivo existe.
Evidência: `requirements-traceability.json` extrai IDs e checkpoints dos 100 requisitos e do plano Graphify; matriz explícita requisito → código → teste → ambiente ainda é pendente.

### Etapa 34 — Modelar UI → API → banco [P]

Responsável: arquitetura full stack. Dependência: 28–31.
1. Detectar mutations frontend.
2. Identificar chamadas Edge, RPC e PostgREST.
3. Relacionar contratos e handlers.
4. Relacionar tabelas e funções SQL versionadas.
5. Marcar elos não resolvidos e validar uma jornada completa por domínio.

Checkpoint: cinco jornadas com fontes em cada elo e sem saltos inferidos como fatos.
Evidência: `architecture.json` lista candidatos de `functions.invoke` e acesso PostgREST/RPC, enquanto `sql-history.json` lista histórico SQL. Não há jornadas fim a fim validadas.

### Etapa 35 — Mapear segurança por operação [P]

Responsável: segurança e backend. Dependência: 29, 31, 34.
1. Relacionar operação a autenticação requerida.
2. Relacionar papel e AAL com guards presentes no código.
3. Relacionar policy SQL histórica sem declarar efetividade remota.
4. Identificar endpoints que usam service-role.
5. Cruzar resultados com futura suíte negativa de RLS e Edge.

Checkpoint: resultado estático e resultado executado aparecem separados.
Evidência: `security-map.json` separa guards, referências service-role e policies históricas; não verifica permissão efetiva nem bypass.

### Etapa 36 — Mapear simulações e proveniência [P]

Responsável: engenharia e produto. Dependência: 28, 34.
1. Identificar fontes simuladas e literais relevantes.
2. Distinguir random usado em ID de random usado em métrica.
3. Relacionar simulação a páginas e persistência.
4. Marcar caminhos de demo e produção.
5. Priorizar peso, telemetria e status de notificação simulados.

Checkpoint: amostra distingue falsos positivos e aponta gravação simulada com trilha completa.
Evidência: `architecture.json` lista candidatos `Math.random` com arquivo e linha; classificação por finalidade e trilha de persistência pendem de revisão humana.

### Etapa 37 — Mapear notificações e rotinas [P]

Responsável: backend. Dependência: 29, 34.
1. Relacionar producers, preferências, handlers e providers.
2. Identificar schedules SQL e cabeçalhos exigidos pelo cron.
3. Distinguir envio solicitado de confirmação de entrega.
4. Relacionar outbox/dead-letter quando implementados no sistema.
5. Sinalizar rotinas sem consumidor versionado, mantendo runtime desconhecido.

Checkpoint: nenhuma rotina é declarada órfã apenas por ausência de chamada frontend.
Evidência: `architecture.json` lista candidatos de notificação e `sql-history.json` schedules históricos; producer/entrega/runtime seguem desconhecidos.

### Etapa 38 — Mapear duplicação e ciclos [P]

Responsável: arquitetura. Dependência: 12, 27–30.
1. Medir componentes fortemente conectados.
2. Separar ciclos de tipos, barrels e execução.
3. Identificar fontes de verdade duplicadas por domínio.
4. Priorizar auth, offline, notificações e TPM.
5. Produzir propostas com teste de regressão e dependências afetadas.

Checkpoint: cada ciclo prioritário tem caminho concreto e impacto revisado.
Evidência: `cycle-report.json` com componentes fortemente conexos e amostras de ciclos; classificação e priorização por domínio pendem de revisão.

### Etapa 39 — Mapear módulos candidatos a abandono [P]

Responsável: engenharia e produto. Dependência: 28–38.
1. Encontrar nós sem consumidores estáticos.
2. Revisar reflexão, carregamento dinâmico e integrações externas.
3. Distinguir provider montado sem leitor de arquivo nunca importado.
4. Classificar candidato, confirmado e não verificável.
5. Separar análise de autorização para remover funcionalidade.

Checkpoint: nenhum arquivo é removido automaticamente a partir de grau zero.
Evidência: `dead-code-candidates.json` fornece fila estática com ressalva explícita; não remove arquivos nem confirma abandono.

### Etapa 40 — Criar visualizações por jornada [P]

Responsável: experiência de desenvolvimento. Dependência: 33–39.
1. Criar visões auth, produção, TPM, offline e comunicação.
2. Exibir filtros por camada e confiança.
3. Mostrar origem, linha e último build.
4. Oferecer acesso aos diagnósticos associados.
5. Validar legibilidade de jornadas grandes sem expor o grafo publicamente.

Checkpoint: um revisor encontra a fonte de cada elo sem percorrer o grafo completo.
Evidência: `journey-views.json` oferece filtros estáticos para auth, produção, TPM, offline e comunicação; visualização interativa, filtros por confiança e homologação de legibilidade pendem.

## E. CI, automação e homologação

### Etapa 41 — Executar validação estrutural no CI [P]

Responsável: plataforma. Dependência: 20–25.
1. Criar workflow dedicado com actions pinadas por SHA.
2. Instalar a partir do lock e hashes.
3. Executar testes, build e check completos.
4. Publicar diagnóstico no resumo do job.
5. Executar em uma PR real e registrar o SHA validado.

Checkpoint: workflow remoto passa sobre o commit exato; configuração local não basta.
Evidência: workflow entregue; run remoto pendente.

### Etapa 42 — Criar comparação entre base e PR [P]

Responsável: plataforma e arquitetura. Dependência: 38, 41.
1. Gerar snapshots separados de base/head.
2. Comparar nós, relações, ciclos e cobertura de fontes.
3. Normalizar caminhos e desconsiderar timestamp.
4. Evitar tratar IDs de comunidades como identidade estável.
5. Produzir relatório de impacto com evidência de ambos os lados.

Checkpoint: alteração, renomeação e exclusão conhecidas produzem diffs corretos.
Evidência: `graph:diff -- --baseline outro/graph.json` e teste de diff idêntico; integração com snapshots base/head do GitHub e casos de rename/exclusão pendem de CI remoto.

### Etapa 43 — Definir ratchets de arquitetura [P]

Responsável: liderança técnica. Dependência: 26, 38, 42.
1. Medir baseline real de warnings.
2. Separar regressões novas de limitações antigas do parser.
3. Definir exceções com owner e validade.
4. Ensaiar modo informativo antes de bloquear merges.
5. Tornar obrigatório somente o gate com precisão comprovada.

Checkpoint: regressão deliberada falha e refactor legítimo não produz falso bloqueio.
Evidência: `graphify-baseline.json`, exceções com owner/validade e `graph:ratchet`; modo informativo entrou no workflow, mas branch protection e precisão em PR real pendem de CI remoto.

### Etapa 44 — Ensaiar atualização automática opcional [F]

Responsável: experiência de desenvolvimento. Dependência: 17, 41.
1. Medir latência do build no uso diário.
2. Escolher hook pós-commit ou watcher conforme necessidade.
3. Integrar com Husky existente sem substituir seus controles.
4. Implementar debounce e comportamento de lock.
5. Documentar desativação e recuperação de processo interrompido.

Checkpoint: dez commits/edições de teste não duplicam processos nem atrapalham commits.
Evidência: ensaio em checkout isolado; automação não ativada nesta baseline.

### Etapa 45 — Medir utilidade e economia [P]

Responsável: QA e arquitetura. Dependência: 26, 40–42.
1. Executar perguntas do dataset com e sem grafo.
2. Medir tempo, contexto recuperado e completude da resposta.
3. Incluir perguntas sem caminho resolvido.
4. Registrar cache quente/frio e hardware.
5. Publicar medianas e falhas sem extrapolar redução de corpus para economia monetária.

Checkpoint: relatório reproduzível de acerto e custo por pergunta.
Evidência: benchmark controlado de 20 perguntas e execução local; faltam comparação humana com/sem grafo, tempo mediano, hardware e análise de respostas incompletas.

### Etapa 46 — Ensaiar MCP local opcional [F]

Responsável: plataforma. Dependência: 21–25, 45.
1. Avaliar se os comandos npm já atendem aos agentes.
2. Se necessário, fixar dependências MCP adicionais em lock separado.
3. Configurar servidor stdio local e caminhos explícitos.
4. Verificar ferramentas expostas e escopo de leitura.
5. Testar consultas sem servidor HTTP público e sem credenciais de banco.

Checkpoint: cliente autorizado consulta o snapshot atual sem ampliar acesso ao sistema.
Evidência: configuração revisada e teste de conexão; não instalado implicitamente.

### Etapa 47 — Versionar evolução e rollback da ferramenta [P]

Responsável: plataforma. Dependência: 05, 20, 41.
1. Atualizar versão somente em mudança isolada.
2. Regenerar lock e revisar dependências novas.
3. Rodar dataset de referência e comparar diagnósticos.
4. Preservar baseline anterior para comparação de regressão.
5. Ensaiar retorno à versão anterior com reconstrução das saídas.

Checkpoint: upgrade e retorno exercitados sem depender de grafo gerado por outra versão.
Evidência: procedimento inicial documentado; ensaio de upgrade/rollback pendente.

### Etapa 48 — Homologar uso por outro desenvolvedor [F]

Responsável: QA e experiência de desenvolvimento. Dependência: 25, 40–47.
1. Usar checkout limpo em ambiente documentado.
2. Instalar sem configuração pessoal do autor.
3. Gerar, consultar e abrir HTML no navegador.
4. Responder três perguntas e localizar o código correto.
5. Registrar dificuldades, tempo e limitações de outras plataformas.

Checkpoint: outra pessoa reproduz o fluxo com o guia, sem instruções adicionais.
Evidência: checklist assinado e logs de instalação/navegação.

### Etapa 49 — Auditar integridade e isolamento finais [P]

Responsável: segurança e QA. Dependência: 41–48.
1. Confirmar que artefatos não entram no bundle/deploy frontend.
2. Revisar regras de compartilhamento e secret scan dos artefatos publicados.
3. Reexecutar testes negativos de snapshot e concorrência.
4. Verificar permissões efetivas do workflow e conectores opcionais.
5. Revisar afirmações de cobertura e separar warnings aceitos de bugs abertos.

Checkpoint: relatório final contém limites, riscos aceitos e evidência por controle.
Evidência: `graph:audit`, testes negativos e regras de ignore locais; revisão independente, CI remoto e permissões efetivas ainda pendem.

### Etapa 50 — Aceitar a integração e manter o roadmap [P]

Responsável: liderança técnica e donos dos domínios. Dependência: 01–49.
1. Consolidar estado real de cada uma das 50 etapas.
2. Anexar commits, logs, dataset e homologação.
3. Classificar extensões adiadas com razão e dependência.
4. Aprovar uso da baseline sem alegar conclusão do plano mestre do produto.
5. Agendar revisão após upgrades relevantes ou mudanças de arquitetura.

Checkpoint: aceite técnico explícito, reproduzível e limitado ao escopo comprovado.
Evidência: baseline local entregue; certificação das extensões e aceite final pendentes.

## Critérios transversais de conclusão

- Grafo principal e perfis possuem origem, data, versão, hashes e escopo verificáveis.
- Falhas de extração não são mascaradas por relatórios verdes.
- Mudanças locais, commitadas, aprovadas no CI e comprovadas em runtime não se confundem.
- Nenhuma dependência Python ou grafo entra no runtime React.
- A geração estrutural não usa LLM nem banco remoto.
- Cobertura de parser é medida separadamente da integridade do snapshot.
- Endpoints não resolvidos e relações colapsadas continuam visíveis até sua correção.
- Nenhuma remoção funcional, implantação ou alteração de RLS deriva automaticamente do grafo.
- As etapas futuras exigem suas próprias evidências antes de serem marcadas como concluídas.
