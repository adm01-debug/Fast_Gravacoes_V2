# Lote 05 — Operadores, Turnos e Gamificação

## Cobertura

Auditoria estática (leitura de código + grep). **Sem acesso a runtime, banco ou produção** — nenhuma
afirmação abaixo sobre "está em uso real", "a tabela tem dados" ou "o cron roda" foi verificada:
tudo isso é **NAO_VERIFICADO**.

Arquivos efetivamente lidos/verificados:

- `src/components/operators/**` (23 arquivos), `src/components/operator/**` (8), `src/components/shift/**` (6 + 2 subpastas), `src/components/calendar/**` (17), `src/components/kiosk/KioskMode.tsx`, `src/components/activity/ActivityLog.tsx`
- Páginas: `OperatorsPage`, `OperatorView`, `OperatorProductivityPage`, `OperatorHistoryPage`, `GamificationPage`, `KioskPage`, `ShiftHandoverPage`, `DailyCalendar`, `WeeklyCalendar`, `MonthlyCalendar`
- Hooks: `src/features/production/hooks/useOperator*.ts` (10), `src/hooks/useGamification.ts`, `src/hooks/shift-handover/*`, `src/hooks/useCalendar*.ts`
- Edge functions: `calculate-rankings`, `create-operator`, `update-operator`
- Migrations: DDL/RLS de `operator_*`, `shift_*`, `gamification_*`, `reward_redemptions`, `pre_production_checklists`, e varredura de `cron.schedule` em todo `supabase/migrations/`

Fora de escopo (outro lote): `PackagingKioskPage` e `src/features/packaging/**` (quiosque de embalagem),
`OEEShiftComparison` (analytics/OEE).

**Não existe no repositório**: nenhuma tabela `shifts`, `schedules`, `escalas`, `training_*` ou
`operator_trainings`. `grep -n "CREATE TABLE" supabase/migrations/*.sql` não retorna nenhum objeto
com esses nomes. "Treinamento" aparece apenas como **texto hardcoded** em
`src/components/operators/AIWorkforceAdvisor.tsx:17,22`.

## Inventário de funcionalidades

| Funcionalidade | Classificação | Evidência (arquivo:linha) | O que falta / observação |
|---|---|---|---|
| **CRUD de operadores — listagem** | ✅ IMPLEMENTADO_TOTAL | UI `src/pages/OperatorsPage.tsx:51`; hook `src/features/production/hooks/useOperators.ts:32-73`; DB `user_roles` + `profiles` (`supabase/migrations/20251213011430_d92f2ce9-7631-4a5c-87c8-74bd54d68ab5.sql:94,98`) | Operador = linha em `user_roles` com `role='operator'`, não tabela própria. |
| **Criar operador (edge function)** | ✅ IMPLEMENTADO_TOTAL | UI `src/components/operators/CreateOperatorModal.tsx:82`; EF `supabase/functions/create-operator/index.ts:117-138`; role default via trigger `handle_new_user` (`supabase/migrations/20251213011430_...sql:86,97-98`) | ⚠️ Divergência de validação: modal aceita senha ≥6 (`CreateOperatorModal.tsx:58-59`), EF exige ≥8 (`create-operator/index.ts:109`) → erro só no servidor. |
| **Editar operador (nome/telefone)** | ✅ IMPLEMENTADO_TOTAL | UI `src/components/operators/EditOperatorModal.tsx:78`; EF `supabase/functions/update-operator/index.ts:90-97` → `profiles` | `update-operator` não tem rate limit (ao contrário de `create-operator:47`). |
| **Ativar/desativar operador + auditoria** | ✅ IMPLEMENTADO_TOTAL | `useOperators.ts:126-173`; grava `user_roles.is_active` + `operator_status_audit` (`supabase/migrations/20251214122654_b50cd4de-c88a-47aa-9bed-83d063b0a227.sql:2`) | Auditoria é best-effort: falha só gera `logger.warn` (`useOperators.ts:153-155`). |
| **Remover operador** | ✅ IMPLEMENTADO_TOTAL | `useOperators.ts:75-124` (delete em `operator_machines` + `user_roles`, insert em `operator_status_audit`) | Deleta a role, não o usuário Auth. |
| **Histórico de auditoria de operador** | ✅ IMPLEMENTADO_TOTAL | UI `src/pages/OperatorsPage.tsx:681`; hook `src/features/production/hooks/useOperatorAudit.ts:15-30`; tabela `operator_status_audit` | — |
| **Atribuição operador↔máquina** | ✅ IMPLEMENTADO_TOTAL | UI `src/pages/OperatorsPage.tsx:683` (`MachineAssignmentModal`); hook `src/features/production/hooks/useOperatorMachines.ts:33-92`; tabela `operator_machines` (`supabase/migrations/20251214111919_d4d04242-a5d0-4954-8eb9-c7e9fa9b1abc.sql:2`) | Realtime via `useRealtimeChannel` (`useOperatorMachines.ts:52`). |
| **Presença online de operadores (realtime)** | 🟨 IMPLEMENTADO_PARCIAL | `src/features/production/hooks/useOperatorPresence.ts:66,71-79`; consumido em `src/pages/OperatorsPage.tsx:54` | Só canal Realtime Presence — **sem persistência**. `lastSeen` é `Map` em memória (`useOperatorPresence.ts:22`): zera a cada reload; quem entrou antes do mount nunca aparece em "visto por último". |
| **Competências / matriz de habilidades** | ✅ IMPLEMENTADO_TOTAL | UI `src/pages/OperatorsPage.tsx:503` (`SkillsMatrix`) e `:700` (`OperatorSkillsModal`); hook `src/features/production/hooks/useOperatorSkills.ts:16-79` (upsert/delete); tabela `operator_skills` (`supabase/migrations/20260512171232_b9a7467b-35d8-43ae-a337-e7cb30e29ccd.sql:9`) | Campos `certified_at`/`expires_at` existem e são gravados, mas **nenhum código alerta sobre certificação vencida** (grep por `expires_at` só retorna o hook e o modal). |
| **Crachá digital QR do operador** | 🟨 IMPLEMENTADO_PARCIAL | UI `src/pages/OperatorsPage.tsx:512-545` (gera `{id,name,type:'operator_badge'}`) | **Fio quebrado**: o único leitor do app rejeita esse payload — `src/components/qrcode/QRScanner.tsx:93` faz `if (data.type !== "job") → "QR Code inválido"`. `grep -rn "operator_badge" src/ supabase/` retorna **apenas** a linha que gera. Impressão via `window.print()` (`OperatorsPage.tsx:544`) funciona; o crachá é só papel. |
| **Metas de operador (CRUD)** | ✅ IMPLEMENTADO_TOTAL | UI `src/pages/OperatorProductivityPage.tsx:214` (`CreateGoalModal`) e `src/pages/OperatorsPage.tsx:603` (`OperatorGoalsTab`); hook `src/features/production/hooks/useOperatorGoals.ts:88-154`; tabela `operator_goals` (`supabase/migrations/20251214143433_eb7013ed-7514-4191-b4af-6fbb9c5f4887.sql:2`) | Progresso calculado no cliente (`useOperatorGoals.ts:197-235`), não persistido. |
| **Alertas de meta (widget)** | ✅ IMPLEMENTADO_TOTAL | UI `src/components/operators/GoalAlertsWidget.tsx:112`, montado em `src/pages/OperatorProductivityPage.tsx:132`; hook `src/features/notifications/hooks/useGoalAlerts.ts:34` | Também consumido por `NotificationIntegrator.tsx:153` e `KPIDashboard.tsx:80`. |
| **Produtividade por operador (métricas)** | ✅ IMPLEMENTADO_TOTAL | UI `src/pages/OperatorProductivityPage.tsx:31`; hook `src/features/production/hooks/useOperatorProductivity.ts:53-331`; fontes: `jobs`, `qr_scan_history` (`supabase/migrations/20251213123245_19ee8f21-2fc8-4b8b-bd1e-1f637b9fb7fc.sql:2`), `operator_machines` | Métricas derivadas em memória; nada persistido. |
| **Evolução diária / gráficos** | ✅ IMPLEMENTADO_TOTAL | `src/features/production/hooks/useOperatorEvolution.ts:56-192`; renderizado em `src/pages/OperatorProductivityPage.tsx:157` (`EvolutionChart`) e `:162` (`EfficiencyChart`) | Atribuição por `operator_id` com fallback para máquina (`useOperatorEvolution.ts:128-131`). |
| **Radar de produção do operador** | ✅ IMPLEMENTADO_TOTAL | `src/components/operators/ProductionRadarChart.tsx:9-13`; montado em `src/pages/OperatorProductivityPage.tsx:163` | Escalas arbitrárias (`totalJobsCompleted*10`, `totalScans*5`) mas derivadas de dado real. |
| **Exportar relatório de produtividade (PDF)** | ✅ IMPLEMENTADO_TOTAL | `src/pages/OperatorProductivityPage.tsx:65-70,98` → `src/lib/productivityReport.ts` (`generateProductivityReport`) | — |
| **"IA Workforce Advisor"** | 🟦 SUGERIDO_OU_INICIADO | `src/components/operators/AIWorkforceAdvisor.tsx:7-32` (array `insights` 100% literal: nomes de operador, %s, "+8.4% OEE"); montado em `src/pages/OperatorProductivityPage.tsx:137` | **Dado fictício**: cita "Ricardo Silva", "CNC 02", "Turno B" hardcoded. Badge "Recalcular" (`:72`) é um `<Badge>` sem `onClick`. Nenhuma chamada a `ml-predictions` nem a qualquer backend. |
| **Painel do operador (OperatorView)** | ✅ IMPLEMENTADO_TOTAL | `src/pages/OperatorView.tsx:49-51`; hook `src/features/production/hooks/useOperatorDashboardData.ts:14-30`; escreve via `updateJobOffline`/`useUpdateJobStatus` em `jobs` | Filtra por máquinas atribuídas quando `isOperator`. |
| **Timer de produção** | ✅ IMPLEMENTADO_TOTAL | `src/components/operator/ProductionTimer.tsx:15-16`; usado em `src/components/operator/OperatorProductionCard.tsx:45` | Contagem local a partir de `actual_start_time` do job. |
| **Checklist pré-produção** | ✅ IMPLEMENTADO_TOTAL | UI `src/pages/OperatorView.tsx:102` (`PreProductionChecklistModal`); persistência `src/components/operator/PreProductionChecklist.tsx:49-50,65-66` → `pre_production_checklists` (`supabase/migrations/20260317212106_5246a827-40e5-4db2-85b3-91621dd92ce8.sql:14`) | — |
| **Registro de produção (modal)** | ✅ IMPLEMENTADO_TOTAL | `src/components/operator/ProductionRegistrationModal.tsx:159,214`; usado em `OperatorView.tsx:101` e `KioskPage.tsx:131` | Upload de foto para Storage + update em `jobs`. |
| **Resumo de turno do operador / histórico rápido** | ✅ IMPLEMENTADO_TOTAL | `src/pages/OperatorView.tsx:126` (`ShiftSummaryCard`), `:185` (`OperatorQuickHistory`) — ambos recebem `jobs` reais por prop | — |
| **Histórico de ações do operador (página)** | ✅ IMPLEMENTADO_TOTAL | `src/pages/OperatorHistoryPage.tsx:44,48-60` — timeline derivada de `jobs.actual_start_time/actual_end_time` | Sem export; sem tabela própria de eventos (reconstruído dos timestamps do job). |
| **Quiosque de produção (KioskPage/KioskMode)** | 🟨 IMPLEMENTADO_PARCIAL | UI `src/pages/KioskPage.tsx:155`; ações persistem via `updateJobOffline` (`KioskPage.tsx:94,106`); componente `src/components/kiosk/KioskMode.tsx:54` | (a) **Métricas falsas hardcoded**: OEE "94.2%" `KioskMode.tsx:190`, "1.2" kWh `:195`, "42s" `:200`, "16:45" `:205`. (b) Badges OEE/Hist./Ener./ABC (`:308-320`) são decorativos, sem dado nem clique. (c) `selectedMachineId` nunca é alterado — `setSelectedMachineId` só aparece na declaração (`KioskPage.tsx:23`): o filtro por máquina é código morto e o título fica sempre "Todas as Máquinas" (`KioskPage.tsx:157`). |
| **Passagem de turno — criar/finalizar/aceitar** | ✅ IMPLEMENTADO_TOTAL | UI `src/pages/ShiftHandoverPage.tsx:485`; mutations `src/hooks/shift-handover/useShiftHandoverMutations.ts:13-70`; tabela `shift_handovers` (`supabase/migrations/20251220135105_e07f8d61-3537-459b-9cbd-635d23c55d27.sql:2`) | Tem guarda contra auto-aceite (`useShiftHandoverMutations.ts:59-64`). |
| **Checklist da passagem de turno** | ✅ IMPLEMENTADO_TOTAL | `useShiftHandoverMutations.ts:18-22,72-79`; query `useShiftHandoverQueries.ts:55-66`; tabela `shift_handover_checklist` (`...20251220135105_...sql:19`) | — |
| **Templates de checklist de turno** | ✅ IMPLEMENTADO_TOTAL | UI `src/pages/ShiftHandoverPage.tsx:480` (`ChecklistTemplatesManager`); CRUD `src/components/shift/ChecklistTemplatesManager.tsx:31,47,62,75,82`; consumo `src/components/shift/CreateHandoverModal.tsx:59`; tabela `shift_checklist_templates` (`...20251220135105_...sql:66`) | — |
| **Pendências de turno** | ✅ IMPLEMENTADO_TOTAL | UI `src/pages/ShiftHandoverPage.tsx:402`; mutations `useShiftHandoverMutations.ts:81-101`; tabela `shift_pending_tasks` (`...20251220135105_...sql:31`) | — |
| **Ocorrências de turno** | ✅ IMPLEMENTADO_TOTAL | UI `src/pages/ShiftHandoverPage.tsx:406`; mutations `useShiftHandoverMutations.ts:103-120`; tabela `shift_occurrences` (`...20251220135105_...sql:48`) | — |
| **Resumo automático de turno + PDF** | 🟨 IMPLEMENTADO_PARCIAL | `src/components/shift/AutoShiftSummary.tsx:16-42`, montado em `src/pages/Index.tsx:386`; PDF via `src/lib/shiftReportPdf.ts` | **Janela de turno hardcoded e divergente** do resto do sistema: usa 7h/14h/22h (`AutoShiftSummary.tsx:24-27`) enquanto `getCurrentShiftType` usa 6h/14h/22h (`src/hooks/shift-handover/shiftHandoverTypes.ts:86-91`). Não lê nenhuma tabela de turno — apenas filtra `jobs.updated_at`. |
| **Definição de turnos / escalas** | 🟦 SUGERIDO_OU_INICIADO | `src/hooks/shift-handover/shiftHandoverTypes.ts:80-91` (labels + faixa horária em constante TS) | **Não existe tabela de turnos nem de escala** — `grep "CREATE TABLE" supabase/migrations/*.sql` não retorna `shifts`/`schedules`/`escalas`. Turno é um enum derivado do relógio do navegador; não é configurável, não é atribuído a operador, não é planejável. |
| **Treinamento / certificação de operador** | 🟦 SUGERIDO_OU_INICIADO | Único vestígio: texto "Sugestão de Treinamento" em `src/components/operators/AIWorkforceAdvisor.tsx:22` | Nenhuma tabela `training_*`, nenhum hook, nenhuma rota. O mais próximo funcional é `operator_skills` (linha "Competências" acima). |
| **Ranking persistido (leaderboard em Operadores)** | 🟨 IMPLEMENTADO_PARCIAL | UI `src/pages/OperatorsPage.tsx:507` (`OperatorLeaderboard`); hook `src/features/production/hooks/useOperatorRankings.ts:19-38`; tabela `operator_rankings` (`supabase/migrations/20251220144811_ddce69a0-cb8c-419d-a9d4-3d8e1536c02b.sql:18`) | **Só lê, nunca escreve** — e a query **não filtra período** (`useOperatorRankings.ts:24-26` filtra apenas `ranking_type`), então mistura todos os períodos históricos e pode exibir várias linhas com `position=1`. Depende inteiramente de `calculate-rankings` ter rodado (ver abaixo). |
| **Ranking/pódio (GamificationPage)** | 🟨 IMPLEMENTADO_PARCIAL | UI `src/pages/GamificationPage.tsx:41-51,249-384`; hook `src/hooks/useGamification.ts:69-110` com fallback `calculateRankingsLocally` (`:269-341`) | Funciona **apenas** pelo fallback client-side: se `operator_rankings` estiver vazia para o período, calcula em memória (`useGamification.ts:86-89`) e **não persiste**. Ou seja, o pódio pode existir enquanto `operator_rankings` permanece vazia — e os pontos exibidos nunca viram saldo. |
| **Edge function `calculate-rankings`** | ⬛ MORTO_OU_ABANDONADO | Função completa e correta: `supabase/functions/calculate-rankings/index.ts:15-325` (upsert em `operator_rankings:195-197`, insert em `operator_achievements:287-290`) | **Sem nenhum chamador executável no repositório.** Provas: (1) `grep -rn "calculate-rankings" .` retorna só `src/hooks/useGamification.ts:132` + 2 comentários em SQL; (2) o `calculateRankingsMutation` só é exposto no retorno do hook (`useGamification.ts:261-262`) e `grep -rn "calculateRankings\|isCalculating" src/` **não encontra nenhum componente que o consuma** — `GamificationPage.tsx:41-51` desestrutura o hook sem `calculateRankings`; (3) não há agendamento: `grep -rn "cron.schedule" supabase/migrations/` retorna apenas `auto-promote-jobs-fallback` (`20260512110942_cb61b4fe-...sql:43`) e `rollup-cron-p95-daily` (`20260726161334_0dc2a73a-...sql`). Um cron configurado fora das migrations (painel Supabase) é **NAO_VERIFICADO**. |
| **Conquistas / badges (concessão)** | ⬛ MORTO_OU_ABANDONADO | Único código que insere: `supabase/functions/calculate-rankings/index.ts:245-255` ("Campeão do Dia/Semana/Mês") e `:270-280` ("Mestre da Qualidade") | `grep -rn "operator_achievements" src/ supabase/functions/` mostra **3 leituras** no frontend (`useGamification.ts:117,170,217`) e **zero escritas** fora da EF morta acima. Como nada dispara a EF, nenhuma conquista é concedida por caminho de execução existente. Só 2 tipos de badge existem no código — não há catálogo de conquistas. |
| **Saldo de pontos do operador** | ⬛ MORTO_OU_ABANDONADO | `src/hooks/useGamification.ts:162-188`: saldo = Σ`operator_achievements.points` − Σ`reward_redemptions.points_spent` | Depende 100% de `operator_achievements`, que ninguém preenche (linha acima) ⇒ saldo estruturalmente 0. Exibido em destaque em `src/pages/GamificationPage.tsx:110`. |
| **Loja de recompensas (catálogo)** | ✅ IMPLEMENTADO_TOTAL | UI `src/pages/GamificationPage.tsx:146-196`; hook `src/hooks/useGamification.ts:150-159`; tabela + seed de 5 prêmios `supabase/migrations/20260512143602_c8aafdab-f761-42aa-99f1-cfff8fed3389.sql:2,42-47` | Ícones do seed (`clock`,`package`,`trending-up`) não existem no mapa `achievementIcons` (`GamificationPage.tsx:23-31`) ⇒ caem sempre no fallback `Trophy` (`:62`). |
| **Resgate de recompensa** | 🟨 IMPLEMENTADO_PARCIAL | Insert real: `src/hooks/useGamification.ts:238-244` → `reward_redemptions` (`...20260512143602_...sql:15`); histórico em `GamificationPage.tsx:198-247` | (a) Botão sempre desabilitado na prática porque `balance` é 0 (`GamificationPage.tsx:175`). (b) **Não existe fluxo de aprovação**: `grep -rn "reward_redemptions" src/ supabase/` não mostra nenhum `update`; a RLS só define SELECT e INSERT (`...20260512143602_...sql:33-38`) — sem policy de UPDATE, status fica `pending` para sempre. (c) `gamification_rewards.stock` nunca é decrementado. |
| **Ícones de conquista (badge visual)** | 🟨 IMPLEMENTADO_PARCIAL | `src/pages/GamificationPage.tsx:397` mapeia `a.icon` por nome; a EF grava emoji: `calculate-rankings/index.ts:250` (`"🏆"`) e `:275` (`"⭐"`) | Chave nunca casa ⇒ todas as conquistas renderizariam o ícone genérico `Trophy`. |
| **Tabela `gamification_settings`** | ⬛ MORTO_OU_ABANDONADO | Criada em `supabase/migrations/20251220144811_ddce69a0-cb8c-419d-a9d4-3d8e1536c02b.sql:34` | `grep -rn "gamification_settings" src/ supabase/functions/` (excluindo `types.ts` gerado) **não retorna nada** — nenhum leitor, nenhum escritor. |
| **Widgets de gamificação no dashboard** | 🟨 IMPLEMENTADO_PARCIAL | `src/components/dashboard/GamificationBanner.tsx:11` e `LeaderboardWidget.tsx:12`, montados em `src/pages/Index.tsx:266,509` e `src/pages/EfficiencyDashboard.tsx:91,110` | Consomem `useGamification` ⇒ herdam o fallback client-side; pontos exibidos não correspondem a nada persistido. |
| **`OperatorsService` (camada de serviço)** | ⬛ MORTO_OU_ABANDONADO | `src/features/production/services/operatorsService.ts:3-32` | `grep -rn "OperatorsService" src/` retorna **apenas a própria definição**. Além de sem consumidor, está quebrado: `.order('name')` em `profiles` (`:5`) e `.order('rank')` em `operator_rankings` (`:29`) — nenhuma dessas colunas existe no DDL (`operator_rankings` tem `position`, ver `...20251220144811_...sql:23`). |
| **`OperatorCardDetailed`** | ⬛ MORTO_OU_ABANDONADO | `src/components/operators/OperatorCardDetailed.tsx:18` | `grep -rn "OperatorCardDetailed" src/` só encontra o próprio arquivo (linhas 12 e 18). Zero importadores. |
| **`OperatorStatCard`** | ⬛ MORTO_OU_ABANDONADO | `src/components/operators/OperatorStatCard.tsx:12` | `grep -rn "OperatorStatCard" src/` só encontra o próprio arquivo. Substituído na prática por `OperatorProductivityStatCard` (`OperatorProductivityPage.tsx:121-124`). |
| **`ActivityLog` (log de atividade no dashboard)** | ⬛ MORTO_OU_ABANDONADO | Componente `src/components/activity/ActivityLog.tsx:50`; hook `src/features/admin/hooks/useActivityLog.ts:34-59` (só `useState`, sem persistência); consumo `src/pages/Index.tsx:22,192,460-467` | Renderizado sob `activityEntries.length > 0` (`Index.tsx:460`), mas `addActivityEntry` é desestruturado em `Index.tsx:192` e **nunca chamado** (`grep -n "addActivityEntry" src/pages/Index.tsx` → só a linha 192). O array é sempre vazio ⇒ o bloco nunca renderiza. |
| **Calendário diário (timeline + drag&drop)** | ✅ IMPLEMENTADO_TOTAL | UI `src/pages/DailyCalendar.tsx:42`; timeline `src/components/calendar/CalendarTimeline.tsx:85-90,292`; persistência `src/features/jobs/hooks/useDailyDragDrop.ts:63-68` (`update` em `jobs`) | Rota protegida `coordinator/manager` (`src/routes/AppRoutes.tsx:180`). |
| **Calendário semanal (drag&drop)** | ✅ IMPLEMENTADO_TOTAL | `src/pages/WeeklyCalendar.tsx:149,360` via `useWeeklyDragDrop` | — |
| **Calendário mensal** | ✅ IMPLEMENTADO_TOTAL | `src/pages/MonthlyCalendar.tsx` (rota `AppRoutes.tsx:182`) | Somente visualização — sem DnD e sem escrita (`grep "DndContext\|supabase" src/pages/MonthlyCalendar.tsx` → vazio). |
| **Filtros e preferências do calendário** | ✅ IMPLEMENTADO_TOTAL | `src/hooks/useCalendarFilters.ts:10-14` e `src/hooks/useCalendarPreferences.ts:27-31` | Persistência em **localStorage**, não no banco — não sincroniza entre dispositivos. |
| **Atalhos de teclado do calendário** | ✅ IMPLEMENTADO_TOTAL | `src/hooks/useCalendarHotkeys.ts:20-50`; usado em `src/pages/DailyCalendar.tsx:28` | — |
| **Exportar calendário (PDF / iCal)** | 🟨 IMPLEMENTADO_PARCIAL | Diário OK: `src/pages/DailyCalendar.tsx:153,164` → `src/lib/calendarExports.ts:13,121` | **Semanal quebrado**: `src/pages/WeeklyCalendar.tsx:347-348` passa `onExportPdf={() => {}}` e `onExportICal={() => {}}` — os itens do menu (`src/components/calendar/CalendarToolbar.tsx:136,140`) existem e não fazem nada. |
| **Painel de conflitos de agendamento** | 🟨 IMPLEMENTADO_PARCIAL | Detecção real via `useSchedulingConflicts` (`src/pages/DailyCalendar.tsx:67`); painel `src/components/calendar/ConflictResolutionPanel.tsx:14-24` | **Botão morto**: "Otimizar via IA" tem `onClick={() => { /* Trigger AI resolution */ }}` vazio (`ConflictResolutionPanel.tsx:66-70`). "Resolver Manualmente" só chama `onResolved()` — o próprio comentário admite que a otimização não existe (`:53-56`). |
| **Assistente de otimização do calendário** | 🟨 IMPLEMENTADO_PARCIAL | `src/components/calendar/OptimizationAssistant.tsx:17-27` calcula ocupação/gargalos a partir de `useMachineUtilization` (real) | "SUGESTÃO DE IA" é texto fixo escolhido por um `if` (`:116-119`); "Setup Estimado 142 min" é **hardcoded** (`:131`); botão "Ver simulação de rebalanceamento →" não tem `onClick` (`:120-122`). |
| **Onboarding / legenda / minimapa / FAB do calendário** | ✅ IMPLEMENTADO_TOTAL | `src/pages/DailyCalendar.tsx:18,15,16,20` (`CalendarOnboarding`, `CalendarLegend`, `DensityMinimap`, `MobileFAB`); flag `onboardingDone` em `useCalendarPreferences.ts:49-52` | — |
| **`CalendarSkeleton`** | ⬛ MORTO_OU_ABANDONADO | `src/components/calendar/CalendarSkeleton.tsx:3` | `grep -rn "CalendarSkeleton" src/` retorna só o próprio arquivo. As rotas usam `CalendarPageSkeleton` de `src/components/loading/SkeletonLibrary.tsx:363` (`AppRoutes.tsx:180-182`). |

## Integrações e automações do domínio

| Integração | Estado | Evidência |
|---|---|---|
| `calculate-rankings` (Edge Function) | **Sem gatilho no repositório** | Nenhum `cron.schedule` a chama (`supabase/migrations/*.sql`); único `functions.invoke` é `src/hooks/useGamification.ts:132`, cujo wrapper (`:261`) não tem consumidor. Autorização dupla implementada: JWT coordinator/admin (`calculate-rankings/index.ts:37-48`) ou `requireCronSecret` fail-closed (`:54`). Execução real em produção: **NAO_VERIFICADO**. |
| `create-operator` / `update-operator` (Edge Functions) | Ativas e chamadas pela UI | `CreateOperatorModal.tsx:82`, `EditOperatorModal.tsx:78` |
| Supabase Realtime — presença de operadores | Ativa | `useOperatorPresence.ts:66` (canal `operators-presence`) |
| Supabase Realtime — `operator_machines`, `operator_goals` | Ativa | `useOperatorMachines.ts:52`, `useOperatorGoals.ts:83` |
| Offline-first no quiosque / OperatorView | Ativa | `KioskPage.tsx:21,94`, `OperatorView.tsx:17` via `useOfflineSync` |
| QR Scanner ↔ crachá de operador | **Incompatível** | `QRScanner.tsx:93` aceita apenas `type === "job"`; crachá emite `type: 'operator_badge'` (`OperatorsPage.tsx:531`) |
| Push/e-mail para eventos de turno ou ranking | **Ausente** | Nenhuma das EFs de notificação (`send-push-notification`, `cron-alert-email`, …) é referenciada por código de turno/gamificação neste lote |

## Achados relevantes

1. **A gamificação está estruturalmente inerte.** O único código que grava pontos e conquistas
   (`calculate-rankings`) não tem nenhum chamador executável: nem cron nas migrations, nem botão na
   UI (o `calculateRankings` do hook é órfão — `useGamification.ts:261` vs. `GamificationPage.tsx:41-51`).
   Consequência em cadeia: `operator_achievements` fica vazia → saldo sempre 0 (`useGamification.ts:174-185`)
   → loja de recompensas inutilizável (`GamificationPage.tsx:175`). A página *parece* funcionar apenas
   porque há um fallback que recalcula o ranking no navegador e **não persiste** (`useGamification.ts:86-89, 269-341`).
2. **Duas fórmulas de pontuação duplicadas** e capazes de divergir: a EF (`calculate-rankings/index.ts:164-169`)
   e o fallback client-side (`useGamification.ts:319`) — hoje idênticas (`produzido + eficiência*10 + qualidade*5 + jobs*2`),
   mas sem teste que amarre uma à outra. O nível/XP (`calculateLevelInfo`, `useGamification.ts:343-348`)
   existe só no cliente e não tem coluna no banco.
3. **Dois leitores concorrentes de `operator_rankings`** com semânticas diferentes: `useOperatorRankings`
   (`:24-26`, sem filtro de período — pode listar posições repetidas de períodos antigos) e `useGamification`
   (`:73-79`, com filtro de período). O leaderboard da tela de Operadores e o pódio da tela de Gamificação
   podem discordar.
4. **"IA" decorativa em três pontos do domínio**: `AIWorkforceAdvisor` (insights 100% literais,
   `:7-32`), `OptimizationAssistant` ("SUGESTÃO DE IA" fixa + "142 min" hardcoded, `:116-131`) e
   `ConflictResolutionPanel` (botão "Otimizar via IA" com corpo vazio, `:66-70`). Nenhum chama
   `ml-predictions` nem qualquer backend.
5. **Métricas fabricadas no quiosque** (`KioskMode.tsx:190,195,200,205`): OEE, kWh, tempo médio e
   previsão de fim são literais. É a tela mais exposta ao chão de fábrica.
6. **Crachá QR é um beco sem saída**: gerado (`OperatorsPage.tsx:527-535`), impresso (`:544`), e
   rejeitado pelo único scanner (`QRScanner.tsx:93`).
7. **Turno não é um conceito modelado**: não existe tabela de turno/escala; a faixa horária é
   constante em TypeScript e **divergente entre dois arquivos** (6h em `shiftHandoverTypes.ts:87`,
   7h em `AutoShiftSummary.tsx:24`). Por outro lado, a *passagem* de turno (`shift_handovers` e
   tabelas irmãs) é a parte mais bem acabada do lote — CRUD completo, templates, aceite com guarda.
8. **Resgates sem ciclo de vida**: `reward_redemptions` só recebe INSERT; a RLS não tem policy de
   UPDATE (`20260512143602_...sql:26-38`) e não há tela de aprovação. O `stock` do prêmio nunca decrementa.
9. **Código morto acumulado**: `OperatorsService` (quebrado, referencia colunas inexistentes),
   `OperatorCardDetailed`, `OperatorStatCard`, `CalendarSkeleton`, `gamification_settings`, e o
   `ActivityLog` do dashboard (hook em memória cujo `addEntry` nunca é invocado).
10. **Divergência de validação de senha** entre modal (≥6, `CreateOperatorModal.tsx:58`) e edge
    function (≥8, `create-operator/index.ts:109`) — o usuário só descobre o erro após o round-trip.
11. **Exportação do calendário semanal é um no-op silencioso** (`WeeklyCalendar.tsx:347-348`): o menu
    existe, o clique não faz nada e não há feedback de erro.

## Limitações

- **Runtime = NAO_VERIFICADO.** Sem acesso a banco, logs ou produção. Não sei se `operator_rankings`,
  `operator_achievements` ou `reward_redemptions` contêm linhas; não sei se `calculate-rankings` está
  agendada no painel do Supabase (fora das migrations), nem se alguma automação externa (n8n, GitHub
  Action, webhook) a invoca. As classificações ⬛ deste lote significam "sem caminho de execução
  **no repositório**", provado por grep, e não "comprovadamente nunca executado".
- Não executei build, testes, lint nem type-check; erros de tipo latentes (ex.: `OperatorsService`)
  foram inferidos por leitura do DDL.
- RLS foi lida apenas nas migrations de criação e nas duas de endurecimento citadas
  (`20260718200200_scope_analytics_writes_to_elevated_roles.sql`,
  `20260719200000_scope_sensitive_reads_to_active_roles.sql`); políticas podem ter sido alteradas
  por migrations que não abri ou diretamente no ambiente.
- `src/integrations/supabase/types.ts` é gerado; usei-o só como sinal de existência de tabela,
  nunca como prova de schema vigente.
- Documentação `.md` do repositório foi tratada como hipótese e **não** citada como evidência.
