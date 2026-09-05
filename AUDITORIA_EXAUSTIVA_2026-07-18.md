# Auditoria Exaustiva & Remediação — FAST GRAVAÇÕES ES v2

**Data:** 2026-07-18
**Escopo:** varredura completa do sistema (frontend, edge functions, banco de
dados, infraestrutura de resiliência, CI/CD) em busca de falhas e gaps não
cobertos pelas auditorias anteriores (`ANALISE_TECNICA_SISTEMA.md`,
`AUDITORIA_CORRECOES_2026-05-29.md`, `CODE_REVIEW_FINDINGS.md`,
`docs/QA_AUDIT_2026-06-14.md`, `docs/QA_SIMULACAO_CENARIOS_2026-06-14.md`),
seguida de remediação prioritária por severidade.

**Método:** 8 agentes especializados em paralelo (arquitetura frontend,
autenticação/RBAC, edge functions, migrações SQL, infraestrutura
transversal, módulos de negócio, config/CI/deps, bateria real de
testes/build/lint/audit), cada achado revisado e, quando de alta severidade,
verificado contra o código-fonte antes de ser aceito (um achado — `onFID`
removido do web-vitals v4 — foi investigado e refutado: a versão instalada
ainda exporta `onFID`).

---

## Parte A — Missão dividida em 30 etapas de auditoria

**Bloco I — Fundamentos e Superfície (1–6):** inventário & baseline · composição/bootstrap · roteamento & code-splitting · RBAC de rota · config de build/TS/lint · gestão de dependências.

**Bloco II — Segurança (7–13):** autenticação · MFA & reset de senha · autorização server-side (RLS) · funções SECURITY DEFINER & search_path · edge functions (auth/identidade) · edge functions (entrada/injeção) · CORS/segredos/vazamento.

**Bloco III — Dados & Backend (14–19):** modelo de dados & tipos · índices & performance de query · triggers & integridade · migrações · edge functions (lógica de negócio) · integrações externas (Bitrix24/ERP).

**Bloco IV — Frontend & Estado (20–24):** árvore de contextos & re-render · hooks customizados · server-state (React Query) · formulários & validação · realtime/WebSocket/offline.

**Bloco V — Infra transversal & Qualidade (25–30):** utilitários de resiliência · sanitização & logger/telemetria · exportações · PWA & Service Worker · i18n & acessibilidade · testes & CI/CD.

## Parte B — Plano de execução em 50 etapas

**Fase 1 (1–20) — Descoberta & Documentação:** concluída nesta entrega (baseline real, 8 auditorias paralelas, consolidação, este documento).
**Fase 2 (21–30) — Remediação Crítica de Segurança:** em grande parte executada nesta mesma entrega (ver Parte C).
**Fase 3 (31–38) — Correctness & Dados:** parcialmente executada (ver Parte C); itens de banco/RLS mais invasivos ficam para PR revisado por humano com acesso ao projeto Supabase real.
**Fase 4 (39–44) — Performance, Estado & UX:** não executada nesta entrega (backlog, ver Parte E).
**Fase 5 (45–50) — Qualidade, Testes & CI/CD:** parcialmente executada (2 testes novos cobrindo os fixes críticos de sync offline); ampliação de cobertura fica como backlog.

---

## Parte C — O que foi corrigido nesta entrega

### Segurança — Banco de dados (migrations novas, não aplicadas ao Supabase ao vivo)
| # | Item | Arquivo |
|---|------|---------|
| C1 | `search_path` mutável em funções `SECURITY DEFINER` criadas após o fix em lote de maio (`log_job_status_change`, `check_and_notify_kpi_alert`, `validate_stock_before_movement`) — escalonamento de privilégio via objeto shadow | `supabase/migrations/20260718200000_fix_search_path_all_functions.sql` |
| H1 | `notifications` INSERT `WITH CHECK (true)` — qualquer autenticado podia forjar notificação para qualquer `user_id` | `supabase/migrations/20260718200100_fix_notifications_insert_policy.sql` |
| H2 | `prediction_history`/`operator_rankings`/`operator_achievements` escritos por qualquer autenticado (verificado: só há leitura client-side; toda escrita real vem de edge functions via service role) | `supabase/migrations/20260718200200_scope_analytics_writes_to_elevated_roles.sql` |

*Nota:* essas migrations foram escritas seguindo exatamente o padrão das
migrations de hardening anteriores do repositório, mas **não foram aplicadas
a nenhum banco Supabase ao vivo** nesta sessão (nenhum MCP conectado mapeia
para o projeto `xxroejpvloldkmqdydar`) — precisam ser aplicadas via CLI/CI
pela equipe, como já era o padrão estabelecido pelas auditorias anteriores.

### Segurança — Edge Functions
| # | Item | Arquivo |
|---|------|---------|
| **CRÍTICO** | `bitrix24-sync` era uma superfície administrativa **totalmente sem autenticação** usando a service-role key: qualquer um podia injetar/alterar `jobs` via `action=webhook`, apagar tokens OAuth (`clear-tokens`), corromper mapeamentos (`save-mapping`/`delete-mapping`), disparar leitura/escrita no CRM. Corrigido com 3 modos de auth: secret compartilhado para o webhook do Bitrix (fail-closed se `BITRIX24_WEBHOOK_SECRET` não configurado), usuário autenticado para `push` (disparado a cada mudança de status de job), role elevada (coordinator/manager/admin) para as demais ações administrativas. Os 4 pontos de chamada do frontend que só enviavam a `apikey` anônima (nunca a sessão do usuário) foram corrigidos para encaminhar `Authorization: Bearer <token>` via novo helper `src/lib/edgeFunctionFetch.ts`. | `supabase/functions/bitrix24-sync/index.ts`, `src/lib/edgeFunctionFetch.ts`, `src/features/admin/hooks/useBitrix24Sync.ts`, `src/components/integrations/Bitrix24SyncHistory.tsx`, `src/components/integrations/Bitrix24FieldMapping.tsx`, `src/pages/Bitrix24ConfigPage.tsx`, `src/features/jobs/services/jobsService.ts` |
| H1 | `cleanup-security-logs` deletava a trilha de auditoria de segurança sem nenhuma autenticação | `supabase/functions/cleanup-security-logs/index.ts` |
| H2/H3 | `send-tpm-email`/`send-loss-risk-alert` — disparo de e-mail não autenticado + HTML/URL de evidência não escapados (injeção de conteúdo/phishing) | `supabase/functions/send-tpm-email/index.ts`, `supabase/functions/send-loss-risk-alert/index.ts`, novo `supabase/functions/_shared/htmlEscape.ts` |
| H4 | `validate-login-ip` confiava no IP enviado pelo cliente (bypass trivial do allowlist) e o matcher CIDR só cobria /8, /16, /24 | `supabase/functions/validate-login-ip/index.ts` — IP agora derivado de `x-forwarded-for`/`x-real-ip`; CIDR genérico (qualquer /0–/32). **Decisão documentada:** função confirmada sem nenhum chamador no app (`grep` não encontrou uso) — a falha estrutural foi corrigida, mas religá-la ao fluxo de login exigiria testar contra um Supabase ao vivo, fora do alcance seguro desta sessão. |
| H5 | `check-login-lockout` — o cliente dizia ao servidor se o login teve sucesso (`record_success`/`record_failure`), permitindo resetar o próprio contador de tentativas indefinidamente (brute-force sem limite) | `supabase/functions/check-login-lockout/index.ts` — `record_success` agora exige prova de sessão real (JWT) cujo e-mail bate com o alvo; IP também passou a ser derivado do servidor. `AuthService`/`AuthProvider` limpos do parâmetro `ipAddress` agora ignorado. |
| H6 | `technical-assistant` (proxy de IA) sem nenhuma autenticação — qualquer um podia gerar custo ilimitado de IA | `supabase/functions/technical-assistant/index.ts` — exige JWT + limites de tamanho de payload; 2 pontos de chamada corrigidos para encaminhar sessão real em vez da anon key |
| H7 | `erp-api` aceitava **qualquer** JWT de usuário autenticado (sem checar role) para CRUD completo de jobs + PII de operadores | `supabase/functions/erp-api/index.ts` — caminho JWT agora exige role coordinator/manager/admin |
| M1–M7 | 7 funções cron/webhook sem autenticação ou com guarda "sem header = cron" bypassável: `metrics-collector`, `security-alert` (upgrade para fail-closed), `auto-promote-jobs`, `calculate-rankings` (fecharam o bypass "ausência de header"), `calculate-inventory-intelligence`, `daily-maintenance-summary` (novo modo dual: usuário autenticado OU secret de cron, via novo helper `requireUserOrCronSecret`), `tpm-notifications` (cron-only, fail-closed) | `supabase/functions/_shared/cronAuth.ts` (+helper novo) e as 7 functions |
| — | Injeção de fórmula CSV + limite de linhas ausente | `supabase/functions/excel-export/index.ts` |

### Segurança — Autenticação (frontend)
| # | Item | Arquivo |
|---|------|---------|
| **CRÍTICO** | **MFA era puramente cosmético e bypassável.** Ao logar, a sessão já ficava válida em AAL1 assim que `signInWithPassword` resolvia; um `useEffect` navegava para `/` assim que `user` ficasse truthy, **desmontando a tela de desafio MFA antes dela renderizar** — o app entrava sem o código de 6 dígitos ter sido verificado. Corrigido em duas camadas: (1) `AuthPage.tsx` agora verifica `supabase.auth.mfa.getAuthenticatorAssuranceLevel()` antes de navegar, mostrando o desafio quando `nextLevel==='aal2' && currentLevel!=='aal2'`; "Cancelar" no desafio agora desloga de verdade (antes só limpava estado local, deixando uma sessão AAL1 pendurada); (2) novo hook `useAuthenticatorAssuranceLevel` + gate em `ProtectedRoute` — **toda** rota protegida agora nega acesso (redireciona para `/auth`) a uma sessão que não completou o MFA exigido, fechando o bypass mesmo por navegação direta a uma URL protegida. | `src/pages/AuthPage.tsx`, `src/components/auth/ProtectedRoute.tsx`, novo `src/features/auth/hooks/useAuthenticatorAssuranceLevel.ts` |

> **Risco residual documentado:** este é o fix de maior impacto e maior risco de regressão desta entrega — não há ambiente Supabase ao vivo para testar o fluxo de login/MFA ponta a ponta. A lógica segue exatamente o padrão documentado da Supabase Auth (AAL1/AAL2), `tsc`/`eslint` passam, mas **recomenda-se QA manual do fluxo de login (com e sem MFA) antes do merge em produção.**

### Correção de dados / lógica de negócio (feature modules)
| # | Item | Arquivo |
|---|------|---------|
| **CRÍTICO** | `useJobs` e `useSchedulingData` escreviam na **mesma chave de cache** do React Query (`QUERY_KEYS.JOBS`) com semânticas diferentes (`getAll()` completo vs. `getAll({recentOnly:true})`) — qual resolvesse/invalidasse por último vencia, corrompendo detecção de jobs travados, buffer, conflitos de agendamento. Nova chave `QUERY_KEYS.JOBS_RECENT` dedicada, com invalidação cruzada nos pontos de mutação relevantes. | `src/lib/queryConfig.ts`, `src/features/jobs/hooks/useJobs.ts`, `src/features/jobs/hooks/useSchedulingData.ts`, `src/components/planning/LoadBalancingPanel.tsx`, `src/components/operator/ProductionRegistrationModal.tsx` |
| ALTO | `machinesService.getAll`/`techniquesService.getAll` engoliam erro de conectividade/RLS e retornavam `[]` — indistinguível de "sem máquinas/técnicas" (mesmo bug já corrigido em `jobsService.getAll`, replicado aqui) | `src/features/production/services/machinesService.ts`, `src/features/jobs/services/techniquesService.ts` |
| ALTO | **Inflação sistêmica de produção**: `job.produced_quantity ?? job.quantity` tratava "não registrado" como "produzido 100% do pedido, zero perda" em 14 pontos (OEE, KPIs, ABC, produtividade de operador, BI Dashboard). Corrigido para `?? 0` (não registrado = zero, não fabricado) em todos os pontos. | `useOEE.ts`, `oeeCalculations.ts`, `useKPIs.ts` (×3), `useABCCalculations.ts` (×2), `useABCMutations.ts`, `useOperatorProductivity.ts`, `useOperatorEvolution.ts`, `BIDashboard.tsx` (×3) |
| ALTO | `useOEE` sobrescrevia o health-score/consumíveis **calculados de dados reais** com literais fixos por estúdio (`healthScore=78`, "Verniz High-Gloss 12%"...) apresentados como telemetria ao vivo. Removido; UI mostra estado vazio honesto quando não há dado real. Mesma classe de bug em `PredictiveHealthCard` (fallback fabricado quando não há predição real + recomendação hardcoded "Monitorar Vibração" ignorando os dados reais) e `VirtualSensorPanel` (sensor 100% `Math.random()` rotulado "Live/IIoT") — ambos corrigidos (estado vazio honesto / rótulo de simulação explícito). | `useOEE.ts`, `StudioHealthMonitor.tsx`, `PredictiveHealthCard.tsx`, `VirtualSensorPanel.tsx` |
| ALTO | Atribuição de produtividade por **máquina** em vez de por **operador** — dois operadores na mesma máquina eram creditados em dobro pelo mesmo job. Corrigido para atribuir por `job.operator_id` (fallback por máquina só quando não registrado). Corrigido também mismatch de numerador/denominador em `estimatedVsActualRatio`/`productionVelocity` (um usava subconjunto de jobs com tempo válido, outro usava todos). | `src/features/production/hooks/useOperatorProductivity.ts` |
| ALTO | TPM: botão "Concluir Manutenção" sem guarda de duplo clique (múltiplos registros de manutenção/peças) — guarda adicionada e propagada aos 2 callers. `approveBatch` pulava totalmente a validação (assinatura + foto obrigatória) que `approveMaintenance` (single) exige, e engolia erro de cada update reportando sucesso sempre — reescrito com a mesma validação + checagem de erro por item + relatório real de sucesso/falha. **Bug adicional descoberto durante o fix:** a checagem "foto obrigatória" nunca funcionava em nenhum dos dois caminhos — `requires_photo` está em `maintenance_checklist_items`, não na resposta (`maintenance_item_responses`); o cast TypeScript inseguro escondia isso do compilador. Corrigido com o join correto em ambos. `ChecklistManager`: `<SelectItem value="">` quebra o Radix Select (crash confirmado) — sentinel value introduzido. | `src/features/maintenance/hooks/useTPMMutations.ts`, `MaintenanceExecutionModal.tsx`, `ChecklistManager.tsx`, `TPMDashboard.tsx`, `MachinesPage.tsx` |

### Infraestrutura transversal
| # | Item | Arquivo |
|---|------|---------|
| **CRÍTICO** | **Sync offline com perda/duplicação de dados.** (1) Replay de `update_job`/`register_production` era last-write-wins cego — sem checar se o registro mudou no servidor enquanto offline, incluindo `register_production` forçando `status:'finished'` incondicionalmente (podia ressuscitar job cancelado). Corrigido com guarda de concorrência otimista (`baseUpdatedAt` capturado ao enfileirar, `.eq('updated_at', baseUpdatedAt)` no replay; sem match = conflito, não sobrescrita silenciosa). (2) `isSyncing` era estado React, não uma trava síncrona — duas passadas de sync podiam rodar concorrentes, duplicando escritas; corrigido com `useRef`. (3) `qr_scan` era um INSERT não-idempotente — replay após resposta perdida duplicava o registro; corrigido com `upsert` chaveado no UUID gerado no cliente. Adicionado: `localStorage.setItem` agora sempre em try/catch (perda de fila em quota excedida), backoff exponencial entre passadas de sync (antes: loop instantâneo em falha parcial), e um **dead-letter store** (`failedActions`) para ações em conflito ou com tentativas esgotadas — antes descartadas silenciosamente, agora preservadas para revisão manual. Validado com 2 novos testes unitários (detecção de conflito, upsert idempotente) além dos 3 já existentes, todos passando. | `src/hooks/useOfflineSync.ts`, `src/hooks/useOfflineSync.test.ts` |
| ALTO | `OfflineProvider.syncNow` (provider redundante e já apontado como "deveria ter sido removido" pelo próprio código) fingia sincronizar com `setTimeout(500ms)` e descartava as ações da fila como "sucesso" sem nunca as enviar. Confirmado sem nenhum chamador real de `addPendingAction` hoje (inerte em produção), mas corrigido para não mentir: se algum dia for usado, falha alto e mantém a fila em vez de descartar. | `src/hooks/useLocalStorage.ts` |
| ALTO | Logger persistia dados não-redigidos em `error_logs` e no webhook de alerta crítico externo, violando seu próprio contrato documentado ("Never logs PII") — URL completa (com querystring), stack, e `data`/erro brutos. Adicionada redação de e-mail e tokens JWT-shaped em toda string antes de persistir/enviar, e a URL agora é truncada para origin+pathname (sem querystring). | `src/lib/logger.ts` |
| ALTO | Injeção de fórmula CSV (`=HYPERLINK(...)` etc.) em 3 exportadores client-side + 1 edge function; `inventoryExport.ts` também não escapava aspas embutidas (quebra de estrutura CSV). Novo helper compartilhado `src/lib/csvSafety.ts`. | `useDataExport.ts`, `inventoryExport.ts` (+ escaping correto de aspas), `oeeExport.ts`, `supabase/functions/excel-export/index.ts` |

### Config / CI / CD
| # | Item | Arquivo |
|---|------|---------|
| **CRÍTICO** | CI/deploy injetavam `VITE_SUPABASE_ANON_KEY` no build, mas `client.ts` lê `VITE_SUPABASE_PUBLISHABLE_KEY` (sem fallback) — todo build gerado pelo CI/deploy criava `createClient(url, undefined)`, quebrando auth/PostgREST no bundle publicado. | `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, `.github/workflows/playwright.yml` |
| ALTO | Hooks git (husky/lint-staged/commitlint) referenciados em `.husky/*` mas as dependências nunca estavam no `package.json`, sem script `prepare`, sem config — hooks nunca executavam em nenhuma máquina. Adicionadas dependências, script `prepare`, config de `lint-staged` (package.json) e `commitlint.config.js`; hooks atualizados para o formato husky v9 (sem o antigo `_/husky.sh`, que nem existia no repo). | `package.json`, `.husky/pre-commit`, `.husky/commit-msg`, `commitlint.config.js` |

---

## Parte D — Achados investigados e refutados

- **`onFID` removido do web-vitals v4** (reportado pelo agente de frontend como quebra crítica de build): verificado contra a versão instalada (`4.2.4`) — `onFID` ainda é exportado; a remoção só ocorre no v5. Rebaixado para observação de dívida técnica (API já deprecated, migrar para `onINP`-only antes de um futuro upgrade major).

---

## Parte E — Backlog documentado (não executado nesta entrega, com justificativa)

Itens abaixo foram identificados e deliberadamente **não** corrigidos nesta
sessão — cada um exige teste contra um ambiente ao vivo (Supabase real,
navegador real) que não estava disponível, ou é uma mudança arquitetural de
alto raio de impacto que merece revisão humana dedicada:

1. **RLS com verificação de AAL2** — adicionar `(select auth.jwt()->>'aal')='aal2'` às policies de tabelas sensíveis como defesa em profundidade para o fix de MFA (a aplicação client-side já fecha o bypass; a camada de banco ainda não).
2. **Consolidação de 3 subsistemas de offline/rede redundantes** (`OfflineProvider`, `OfflineSyncProvider`/`useOfflineSync`, `NetworkStatusProvider`) — causam toasts duplicados e listeners redundantes; `OfflineProvider` foi corrigido para não mentir, mas a consolidação completa (remover um dos três) precisa de teste visual.
3. **`npm audit`**: 11 vulnerabilidades (0 críticas, 3 altas — `undici`, `vite`/`launch-editor`, `ws`; 6 moderadas incl. `dompurify`, `react-router` open-redirect; 2 baixas). Não corrigido — bump de dependências maiores sem poder rodar a suíte E2E completa (sem browsers Playwright instalados neste ambiente) é arriscado às cegas.
4. **`npm ci` quebrado** — lockfile fora de sincronia com `package.json` (faltam pacotes `esbuild`) e pacotes dev pinados a um registro privado (`europe-west1-npm.pkg.dev/lovable-core-prod/...`) inacessível fora do ambiente Lovable. Bloqueia instalação reprodutível em qualquer CI/ambiente novo.
5. **Cobertura de testes** ~21-23% (linhas/branches/funções), mal passando dos thresholds configurados (20/15/17/20). `admin`, `inventory`, `maintenance` (features) e ~19 módulos de `src/lib` sem nenhum teste.
6. **`lib-mermaid` chunk de 2.75 MB** — maior violação de bundle budget; requer confirmar se mermaid é carregado só via `React.lazy` em todos os call sites.
7. **E2E não executável neste ambiente** — sem browsers do Playwright instalados e sem backend Supabase ao vivo acessível.
8. **`BatchApprovalPreviewModal`** (preview client-side de aprovação em lote) ainda não valida "foto obrigatória" (só assinatura) — a validação real e autoritativa agora está no servidor (`approveBatch`, corrigido nesta entrega), então o preview desatualizado é um gap de UX, não mais um bug de segurança/integridade de dados.
9. **CORS com origens de preview Lovable hardcoded** em ~30 edge functions (copiadas, não centralizadas) — ainda permitem acesso de domínios de preview efêmeros.
10. **`deploy.yml` roda migração de banco + deploy de edge functions em paralelo, sem ordenação** e sem depender dos gates completos de `ci.yml`.
11. Demais achados MÉDIOS/BAIXOS documentados pelos 8 agentes (ver histórico da sessão) não listados individualmente aqui por brevidade — principalmente: paginação ausente em várias queries analíticas, race conditions menores, gaps de i18n/a11y, timeouts ausentes em chamadas HTTP externas nas edge functions.

---

## Parte F — Verificação final (primeira onda)

```
npx tsc --noEmit -p tsconfig.app.json    → 0 erros
npx eslint . --max-warnings 9999         → 0 erros, exit 0
npx vitest run                           → 461/461 testes passando (35 arquivos)
npx vite build                           → sucesso (~69s), mesmo aviso pré-existente de chunk grande (mermaid)
```

Nenhuma migração SQL foi aplicada a um banco ao vivo; nenhuma alteração foi
enviada a produção além do que este PR contém.

---

## Parte G — Segunda onda: remediação do backlog (mesmo PR)

Após a primeira entrega, itens documentados na Parte E foram trabalhados
(sem nova varredura completa), pulando explicitamente o que seria arriscado
aplicar às cegas (ex.: RLS exigindo AAL2 em todas as tabelas sensíveis —
bloquearia qualquer usuário sem MFA configurado; decisão de produto, não
de código).

| Item | Resultado |
|------|-----------|
| `BatchApprovalPreviewModal` sem validação de foto obrigatória | Corrigido — preview agora consulta `maintenance_item_responses` + `maintenance_checklist_items` escopado aos registros selecionados, com estado de "verificando" para não deixar confirmar antes da checagem resolver |
| CORS duplicado em ~30 edge functions | Centralizado em `_shared/cors.ts` para os 15 functions já tocados na primeira onda (contexto profundo, baixo risco); demais ~15 ficam de fora — sem type-checker Deno neste ambiente, editar às cegas seria desproporcional para um hardening cosmético. Removidas 2 origens de preview do Lovable do módulo compartilhado que não apareciam em nenhum array por-função ativo |
| `deploy.yml` sem ordenação migração↔functions | Corrigido — `apply-migrations` agora roda antes de `deploy-edge-functions`. Gate completo contra `ci.yml` **não** adicionado: o E2E do `ci.yml` está com hang pré-existente confirmado no próprio histórico do `main` (últimos ~10 runs `failure`/`cancelled`, ~2h15min cada) — amarrar o deploy a isso travaria toda entrega em produção até esse problema (fora do escopo desta auditoria) ser resolvido separadamente |
| Toasts duplicados de conexão (3 providers) | Parcialmente corrigido — `OfflineProvider` não dispara mais toast (mantém apenas o estado usado por `OfflineBanner`/`ConnectionStatus`); `useOfflineSync` continua sendo a fonte real. Consolidação arquitetural completa dos 3 subsistemas segue como item maior, precisa de teste visual |
| `npm audit`: 11 vulnerabilidades | `npm audit fix` (sem `--force`): **11 → 3**. As 3 restantes exigem downgrade major de `exceljs` (`3.4.0`, breaking) — não aplicado sem poder validar contra a suíte E2E completa |
| Chunk `lib-mermaid` de 2.75MB | Verificado, não é bug: só é importado por `TechnicalArtifacts.tsx` → `ChatMessage.tsx`, alcançado exclusivamente via `TechnicalAssistantPage`, que já é `React.lazy()` nas rotas. O chunk só baixa ao navegar para `/technical-assistant` |
| Cobertura de testes | 3 arquivos novos (12 testes) cobrindo os fixes de maior risco desta sessão: `csvSafety.test.ts` (sanitização anti-fórmula), `logger.test.ts` estendido (redação de e-mail/token/querystring), `oeeCalculations.test.ts` (regressão do bug `produced_quantity`) |

### Verificação final (segunda onda)
```
npx tsc --noEmit -p tsconfig.app.json    → 0 erros
npx eslint . --max-warnings 9999         → 0 erros, exit 0
npx vitest run                           → 473/473 testes passando (37 arquivos, +12 novos)
npx vite build                           → sucesso
```

### Ainda em aberto (não executado)
- RLS com verificação de AAL2 (decisão de produto — depende de quantos usuários já têm MFA ativo)
- Consolidação arquitetural completa dos 3 subsistemas offline/rede
- Centralização de CORS nos ~15 edge functions restantes
- `npm ci` quebrado (lockfile fora de sync + registro privado inacessível)
- Cobertura de testes ainda muito abaixo do desejável (~21-23%)
- `deploy.yml` não gateado pelo `ci.yml` completo — bloqueado pelo hang de E2E pré-existente no `main`, que é o item de maior prioridade real do backlog de infraestrutura agora
