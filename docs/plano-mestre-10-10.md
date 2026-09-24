# Plano mestre de auditoria e evolução — FAST GRAVAÇÕES V2 rumo ao 10/10

> **Origem:** plano elaborado pelo Codex em 10/09/2026 (sessão rollout-2026-09-10T07-53-46), sobre a branch `main` @ `a82e4fed`.
> **Status de execução:** controlado por commits nesta branch e no scorecard abaixo. Bloco A em execução.
> **Baseline registrada (Etapa 1):** commit `a82e4fed`; working tree preservado (hardening CI/segurança pré-existente).

## Registro de execução — Bloco A (contenção crítica)

| Etapa | Status | Evidência |
|---|---|---|
| 1 — Baseline + backlog | ✅ Executada | Este documento; baseline `a82e4fed`; gates medidos abaixo |
| 2 — migrate-helper como incidente | 🟨 Contida no repositório | Diretório removido; `index.html` limpo; post-mortem `docs/post-mortems/2026-09-10-migrate-helper.md`; **pendências manuais**: rotação service-role/DB password + auditoria de logs no painel |
| 3 — Encerrar superfície `exec_sql` | 🟨 Migration corrigida | `20260905120000…` agora condicional (segura em banco limpo); verificação no banco real **pendente** (MCP local aponta para outro projeto — ver `supabase/ENVIRONMENTS.md`) |
| 4 — Rotacionar e classificar segredos | 🟨 Parcial | Templates `.env.*` limpos de segredos server-side; rotação de tokens **pendente** (painel) |
| 5 — Unificar ambientes Supabase | 🟨 Parcial | `seed-users.mjs` parametrizado; matriz documentada em `supabase/ENVIRONMENTS.md`; decisão do ref canônico **pendente** (owner) |
| 6 — Middleware comum Edge | 🟨 Parcial | `_shared/auth.ts` entrega AuthContext, JWT+papéis+AAL, guardas, envelopes e HMAC; 40 testes Deno congelados passam. Apenas `create-operator` o adota: migração gradual das demais Edge Functions ainda é necessária. |
| 7 — MFA AAL2 server-side | 🟨 Parcial | `create-operator` exige AAL2; a migration usa policies **RESTRICTIVE** para combinar AAL2 com os limites legados de papel; UI envia elevados sem fator à rota isolada `/mfa-enrollment`. A migration ainda não foi aplicada/validada no banco canônico. ⚠️ BREAKING planejado: AAL1 não escreve `user_roles`. |
| 8 — Endurecer CORS/headers | 🟨 Parcial | CORS compartilhado não usa wildcard; Vercel tem fallback SPA e CSP Report-Only. Eventos `securitypolicyviolation` são enviados ao Sentry quando configurado. Falta scanner automatizado de origens e promoção segura da CSP de observação para bloqueio. |
| 9 — Supply chain | 🟨 Parcial | Audit gate agora falha fechado se npm audit não produzir resultado válido; CI usa histórico completo para TruffleHog, inclui Deno congelado e falha se E2E não puder rodar. Ainda falta pin por SHA e tratamento das vulnerabilidades moderadas. |
| 10 — Certificar contenção P0 | 🟨 Gates locais verdes | `tsc --noEmit`, lint sem erros, Vitest, build, Deno 40/40, actionlint e simulação de audit indisponível passaram. Secret scan remoto, E2E real e banco canônico continuam pendentes. |

### Recertificação 2026-09-24

Sessão executou os gates locais do zero (`npm install` — `npm ci` **continua quebrado**, mesmo
sintoma de lockfile fora de sincronia da Etapa 9/31/32) e encontrou 2 regressões reais, ambas
corrigidas nesta sessão (não estavam listadas no plano; entraram depois da última baseline):

- `tsc --noEmit -p tsconfig.app.json` **falhava** — `src/features/auth/hooks/useAuthenticatorAssuranceLevel.ts:65` chamava `logger.warn(...)` sem importar `logger` de `@/lib/logger`. Import adicionado.
- `eslint .` **falhava** (parsing error) — `tests/e2e/logistics.spec.ts:40` tinha parêntese não fechado em `.or(page.locator('input').first()`. Corrigido.

Gates após a correção:

| Gate | Comando | Resultado |
|---|---|---|
| TypeScript | `tsc --noEmit -p tsconfig.app.json` | ✅ 0 erros (era 1) |
| ESLint | `eslint . --max-warnings 9999` | ✅ 0 erros, 16 warnings (era 1 erro) |
| Testes unitários | `vitest run` | ✅ 734/734 (50 arquivos) |
| Build | `vite build` | ✅ sucesso (~1m15s); maior chunk ainda `lib-mermaid` 3,01 MB (Etapa 72 não executada) |
| NPM audit | `npm audit --audit-level=high` | 🟨 2 moderadas (`react-router`/`react-router-dom`, CVE-2025-68470 bypass + injeção via `deserializeErrors`) — era 5 moderadas na baseline; fix exige `--force` (breaking, para `react-router-dom@7.18.4`), não aplicado às cegas |
| `npm ci` | — | ❌ continua quebrado (`Missing: @esbuild/*@0.28.2 from lock file`) — Etapa 9/31/32 ainda pendente |
| Deno check | `deno check` | `NAO_VERIFICADO` — sem binário `deno` neste ambiente; commits `4a4b449`/`f5faa22`/`ba144dd`/`4c79064`/`c503336` (10–11/09) alegam 33/33 sem erro, não reconfirmado aqui |

Sem acesso ao banco canônico nem a runtime nesta sessão — Blocos B–J (schema/RLS, TPM
transacional, Edge Functions conectadas, i18n, performance de bundle, PWA, cobertura de testes,
CI/CD/observabilidade) **não foram reauditados**; permanecem no estado do último registro de
cada etapa. `npm audit fix --force` (react-router v7.18.4) é candidato a próxima sessão dedicada,
com suíte E2E validada antes do merge (breaking change documentado pelo próprio `npm audit`).

## Documento original (íntegra)

## 1. Diagnóstico consolidado

Auditoria estática e execução read-only realizadas em 10/09/2026 sobre a branch `main`, commit `a82e4fed`, preservando as alterações locais existentes.

### Inventário medido

| Item | Estado atual |
|---|---:|
| Código frontend | ~905 arquivos TypeScript/TSX; ~143 mil linhas |
| Páginas | 55 |
| Declarações de rota | 57 |
| Edge Functions | 34, além de `_shared` |
| Migrations SQL | 217 |
| Tabelas nos tipos gerados | 133 |
| Testes Vitest | 50 arquivos; 734 testes |
| Testes E2E | 17 specs |
| Testes Deno | 21 testes executáveis |
| GitHub Actions | 2 workflows |
| Crons versionados | 2 |
| Último deploy real | Não auditável somente pelo repositório |

### Baseline executado

- Vitest: 734/734 testes passam.
- Cobertura: 24,89% linhas, 23,33% statements, 19,83% funções, 19,90% branches.
- ESLint: zero erros e 16 warnings.
- Ratchet de `any`: zero ocorrências em `src`.
- TypeScript frontend: falha em `src/test/authFlow.test.ts:21`.
- Deno tests: 21/21 passam.
- Deno check: 26 erros em Edge Functions.
- NPM audit: 5 vulnerabilidades moderadas, nenhuma alta/crítica.
- Build temporário: passa, mas gera ~16,9 MB.
- Maiores chunks: Mermaid 3,01 MB, charts 1,12 MB e Excel 1,04 MB.
- E2E: nem a listagem funciona sem credenciais; retorna zero testes.
- Complexidade: 111 funções acima de 15; máximo de 80.
- Arquivos grandes: 236 arquivos acima de 200 linhas.
- Grafo de imports: 7 grupos cíclicos, incluindo `logger ↔ Supabase`, features/barrels, auth e páginas/prefetch.

### Achados críticos confirmados

1. `migrate-helper` contém chave fixa, CORS wildcard e retorna service-role/DB URL.
2. O deploy apaga `migrate-helper` e depois pode reimplantá-lo ao publicar todas as funções.
3. `index.html` ainda instrui reimplantá-lo com `verify_jwt=false`.
4. A migration de revogação de `exec_sql` pode falhar em banco limpo se a função não existir.
5. Há três project refs Supabase incompatíveis no código.
6. Três tabelas de geoblocking aparecem no cliente/tipos, mas não são criadas pelas migrations.
7. Edge Functions acumulam 26 erros de typecheck, inclusive redeclarações.
8. A integridade referencial do TPM mistura `maintenance_records` e `tpm_executions`.
9. Peso simulado pode ser persistido como dado real na embalagem.
10. Web Push declara `aes128gcm`, mas envia payload sem a criptografia exigida.
11. `tpm-notifications` marca notificações simuladas como enviadas.
12. Vários E2E usam rotas inexistentes ou fazem asserções que não provam comportamento.
13. Não existem testes automatizados de RLS.
14. Documentação arquitetural descreve como padrão uma Edge Function hoje sem consumidor.
15. PWA possui manifest não linkado e ícones com dimensões/MIME incorretos.
16. O frontend ainda documenta variáveis `VITE_*` que seriam segredos se configuradas.
17. CSP depende de `unsafe-inline` e `unsafe-eval`.
18. Deploy de produção não está subordinado ao resultado do workflow principal de CI.
19. Não há deploy frontend Vercel versionado e comprovado.
20. Não há evidência local de restore, DR, SLOs, tracing ou branch protection.

### Scorecard local

O prompt fornecido declara 22 dimensões, mas especifica somente 20. O plano usa as 20 dimensões efetivamente descritas.

| Dimensão | Nota | Principal gap |
|---|---:|---|
| Arquitetura | 4,5 | Ciclos, providers globais e limites de domínio frágeis |
| Autenticação | 6,0 | MFA não imposto server-side por papel |
| Autorização | 4,0 | RLS sem testes e superfícies service-role |
| Banco de dados | 3,5 | Drift, tabelas ausentes e rebuild não comprovado |
| CI/CD | 4,5 | Deploy desacoplado dos gates e E2E opcional |
| Data Integrity | 3,5 | FK TPM quebrada, operações não atômicas e dados simulados |
| Documentação | 3,0 | Material desatualizado; sem ADRs, OpenAPI e runbooks |
| Infraestrutura/DevOps | 2,5 | Sem IaC, DR comprovado ou deploy frontend oficial |
| Logging/Monitoring | 5,0 | Logger existente, mas sem retenção e cobertura uniforme |
| Observabilidade | 3,0 | Sem traces, SLOs e monitor externo comprovado |
| Lógica de negócio | 4,5 | Núcleo real, porém com métricas e custos inconsistentes |
| Manutenibilidade | 2,5 | 111 complexidades altas e 236 arquivos longos |
| Operacionalidade | 2,5 | Sem rollback testado, runbooks e promoção controlada |
| Performance | 3,5 | Chunks enormes e dependências pesadas no carregamento |
| Qualidade de código | 4,0 | Frontend e Edge Functions não passam typecheck completo |
| Segurança | 1,5 | Backdoor versionada e risco de exposição de credenciais |
| Testes | 4,0 | Boa quantidade, baixa cobertura e E2E/RLS frágeis |
| Type Safety | 3,5 | 1 erro frontend, 26 Deno e muitas assertions |
| Validação | 4,0 | Zod parcial e validação server-side inconsistente |
| Operações do time | 3,0 | Processo de release/incidente não documentado |
| **Nota geral ponderada** | **3,7/10** | Risco crítico de segurança e baixa confiança operacional |

A nota mede somente o que pode ser provado localmente. Infra, banco vivo, tráfego, crons, backups, branch protection e último deploy permanecem `NÃO AUDITÁVEL` até acesso aos ambientes.

## 2. Decisões e interfaces-alvo

- Vercel será a plataforma oficial do frontend, com previews por PR e promoção explícita.
- NPM e Node 24 serão o toolchain canônico; lockfiles Bun permanecem apenas até migração controlada.
- Simulações existirão somente em `/simulation`, com `DataProvenance = "simulated"`.
- Qualquer tela de produção aceitará apenas `"real"` ou `"unavailable"`.
- Funções e integrações órfãs serão preservadas e conectadas; `migrate-helper` é exceção obrigatória por ser backdoor.
- MFA AAL2 será obrigatório para `admin`, `manager` e `coordinator`.
- `maintenance_records` será a entidade canônica de execução TPM; `tpm_executions` será migrada para uma interface de compatibilidade durante a transição.
- Toda Edge Function usará um middleware comum com autenticação, papel, AAL, CORS, rate limit e request ID.
- Toda mutation externa aceitará `Idempotency-Key`.
- Respostas HTTP adotarão:
  - sucesso: `{ ok: true, data, meta: { requestId, durationMs } }`;
  - erro: `{ ok: false, error: { code, message, details? }, meta: { requestId } }`.
- Webhooks aceitarão apenas assinatura HMAC verificada sobre os bytes originais do corpo.
- O registro de funções declarará owner, consumidores, autenticação, agenda, timeout, idempotência e SLO.
- Critérios finais: zero vulnerabilidade alta/crítica, zero type error, zero lint warning, RLS negativa em 100% das tabelas, cobertura global ≥70%, cobertura crítica ≥80%, E2E obrigatório e SLO mensal ≥99,9%.

## 3. Top 10 ações por impacto/ROI

1. Remover `migrate-helper`, revogar credenciais expostas e eliminar instruções de reimplantação.
2. Revogar/remover `exec_sql` e fechar privilégios padrão de funções SQL.
3. Corrigir os 26 erros Deno e tornar o check obrigatório.
4. Reconciliar project refs, schema versionado e banco vivo.
5. Implementar testes RLS e MFA AAL2 server-side.
6. Corrigir o modelo TPM e tornar conclusão/aprovação transacionais.
7. Subordinar deploy Vercel/Supabase a um único quality gate.
8. Impedir persistência/apresentação de dados simulados como reais.
9. Refazer E2E, testes de contratos reais e cobertura crítica.
10. Reduzir bundle inicial e ativar observabilidade/SLOs reais.

## 4. Roadmap

- Quick Wins, etapas 1–10: contenção crítica em 1–3 dias.
- Sprint 1, etapas 11–40: schema, RLS, integridade e Edge Functions em 3–6 semanas.
- Sprint 2, etapas 41–100: integrações, arquitetura, UX, performance, testes, DevOps e certificação em 8–16 semanas.
- Estimativa considera 2–4 engenheiros, revisão obrigatória e staging isolado. Nenhuma mudança destrutiva chega à produção sem backup, ensaio de rollback e aprovação.

# Plano de execução em 100 etapas

## Bloco A — Contenção crítica

**Etapa 1 — Congelar e registrar a baseline**

Subetapas: 1) registrar commit e branch; 2) capturar alterações locais; 3) inventariar arquivos e linhas; 4) registrar versões do toolchain; 5) executar gates atuais; 6) salvar métricas de cobertura; 7) salvar inventário de functions; 8) abrir backlog rastreável; 9) atribuir owners; 10) aprovar janela de contenção.

Checkpoint: baseline reproduzível, assinada e vinculada a issues sem alterar trabalho local alheio.

**Etapa 2 — Tratar `migrate-helper` como incidente**

Subetapas: 1) confirmar se foi implantada; 2) consultar logs de acesso; 3) desativar a função remota; 4) remover seu diretório; 5) remover configuração JWT; 6) remover atributo do `index.html`; 7) varrer histórico Git; 8) rotacionar service-role e DB password; 9) invalidar a chave fixa; 10) registrar post-mortem.

Checkpoint: endpoint responde 404, segredos foram rotacionados e nenhuma referência implantável permanece.

**Etapa 3 — Encerrar a superfície `exec_sql`**

Subetapas: 1) consultar assinatura e owner ao vivo; 2) listar grants atuais; 3) confirmar uso legítimo; 4) revogar `PUBLIC`; 5) revogar `anon`; 6) revogar `authenticated`; 7) remover a função se dispensável; 8) tornar migration condicional; 9) fixar default privileges; 10) testar RPC como anônimo e autenticado.

Checkpoint: SQL arbitrário não é executável por clientes e banco limpo aplica a migration sem erro.

**Etapa 4 — Rotacionar e classificar segredos**

Subetapas: 1) inventariar variáveis; 2) classificar pública/privada; 3) remover segredos `VITE_*`; 4) mover webhooks para Edge Functions; 5) rotacionar tokens Bitrix; 6) rotacionar Resend/Twilio; 7) revisar GitHub Secrets; 8) revisar Supabase Secrets; 9) executar secret scan histórico; 10) documentar periodicidade.

Checkpoint: nenhum segredo servidor é incluído no bundle ou histórico ativo e rotações estão comprovadas.

**Etapa 5 — Unificar os ambientes Supabase**

Subetapas: 1) identificar projeto dev; 2) identificar staging; 3) identificar produção; 4) remover três refs hardcoded; 5) parametrizar URLs de cron; 6) corrigir preconnect; 7) corrigir seed scripts; 8) criar matriz ambiente/ref; 9) validar secrets por ambiente; 10) testar conexão isolada.

Checkpoint: cada ambiente aponta para um único projeto por secrets, sem project ref embutido em código ou SQL.

**Etapa 6 — Criar middleware comum de segurança Edge**

Subetapas: 1) definir `AuthContext`; 2) implementar `requireUser`; 3) implementar `requireRole`; 4) implementar `requireAal2`; 5) implementar `requireCronSecret`; 6) implementar `verifyWebhook`; 7) adicionar rate limit; 8) adicionar request ID; 9) padronizar erros; 10) testar cada guarda.

Checkpoint: todas as funções usam guardas compartilhadas e os testes cobrem ausência, fraude e sucesso.

**Etapa 7 — Impor MFA AAL2 a papéis elevados**

Subetapas: 1) mapear papéis elevados; 2) validar AAL no JWT; 3) incluir AAL nas policies sensíveis; 4) exigir AAL2 em functions administrativas; 5) ajustar `ProtectedRoute`; 6) tratar step-up expirado; 7) criar enrollment guiado; 8) definir recuperação; 9) criar break-glass auditado; 10) testar downgrade/replay.

Checkpoint: sessões AAL1 elevadas recebem 403 no banco, nas funções e na UI.

**Etapa 8 — Endurecer CORS e headers**

Subetapas: 1) centralizar origens; 2) negar origem desconhecida; 3) limitar métodos; 4) limitar headers; 5) remover CORS wildcard; 6) implantar CSP report-only; 7) remover `unsafe-eval`; 8) reduzir `unsafe-inline`; 9) manter HSTS/frame-ancestors; 10) testar em Vercel/staging.

Checkpoint: scanner de headers passa e chamadas de origens não autorizadas falham.

**Etapa 9 — Fechar vulnerabilidades e supply chain**

Subetapas: 1) atualizar Vitest corrigido; 2) planejar React Router v7; 3) revisar overrides; 4) remover exceções vencidas; 5) congelar imports Deno; 6) pinçar GitHub Actions por SHA; 7) gerar SBOM; 8) ativar Dependabot; 9) executar license scan; 10) bloquear high/critical.

Checkpoint: audit/SBOM não apresentam high/critical e toda exceção possui owner e expiração.

**Etapa 10 — Certificar a contenção P0**

Subetapas: 1) executar frontend typecheck; 2) executar Deno check; 3) executar lint; 4) executar testes; 5) executar secret scan; 6) validar endpoints críticos; 7) validar roles/AAL; 8) confirmar rotação; 9) revisar rollback; 10) emitir go/no-go.

Checkpoint: backdoors eliminadas, credenciais rotacionadas e todos os gates P0 verdes.

## Bloco B — Banco, schema e RLS

**Etapa 11 — Tornar o banco reconstruível**

Subetapas: 1) iniciar Supabase local limpo; 2) aplicar 217 migrations; 3) registrar primeira falha; 4) corrigir dependências temporais; 5) corrigir objetos inexistentes; 6) validar seeds; 7) repetir do zero; 8) comparar schema final; 9) automatizar o reset; 10) integrar ao CI.

Checkpoint: `supabase db reset` passa duas vezes consecutivas sem intervenção manual.

**Etapa 12 — Reconciliar schema local e vivo**

Subetapas: 1) exportar DDL de staging; 2) exportar DDL de produção; 3) normalizar dumps; 4) comparar tabelas; 5) comparar colunas; 6) comparar constraints; 7) comparar policies; 8) comparar funções/triggers; 9) gerar migrations corretivas; 10) validar sem perda.

Checkpoint: drift report fica vazio ou contém somente diferenças explicitamente aceitas.

**Etapa 13 — Versionar tabelas de geoblocking**

Subetapas: 1) extrair DDL real; 2) definir PKs; 3) definir FKs; 4) definir constraints; 5) definir índices; 6) criar RLS; 7) criar policies por papel; 8) migrar dados; 9) regenerar tipos; 10) testar CRUD negativo.

Checkpoint: os três objetos nascem por migration e funcionam em banco zerado.

**Etapa 14 — Estabelecer governança de migrations**

Subetapas: 1) proibir SQL ad-hoc; 2) adotar nomes legíveis; 3) criar template; 4) exigir transação quando possível; 5) exigir rollback documentado; 6) detectar timestamps duplicados; 7) validar ordem; 8) bloquear project refs; 9) gerar schema snapshot; 10) revisar por DBA.

Checkpoint: toda nova migration passa lint, reset, revisão e ensaio de rollback.

**Etapa 15 — Regenerar e validar tipos Supabase**

Subetapas: 1) escolher schema autoritativo; 2) rodar `gen types`; 3) comparar diff; 4) eliminar tipos manuais redundantes; 5) corrigir `never`; 6) tipar RPCs; 7) tipar views; 8) tipar Edge clients; 9) adicionar check de drift; 10) bloquear tipos desatualizados.

Checkpoint: tipos gerados equivalem ao schema de staging e nenhum acesso usa cast para ocultar drift.

**Etapa 16 — Criar matriz RLS completa**

Subetapas: 1) listar 133 tabelas; 2) listar operações CRUD; 3) listar quatro papéis; 4) identificar ownership; 5) marcar dados sensíveis; 6) mapear AAL; 7) localizar policies sobrepostas; 8) localizar `true` em escrita; 9) definir decisão por célula; 10) aprovar com negócio.

Checkpoint: cada tabela/operação/papel possui regra explícita, owner e justificativa.

**Etapa 17 — Implementar testes RLS positivos e negativos**

Subetapas: 1) configurar pgTAP; 2) criar usuários por papel; 3) emitir claims AAL1/AAL2; 4) testar SELECT; 5) testar INSERT; 6) testar UPDATE; 7) testar DELETE; 8) testar autoelevação; 9) testar isolamento por owner; 10) executar no CI.

Checkpoint: 100% das células da matriz RLS têm teste e nenhum acesso negativo passa.

**Etapa 18 — Endurecer funções SQL privilegiadas**

Subetapas: 1) inventariar `SECURITY DEFINER`; 2) fixar `search_path`; 3) qualificar objetos; 4) revisar owners; 5) revogar grants implícitos; 6) conceder mínimos explícitos; 7) revisar SQL dinâmico; 8) revisar funções de papel; 9) testar shadow objects; 10) rodar linter Supabase.

Checkpoint: nenhuma função privilegiada tem search path mutável ou execução pública acidental.

**Etapa 19 — Corrigir constraints e tipos**

Subetapas: 1) identificar TEXT temporal; 2) identificar dinheiro em float; 3) revisar NOT NULL; 4) revisar UNIQUE; 5) revisar CHECKs; 6) revisar enums/status; 7) revisar NULL semânticos; 8) criar migrations compatíveis; 9) validar dados legados; 10) testar rollback.

Checkpoint: colunas críticas têm tipo e constraint de domínio, sem registros inválidos.

**Etapa 20 — Comprovar backup e restore**

Subetapas: 1) definir RPO ≤1h; 2) definir RTO ≤2h; 3) verificar PITR; 4) criar backup manual; 5) restaurar em ambiente isolado; 6) executar checks de integridade; 7) medir tempo; 8) documentar falhas; 9) agendar teste trimestral; 10) anexar evidência.

Checkpoint: restore completo dentro de RTO/RPO com relatório assinado.

## Bloco C — Integridade e lógica de negócio

**Etapa 21 — Canonicalizar execução TPM**

Subetapas: 1) declarar `maintenance_records` canônica; 2) mapear campos equivalentes; 3) mapear dependentes; 4) mapear registros legados; 5) definir compatibilidade; 6) alinhar status; 7) alinhar timestamps; 8) alinhar usuários; 9) revisar relatórios; 10) aprovar modelo.

Checkpoint: existe um único modelo conceitual e mapeamento sem ambiguidades.

**Etapa 22 — Migrar `tpm_executions` com compatibilidade**

Subetapas: 1) criar backup; 2) adicionar campos ausentes; 3) migrar linhas legadas; 4) repontar alerts; 5) repontar parts; 6) repontar supplies; 7) repontar parameter alerts; 8) criar view de compatibilidade; 9) validar contagens; 10) testar rollback.

Checkpoint: zero FK inválida e consumidores antigos continuam operando durante a transição.

**Etapa 23 — Tornar conclusão TPM atômica**

Subetapas: 1) criar RPC transacional; 2) validar status inicial; 3) validar checklist; 4) validar fotos; 5) validar assinatura; 6) inserir peças; 7) inserir insumos; 8) inserir alertas; 9) atualizar schedule; 10) retornar envelope tipado.

Checkpoint: qualquer erro reverte toda a conclusão e o teste confirma ausência de gravação parcial.

**Etapa 24 — Tornar aprovação TPM concorrente e idempotente**

Subetapas: 1) exigir versão esperada; 2) bloquear duplo clique; 3) bloquear dupla aprovação; 4) validar papel/AAL; 5) validar estado; 6) registrar approver; 7) registrar timestamp; 8) recalcular schedule uma vez; 9) gerar audit log; 10) testar corrida.

Checkpoint: duas aprovações simultâneas produzem exatamente uma transição válida.

**Etapa 25 — Centralizar a state machine de jobs**

Subetapas: 1) definir enum canônico; 2) mover transições ao backend; 3) criar RPC de transição; 4) exigir estado anterior; 5) validar role; 6) validar campos obrigatórios; 7) emitir histórico; 8) atualizar frontend; 9) atualizar ERP/Bitrix; 10) testar todas as arestas.

Checkpoint: nenhuma escrita altera `jobs.status` fora da state machine autoritativa.

**Etapa 26 — Implantar idempotência e concorrência geral**

Subetapas: 1) criar tabela de idempotência; 2) definir TTL; 3) aceitar header padrão; 4) hash do payload; 5) rejeitar reuse divergente; 6) armazenar resposta; 7) adicionar `version`; 8) usar optimistic locking; 9) tratar conflito 409; 10) testar retries.

Checkpoint: retry da mesma mutation não duplica dados e conflito não sobrescreve atualização recente.

**Etapa 27 — Consolidar a arquitetura offline**

Subetapas: 1) escolher `OfflineSyncProvider`; 2) remover fila genérica inerte; 3) unificar status de rede; 4) unificar listeners; 5) unificar toasts; 6) migrar consumidores; 7) manter dead-letter; 8) criptografar dados sensíveis locais; 9) limpar por usuário/logout; 10) testar upgrade.

Checkpoint: existe uma fila offline, um detector de rede e nenhum dado atravessa sessões de usuários.

**Etapa 28 — Corrigir pesagem de embalagem**

Subetapas: 1) remover fallback aleatório; 2) definir interface da balança; 3) validar unidade; 4) registrar origem; 5) registrar device ID; 6) registrar calibração; 7) permitir entrada manual identificada; 8) exigir confirmação; 9) auditar alterações; 10) testar falha do dispositivo.

Checkpoint: nenhum peso simulado entra em produção e cada valor possui proveniência verificável.

**Etapa 29 — Centralizar preços e métricas financeiras**

Subetapas: 1) inventariar preços literais; 2) definir moeda/escala; 3) criar tabela de custos versionada; 4) definir vigência; 5) definir aprovação; 6) usar NUMERIC; 7) centralizar cálculo; 8) atualizar dashboards; 9) testar arredondamento; 10) reconciliar amostra contábil.

Checkpoint: todo KPI financeiro deriva da mesma configuração versionada e fecha com casos de referência.

**Etapa 30 — Corrigir audit trail e retenção**

Subetapas: 1) revisar cadeia hash; 2) serializar encadeamento; 3) impedir bifurcação; 4) incluir actor/request ID; 5) impedir alteração; 6) definir retenção; 7) separar PII; 8) criar verificador; 9) testar concorrência; 10) exportar evidência.

Checkpoint: cadeia passa verificação sob carga concorrente e retenção atende LGPD.

## Bloco D — Edge Functions e APIs

**Etapa 31 — Zerar erros Deno**

Subetapas: 1) corrigir `backup-scheduler`; 2) corrigir `erp-api`; 3) corrigir `excel-export`; 4) corrigir `health-check`; 5) remover redeclarações ML; 6) remover redeclarações push; 7) tipar e-mail TPM; 8) fixar tipos Supabase; 9) rodar check congelado; 10) adicionar gate.

Checkpoint: `deno check supabase/functions/*/index.ts` retorna zero erros sem alterar lockfile.

**Etapa 32 — Padronizar dependências Deno**

Subetapas: 1) criar import map; 2) fixar Supabase JS; 3) fixar Zod; 4) fixar std; 5) remover imports divergentes; 6) atualizar lockfile conscientemente; 7) verificar checksums; 8) testar bundle offline; 9) documentar upgrade; 10) bloquear imports flutuantes.

Checkpoint: builds Deno são determinísticos e nenhuma dependência usa major aberta.

**Etapa 33 — Criar contratos compartilhados reais**

Subetapas: 1) extrair schemas Zod; 2) exportar tipos inferidos; 3) remover schemas duplicados dos testes; 4) aplicar `.strict()`; 5) impor limites; 6) validar responses; 7) criar códigos de erro; 8) gerar JSON Schema; 9) gerar OpenAPI; 10) testar compatibilidade.

Checkpoint: produção e testes importam o mesmo contrato e drift automático falha no CI.

**Etapa 34 — Criar registro operacional de functions**

Subetapas: 1) listar 33 funções legítimas; 2) atribuir owner; 3) declarar consumidor; 4) declarar auth; 5) declarar AAL; 6) declarar cron/webhook; 7) declarar timeout; 8) declarar idempotência; 9) declarar SLO; 10) validar automaticamente.

Checkpoint: nenhuma function é implantada sem entrada válida no registro.

**Etapa 35 — Conectar e monitorar crons**

Subetapas: 1) listar rotinas esperadas; 2) criar schedules versionados; 3) usar secrets; 4) impedir execução duplicada; 5) registrar início/fim; 6) registrar heartbeat; 7) registrar falha; 8) criar dead-letter; 9) criar alerta de silêncio; 10) testar atraso.

Checkpoint: toda rotina possui agenda, owner, última execução e alerta quando silenciosa.

**Etapa 36 — Tornar health/status confiáveis**

Subetapas: 1) separar `/live`; 2) separar `/ready`; 3) testar DB; 4) testar Auth; 5) testar storage; 6) testar functions críticas; 7) persistir histórico; 8) alimentar `/status`; 9) configurar monitor externo; 10) alertar por SLO.

Checkpoint: status reflete checks reais e monitor externo detecta falha simulada.

**Etapa 37 — Restringir `external-db-bridge`**

Subetapas: 1) definir consumidor real; 2) criar allowlist de tabelas; 3) criar allowlist de ações; 4) proibir filtros vazios destrutivos; 5) impor role/AAL2; 6) limitar colunas/relações; 7) limitar paginação; 8) auditar cada chamada; 9) criar testes de exfiltração; 10) atualizar documentação.

Checkpoint: nenhum usuário consegue operações arbitrárias via service-role.

**Etapa 38 — Completar e versionar ERP API**

Subetapas: 1) definir `/v1`; 2) implementar API keys com hash; 3) suportar rotação; 4) aplicar contratos reais; 5) paginar listagens; 6) aplicar idempotência; 7) limitar escopos; 8) documentar OpenAPI; 9) criar contract tests; 10) criar sandbox.

Checkpoint: consumidor externo completa CRUD autorizado no sandbox sem mass assignment.

**Etapa 39 — Consolidar integração Bitrix24**

Subetapas: 1) validar OAuth; 2) centralizar tokens; 3) implementar refresh single-flight; 4) documentar `UF_CRM_*`; 5) validar assinatura webhook; 6) aplicar mapeamento bidirecional; 7) impedir loops; 8) respeitar rate limit; 9) reconciliar divergências; 10) monitorar backlog.

Checkpoint: job de referência sincroniza nos dois sentidos uma vez, com trilha auditável.

**Etapa 40 — Fechar endpoints de login e segurança**

Subetapas: 1) validar IP pelo proxy confiável; 2) configurar trusted proxies; 3) proteger enumeração; 4) tornar lockout atômico; 5) impedir reset pelo cliente; 6) conectar geoblocking; 7) conectar rate limit; 8) produzir login audit; 9) alertar anomalias; 10) testar brute force distribuído.

Checkpoint: ataques simulados são limitados sem permitir bloqueio arbitrário de terceiros.

## Bloco E — Integrações e comunicações

**Etapa 41 — Criar outbox unificado**

Subetapas: 1) definir `notification_outbox`; 2) definir canais; 3) definir estados; 4) definir dedupe key; 5) definir tentativas; 6) definir prioridade; 7) definir agendamento; 8) definir payload seguro; 9) criar worker; 10) criar dead-letter.

Checkpoint: notificações são persistidas antes do envio e nunca somem silenciosamente.

**Etapa 42 — Conectar Resend**

Subetapas: 1) validar domínio; 2) configurar SPF/DKIM/DMARC; 3) centralizar client; 4) tipar templates; 5) escapar HTML; 6) limitar destinatários; 7) processar bounces; 8) processar complaints; 9) registrar delivery; 10) testar sandbox.

Checkpoint: cada e-mail possui status real do provedor e falhas entram em retry/dead-letter.

**Etapa 43 — Implementar Twilio SMS/WhatsApp**

Subetapas: 1) criar credenciais server-side; 2) registrar sender; 3) definir templates aprovados; 4) normalizar E.164; 5) validar consentimento; 6) integrar outbox; 7) receber status callback; 8) tratar opt-out; 9) limitar custo; 10) testar números sandbox.

Checkpoint: UI só declara canal disponível quando envio e callback reais estão operacionais.

**Etapa 44 — Corrigir Web Push**

Subetapas: 1) escolher biblioteca Web Push compatível; 2) gerar VAPID único; 3) armazenar chaves server-side; 4) criptografar aes128gcm; 5) validar endpoint contra SSRF; 6) autorizar destinatário; 7) remover apenas 404/410; 8) tratar 429/5xx; 9) testar browser real; 10) rotacionar VAPID.

Checkpoint: Chrome/Android descriptografa payload real e falha transitória não apaga subscription.

**Etapa 45 — Implementar notificações TPM reais**

Subetapas: 1) remover “simular envio”; 2) gerar outbox por regra; 3) respeitar preferências; 4) aplicar throttling; 5) evitar duplicidade; 6) enviar e-mail; 7) enviar WhatsApp/SMS; 8) enviar push; 9) registrar resultado; 10) testar overdue crítico.

Checkpoint: item só recebe `sent` após confirmação real do canal.

**Etapa 46 — Consolidar preferências de notificação**

Subetapas: 1) escolher tabela canônica; 2) migrar preferências; 3) definir defaults; 4) definir severidades obrigatórias; 5) validar ownership; 6) aplicar timezone; 7) aplicar horário silencioso; 8) aplicar frequência; 9) criar preview; 10) testar por papel.

Checkpoint: todos os canais consultam a mesma preferência e respeitam consentimento.

**Etapa 47 — Conectar exports e image optimizer**

Subetapas: 1) ligar `excel-export`; 2) ligar `pdf-generator`; 3) ligar `image-optimizer`; 4) exigir auth/role; 5) aplicar limite de linhas; 6) impedir CSV injection; 7) validar MIME/magic bytes; 8) limitar recursos; 9) usar URLs assinadas; 10) monitorar tempo/custo.

Checkpoint: cada função possui chamador real, teste e proteção contra exfiltração/DoS.

**Etapa 48 — Conectar ML e assistente técnico**

Subetapas: 1) corrigir compilação ML; 2) versionar modelos; 3) registrar dataset; 4) marcar confiança real; 5) remover confiança fabricada; 6) limitar payload/custo; 7) redigir PII; 8) impedir prompt injection em ferramentas; 9) criar avaliação; 10) monitorar qualidade.

Checkpoint: toda predição informa modelo, versão, origem e confiança calculada.

**Etapa 49 — Aplicar resiliência a integrações**

Subetapas: 1) definir timeouts; 2) retry apenas idempotente; 3) aplicar jitter; 4) criar circuit breaker; 5) limitar concorrência; 6) respeitar Retry-After; 7) propagar request ID; 8) medir RED; 9) definir fallback; 10) testar indisponibilidade.

Checkpoint: falha de terceiro degrada somente o recurso dependente e não trava o sistema.

**Etapa 50 — Certificar conexão das funções preservadas**

Subetapas: 1) verificar consumidor por function; 2) verificar cron por rotina; 3) verificar documentação por API; 4) verificar auth; 5) verificar tipo; 6) verificar teste; 7) verificar dashboard; 8) verificar alerta; 9) verificar owner; 10) verificar tráfego em staging.

Checkpoint: zero function legítima permanece órfã, sem owner ou sem forma comprovada de acionamento.

## Bloco F — Arquitetura e manutenibilidade

**Etapa 51 — Formalizar arquitetura modular**

Subetapas: 1) definir domínios; 2) definir camadas; 3) definir dependências permitidas; 4) separar UI/aplicação/domínio/infra; 5) definir contratos; 6) definir eventos; 7) definir shared kernel; 8) documentar exceções; 9) criar ADR; 10) configurar lint de boundaries.

Checkpoint: import proibido falha automaticamente e arquitetura está documentada.

**Etapa 52 — Quebrar ciclos de barrels de features**

Subetapas: 1) listar sete SCCs; 2) identificar reexports causais; 3) criar módulos de tipos; 4) mover constantes; 5) mover contratos; 6) substituir imports internos do barrel; 7) limitar barrels à API externa; 8) repetir análise; 9) bloquear novos ciclos; 10) documentar regra.

Checkpoint: features não importam seus próprios barrels e ciclos de domínio chegam a zero.

**Etapa 53 — Remover ciclo logger/Supabase**

Subetapas: 1) definir sink abstrato; 2) separar logger puro; 3) separar persistência; 4) injetar transport; 5) remover import do client; 6) evitar telemetria recursiva; 7) implementar buffer; 8) implementar backpressure; 9) testar falha do sink; 10) medir hot path.

Checkpoint: logger não depende do cliente instrumentado e erro de log não gera novo log persistido.

**Etapa 54 — Remover ciclo páginas/prefetch**

Subetapas: 1) criar route registry; 2) mover lazy imports; 3) gerar prefetch do registry; 4) remover imports de páginas no layout; 5) reduzir sidebar coupling; 6) tipar route IDs; 7) mapear permissões; 8) mapear skeletons; 9) testar chunks; 10) repetir grafo.

Checkpoint: páginas são folhas da dependência e prefetch não cria ciclo.

**Etapa 55 — Desacoplar auth**

Subetapas: 1) separar tipos; 2) separar contexto; 3) separar API pública; 4) remover imports internos de `index.ts`; 5) separar RBAC; 6) separar MFA; 7) separar session lifecycle; 8) estabilizar callbacks; 9) testar providers; 10) repetir grafo.

Checkpoint: módulo auth não possui ciclo interno e consumidores usam somente sua API pública.

**Etapa 56 — Reduzir providers globais**

Subetapas: 1) medir renders; 2) classificar providers; 3) remover offline redundante; 4) consolidar notificações; 5) mover estado não-React ao Zustand; 6) lazy-load providers de feature; 7) estabilizar values; 8) usar selectors; 9) perfilar novamente; 10) documentar ordem.

Checkpoint: árvore global contém apenas dependências essenciais e renders caem em cenário medido.

**Etapa 57 — Definir ownership de estado**

Subetapas: 1) classificar server state; 2) classificar UI state; 3) classificar sessão; 4) classificar estado persistente; 5) mover server state ao React Query; 6) mover UI global ao Zustand; 7) eliminar cópias derivadas; 8) normalizar query keys; 9) documentar invalidação; 10) testar concorrência.

Checkpoint: cada dado possui uma fonte de verdade e estratégia explícita de atualização.

**Etapa 58 — Decompor páginas gigantes**

Subetapas: 1) priorizar top dez; 2) extrair loaders; 3) extrair mutations; 4) extrair view models; 5) extrair seções; 6) extrair dialogs; 7) reduzir props; 8) adicionar testes; 9) comparar visual; 10) medir complexidade.

Checkpoint: páginas priorizadas ficam abaixo de 300 linhas e complexidade 15.

**Etapa 59 — Decompor componentes/hooks gigantes**

Subetapas: 1) priorizar TPM; 2) priorizar knowledge; 3) priorizar offline; 4) priorizar sidebar; 5) extrair regras puras; 6) extrair adapters; 7) separar efeitos; 8) estabilizar hooks; 9) adicionar testes; 10) medir dependências.

Checkpoint: nenhum módulo crítico concentra UI, I/O e regra de negócio simultaneamente.

**Etapa 60 — Implantar ratchets de manutenção**

Subetapas: 1) registrar baseline de linhas; 2) registrar baseline de complexidade; 3) registrar ciclos; 4) registrar assertions; 5) proibir regressão; 6) reduzir top 20; 7) reduzir top 50; 8) eliminar violações críticas; 9) elevar gates progressivamente; 10) publicar dashboard real.

Checkpoint: novos arquivos ≤200 linhas, complexidade nova ≤15 e baseline legado diminui a cada PR.

## Bloco G — Correção funcional e UX

**Etapa 61 — Criar registro único de rotas**

Subetapas: 1) definir route IDs; 2) definir paths; 3) definir aliases; 4) definir papel; 5) definir AAL; 6) definir page loader; 7) definir skeleton; 8) gerar `Routes`; 9) gerar navegação; 10) gerar testes.

Checkpoint: nenhuma rota ou link é literal fora do registry, salvo URLs externas.

**Etapa 62 — Corrigir links e rotas inválidas**

Subetapas: 1) corrigir `/pending-queue`; 2) corrigir `/knowledge-base`; 3) corrigir `/kpi`; 4) corrigir `/calendar`; 5) corrigir `/production`; 6) corrigir `/admin-telemetria`; 7) corrigir `/audit-trail`; 8) corrigir `/public-tracking`; 9) definir rotas de detalhe; 10) testar aliases.

Checkpoint: crawler interno encontra zero links para 404 não intencional.

**Etapa 63 — Unificar RBAC de rota e operação**

Subetapas: 1) comparar `allowedRoles`; 2) comparar `ROLE_PERMISSIONS`; 3) mapear ações; 4) corrigir coordinator/manager; 5) revisar admin bypass; 6) revisar operator ownership; 7) esconder ações proibidas; 8) manter 403 server-side; 9) testar matriz; 10) revisar linguagem de erro.

Checkpoint: UI, Edge Function e RLS chegam à mesma decisão para cada cenário.

**Etapa 64 — Isolar simulações**

Subetapas: 1) criar `RuntimeMode`; 2) criar `DataProvenance`; 3) marcar fontes simuladas; 4) mover widgets para `/simulation`; 5) remover imports de produção; 6) bloquear persistência; 7) adicionar badge permanente; 8) separar storage; 9) impedir enable em prod; 10) testar bundle.

Checkpoint: busca automatizada não encontra geradores simulados em caminhos de produção.

**Etapa 65 — Corrigir painéis de telemetria/IA**

Subetapas: 1) substituir HyperInsights; 2) substituir BIAIInsights; 3) substituir telemetry aleatória; 4) substituir virtual sensors; 5) substituir uptime literal; 6) substituir cyber score; 7) substituir workforce advisor; 8) substituir hashes falsos; 9) substituir lote aleatório; 10) criar estados indisponíveis.

Checkpoint: todo número exibido em produção referencia fonte, timestamp e proveniência.

**Etapa 66 — Compartilhar validação de formulários**

Subetapas: 1) inventariar forms; 2) definir schemas de domínio; 3) usar Zod no frontend; 4) reutilizar no backend; 5) padronizar mensagens PT-BR; 6) limitar strings; 7) limitar números; 8) validar relações; 9) validar transições; 10) testar boundaries.

Checkpoint: toda mutation relevante é validada com o mesmo contrato nos dois lados.

**Etapa 67 — Endurecer uploads**

Subetapas: 1) definir MIME permitido; 2) validar magic bytes; 3) limitar tamanho; 4) limitar dimensões; 5) gerar nome UUID; 6) impedir path traversal; 7) usar bucket privado; 8) integrar malware scan; 9) expirar signed URLs; 10) testar polyglots.

Checkpoint: arquivos inválidos são rejeitados antes de persistir e objetos não são públicos.

**Etapa 68 — Completar i18n**

Subetapas: 1) definir pt-BR canônico; 2) comparar chaves; 3) preencher espanhol; 4) preencher inglês; 5) extrair strings de páginas; 6) extrair componentes; 7) localizar datas; 8) localizar números/moeda; 9) adicionar lint; 10) testar troca de idioma.

Checkpoint: 100% das strings funcionais usam i18n e os três locales têm paridade.

**Etapa 69 — Elevar acessibilidade**

Subetapas: 1) corrigir 16 warnings relacionados; 2) testar landmarks; 3) testar labels; 4) testar teclado; 5) testar foco; 6) testar contraste; 7) testar reduced motion; 8) testar leitores; 9) executar axe autenticado; 10) criar gate WCAG.

Checkpoint: zero violação séria/crítica WCAG 2.2 AA nas rotas críticas.

**Etapa 70 — Padronizar loading, erros e estados vazios**

Subetapas: 1) definir skeletons; 2) definir empty states; 3) definir error boundaries; 4) diferenciar vazio/erro; 5) adicionar retry seguro; 6) mostrar request ID; 7) evitar dados antigos enganadores; 8) preservar layout; 9) testar offline; 10) testar mobile.

Checkpoint: cada tela crítica possui estados loading, empty, error, offline e success testados.

## Bloco H — Performance e PWA

**Etapa 71 — Definir budgets de bundle**

Subetapas: 1) medir raw/gzip/brotli; 2) definir entry ≤250 KB gzip; 3) definir CSS ≤100 KB gzip; 4) definir lazy chunk ≤500 KB; 5) definir delta por PR; 6) registrar baseline; 7) falhar regressão; 8) publicar relatório; 9) revisar exceções; 10) atribuir owners.

Checkpoint: CI bloqueia qualquer orçamento excedido sem exceção temporária aprovada.

**Etapa 72 — Isolar Mermaid**

Subetapas: 1) localizar consumidores; 2) remover preloads; 3) importar sob demanda; 4) avaliar renderer server-side; 5) usar worker; 6) manter `securityLevel: strict`; 7) sanitizar SVG; 8) cachear resultado; 9) medir navegação comum; 10) remover `unsafe-eval`.

Checkpoint: Mermaid não é baixado antes de abrir recurso que realmente o utiliza.

**Etapa 73 — Isolar bibliotecas pesadas**

Subetapas: 1) lazy-load Excel; 2) lazy-load PDF; 3) lazy-load QR; 4) lazy-load html2canvas; 5) separar charts por tela; 6) evitar mega manualChunks; 7) revisar tree shaking; 8) mover exports ao servidor quando útil; 9) medir rotas; 10) ajustar budgets.

Checkpoint: carregamento inicial não inclui PDF/Excel/Mermaid e cada rota baixa somente o necessário.

**Etapa 74 — Otimizar bootstrap e providers**

Subetapas: 1) medir main thread; 2) adiar watchers; 3) lazy-load IA; 4) lazy-load celebrações; 5) reduzir prefetch; 6) respeitar save-data; 7) evitar subscriptions duplicadas; 8) memoizar selectors; 9) perfilar kiosk/mobile; 10) comparar Web Vitals.

Checkpoint: LCP p75 <2,5s, INP <200ms e CLS <0,1 no staging.

**Etapa 75 — Corrigir paginação e N+1**

Subetapas: 1) inventariar listagens; 2) limitar queries; 3) usar cursor estável; 4) usar count opcional; 5) evitar SELECT `*`; 6) consolidar joins; 7) criar views seguras; 8) testar dataset grande; 9) medir planos; 10) bloquear query sem limite.

Checkpoint: listagens críticas mantêm memória e latência estáveis com volume de produção projetado.

**Etapa 76 — Otimizar React Query e Realtime**

Subetapas: 1) revisar query keys; 2) revisar staleTime; 3) revisar invalidações; 4) deduplicar canais; 5) limitar refetch storms; 6) usar patch de cache; 7) tratar reconnect; 8) limpar canais; 9) instrumentar hit rate; 10) testar eventos concorrentes.

Checkpoint: um evento produz no máximo a atualização necessária, sem canais vazados.

**Etapa 77 — Corrigir imagens, ícones e fontes**

Subetapas: 1) gerar ícones nas dimensões declaradas; 2) corrigir MIME 512; 3) comprimir PNGs; 4) preferir WebP/AVIF; 5) definir width/height; 6) criar responsive sizes; 7) self-host fonts; 8) reduzir famílias/pesos; 9) configurar cache imutável; 10) medir bytes.

Checkpoint: manifest valida, ícones correspondem ao nome e mídia não causa layout shift.

**Etapa 78 — Migrar PWA para Workbox**

Subetapas: 1) escolher `vite-plugin-pwa`; 2) remover SW manual; 3) linkar manifest; 4) versionar caches; 5) usar network-first em navegação; 6) usar cache-first só em assets hashados; 7) excluir APIs; 8) implementar update prompt; 9) testar offline; 10) testar rollback.

Checkpoint: instalação, atualização e modo offline passam Lighthouse/PWA em desktop e mobile.

**Etapa 79 — Testar sincronização offline ponta a ponta**

Subetapas: 1) criar job offline; 2) atualizar job offline; 3) registrar produção offline; 4) registrar QR offline; 5) simular resposta perdida; 6) simular conflito; 7) simular quota cheia; 8) revisar dead-letter; 9) trocar usuário; 10) atualizar service worker.

Checkpoint: nenhum cenário causa duplicação, sobrescrita silenciosa ou vazamento entre usuários.

**Etapa 80 — Validar performance e carga**

Subetapas: 1) definir dataset; 2) testar frontend Lighthouse; 3) testar API com k6; 4) testar crons; 5) testar Realtime; 6) testar concorrência TPM; 7) medir P50/P95/P99; 8) medir erros; 9) criar flamegraphs; 10) registrar limites.

Checkpoint: endpoints críticos mantêm P95 <800ms e erro <1% na carga acordada.

## Bloco I — Estratégia de testes

**Etapa 81 — Definir pirâmide e fixtures**

Subetapas: 1) classificar testes; 2) definir unitários; 3) definir integração; 4) definir contrato; 5) definir RLS; 6) definir E2E; 7) criar factories; 8) criar seeds determinísticos; 9) separar contas; 10) documentar execução.

Checkpoint: cada fluxo crítico aponta para testes e fixtures reproduzíveis.

**Etapa 82 — Cobrir jobs e produção**

Subetapas: 1) testar state machine; 2) testar scheduling; 3) testar conflitos; 4) testar OEE; 5) testar perdas; 6) testar operador; 7) testar cache; 8) testar Realtime; 9) testar offline; 10) testar RBAC.

Checkpoint: lógica crítica de jobs/produção atinge pelo menos 85% de branches.

**Etapa 83 — Cobrir manutenção e embalagem**

Subetapas: 1) testar início TPM; 2) testar conclusão; 3) testar aprovação; 4) testar foto; 5) testar assinatura; 6) testar peças/insumos; 7) testar pesagem; 8) testar defeitos; 9) testar concorrência; 10) testar rollback.

Checkpoint: fluxos TPM/packaging têm unitários, integração DB e E2E positivos/negativos.

**Etapa 84 — Cobrir estoque, logística e rastreabilidade**

Subetapas: 1) testar saldo; 2) testar movimento; 3) testar lote; 4) testar reserva; 5) testar expedição; 6) testar tracking público; 7) testar QR; 8) testar concorrência; 9) testar auditoria; 10) testar permissões.

Checkpoint: nenhum movimento inválido produz estoque negativo ou rastreabilidade órfã.

**Etapa 85 — Cobrir auth, MFA e RBAC**

Subetapas: 1) testar login; 2) testar lockout; 3) testar refresh concorrente; 4) testar logout; 5) testar recuperação; 6) testar MFA enrollment; 7) testar AAL step-up; 8) testar papel nulo; 9) testar elevação; 10) testar cache entre usuários.

Checkpoint: matriz de identidade passa no frontend, Edge Functions e banco.

**Etapa 86 — Substituir testes-espelho**

Subetapas: 1) importar contratos reais; 2) importar handlers puros; 3) remover schemas locais; 4) remover simuladores duplicados; 5) testar HTTP real; 6) testar auth real; 7) testar Zod real; 8) testar erros; 9) manter fuzz; 10) medir mutation score.

Checkpoint: alterar contrato de produção quebra o teste correspondente.

**Etapa 87 — Integrar testes Deno e DB**

Subetapas: 1) executar 21 testes existentes; 2) adicionar testes auth; 3) adicionar testes CORS; 4) adicionar testes idempotência; 5) adicionar testes webhook; 6) adicionar testes de providers; 7) executar pgTAP; 8) executar reset; 9) congelar lockfile; 10) publicar resultados.

Checkpoint: CI executa Deno e DB em toda PR e falha diante de regressão.

**Etapa 88 — Criar ambiente E2E determinístico**

Subetapas: 1) provisionar Supabase E2E; 2) criar contas por papel; 3) criar seeds; 4) isolar por run; 5) resetar dados; 6) guardar secrets; 7) gerar storage fixtures; 8) desabilitar terceiros reais; 9) expor mocks controlados; 10) validar readiness.

Checkpoint: `playwright test --list` e a suíte rodam sem dependência manual.

**Etapa 89 — Reparar suíte Playwright**

Subetapas: 1) usar route registry; 2) remover asserções vácuas; 3) remover skips condicionais silenciosos; 4) autenticar specs protegidos; 5) corrigir admin; 6) corrigir jobs; 7) corrigir logistics; 8) corrigir packaging; 9) versionar snapshots; 10) rodar desktop/mobile.

Checkpoint: zero teste visita rota errada, página de login ou 404 sem afirmar isso explicitamente.

**Etapa 90 — Elevar cobertura e estabilidade**

Subetapas: 1) estabelecer baseline atual; 2) subir para 35%; 3) subir para 50%; 4) subir para 60%; 5) chegar a 70% global; 6) chegar a 80% crítico; 7) medir mutation testing; 8) detectar flaky; 9) repetir falhas automaticamente; 10) impor duração <5 min.

Checkpoint: thresholds finais passam, mutation score crítico ≥70% e flaky rate <1%.

## Bloco J — CI/CD, operação e certificação

**Etapa 91 — Unificar quality gates**

Subetapas: 1) adicionar frontend typecheck; 2) adicionar Deno check; 3) exigir zero lint warning; 4) executar unitários; 5) executar cobertura; 6) executar RLS/DB; 7) executar E2E; 8) executar security scan; 9) executar bundle budgets; 10) produzir summary.

Checkpoint: um único gate obrigatório representa honestamente todos os resultados.

**Etapa 92 — Implantar frontend oficial na Vercel**

Subetapas: 1) versionar `vercel.json`; 2) configurar projeto; 3) configurar environments; 4) configurar headers; 5) configurar SPA rewrites; 6) criar preview por PR; 7) configurar domínio; 8) corrigir canonical; 9) validar cache; 10) testar rollback.

Checkpoint: preview e produção são promovidos pelo pipeline, com rollback comprovado.

**Etapa 93 — Criar deploy Supabase para staging**

Subetapas: 1) validar migrations; 2) aplicar em staging; 3) verificar schema drift; 4) implantar functions por allowlist; 5) excluir backdoors; 6) validar secrets; 7) executar smoke tests; 8) executar contratos; 9) executar RLS; 10) publicar release candidate.

Checkpoint: staging reproduz a release completa antes de qualquer ação em produção.

**Etapa 94 — Criar promoção controlada à produção**

Subetapas: 1) exigir quality gate; 2) exigir aprovação; 3) registrar versão; 4) criar backup; 5) aplicar migrations compatíveis; 6) implantar functions; 7) promover Vercel; 8) executar smoke; 9) monitorar canário; 10) fechar release.

Checkpoint: nenhuma implantação ocorre por simples push sem gates e aprovação.

**Etapa 95 — Implementar rollout e rollback**

Subetapas: 1) criar feature flags server-side; 2) definir percentuais; 3) definir kill switches; 4) definir compatibilidade N/N-1; 5) criar down migration segura; 6) criar rollback de functions; 7) criar rollback Vercel; 8) ensaiar falha; 9) medir tempo; 10) documentar decisão.

Checkpoint: release inteira retorna à versão anterior em menos de cinco minutos quando aplicável.

**Etapa 96 — Implantar observabilidade e SLOs**

Subetapas: 1) padronizar logs JSON; 2) propagar trace/request ID; 3) instrumentar RED; 4) instrumentar recursos; 5) integrar Sentry; 6) criar dashboards; 7) definir SLO 99,9%; 8) definir error budget; 9) criar alertas acionáveis; 10) vincular runbooks.

Checkpoint: incidente simulado gera alerta com contexto, trace e procedimento correto.

**Etapa 97 — Atualizar arquitetura e APIs**

Subetapas: 1) corrigir `ARCHITECTURE.md`; 2) documentar domínios; 3) documentar fluxos; 4) documentar providers; 5) documentar offline; 6) documentar schema/ERD; 7) publicar OpenAPI; 8) publicar dicionário; 9) documentar integrações; 10) validar exemplos automaticamente.

Checkpoint: documentação corresponde ao código e exemplos executam no CI.

**Etapa 98 — Criar ADRs, runbooks e onboarding**

Subetapas: 1) ADR de hosting; 2) ADR de Supabase; 3) ADR de TPM; 4) ADR de auth/MFA; 5) runbook de deploy; 6) runbook de rollback; 7) runbook de incidentes; 8) runbook de terceiros; 9) guia de setup; 10) teste de onboarding.

Checkpoint: novo desenvolvedor sobe o ambiente e entrega mudança simples em menos de quatro horas.

**Etapa 99 — Formalizar segurança, LGPD e operação do time**

Subetapas: 1) mapear dados pessoais; 2) definir bases legais; 3) definir retenção; 4) implementar exportação; 5) implementar exclusão/anônimização; 6) registrar consentimentos; 7) definir severidades; 8) definir on-call; 9) definir post-mortem; 10) definir revisão trimestral.

Checkpoint: controles LGPD e resposta a incidentes possuem owner, SLA e evidência de exercício.

**Etapa 100 — Reauditar e certificar 10/10**

Subetapas: 1) repetir inventário; 2) repetir 20 dimensões; 3) anexar evidências; 4) executar todos os gates; 5) testar pen test; 6) testar carga; 7) testar restore; 8) testar rollback; 9) obter aprovação técnica/negócio; 10) publicar scorecard final.

Checkpoint: nenhuma dimensão recebe 10 sem evidência; gaps restantes viram backlog com owner, prazo e risco aceito formalmente.

## 5. Critérios finais de aceite

- Zero backdoor, segredo privado ou RPC arbitrária acessível.
- Zero erro TypeScript/Deno e zero warning ESLint.
- Banco reconstruível e sem drift não documentado.
- RLS testada positiva e negativamente em todas as tabelas.
- MFA AAL2 obrigatório server-side para papéis elevados.
- Zero dado simulado persistido ou apresentado como real.
- Todas as Edge Functions legítimas conectadas, tipadas, testadas e monitoradas.
- Cobertura ≥70% global e ≥80% na lógica crítica.
- E2E determinístico em Chromium desktop e mobile.
- Bundle inicial ≤250 KB gzip; bibliotecas pesadas somente sob demanda.
- LCP p75 <2,5s, INP <200ms e CLS <0,1.
- SLO ≥99,9%, restore trimestral e rollback comprovado.
- Deploy Vercel/Supabase subordinado ao quality gate.
- OpenAPI, ERD, ADRs, runbooks e onboarding atualizados.

## 6. Premissas

- A análise é local; runtime e banco vivo precisam ser verificados nas etapas correspondentes.
- Alterações já existentes no worktree serão preservadas e revisadas antes de incorporação.
- `migrate-helper` não será preservada, pois não representa funcionalidade legítima.
- Funções órfãs restantes serão conectadas conforme a decisão do usuário.
- Vercel será o host oficial do frontend.
- Simulações permanecerão exclusivamente no modo demo.
- Papéis elevados exigirão AAL2.
- Mudanças de schema usarão expansão/migração/contração e compatibilidade N/N-1.
- O score final só poderá alcançar 10/10 após evidências de produção, segurança ofensiva, restore e operação sustentada.
</proposed_plan>
