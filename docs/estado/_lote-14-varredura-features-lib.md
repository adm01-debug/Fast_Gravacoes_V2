# Lote 14 — Varredura de features, hooks e lib não citados

> Auditoria de estado do repositório `fast-grava-es-v2`. Escopo: os **147 arquivos fora de
> `src/components/`** que nenhum dos 12 lotes anteriores citou como evidência (lista em `/tmp/sweepB.txt`).
> Data: 2026-08-16.
>
> Regras aplicadas: os `.md` do repositório são **hipótese, não fonte**. Sem acesso a runtime ou banco —
> tudo que depende de execução está marcado `NAO_VERIFICADO`. Nenhum arquivo existente foi modificado.
> Toda afirmação carrega evidência `caminho:LINHA` conferida neste repositório.

**Legenda**

| | Significado |
|---|---|
| ✅ | IMPLEMENTADO_TOTAL — cadeia UI→hook→serviço→banco fechada, com consumidor real |
| 🟨 | PARCIAL — funciona, mas falta peça, tem atalho, ou o dado exibido não é o que o rótulo promete |
| 🟦 | SUGERIDO_OU_INICIADO — código existe e é honesto sobre ser demo/config, ou backend existe sem UI |
| ⬛ | MORTO_OU_ABANDONADO — sem chamador em produção (grep de prova incluído) |

---

## Método e cobertura

Três varreduras automatizadas sobre os 147 arquivos, todas rodadas em `/home/user/fast-grava-es-v2`:

1. **Consumidor por caminho** — para cada arquivo, `grep -rl "@/caminho/modulo"` em `src/`, excluindo o
   próprio arquivo, `*.test.*` e `*.spec.*`.
2. **Consumidor por símbolo** — a varredura (1) produziu falsos positivos em módulos importados por
   caminho relativo (`./abc`, `../transitions`). Refiz por *basename* + nome do símbolo exportado.
   Isso **derrubou** duas suspeitas iniciais: `src/hooks/abc/**` está vivo via
   `src/hooks/useABCCosts.ts:4`, e `src/lib/transitions/index.ts` está vivo via
   `src/components/layout/PageTransition.tsx:8`, `src/contexts/TransitionConfigContext.tsx:13` e
   `src/routes/AppRoutes.tsx:7`.
3. **Export a export** — para cada `export const|function|class` dos arquivos de `src/hooks/` e
   `src/lib/` da lista, contagem de referências fora do próprio arquivo, separando produção de teste.

Cobertura por área da lista (147 arquivos):

| Área | Arquivos | Situação após varredura |
|---|---|---|
| `src/features/packaging/**` | 25 | Todos com consumidor. Inventário funcional na seção seguinte |
| `src/features/analytics/components/{bi,oee,efficiency,energy,spc}/**` | 38 | Todos com consumidor; 3 achados de dado fictício |
| `src/features/{admin,maintenance,auth,jobs,production,notifications}/**` | 33 | 2 mortos |
| `src/hooks/**` | 17 | 0 arquivos mortos; 9 exports mortos |
| `src/lib/**` | 14 | 0 arquivos mortos; 7 exports mortos |
| `src/pages/`, `src/test/` | 5 | Todos referenciados (`src/test/setup.ts` via `vitest.config.ts:27`) |
| `supabase/functions/_shared/**` + `external-db-bridge` | 7 | 1 script órfão, 3 schemas mortos |

**O que NÃO foi verificado:** nada foi executado. Não rodei `npm run test`, `build` ou `lint` neste lote;
não houve acesso a Supabase. Portanto: se um `INSERT` funciona, se uma policy RLS permite a operação, se
uma RPC existe no banco de produção (e não só na migration), e se qualquer job de cron está agendado —
tudo isso é **NAO_VERIFICADO**.

---

## Módulo packaging — inventário funcional

**Veredicto do fio: o fluxo de embalagem FECHA ponta a ponta.** Rota → página → hook → serviço →
tabela existe e é real, com gatilhos de banco reforçando as regras. É o módulo mais bem construído
entre os que eu vi neste lote — o problema dele não é abandono, é **um dado inventado sendo gravado
no banco** e **backend construído sem UI**.

**Cadeia verificada:**
`src/routes/AppRoutes.tsx:189-190` (rotas `/packaging` e `/packaging/kiosk`, `allowedRoles`
`coordinator|manager|operator`) → `src/pages/PackagingDashboard.tsx:3-21` e
`src/pages/PackagingKioskPage.tsx:7-11` → hooks em `src/features/packaging/hooks/` →
`src/features/packaging/services/packagingService.ts:59-208` → tabelas Postgres.

**Tabelas / RPC que o módulo usa (todas com migration no repo):**

| Objeto | Migration | Consumidor no front |
|---|---|---|
| `packaging_tasks` | `supabase/migrations/20260723125433_...sql:26` | `packagingService.ts:62,84,101,117,135,143` |
| `packaging_defects` | `...20260723125433_...sql:96` | `packagingService.ts:158,170` |
| `packaging_settings` | `...20260723125433_...sql:167` | `usePackagingSettings.ts:35` |
| `packaging_checklist_items` | `...20260723150514_...sql:3` | `usePackagingChecklist.ts:38` |
| `packaging_task_checklist` | `...20260723150514_...sql:34` | `usePackagingChecklist.ts:53,91` |
| `packaging_sla_overrides` | `...20260723162822_...sql` | `usePackagingSlaOverrides.ts:52,82,85,94` |
| `audit_log` | (pré-existente) | `usePackagingAuditTimeline.ts:36` |
| `get_packaging_leaderboard()` | `...20260802113515_...sql:5` | `PackagingLeaderboard.tsx:18` |

**Automação server-side existente** (não verificada em runtime): criação automática de tarefa quando o
job termina (`...20260723125433_...sql:209-230`), criação de shipment ao ficar pronto
(`...20260723142509_...sql:3-32`), abertura de job de retrabalho ao registrar defeito
(`...20260723144856_...sql:9-72`), notificações (`...20260723150905_...sql:3-95`), auditoria
(`...20260723150957_...sql:3-13`) e bloqueio de envio com checklist obrigatório pendente
(`...20260723150514_...sql:77-118`).

**RLS:** as policies de packaging são segmentadas por papel, não `USING true` —
`...20260723125433_...sql:55` (staff), `:69` (operador vê não-atribuídas ou próprias), `:77` (operador
atualiza só as próprias), `:121/:135/:147` (defeitos). Isso **contraria** a hipótese genérica de RLS
permissiva do `ANALISE_TECNICA_SISTEMA.md` para este módulo. (Efeito real em produção: NAO_VERIFICADO.)

### Tabela funcional

| Funcionalidade | Classificação | Evidência arquivo:LINHA | O que falta |
|---|---|---|---|
| Fila de tarefas + realtime | ✅ | `src/features/packaging/hooks/usePackagingQueue.ts:7-13` (query + `useRealtimeChannel('packaging-tasks-changes')`); render em `components/PackagingQueueList.tsx:40` via `pages/PackagingDashboard.tsx:5` | — |
| Assumir tarefa (lock otimista) | ✅ | `services/packagingService.ts:95-106` — `.or('assigned_to.is.null,assigned_to.eq.<uid>')` | Não confere linhas afetadas; se outro operador pegou antes, o toast de sucesso em `hooks/usePackagingTask.ts:36` mente. Corrida real: NAO_VERIFICADO |
| Troca de status + motivo de atraso | ✅ | `services/packagingService.ts:124-139`; diálogo em `components/DelayReasonDialog.tsx`; categorias em `types/packaging.schema.ts:111-119` | — |
| Registro de embalagem (tipo, nº pacotes, peso, aprovados) | 🟨 | `services/packagingService.ts:141-154`; form em `components/PackagingRegisterForm.tsx:23-109` | **Botão "Ler balança" grava peso inventado — ver achado P1 abaixo** |
| Triagem de defeito + foto obrigatória | ✅ | `types/packaging.schema.ts:57-78` (`superRefine` exige foto se `critical` ou `rework`); grava em `services/packagingService.ts:166-195`; upload em `:197-208` | Incremento de `rejected_quantity` é read-modify-write no cliente (`:183-194`), sem transação — sujeito a *lost update* |
| Checklist de conferência | ✅ | `hooks/usePackagingChecklist.ts:38,53,91`; UI `components/PackagingChecklistPanel.tsx`; **bloqueio no banco** `supabase/migrations/20260723150514_...sql:77-118` | — |
| SLA (cálculo, badge, alertas) | ✅ | `hooks/usePackagingSettings.ts:61-127` (`computeSla`); badge `components/SlaBadge.tsx`; painel `components/PackagingSlaAlerts.tsx:12-54` | Lógica duplicada: o banco tem `packaging_task_sla_status()` em `...20260723150259_...sql:9` que **ninguém chama** (ver ⬛ abaixo). Duas fontes de verdade para SLA |
| Overrides de SLA por cliente/técnica | ✅ | CRUD completo `hooks/usePackagingSlaOverrides.ts:52,82,85,94`; UI `components/PackagingSlaOverridesManager.tsx` (329 linhas); resolução em `usePackagingSettings.ts:67-86` | — |
| Badge de atrasadas na sidebar | 🟨 | `hooks/usePackagingOverdueCount.ts:39-45`, consumido em `src/components/layout/AppSidebar.tsx:25` | Baixa **todas** as tarefas abertas a cada 60 s (`:34`) e filtra no cliente — sem `limit`, sem contagem no servidor. E `catch { return 0 }` em `:46-48` esconde falha: erro vira "0 atrasadas" |
| Reatribuição em massa | ✅ | `services/packagingService.ts:114-122`; UI `components/BulkReassignDialog.tsx`; lista de destinatários `hooks/usePackagingAssignees.ts:22` | `bulkAssign` retorna `taskIds.length` (`:121`), não linhas realmente afetadas |
| Dashboard de qualidade + Pareto de atrasos | ✅ | `hooks/usePackagingQuality.ts:35-36`; `hooks/usePackagingDelayPareto.ts:24`; UI `components/PackagingQualityDashboard.tsx`, `components/PackagingDelayParetoCard.tsx` | — |
| Heatmap de SLA / throughput por operador | ✅ | `hooks/usePackagingSlaHeatmap.ts:40`; `hooks/usePackagingThroughput.ts:33,76` | — |
| Timeline de auditoria da tarefa | ✅ | `hooks/usePackagingAuditTimeline.ts:25,26,36`; UI `components/PackagingAuditTimeline.tsx` | — |
| Etiqueta térmica | ✅ | `components/PackagingThermalLabel.tsx:38-60` (`window.open` + `w.print()`) | Impressão real: NAO_VERIFICADO |
| Leaderboard | ✅ | `components/PackagingLeaderboard.tsx:18` chama RPC `get_packaging_leaderboard`, definida em `...20260802113515_...sql:5` | Cast `as any` desnecessário — ver achado P2 |
| Quiosque de chão de fábrica | ✅ | `src/pages/PackagingKioskPage.tsx:7-11`, rota em `AppRoutes.tsx:190` | — |
| `packaging_waste` (tabela) | 🟦 | Criada em `...20260802113432_...sql:3`; zero referência em `src/` fora de `types.ts` | Nenhuma UI, nenhum hook. Backend sem consumidor |
| `packaging_equipment` (tabela) | 🟦 | Criada em `...20260802113515_...sql:92`; zero referência em `src/` fora de `types.ts` | Idem |
| `get_packaging_manifest()` (RPC) | ⬛ | `...20260802113432_...sql:20` e `...20260802113515_...sql:60`; `grep -rl get_packaging_manifest src/ supabase/functions/` → só `src/integrations/supabase/types.ts` | Sem chamador |
| `auto_reassign_stale_packaging_tasks()` (RPC) | ⬛ | `...20260802113515_...sql:36`; `grep -rn "cron.schedule" supabase/migrations/` → **zero ocorrências no repo inteiro**; sem chamador em `src/` nem em edge function | Nunca agendada, nunca chamada |
| `packaging_task_sla_status()` (função SQL) | ⬛ | `...20260723150259_...sql:9`; sem chamador em `src/` nem em `supabase/functions/` | Substituída de fato por `computeSla` no cliente |

### Achado P1 (grave) — peso de balança inventado é persistido

`src/features/packaging/components/PackagingRegisterForm.tsx:80-89`:

```ts
onClick={async () => {
  if (onScaleWeight) {
    const weight = await onScaleWeight();
    form.setValue('total_weight_kg', weight);
  } else {
    // Mock para demonstração se não houver handler real
    const mockWeight = Number((Math.random() * 50).toFixed(2));
    form.setValue('total_weight_kg', mockWeight);
    toast.success(`Peso capturado: ${mockWeight}kg (Simulação)`);
  }
}}
```

A prop `onScaleWeight` **nunca é passada por ninguém**:

```
$ grep -rn "onScaleWeight" src/
src/features/packaging/components/PackagingRegisterForm.tsx:16      (declaração da prop, opcional)
src/features/packaging/components/PackagingRegisterForm.tsx:23      (destructuring)
src/features/packaging/components/PackagingRegisterForm.tsx:81,82   (uso interno)
```

O único ponto de montagem é `src/features/packaging/components/PackagingTaskDetail.tsx:102-106`, que
passa apenas `received`, `submitting` e `onSubmit`. Logo o ramo `else` é o **único** caminho executável:
todo clique em "Ler balança" gera `Math.random() * 50` e o valor cai em `total_weight_kg` via
`services/packagingService.ts:147`. O rótulo "(Simulação)" some assim que o toast fecha; o número
fica no banco indistinguível de uma pesagem real e alimenta qualquer relatório de peso a jusante.

### Achado P2 — o *workaround* de tipos do packaging está obsoleto

`src/features/packaging/services/packagingService.ts:10-31` declara:

```ts
// Supabase generated types don't include the new packaging tables yet.
```

e monta `type UntypedSupabase` para contornar. **A premissa é falsa hoje.** As tabelas estão nos tipos
gerados: `src/integrations/supabase/types.ts:2762` (`packaging_checklist_items`), `:2795`
(`packaging_defects`), `:2875` (`packaging_settings`), `:2914` (`packaging_sla_overrides`), `:2967`
(`packaging_task_checklist`), `:3018` (`packaging_tasks`), e a RPC em `:6028`
(`get_packaging_leaderboard`). O mesmo cast reaparece em `hooks/usePackagingSettings.ts:26-34` e
`hooks/usePackagingOverdueCount.ts:38`, e há um `as any` redundante em
`components/PackagingLeaderboard.tsx:18`. Resultado: o módulo inteiro opera sem checagem de tipo
contra o schema, por um motivo que não existe mais.

---

## Hooks e lib sem consumidor real (⬛)

**Nenhum arquivo inteiro de `src/hooks/` ou `src/lib/` da lista está morto.** As duas suspeitas
iniciais (`src/hooks/abc/**` e `src/lib/transitions/`) caíram na varredura por símbolo — ambas são
importadas por caminho relativo. O que está morto é mais granular: **exports individuais**.

| Módulo | Arquivo:LINHA | Só usado por teste? | Prova (grep) |
|---|---|---|---|
| `useHapticButton` | `src/hooks/use-haptic-feedback.tsx:57` | Não — nem teste | `grep -rlE "\buseHapticButton\b" src/` → só o próprio arquivo |
| `useHapticInteraction` | `src/hooks/use-haptic-feedback.tsx:75` | Não — nem teste | idem |
| `useDebouncedCallback` | `src/hooks/useDebounce.ts:53` | Não — nem teste | `grep -rlE "\buseDebouncedCallback\b" src/` → só o próprio arquivo |
| `useDebouncedState` | `src/hooks/useDebounce.ts:138` | Não — nem teste | idem |
| `useDebounceWithLoading` | `src/hooks/useDebounce.ts:165` | Não — nem teste | idem |
| `useSearchDebounce` | `src/hooks/useDebounce.ts:208` | Não — nem teste | idem |
| `useFuseSearchWithDetails` | `src/hooks/useFuseSearch.ts:69` | Não — nem teste | `grep -rlE "\buseFuseSearchWithDetails\b" src/` → só o próprio arquivo |
| `createFuseInstance` | `src/hooks/useFuseSearch.ts:112` | Não — nem teste | idem |
| `highlightMatches` | `src/hooks/useFuseSearch.ts:134` | Não — nem teste | idem |
| `showSuccessToast` | `src/lib/errorHandling.ts:221` | Não — nem teste | `grep -rlE "\bshowSuccessToast\b" src/` → só o próprio arquivo |
| `withErrorHandling` | `src/lib/errorHandling.ts:231` | Não — nem teste | idem |
| `isErrorCode` | `src/lib/errorHandling.ts:274` | Não — nem teste | idem |
| `prefetchRoutes` | `src/lib/prefetch.ts:67` | Não — nem teste | `grep -rlE "\bprefetchRoutes\b" src/` → só o próprio arquivo |
| `getPrefetchHandler` | `src/lib/prefetch.ts:74` | Não — nem teste | idem |
| `isRoutePrefetched` | `src/lib/prefetch.ts:81` | Não — nem teste | idem |
| `sanitizeControlChars` | `src/lib/sanitize.ts:67` | **SIM** | `grep -rlE "\bsanitizeControlChars\b" src/ \| grep -v test` → vazio; único consumidor é `src/test/sanitize.test.ts` |
| `NotificationSettings` (tipo) | `src/features/notifications/types/index.ts:18` | Não — nem teste | `grep -rlE "\bNotificationSettings\b" src/` → só o próprio arquivo e o barrel |
| `useDashboardSettings` (hook inteiro) | `src/features/admin/hooks/useDashboardSettings.ts:4` | Não — nem teste | `grep -rn "useDashboardSettings" src/` → apenas `src/features/admin/index.ts:13` (reexport de barril, ninguém importa) |
| `AuditTrailDrawer` (componente inteiro, 97 linhas) | `src/features/admin/components/audit/AuditTrailDrawer.tsx:22` | Não — nem teste | `grep -rn "AuditTrailDrawer" src/` → só as 3 linhas do próprio arquivo (`:14`, `:22`, `:28`). Nem barril o exporta |

Observação sobre `useDashboardSettings`: ele lê `business_config` filtrando `key ILIKE '%threshold%'`
(`src/features/admin/hooks/useDashboardSettings.ts:9-11`) para obter limiares de OEE do banco. Ou seja,
existia a intenção de tornar os limiares configuráveis — e ela morreu. Hoje o limiar vive hardcoded em
`src/features/production/hooks/useOEE.ts:151` (`WORLD_CLASS_OEE = 85`) e em
`src/features/analytics/constants/oee.ts:22-28`.

**Falsos positivos corrigidos (não são mortos):**
`src/hooks/abc/*` → vivo por `src/hooks/useABCCosts.ts:4,36`.
`src/lib/transitions/index.ts` → vivo por `src/components/layout/PageTransition.tsx:8`.
`src/lib/schemas/auditLog.ts` → vivo e **de fato validando**: `auditLogEntrySchema.safeParse(row)` em
`src/features/admin/hooks/useAuditTrail.ts:49` e `auditChainVerificationSchema.parse(row)` em `:101`.
`src/test/assertNonNull.ts` e `src/test/realtimeMock.ts` são helpers de teste por desenho (4 specs cada);
`src/test/setup.ts` é referenciado por `vitest.config.ts:27`.

---

## Analytics BI/OEE — dado fictício

`grep -rn "Math.random()" src/features/analytics/components/oee/` → **zero ocorrências**. Os gráficos de
OEE são todos presentacionais e recebem dados por props, derivados de jobs reais em
`src/features/production/hooks/useOEE.ts` (ex.: `byShift` em `:293-314` particiona jobs reais por hora de
início; `byStudio` em `:339`; `byMaterial` em `:394`). **Não encontrei métrica de OEE inventada.**

O que encontrei foi outra coisa: **três números apresentados como medição que não medem nada.**

| Achado | Classificação | Evidência arquivo:LINHA | Por que é fictício |
|---|---|---|---|
| "Confiança do Modelo" da previsão de KPI | 🟨 | Exibido em `src/features/analytics/components/bi/executive/KPIOverviewTab.tsx:353` e `:355`; origem em `src/features/analytics/hooks/useKPIs.ts:328` — `confidence: 0.9 - (i * 0.05)` | É uma reta decrescente fixa (90 %, 85 %, 80 %…), sem qualquer relação com variância, amostra ou erro do modelo. O rótulo promete estatística; o valor é uma constante disfarçada. Agrava: quando não há previsão, `KPIOverviewTab.tsx:353` faz `|| 90` — o fallback exibe "90 %" de confiança sobre nenhum dado |
| "Última atualização" do BI futurista | 🟨 | `src/features/analytics/components/bi/FuturisticBI.tsx:48-55` — `setInterval(… if (Math.random() > 0.8) setLastUpdated(new Date()) …, 30000)` | O timestamp de frescor é atualizado por sorteio (≈20 % de chance a cada 30 s), sem qualquer refetch acontecendo. É um indicador de frescor descolado do dado |
| Badge "Análise em Tempo Real" | 🟨 | `src/features/analytics/components/oee/MaterialEfficiencyChart.tsx:36-38` | Texto estático dentro de um card cujos dados chegam por prop de uma query com `staleTime`. Nada no componente é tempo real |

**Constantes de negócio (não são fictícias, mas são hardcoded):**

| Item | Classificação | Evidência |
|---|---|---|
| Benchmarks de indústria (World Class 85, Têxtil 65…) | 🟦 | `src/features/analytics/constants/oee.ts:22-28` — configuração declarada, honesta; consumida em `src/pages/OEEDashboard.tsx:60` |
| Lista de Studios | 🟨 | `src/features/analytics/constants/oee.ts:13-20` e, duplicada, `src/features/production/hooks/useOEE.ts:154-156` (`STUDIOS_MAP`). Mapeamento studio→técnica fixo no código, não no banco — duas cópias podem divergir |
| Turnos (Manhã/Tarde/Noite, faixas 7–15 / 15–23 / resto) | 🟨 | `src/features/production/hooks/useOEE.ts:300-302,308` — regra de turno codificada, não lida de tabela |
| Peças/hora e valor de peça em insights de IA | 🟨 | `src/features/analytics/components/bi/BIAIInsights.tsx:55` (`avgPiecesPerHour = 52`), `:56` (`toDoJobs * 85`); `src/features/analytics/components/bi/BIPredictiveROI.tsx:15` (`avgPieceValue = 15.5`) | Números de negócio chumbados que viram texto de recomendação e cifra de ROI |

**Ponto positivo:** `src/features/analytics/hooks/useKPIs.ts:318-320` traz o comentário
*"Flat rolling-average forecast — no sinusoidal noise that would fabricate a meaningful pattern from a
fixed mathematical function"* e o código honra isso (`estimatedVolume: Math.round(dailyAvgPieces)` em
`:326`). Alguém já removeu uma fabricação parecida antes; só esqueceu o `confidence` logo abaixo.

Todos os 38 componentes de `bi/`, `oee/`, `efficiency/`, `energy/` e `spc/` da lista têm consumidor real
(páginas `BIDashboard`, `OEEDashboard`, `KPIDashboard`, `ExecutiveDashboard`, `EfficiencyDashboard`,
`EnergyDashboard`, `SPCDashboard` ou o barril `src/features/analytics/index.ts`). **Zero mortos nessa área.**

---

## `_shared` das edge functions — quem importa o quê

| Helper | Classificação | Importadores | Evidência |
|---|---|---|---|
| `cors.ts` | ✅ | **31** functions | `approve-password-reset`, `erp-api`, `webhook-handler`, `pdf-generator`, `bitrix24-sync`, … (`grep -rl "_shared/cors.ts" supabase/functions/`) |
| `cronAuth.ts` | ✅ | **13** functions | `calculate-rankings`, `auto-promote-jobs`, `cron-cleanup`, `backup-scheduler`, `metrics-collector`, … |
| `logger.ts` | ✅ | 8 functions | `erp-api`, `health-check`, `health-monitor`, `ml-predictions`, `webhook-handler`, … |
| `rateLimit.ts` | ✅ | 6 functions | `rate-limit-check`, `check-login-lockout`, `validate-login-ip`, `create-operator`, `approve-password-reset`, `webhook-handler` |
| `htmlEscape.ts` | ✅ | 5 functions | `cron-alert-email`, `new-device-alert`, `send-email-report`, `send-loss-risk-alert`, `send-tpm-email` — **e são exatamente as 5 únicas functions que montam HTML** (`grep -rln "<html\|<body\|<div" supabase/functions/*/index.ts` retorna as mesmas 5). Cobertura completa; nenhum corpo de e-mail interpola sem escape |
| `contracts.ts` | ✅ | 4 (2 functions + 2 testes) | `supabase/functions/erp-api/index.ts`, `supabase/functions/webhook-handler/index.ts`, `src/test/erpApiContracts.test.ts`, `src/test/webhookSimulation.test.ts` |
| `validate.ts` (`parseOrError`) | 🟨 | **2 de ~31** functions | Só `approve-password-reset/index.ts` e `ml-predictions/index.ts`. O cabeçalho em `supabase/functions/_shared/validate.ts:1-10` vende um "formato uniforme de 400 em toda function"; a adoção parou em duas |
| `validation.ts` (schemas) | 🟨 | 2 functions | `mlPredictionPayloadSchema` → `ml-predictions`; `approvePasswordResetSchema` → `approve-password-reset`. Os outros três estão mortos (abaixo) |
| `test-utils.ts` | 🟦 | 1 teste | `supabase/functions/webhook-handler/index.test.ts`. Helper de teste por desenho — não é código morto, mas serve a um único spec |

**Mortos em `_shared`:**

| Símbolo | Arquivo:LINHA | Prova |
|---|---|---|
| `webhookPayloadSchema` | `supabase/functions/_shared/validation.ts:3` | `grep -rl webhookPayloadSchema supabase/ src/` → só o próprio arquivo. Ironia: `webhook-handler` existe e importa `contracts.ts`, mas não este schema |
| `bitrix24DataSchema` | `supabase/functions/_shared/validation.ts:11` | idem |
| `stripeDataSchema` | `supabase/functions/_shared/validation.ts:17` | idem — e não há nenhuma integração Stripe no repositório |

**Script órfão:**

| Item | Classificação | Evidência |
|---|---|---|
| `supabase/functions/external-db-bridge/validate_contract.ts` | ⬛ | 69 linhas, chama `testBridge()` no topo do módulo (`:69`) e faz `Deno.exit(1)` em falha (`:66`). `grep -rn "validate_contract" supabase/ src/ package.json` → **nenhuma referência**. Não está em `package.json` scripts, não está em CI, e `vitest.config.ts` exclui `supabase/functions/**`. É um validador de contrato que ninguém executa — o pior lugar para um teste estar |

---

## Outros achados

**⬛ `AuditTrailDrawer.tsx` — 97 linhas de UI de auditoria sem nenhuma porta de entrada.**
`src/features/admin/components/audit/AuditTrailDrawer.tsx:22`. O grep completo retorna apenas as três
linhas do próprio arquivo. O agravante é que ele é o único consumidor "seu" de nada — os componentes que
ele monta (`AuditEntryCard`, `HistoryPeriodFilter`) estão vivos por outros caminhos
(`src/components/jobs/JobDetailsModal.tsx`, `src/components/machines/MachineDetailsModal.tsx`,
`src/pages/AuditTrailPage.tsx`, `src/pages/MachinesPage.tsx`). Ou seja: alguém extraiu o drawer,
plugou as peças direto nas telas, e esqueceu de apagar o drawer.

**🟦 `VirtualSensorPanel` é 100 % sintético — e é honesto sobre isso.**
`src/features/maintenance/components/VirtualSensorPanel.tsx:33-42` gera vibração, temperatura, potência e
velocidade com `Math.random()` a cada 2 s, e é montado em produção (`src/pages/TPMDashboard.tsx:32,331`).
**Mas** o card se identifica: `:70` "Telemetria (Simulação)" e `:74` "Demo — sem sensor real", com
comentário explicativo em `:17`. Classifico 🟦 e não ⬛/🟨 justamente por isso — é o contraste que expõe
o achado P1 do packaging: lá o número simulado **vai para o banco**; aqui ele fica na tela e diz o que é.

**🟨 Três implementações de feedback sonoro convivendo.**
`src/features/packaging/hooks/useSoundFeedback.ts:16-30` (oscilador Web Audio próprio, chamado em
`src/features/packaging/components/PackagingRegisterForm.tsx:24,41,43`),
`src/lib/soundFeedback.ts:26,46` (singleton `SoundFeedback`, 6 consumidores) e
`src/hooks/useThemeSound.ts` (2 consumidores). Nenhuma das duas primeiras consulta preferência do
usuário antes de tocar — `playTone` em `src/lib/soundFeedback.ts:26-39` recebe volume por parâmetro e
toca; o hook do packaging instancia `AudioContext` direto (`:18`). Acessibilidade e "modo silencioso"
dependem de qual caminho o componente escolheu.

**🟨 `assignToMe` e `bulkAssign` não confirmam efeito.**
`src/features/packaging/services/packagingService.ts:100-105` e `:116-121` só checam `error`. Como o
`UPDATE` do PostgREST retorna sucesso mesmo afetando zero linhas (filtro `.or(...)` não casou, ou RLS
barrou silenciosamente), `hooks/usePackagingTask.ts:36` exibe "Tarefa assumida" em caso de disputa
perdida. Precisaria de `.select()` + contagem. Comportamento real sob concorrência: **NAO_VERIFICADO**.

**🟨 Erros engolidos viram zero.**
`src/features/packaging/hooks/usePackagingOverdueCount.ts:43` (`if (error) return 0`) e `:46-48`
(`catch { return 0 }`). O badge da sidebar não distingue "nenhuma atrasada" de "a consulta falhou".

**Zero ocorrências de `TODO` / `FIXME` nos diretórios-alvo.** O grep
`grep -rniE "TODO|FIXME" src/features/packaging src/features/analytics/components/{bi,oee}
src/features/maintenance/components/execution src/features/admin/components/audit src/hooks src/lib
supabase/functions/_shared` só retornou falsos positivos de português (`toDoJobs`, "Todos os Studios").
Isso significa que **o débito técnico deste lote não está sinalizado no código** — nada avisa o próximo
desenvolvedor sobre o peso falso ou sobre o drawer órfão.

---

## Limitações

1. **Runtime = NAO_VERIFICADO.** Nada foi executado neste lote: nem `npm run test`, nem `build`, nem
   `lint`, nem qualquer chamada a Supabase. Toda afirmação é análise estática do repositório.
2. **Banco = NAO_VERIFICADO.** A existência de uma migration no repo **não** prova que o objeto existe no
   banco de produção, nem que foi aplicada. Vale para as 6 tabelas e 5 funções de packaging citadas.
3. **RLS = NAO_VERIFICADO.** Li o texto das policies; não testei se um operador real consegue ou não
   executar cada operação.
4. **Cron = NAO_VERIFICADO com ressalva forte.** `grep -rn "cron.schedule" supabase/migrations/` retorna
   **zero** no repositório inteiro. Isso prova que nenhum agendamento está versionado aqui — não prova
   que não exista agendamento criado manualmente no painel do Supabase. `auto_reassign_stale_packaging_tasks`
   está classificada ⬛ com base na ausência no repo.
5. **Detecção de morto por grep tem limite.** Não cobre chamadas dinâmicas (`import()` com string
   construída, acesso por índice em objeto de rotas, invocação via string em `supabase.rpc(variavel)`).
   Fiz busca por símbolo e por caminho, relativo e por alias, mas um consumo verdadeiramente dinâmico
   escaparia. Onde a busca por caminho e a busca por símbolo divergiram, prevaleceu a por símbolo — foi
   assim que `src/hooks/abc/**` e `src/lib/transitions/` saíram da lista de mortos.
6. **Escopo fechado nos 147 arquivos.** Alguns achados (`VirtualSensorPanel`, `FuturisticBI`,
   `BIAIInsights`, `useKPIs`, `useOEE`) são de arquivos **fora** da lista, alcançados por rastreamento a
   partir dela; estão em "Outros achados" e na seção de BI/OEE, e não contam na cobertura dos 147.
7. **Não avaliei qualidade visual, i18n, acessibilidade ou performance de render** — apenas existência,
   cadeia de dados, e veracidade do que é exibido.
