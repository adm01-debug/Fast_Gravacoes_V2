# Graphify no FAST GRAVAÇÕES V2

O Graphify é uma ferramenta de engenharia para consultar a estrutura do repositório.
A integração usa `graphifyy[sql]==0.9.48`, extração AST local e grafos direcionados.
Não exige credencial de LLM, Supabase ou acesso ao banco. As consultas retornam
contexto estrutural; cabe ao desenvolvedor verificar o código e os testes.

## Instalação e primeiro uso

Requisitos: Node.js 22 e Python 3.11. `uv` é recomendado; sem ele, Python precisa
do módulo `venv`/`ensurepip`. A plataforma exercitada nesta entrega é Linux.

```bash
npm run graph:install
npm run graph:doctor
npm run graph:build
npm run graph:check
npm run graph:query -- "authenticate requireRole requireAal2" --budget 1500
npm run graph:html
```

`graph:install` cria `.venv-graphify`, instala o lock com hashes e valida a versão.
Com `uv`, usa Python 3.11; com pip, usa o `python3` disponível (use Python 3.11).
Nenhuma dependência Graphify entra em `dependencies` do frontend.
O launcher prefere `.venv-graphify`, depois a instalação Graphify compatível no PATH.
Para selecionar explicitamente um interpretador, use `GRAPHIFY_PYTHON` com o caminho
do executável; argumentos de shell não são aceitos nessa variável.

## Comandos

| Comando | Resultado |
|---|---|
| `graph:doctor` | Valida Python, Graphify e parser SQL; lista perfis. |
| `graph:detect` | Mostra exatamente os arquivos elegíveis e as exclusões sensíveis detectadas. |
| `graph:build` | Reutiliza AST em cache, reconstrói o grafo e publica o snapshot validado. |
| `graph:build -- --rebuild` | Força reconstrução com cache; não apaga histórico nem ignora erros. |
| `graph:check` | Verifica hashes, origem atual, IDs, direção e endpoints; imprime diagnósticos. |
| `graph:query -- "símbolos" --budget 1500` | Recupera contexto pelo vocabulário do código, com limite estimado. |
| `graph:path -- "origem" "destino"` | Procura caminho estrutural entre dois símbolos. |
| `graph:explain -- "símbolo"` | Exibe nó e vizinhos. |
| `graph:affected -- "símbolo"` | Consulta dependências reversas potenciais. |
| `graph:html` | Gera visualização local; agrega comunidades acima de 5.000 nós. |
| `graph:audit` | Verifica controles locais versionados e os artefatos enriquecidos. |
| `graph:benchmark` | Exibe o resultado determinístico das perguntas de regressão revisadas. |
| `graph:ratchet -- --mode report` | Compara métricas com a baseline sem bloquear a entrega. |
| `graph:ratchet -- --mode enforce` | Falha apenas para regressão sem exceção versionada e não expirada. |
| `graph:diff -- --baseline outro/graph.json` | Compara duas projeções estruturais sem depender de provedor Git. |
| `graph:test` | Executa cenários de falha em diretórios temporários isolados. |

Todos os comandos operacionais aceitam `--profile`; geração e consulta devem usar
o mesmo perfil. As consultas rejeitam snapshots desatualizados ou inconsistentes.
Uma alteração exclusivamente documental não invalida a extração estrutural.

```bash
npm run graph:build -- --profile security
npm run graph:query -- --profile security "authenticate requireAal2" --budget 1000
npm run graph:explain -- --profile security "requireAal2"
npm run graph:affected -- --profile security "requireAal2"
npm run graph:html -- --profile security
```

## Corpus e artefatos

`graphify.config.json` define quatro perfis:

- `all`: `src`, funções e migrations Supabase, testes e scripts;
- `security`: auth frontend, guards, helpers Edge e gestão de operadores;
- `frontend`: `src`;
- `backend`: funções e migrations Supabase.

As extensões elegíveis são TS/TSX, JS/JSX/MJS, Python e SQL. `.graphifyignore`
exclui ambientes, chaves, caches, builds, dependências, documentação, mídia e os
tipos Supabase gerados. Symlinks de arquivos são rejeitados e o detector não segue
symlinks de diretórios. Somente caminhos dentro do repositório são elegíveis.
Isso é uma política de seleção, não um scanner capaz de reconhecer todo segredo
eventualmente colocado dentro de um arquivo fonte; revise artefatos antes de compartilhá-los.

O perfil `all` fica em `graphify-out/`; os demais em
`graphify-out/profiles/<perfil>/`. O grafo antigo de `_shared` permanece independente.

| Artefato | Uso |
|---|---|
| `graph.json` | Projeção navegável produzida pelo Graphify. |
| `extraction.json` | Nós e relações originais, antes da projeção e de possíveis colapsos. |
| `GRAPH_REPORT.md` | Comunidades, coesão numérica, hubs, perguntas e limites. |
| `health.json` | Relações não resolvidas, colapsos e arquivos sem representação. |
| `relation-catalog.json` | Relações brutas resolvidas, endpoints não resolvidos e grupos paralelos; não colapsa a evidência. |
| `architecture.json` | Rotas, providers, Edge Functions, consumidores e candidatos estáticos de dados/notificações/simulação. |
| `security-map.json` | Guards e referências a service role no código, além de policies no histórico SQL. |
| `sql-history.json` | Objetos, policies e agendamentos encontrados nas migrations — nunca o schema vivo. |
| `cycle-report.json` | Componentes fortemente conexos e amostras de ciclos estruturais. |
| `dead-code-candidates.json` | Arquivos sem importação AST resolvida; é fila de revisão, não ordem de remoção. |
| `test-contract-map.json` | Imports de testes e menções explícitas a contratos; não é cobertura. |
| `requirements-traceability.json` | Checkpoints do plano de 50 etapas extraídos do documento versionado. |
| `journey-views.json` | Filtros estáticos iniciais para auth, produção, TPM, offline e comunicação; não são fluxos executados. |
| `benchmark.json` | Resultado do conjunto de perguntas controladas em `graphify-benchmark.json`. |
| `overview.json` | Métricas agregadas dos artefatos estáticos. |
| `manifest.json` | Perfil, hashes, commit, worktree sujo, versão, duração e custo AST. |
| `.graphify_labels.json` | Nomes determinísticos derivados de pastas, sem LLM. |
| `graph.html` | Visualização derivada; regenere com `graph:html` após um build. |

O HTML nativo carrega `vis-network@9.1.6` do CDN unpkg com hash de integridade
fixado pelo Graphify. Portanto, a extração e as consultas são locais, mas a primeira
abertura do HTML requer acesso a esse recurso externo. Uma distribuição totalmente
offline do visualizador precisa de empacotamento adicional.

O manifest é publicado por último; seus hashes permitem rejeitar uma publicação
interrompida. Um lock global impede builds simultâneos de perfis que compartilham
o cache. O build compara o corpus antes e depois da extração. Reconstrução completa
a partir da lista atual elimina nós de arquivos excluídos, mesmo quando a AST usa cache.

`graphify-baseline.json` contém somente métricas de ambiguidade revisáveis
(`unresolved_relations` e `parallel_relation_groups`). Contagens de arquivos e
relações brutas são telemetria de capacidade: uma feature legítima pode aumentá-las.
Uma exceção ao ratchet exige `metric`, `reason`, `responsible` e `expires_on`; exceções
expiradas não suprimem a falha. Mantenha `--mode report` até a primeira validação
remota da automação; `--mode enforce` já está disponível para execução explícita.

## Como interpretar o resultado

1. Execute `graph:check` e examine `health.json`.
2. Pesquise nomes reais de módulos/símbolos; perguntas vagas podem recuperar contexto irrelevante.
3. Verifique `source_file` e `source_location` no código atual.
4. Confirme relações dinâmicas e regras de negócio com testes específicos.
5. Após editar fontes, execute `graph:build` e repita a consulta afetada.

A versão usada pode colapsar relações paralelas ao projetar um `DiGraph` e não
resolver alguns endpoints. `relation-catalog.json` preserva cada relação bruta,
separa endpoints não resolvidos e enumera grupos paralelos; portanto uma revisão
não precisa inferir a perda a partir da projeção. O `graph.json` continua sendo
apenas a visualização navegável. O relatório mede ambos os lados.
`graph:check` verde certifica integridade/frescor do snapshot, **não** completude
semântica, ausência de código morto, autorização RBAC ou qualidade 10/10.
Um perfil reduzido terá mais referências externas não resolvidas que `all`.

SQL representa declarações do histórico de migrations. O grafo não executa SQL,
não determina sozinho o estado final das policies e não comprova aplicação no banco.
Documentação e imagens estão fora da baseline. Os mapas de UI → Edge → acesso a dados
usam padrões conservadores e são candidatos de revisão, não rastreamento semântico
fim a fim. Eles nunca devem justificar alteração de RLS ou exclusão de código sem
confirmar o caminho real.

O custo de API registrado para a extração estrutural é zero. Isso não significa
zero CPU, zero tempo ou zero tokens desta conversa. Ganho de produtividade exige
benchmark com perguntas e respostas esperadas; não derive economia de uma contagem de nós.

## CI e agentes

`.github/workflows/graphify.yml` instala dependências verificadas por hashes,
executa testes, gera o perfil completo, checa o snapshot, audita os controles,
executa benchmark e ratchet informativo, e prova o caminho sem alterações. O relatório entra no resumo do job. O workflow usa actions pinadas e
permissão `contents: read`; não publica HTML nem envia o grafo a serviços externos.
Ele só será validado no GitHub após commit/push. Branch protection é configuração externa.

`CLAUDE.md` e o corpo espelhado de `AGENTS.md` orientam consulta e atualização.
Husky permanece com seu comportamento existente; hooks automáticos, watcher e MCP
estão planejados separadamente para não introduzir processos ou conexões implícitos.

## Falhas e recuperação

- **Parser SQL ausente ou versão diferente:** execute `graph:install`.
- **Sem `ensurepip`:** use `uv` ou disponibilize Python 3.11 com `venv` e tente novamente.
- **Grafo desatualizado/corrompido:** execute `graph:build`. O último snapshot íntegro
  permanece intacto se a extração falhar antes da publicação.
- **Build interrompido durante publicação:** `graph:check` rejeita hashes mistos;
  refaça o build. Não use resultados do snapshot inconsistente.
- **Lock abandonado:** examine o PID em `graphify-out/.build.lock` e confirme que
  não há build ativo antes de remover somente esse arquivo. Nenhum desbloqueio automático.
- **Arquivos sem nós:** veja a lista em `health.json`; investigue parser/linguagem
  antes de declarar o arquivo sem dependências.
- **Retirar a integração:** remova os scripts `graph:*`, o workflow dedicado e os
  blocos documentais. Não há migration de banco, pacote frontend ou serviço remoto a desfazer.

Veja [o plano de 50 etapas](../plano-graphify-50-etapas.md) e
[as evidências desta entrega](VALIDACAO.md).
