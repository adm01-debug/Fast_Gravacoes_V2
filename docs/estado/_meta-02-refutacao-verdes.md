# Meta-auditoria 02 — Refutação adversarial dos ✅ (lotes 05–10)

> Verificação **adversarial** das linhas classificadas como ✅ IMPLEMENTADO_TOTAL nos lotes 05, 06, 07, 09 e 10.
> **Sem acesso a runtime, banco ou produção.** Tudo aqui é leitura de código + grep sobre o repositório.
> Objetivo declarado: **derrubar** ✅ que não merecem o selo. Quando o ✅ resiste ao ataque, está registrado como PROCEDE.

---

## Método e amostra

### Critério aplicado (o mesmo do enunciado da auditoria original)

✅ IMPLEMENTADO_TOTAL = fio **completo**: UI → lógica → persistência, com evidência em cada camada.
Falta qualquer camada, persistência inexistente, dado fictício no caminho, botão sem handler ou consumidor ausente ⇒ **não é ✅**.

### Extração

```
grep -hE '^\|.*✅' docs/estado/_lote-05*.md docs/estado/_lote-06*.md \
                   docs/estado/_lote-07*.md docs/estado/_lote-09*.md docs/estado/_lote-10*.md
```

Universo de linhas ✅ encontradas: **276** (lote 05 = 32, 06 = 26, 07 = 41, 09 = 37, 10 = 140).

### Amostra

**30 itens** verificados linha a linha, priorizando os mais ambiciosos: fluxos de segurança/auth, integrações externas,
exportações, providers/infraestrutura e features com persistência. Páginas "de vitrine" do lote 10 foram incluídas
deliberadamente, porque são o tipo de item onde "roteado" costuma ser confundido com "funciona".

### Ressalva de justiça sobre o lote 10

A tabela **"Mapa completo de rotas"** do lote 10 usa a coluna `Status` com critério mais estreito ("a rota existe e
resolve para uma página real"), não o critério de fio completo. Onde derrubei uma linha dessa tabela (`/code-quality`,
`/master-api`, `/digital-twin`), a derrubada é **contra o critério ✅ IMPLEMENTADO_TOTAL do enunciado**, e isso está dito
explicitamente em cada caso. As demais derrubadas do lote 10 vêm das tabelas de **inventário de funcionalidades**, onde o
critério de fio completo se aplica sem ressalva.

### Técnica de verificação por item

1. UI existe e está montada/roteada? (grep do componente fora do próprio arquivo)
2. A lógica faz o que o nome diz ou é stub/fachada?
3. Persistência real? `.from('x')` **e** `.from("x")` (o repo usa os dois estilos), `.rpc(`, `storage.from(`
4. A tabela/função citada existe em `supabase/migrations/`? (`CREATE TABLE ... x`, `CREATE ... FUNCTION x`)
5. `Math.random()`, literais hardcoded ou seed fictício no caminho de dados?
6. Botão com `onClick` real? Provider com consumidor real do seu hook?

---

## Resultado por item

| Item | Lote | Veredito | Motivo + arquivo:linha |
|---|---|---|---|
| Criar operador (edge function) | 05 | **PROCEDE** | Fio completo: `src/components/operators/CreateOperatorModal.tsx:82` → `supabase/functions/create-operator/index.ts` (rate limit `:47`) → `auth` + `user_roles`. Divergência de senha (6 vs 8) já estava declarada. |
| Competências / matriz de habilidades | 05 | **PROCEDE** | `src/features/production/hooks/useOperatorSkills.ts:16-79` (upsert/delete) e `CREATE TABLE operator_skills` confirmado em migrations (2 ocorrências). `expires_at` sem alerta já estava declarado. |
| Metas de operador (CRUD) | 05 | **PROCEDE** | `src/features/production/hooks/useOperatorGoals.ts:71,91-92,116-119` (select/insert/update em `operator_goals`); tabela existe. Widget montado em `src/pages/OperatorProductivityPage.tsx:132`. |
| Checklist pré-produção | 05 | **PROCEDE** | Modal montado em `src/pages/OperatorView.tsx:102`; leitura `src/components/operator/PreProductionChecklist.tsx:49-52`, insert `:63-72` em `pre_production_checklists`; tabela existe. |
| Exportar relatório de produtividade (PDF) | 05 | **PROCEDE** | `src/lib/productivityReport.ts` (306 linhas) importado em `src/pages/OperatorProductivityPage.tsx:19`. |
| Loja de recompensas (catálogo) | 05 | **PROCEDE** | Botão com handler real (`src/pages/GamificationPage.tsx:174-176`, `onClick={() => handleRedeem(reward)}`), mutation `redeemReward`, catálogo de `gamification_rewards` (`src/hooks/useGamification.ts:149-157`); tabela existe. |
| Passagem de turno — criar/finalizar/aceitar | 05 | **PROCEDE** | `src/hooks/shift-handover/useShiftHandoverMutations.ts:13-70`; `CREATE TABLE shift_handovers` + 4 tabelas satélites confirmadas em migrations. |
| Correção do bypass de MFA (guarda de rota) | 06 | **PROCEDE** | `src/components/auth/ProtectedRoute.tsx:45,82-86` redireciona antes do bypass de admin (`:89-91`); hook `src/features/auth/hooks/useAuthenticatorAssuranceLevel.ts:37-38`. Fail-open em erro (`:44-47`) já estava declarado. |
| Lockout por tentativas falhas | 06 | **PROCEDE** | `src/features/auth/services/authService.ts:48,64` ← `AuthProvider.tsx:215,227,263`; EF escreve em `login_lockouts` (`check-login-lockout/index.ts:98,113,192,241,277,309,326`); tabela existe em 2 migrations. |
| Alerta de novo dispositivo | 06 | **PROCEDE** | `src/hooks/useDeviceDetection.ts:104` → EF grava em `user_devices` (`:73,93,112`) e `new_device_alerts` (`:135,250`); tabelas existem. |
| Fluxo de reset de senha — aprovação | 06 | **PROCEDE** | Fio fechado dos dois lados: **criação** em `src/pages/AuthPage.tsx:135` (insert em `password_reset_requests`), **aprovação** em `src/components/settings/PasswordResetRequests.tsx:72,95` → `approve-password-reset/index.ts:101,131`. Tabela existe. |
| RLS de `user_roles` (anti-escalada) | 06 | **PROCEDE** | Policies lidas na íntegra: `20260712231523_*.sql:5-40` e `20260713122454_*.sql:3-22` — `role NOT IN ('admin','manager')` no `USING` **e** no `WITH CHECK`. |
| Rate limiting `_shared/rateLimit.ts` | 06 | **PROCEDE** | `supabase/functions/_shared/rateLimit.ts:52-110` (count + insert em `rate_limit_logs`); tabela existe. Fail-open documentado em `:11-13`. |
| CORS das edge functions | 06 | **PROCEDE** | `_shared/cors.ts:16-51` com allowlist; **31 de 34** funções importam o helper; `grep "Allow-Origin.*\*"` só acerta arquivos `*.test.ts`. Achado de "CORS wildcard" do `ANALISE_TECNICA_SISTEMA.md` está de fato desatualizado. |
| **Bloqueio de IPs (`blocked_ips`)** | 07 | **DERRUBADO** | CRUD existe, **bloqueio não**. O único leitor de `blocked_ips` em runtime é `supabase/functions/rate-limit-check/index.ts:95`, que **não tem nenhum chamador** em todo o repo (front, migrations e cron). Idem `validate-login-ip`. Bloquear um IP na UI não impede login algum. → 🟨 |
| Trilha de auditoria + `verify_audit_chain` | 07 | **PROCEDE** | `src/features/admin/hooks/useAuditTrail.ts:20,95`; função existe (`20260512213154_*.sql:19-26`, com `REVOKE`/`GRANT`); `audit_log` alimentado por triggers em ≥5 migrations. |
| Traces de performance (`telemetry_traces`) | 07 | **PROCEDE** | Produtor real: `src/features/production/hooks/usePerformanceMetrics.ts:40,77` (insert), consumido em `src/pages/Index.tsx:120`. Tabela existe. |
| **Monitoramento do sistema (`/admin/monitoring`)** | 07 | **DERRUBADO** | 1 das 4 fontes é um painel permanentemente vazio: `query_telemetry` (`useMonitoringData.ts:50,64`) tem **um único produtor**, `supabase/functions/external-db-bridge/index.ts:65`, que **não tem chamador nenhum**. O próprio lote 07 declarou o buraco e mesmo assim marcou ✅. → 🟨 |
| Bitrix24 (CRM) | 07 | **PROCEDE** | `src/pages/Bitrix24ConfigPage.tsx:26,58` e `src/features/admin/hooks/useBitrix24Sync.ts:38` via `edgeFunctionFetch` → EF de 1217 linhas → tabelas `bitrix24_oauth_tokens`, `bitrix24_field_mappings`, `bitrix24_sync_history` confirmadas em migrations. |
| Web Push (VAPID) | 07 | **PROCEDE** | Fio inteiro: `usePushSubscription.ts:114` (upsert em `push_subscriptions`, tabela existe) → EF com JWT VAPID → `public/sw.js:93` (`push`) e `:146` (`notificationclick`). Ressalva: dos 3 call sites do front, 2 são `sendTestNotification`; o único disparo por evento real de negócio vem de `new-device-alert/index.ts:281`. |
| **Página de Configurações (9 abas)** | 07 | **DERRUBADO** | Duas abas gravam num balde que **ninguém lê**: `app-settings-<uid>` é escrito em `src/pages/SettingsPage.tsx:35` e não tem **nenhum** leitor fora do próprio arquivo. Os switches "Atualização Automática" (`SettingsGeneralTab.tsx:52`), "Sons" e "Notificações" (`SettingsNotificationsTab.tsx:48,53`) são inertes — e ainda assim `SettingsPage.tsx:70` dispara `toast.success('Configuração salva automaticamente')`. → 🟨 |
| Backup manual (JSON no browser) | 07 | **PROCEDE** | `src/pages/SettingsPage.tsx:80-92` lê `jobs`/`profiles`/`machines` e baixa o blob; botão real em `SettingsBackupTab.tsx:20`. |
| Gestão de técnicas | 07 | **PROCEDE** | `src/components/settings/TechniqueManagement.tsx:38,51,70` (select/upsert/delete em `techniques`). |
| Exportação de dados (CSV/audit) | 07 | **PROCEDE** | `src/features/admin/hooks/useDataExport.ts:75,157`; 5 consumidores reais (`PendingQueue.tsx:114`, `MachinesPage.tsx:58`, `JobDetailsModal.tsx:475`, `MachineDetailsModal.tsx:153`, `AuditTrailDrawer.tsx:35`). |
| Chat com IA — chamada real de LLM | 09 | **PROCEDE** | `TechnicalAssistantPage.tsx:86` → `technical-assistant/index.ts:498` (POST real ao gateway) e persistência em `technical_messages` (`useTechnicalConversations.ts:178-186`); tabela existe. Bug de JSON parcial (`TechnicalAssistantPage.tsx:119`) já estava declarado. |
| Upload de documento técnico | 09 | **PROCEDE** | `useDocuments.ts:70-119` (`storage.from('technical-documents')` + insert em `technical_documents`); bucket criado em `20251220150808_*.sql:76-87`; tabela existe. |
| Reconhecimento de voz (STT) | 09 | **PROCEDE** | Web Speech API real em `src/components/voice/VoiceCommands.tsx:62-115`; `VoiceButton` montado em **11 páginas**. |
| Exports PDF/Excel (SPC, calendário, turno) | 09 | **PROCEDE** | Todos os libs existem e todos têm chamador ligado a UI: `spcExport.ts` ← `SPCDashboard.tsx:94`; `calendarExports.ts` ← `DailyCalendar.tsx:153,164`; `shiftReportPdf.ts` ← `AutoShiftSummary.tsx:30`, que por sua vez é montado em `Index.tsx:386`. |
| **Árvore de 21 providers ("✅ montada")** | 10 | **DERRUBADO** | Contagem independente: **10 dos 21 providers têm 0 consumidores** do seu contexto (`usePermissionsContext`, `useWebSocketContext`, `useBreadcrumbContext`, `useSearchContext`, `useSidebarContext`, `useThemeContext`, `useUserPreferences`, `useReauth`, `useFeedback`, `useOfflineSyncContext` — todos zero). Montagem em `src/providers/AppProviders.tsx:57-79`. Montado ≠ funciona: isto é exatamente 🟨. |
| **`FeatureFlagsContext` / `useFeatureFlags`** | 10 | **DERRUBADO** | Erro de **colisão de nomes** na auditoria. `src/contexts/FeatureFlagsContext.tsx:50` exporta `useFeatureFlags` e **ninguém** o importa — os únicos imports de `@/contexts/FeatureFlagsContext` são `AppProviders.tsx:26,62` (a própria montagem). Os "2 consumidores" citados são o **outro** hook homônimo, `src/features/admin/hooks/useFeatureFlags.ts:17`, e o seu barrel — e esse também tem **0 consumidores** em `.tsx`. Duas implementações concorrentes de feature flags, ambas mortas. → 🟦 |
| **3 locales (i18n)** | 10 | **DERRUBADO** | Diff programático das chaves: `es-ES` tem **59 de 389 chaves faltando** (15%, todo o namespace `logistics.*` entre elas) e `en-US` falta 1 (`logistics.freightCost`) — trocar para espanhol devolve texto em português por fallback. Além disso, só **30 de 620** arquivos `.tsx` usam `useTranslation` (4,8%): a troca de idioma não alcança ~95% da UI. → 🟨 |
| **Rota `/code-quality`** | 10 | **DERRUBADO** | Página inteiramente fictícia. `src/features/admin/hooks/useCodeQualityMetrics.ts` é 100% literal hardcoded: `lighthouseScore: 85` (`:166`), `typeSafetyScore: 99.8` (`:187`), `anyUsageCount: 0` (`:189` — o repo tem **4** ocorrências de `: any`), `totalPages: 30` (`:159` — são **57** arquivos em `src/pages/`), `edgeFunctions: 18` (`:160` — são **34**), `TEST_FILES` fixo (`:69`). Zero medição, zero persistência. → 🟦 |
| **Rota `/master-api`** | 10 | **DERRUBADO** | `src/pages/MasterAPIPage.tsx` não tem **nenhuma** referência a `supabase` no arquivo inteiro. Chave de API falsa hardcoded (`:29`, `sk_live_fast_9283749123847`), lista `ENDPOINTS` inventada (`:37-41`), badge "Sistemas Operantes" estático. É uma página de documentação estática apresentada como hub de API. → 🟦 |
| **Rota `/digital-twin`** | 10 | **DERRUBADO** | Dado fictício no caminho: `src/components/digital-twin/FactoryFloorMap.tsx:90-92` gera `load`, `temp` e `efficiency` com `Math.random()` num `setInterval`, exibidos como telemetria ao vivo das máquinas. A camada de máquinas/jobs é real (`:55`), a telemetria não é. → 🟨 |
| Rota `/simulation` | 10 | **PROCEDE** | Ataque falhou: apesar dos `Math.random()` em `src/lib/simulation.ts:54,64,111`, eles são **fuzzing intencional**; a simulação invoca de verdade a EF `webhook-handler` (`:113-120`) com headers `X-Simulation-Mode`. É um harness real. |
| `ConfirmationContext` / `useConfirmation` | 10 | **PROCEDE** | Consumidor real em `src/components/jobs/JobDetailsModal.tsx:101`. (A auditoria disse "2 consumidores"; são 1 consumidor + a montagem — imprecisão de contagem, não derrubada.) |
| `NotificationsContext` | 10 | **PROCEDE** | 4 arquivos consumidores reais (`useTechniqueCapacityAlerts.ts`, `useSmartDelayAlerts.ts`, `usePriorityEscalation.ts`, `InAppNotificationWatcher.tsx`). |
| Headers de segurança + `public/_headers` | 10 | **PROCEDE** | `vite.config.ts:8-15,19-26` (dev/preview) e `public/_headers` com CSP completa, HSTS, `frame-ancestors 'none'`. |

---

## ✅ derrubados (detalhe)

### 1. Bloqueio de IPs (`blocked_ips`) — lote 07

O item é vendido como controle de segurança. Ele é, na verdade, um CRUD sem efeito.

- UI e hook existem: `BlockedIPsPanel.tsx` montado em `src/pages/SecurityDashboard.tsx:246`; CRUD em `src/features/admin/hooks/useRateLimitLogs.ts:78,94,152,183`.
- Quem consulta `blocked_ips` para **negar** algo: apenas `supabase/functions/rate-limit-check/index.ts:95`.
- `grep -rn "rate-limit-check"` em todo o repo (src, supabase, migrations) retorna **apenas auto-referências dentro da própria função**. Mesmo resultado para `validate-login-ip`.
- O único outro leitor é `cleanup-security-logs/index.ts:53`, que **apaga** entradas expiradas.

Consequência: um coordenador bloqueia um IP na tela de segurança, a linha é gravada, e nada no fluxo de login ou nas edge functions jamais a lê. **Classificação correta: 🟨** (UI + persistência sem consumidor de enforcement).

### 2. Monitoramento do sistema `/admin/monitoring` — lote 07

`src/features/admin/hooks/useMonitoringData.ts` lê 4 fontes. Três estão vivas. A quarta, `query_telemetry` (`:50` e `:64`), tem um único produtor no repositório inteiro — `supabase/functions/external-db-bridge/index.ts:65` — e essa função **não é invocada por ninguém** (busca por `external-db-bridge` fora da própria pasta: zero resultados). O painel correspondente é estruturalmente vazio. A mesma tabela também alimenta `src/pages/AdminTelemetriaPage.tsx:130,197`. **Classificação correta: 🟨.**

### 3. Página de Configurações (9 abas) — lote 07

A auditoria escreveu "a persistência varia por aba" e mesmo assim marcou ✅. Verificado:

- `usePersistedSettings` (`src/pages/SettingsPage.tsx:23-37`) grava `{notifications, sounds, autoRefresh}` em `localStorage['app-settings-<uid>']` (`:35`).
- `grep -rn "app-settings-" src/` retorna **uma única linha**: a própria definição (`:25`). Ninguém lê.
- Os controles ligados a esse estado — `SettingsGeneralTab.tsx:52` ("Atualização Automática"), `SettingsNotificationsTab.tsx:48,53` ("Sons", "Notificações") — não têm efeito algum sobre o app.
- E o usuário recebe `toast.success('Configuração salva automaticamente')` (`SettingsPage.tsx:70`).

Contraste honesto: `alert-thresholds` (`SettingsPage.tsx:42`) **é** lido de verdade (`KanbanMetricsBar.tsx:24`, `DroppableColumn.tsx:82,93`, `AlertsWidget.tsx:37-38`, `KanbanAIAdvisor.tsx:58`), e as abas de usuários/MFA/técnicas persistem em banco. O problema é o ✅ agregado sobre uma página onde 2 das 9 abas são inertes. **Classificação correta: 🟨.**

### 4. Árvore de 21 providers — lote 10

O próprio lote 10 listou "9 providers sem consumidor" (a tabela na verdade lista 11 linhas — inconsistência de contagem) e, apesar disso, marcou a linha de inventário como "✅ montada". Contagem independente por hook, excluindo o arquivo do próprio contexto:

| Hook | Consumidores externos |
|---|---|
| `usePermissionsContext` | 0 |
| `useWebSocketContext` | 0 |
| `useBreadcrumbContext` | 0 |
| `useSearchContext` | 0 |
| `useSidebarContext` | 0 |
| `useThemeContext` | 0 |
| `useUserPreferences` | 0 |
| `useReauth` | 0 |
| `useFeedback` | 0 |
| `useOfflineSyncContext` | 0 |
| `useCelebration` | 1 |

10 de 21 providers montados em `src/providers/AppProviders.tsx:57-79` não entregam nada a ninguém — incluindo `PermissionsProvider`, que o `CLAUDE.md` descreve como peça central do RBAC, e `WebSocketProvider`, que ainda roda 2 intervals e um canal de presença. **"Montado" foi tratado como "funciona". Classificação correta: 🟨.**

### 5. `FeatureFlagsContext` — lote 10 (erro factual da auditoria)

O lote 10 afirma `src/contexts/FeatureFlagsContext.tsx:25,50; 2 consumidores`. Verificado:

```
grep -rn "FeatureFlagsContext|FeatureFlagsProvider" src/   (excluindo o próprio arquivo)
→ src/providers/AppProviders.tsx:26
→ src/providers/AppProviders.tsx:62
```

Ou seja: **zero** consumidores; os dois hits são a montagem. Os "2 consumidores" contados vieram de um **hook homônimo e independente**, `src/features/admin/hooks/useFeatureFlags.ts:17` (esse sim lê a tabela `feature_flags` do banco), mais o seu re-export em `src/features/admin/index.ts:15`. E esse segundo hook também não tem **nenhum** consumidor `.tsx`.

Resultado: o sistema de feature flags existe **duas vezes** e está morto **nas duas**. As 8 flags default (`gamification`, `mlPredictions`, `voiceCommands`, …) nunca são consultadas. **Classificação correta: 🟦.**

### 6. i18n / 3 locales — lote 10

Diff programático de chaves achatadas contra `pt-BR.json` (389 chaves):

| Locale | Presentes | Faltando |
|---|---|---|
| `en-US` | 388 | 1 (`logistics.freightCost`) |
| `es-ES` | 330 | **59** (`logistics.title`, `logistics.description`, `logistics.newShipment`, `logistics.trackingCode`, …) |

Além do locale incompleto, a cobertura de consumo é de **30 arquivos `.tsx` com `useTranslation` em 620** (4,8%). O `LanguageSwitcher` está montado (`AppSidebar.tsx:240`, `AuthPage.tsx:229`) e funciona, mas trocar o idioma muda uma fração mínima da interface e, em espanhol, cai em português nas chaves ausentes. **Classificação correta: 🟨.**

### 7. `/code-quality` — lote 10 (o pior caso)

`src/features/admin/hooks/useCodeQualityMetrics.ts` não mede **nada**. Todo o dashboard "Qualidade de Código" é constante literal, e várias constantes são **verificavelmente falsas** contra o próprio repositório:

| Métrica exibida | Valor hardcoded | Valor real medido |
|---|---|---|
| `anyUsageCount` (`:189`) | `0` | 4 ocorrências de `: any` em `src/` |
| `totalPages` (`:159`) | `30` | 57 arquivos em `src/pages/` |
| `edgeFunctions` (`:160`) | `18` | 34 diretórios em `supabase/functions/` |
| `lighthouseScore` (`:166`) | `85` | não medido |
| `typeSafetyScore` (`:187`) | `99.8` | não medido |
| `buildStatus` (`:188`) | `'passing'` | não medido |
| `TEST_FILES` (`:69-80`) | lista fixa de 11 arquivos | não enumerado |
| `COMPONENT_METRICS` (`:114-130`) | `linesOfCode` inventados por componente | não contado |

Nenhuma chamada a `supabase`, nenhuma leitura de arquivo, nenhuma telemetria. É uma tela que afirma ao gestor que a qualidade do código está em 99,8%. **Classificação correta: 🟦 (fachada).**

### 8. `/master-api` — lote 10

`src/pages/MasterAPIPage.tsx`: `grep -n "supabase|api_keys|invoke"` → **zero resultados** em 234 linhas.

- `:29` — `useState('sk_live_fast_9283749123847')`: uma chave de API fictícia hardcoded, exibida como "Credenciais Master" com botão de copiar.
- `:37-41` — `ENDPOINTS` é um array literal descrevendo `/api/v1/jobs`, `/api/v1/inventory` etc., que não correspondem à edge function real do ERP (`supabase/functions/erp-api/`).
- `:202-216` — exemplo de código apontando para `https://api.fastgravacoes.com/v1/jobs`.
- Badge "Sistemas Operantes" com pulso verde, estático.

Não há geração, rotação, revogação ou persistência de chave. **Classificação correta: 🟦 (fachada).**

### 9. `/digital-twin` — lote 10

`src/components/digital-twin/FactoryFloorMap.tsx` puxa máquinas e jobs reais (`:55`), mas dentro de um `setInterval` (`:85-95`) fabrica a telemetria:

```
load:       hasJob ? Math.floor(Math.random() * 20) + 80 : 0
temp:       hasJob ? Math.floor(Math.random() * 20) + 45 : 30
efficiency: hasJob ? Math.floor(Math.random() * 10) + 90 : 0
```

Carga, temperatura e eficiência por máquina são ruído aleatório apresentado como leitura ao vivo do chão de fábrica — e sempre num intervalo "saudável" (80–100% de carga, 45–65 °C, 90–100% de eficiência). Os painéis irmãos são honestos (`SupplyChainPanel.tsx:19` lê `inventory_items`; `DigitalTwin.tsx:25-26` usa `useKPIs`/`useEnergy` reais). **Classificação correta: 🟨** — o mapa, que é o elemento central da página, tem dado fictício no caminho.

---

## Taxa de erro medida

| | |
|---|---|
| Universo de linhas ✅ nos lotes 05/06/07/09/10 | 276 |
| Itens amostrados e verificados linha a linha | **30** |
| **PROCEDE** (o ✅ resiste ao ataque) | **21** |
| **DERRUBADO** (deveria ser 🟨 ou 🟦) | **9** |
| **Taxa de erro medida na amostra** | **30,0 %** (9/30) |

Distribuição das derrubadas por lote e severidade:

| Lote | Amostrados | Derrubados | Taxa | Severidade |
|---|---|---|---|---|
| 05 — Operadores/Turnos | 7 | 0 | 0 % | — |
| 06 — Auth/Segurança | 7 | 0 | 0 % | — |
| 07 — Admin/Integrações | 9 | 3 | 33 % | 3× 🟨 |
| 09 — Conhecimento/IA | 4 | 0 | 0 % | — |
| 10 — UX Transversal | 9 (*) | 6 | 67 % | 3× 🟦, 3× 🟨 |

(*) inclui os 3 itens da tabela de rotas verificados sob o critério de fio completo.

**Leitura do resultado.** A qualidade da auditoria original é **fortemente heterogênea**:

- Os lotes **05, 06 e 09** resistiram a 18 ataques sem uma única derrubada. As afirmações de segurança em particular (MFA/AAL, lockout, RLS anti-escalada, CORS, rate limit, reset de senha) foram verificadas até a migration e todas conferem — inclusive contradizendo corretamente achados desatualizados do `ANALISE_TECNICA_SISTEMA.md`.
- O lote **07** erra por **ignorar o consumidor**: marca ✅ features cujo dado é gravado mas nunca lido/aplicado (`blocked_ips`, `query_telemetry`, `app-settings-*`). O padrão é sempre o mesmo — CRUD completo, efeito ausente.
- O lote **10** é o ponto fraco, exatamente como suspeitado: erra por confundir **"montado/roteado" com "funciona"** (providers, i18n) e por **não abrir as páginas de vitrine** (`/code-quality`, `/master-api`, `/digital-twin`), que são fachadas com dado inventado. Contém também um erro factual puro (colisão de nomes em `useFeatureFlags`).

Extrapolação prudente: aplicando a taxa por lote ao universo de 276 linhas ✅, estima-se entre **55 e 85 linhas ✅ indevidas**, com a esmagadora maioria concentrada no lote 10.

---

## Limitações

1. **Sem runtime, sem banco, sem produção.** Nada aqui descreve comportamento observado em execução. Todas as afirmações derivam de leitura de código, de `supabase/migrations/*.sql` e de grep. Se uma migration foi aplicada, se uma tabela tem linhas, se uma edge function está deployada, se um cron está ativo: **NAO_VERIFICADO**.
2. **Amostra, não censo.** 30 de 276 linhas ✅ (10,9%). A amostra foi **deliberadamente enviesada** para os itens mais ambiciosos, o que tende a **superestimar** a taxa de erro se os itens simples forem mais confiáveis — e o resultado por lote sugere que são. A taxa de 30% é o pior caso da fatia mais arriscada, não a média do documento.
3. **"Sem consumidor" é limitado ao repositório.** Chamadas por URL direta, dashboards externos, jobs de CI, `pg_cron` criado manualmente no painel do Supabase ou clientes de terceiros não apareceriam nos greps. As afirmações de orfandade (`rate-limit-check`, `external-db-bridge`, `app-settings-*`) valem **dentro deste repositório**.
4. **Critério de ✅ para tabelas de rota.** A tabela de rotas do lote 10 usava um critério mais estreito que o do enunciado. As 3 derrubadas ali são explicitamente contra o critério de fio completo e estão sinalizadas como tal; sob o critério estreito daquela tabela, as três seriam PROCEDE.
5. **Não reauditei os lotes 01–04, 08, 11–14**, nem as linhas 🟨/🟦 dos lotes no escopo (o alvo eram os ✅). Um ✅ ausente onde deveria existir — falso negativo — não é medido por esta meta-auditoria.
6. **Nenhum arquivo do repositório foi modificado.** A única escrita desta sessão é este documento.
